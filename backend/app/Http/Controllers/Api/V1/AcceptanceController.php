<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\BaseApiController;
use App\Models\Acceptance;
use App\Models\AcceptanceLine;
use App\Models\Company;
use App\Models\DeliveryOrder;
use App\Services\CustodyService;
use App\Services\SecurityAuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AcceptanceController extends BaseApiController
{
    public function __construct(
        private CustodyService $custodyService,
        private SecurityAuditLogger $auditLogger,
    ) {
    }

    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()?->hasPermission('acceptance.view'), 403, __('acceptance.errors.forbidden'));

        $items = Acceptance::query()
            ->with(['deliveryOrder.customer', 'lines.deliveryOrderLine.customerItem'])
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')))
            ->when($request->filled('delivery_order_id'), fn ($q) => $q->where('delivery_order_id', $request->string('delivery_order_id')))
            ->orderByDesc('acceptance_date')
            ->paginate(min($request->integer('per_page', 20), 100));

        return $this->sendResponse($items, __('acceptance.messages.listed'));
    }

    public function store(Request $request): JsonResponse
    {
        abort_unless($request->user()?->hasPermission('acceptance.create'), 403, __('acceptance.errors.forbidden'));

        $data = $request->validate([
            'delivery_order_id' => 'required|uuid|exists:delivery_orders,id',
            'acceptance_date' => 'required|date',
            'notes' => 'nullable|string',
            'evidence_reference' => 'nullable|string',
            'lines' => 'required|array|min:1',
            'lines.*.delivery_order_line_id' => 'required|uuid|exists:delivery_order_lines,id',
            'lines.*.quantity_ok' => 'required|numeric|min:0',
            'lines.*.quantity_rejected' => 'required|numeric|min:0',
            'lines.*.reject_reason' => 'nullable|string',
        ]);

        $acceptance = DB::transaction(function () use ($data, $request) {
            $delivery = DeliveryOrder::query()->lockForUpdate()->findOrFail($data['delivery_order_id']);
            if (!in_array($delivery->status, [DeliveryOrder::STATUS_DELIVERED, DeliveryOrder::STATUS_CLOSED])) {
                throw ValidationException::withMessages(['delivery_order_id' => [__('acceptance.errors.delivery_not_delivered')]]);
            }

            // Validate cumulative quantities
            $this->validateCumulativeQuantities($delivery, $data['lines']);

            $prefix = 'ACC-' . now()->format('Ym') . '-';
            $companyId = $delivery->company_id;
            $last = Acceptance::whereHas('deliveryOrder', fn($q) => $q->where('company_id', $companyId))->where('acceptance_number', 'like', $prefix . '%')->max('acceptance_number');
            $seq = $last ? ((int) substr($last, -4)) + 1 : 1;

            $acceptance = Acceptance::create([
                'delivery_order_id' => $data['delivery_order_id'],
                'acceptance_number' => $prefix . str_pad((string) $seq, 4, '0', STR_PAD_LEFT),
                'acceptance_date' => $data['acceptance_date'],
                'status' => Acceptance::STATUS_DRAFT,
                'notes' => $data['notes'] ?? null,
                'evidence_reference' => $data['evidence_reference'] ?? null,
                'created_by' => $request->user()?->id,
            ]);

            foreach ($data['lines'] as $line) {
                // Verify line belongs to this DO
                $doLine = $delivery->lines()->findOrFail($line['delivery_order_line_id']);
                if ((float) $line['quantity_ok'] + (float) $line['quantity_rejected'] <= 0) {
                    throw ValidationException::withMessages(['lines' => [__('acceptance.errors.zero_quantity')]]);
                }
                $acceptance->lines()->create($line);
            }

            $this->auditLogger->log($request->user()?->id, 'CREATE_ACC', 'ACCEPTANCE', $acceptance->id, null, ['status' => 'DRAFT']);
            return $acceptance;
        });

        return $this->sendResponse(
            $acceptance->load(['deliveryOrder.customer', 'lines.deliveryOrderLine.customerItem']),
            __('acceptance.messages.created'),
            201
        );
    }

    public function show(Request $request, Acceptance $acceptance): JsonResponse
    {
        abort_unless($request->user()?->hasPermission('acceptance.view'), 403, __('acceptance.errors.forbidden'));
        return $this->sendResponse(
            $acceptance->load(['deliveryOrder.customer', 'lines.deliveryOrderLine.customerItem']),
            __('acceptance.messages.retrieved')
        );
    }

    public function submit(Request $request, Acceptance $acceptance): JsonResponse
    {
        abort_unless($request->user()?->hasPermission('acceptance.submit'), 403, __('acceptance.errors.forbidden'));

        $result = DB::transaction(function () use ($acceptance, $request) {
            $locked = Acceptance::query()->lockForUpdate()->findOrFail($acceptance->id);
            if ($locked->status !== Acceptance::STATUS_DRAFT) {
                throw ValidationException::withMessages(['status' => [__('acceptance.errors.submit_only_draft')]]);
            }
            $locked->update(['status' => Acceptance::STATUS_SUBMITTED]);
            $this->auditLogger->log($request->user()->id, 'SUBMIT_ACC', 'ACCEPTANCE', $locked->id,
                ['status' => 'DRAFT'], ['status' => 'SUBMITTED']);
            return $locked->fresh('lines.deliveryOrderLine.customerItem', 'deliveryOrder.customer');
        });

        return $this->sendResponse($result, __('acceptance.messages.submitted'));
    }

    public function post(Request $request, Acceptance $acceptance): JsonResponse
    {
        abort_unless($request->user()?->hasPermission('acceptance.post'), 403, __('acceptance.errors.forbidden'));

        $result = DB::transaction(function () use ($acceptance, $request) {
            $locked = Acceptance::query()->with('lines.deliveryOrderLine')->lockForUpdate()->findOrFail($acceptance->id);
            if ($locked->status !== Acceptance::STATUS_SUBMITTED) {
                throw ValidationException::withMessages(['status' => [__('acceptance.errors.post_only_submitted')]]);
            }

            $delivery = DeliveryOrder::query()->lockForUpdate()->findOrFail($locked->delivery_order_id);

            // Re-validate cumulative
            $this->validateCumulativeQuantities($delivery, $locked->lines->map(fn ($l) => [
                'delivery_order_line_id' => $l->delivery_order_line_id,
                'quantity_ok' => $l->quantity_ok,
                'quantity_rejected' => $l->quantity_rejected,
            ])->toArray(), $locked->id);

            // Return rejected goods via custody
            $this->custodyService->createReturnRejected($locked, $request->user()->id);

            $locked->update([
                'status' => Acceptance::STATUS_POSTED,
            ]);

            // Update delivery order status based on acceptance progress
            $this->updateDeliveryOrderStatus($delivery);

            $this->auditLogger->log($request->user()->id, 'POST_ACC', 'ACCEPTANCE', $locked->id,
                ['status' => 'SUBMITTED'], ['status' => 'POSTED']);
            return $locked->fresh('lines.deliveryOrderLine.customerItem', 'deliveryOrder.customer');
        });

        return $this->sendResponse($result, __('acceptance.messages.posted'));
    }

    public function cancel(Request $request, Acceptance $acceptance): JsonResponse
    {
        abort_unless($request->user()?->hasPermission('acceptance.create'), 403, __('acceptance.errors.forbidden'));

        $result = DB::transaction(function () use ($acceptance, $request) {
            $locked = Acceptance::query()->lockForUpdate()->findOrFail($acceptance->id);
            if ($locked->status !== Acceptance::STATUS_DRAFT) {
                throw ValidationException::withMessages(['status' => [__('acceptance.errors.cancel_only_draft')]]);
            }
            $locked->update(['status' => Acceptance::STATUS_CANCELLED]);
            $this->auditLogger->log($request->user()->id, 'CANCEL_ACC', 'ACCEPTANCE', $locked->id,
                ['status' => 'DRAFT'], ['status' => 'CANCELLED']);
            return $locked->fresh('lines.deliveryOrderLine.customerItem', 'deliveryOrder.customer');
        });

        return $this->sendResponse($result, __('acceptance.messages.cancelled'));
    }

    /**
     * Validate: SUM(accepted_ok) + SUM(rejected) <= delivered_quantity per line.
     * Excludes the current acceptance ($excludeAcceptanceId) from cumulative when re-validating during post.
     */
    private function validateCumulativeQuantities(DeliveryOrder $delivery, array $newLines, ?string $excludeAcceptanceId = null): void
    {
        $delivery->loadMissing('lines');

        foreach ($newLines as $newLine) {
            $doLine = $delivery->lines->firstWhere('id', $newLine['delivery_order_line_id']);
            if (!$doLine) {
                throw ValidationException::withMessages(['lines' => [__('acceptance.errors.line_not_in_delivery')]]);
            }

            // Sum all previously accepted/rejected for this DO line (excluding current)
            $query = AcceptanceLine::query()
                ->where('delivery_order_line_id', $newLine['delivery_order_line_id'])
                ->whereHas('acceptance', function ($q) use ($excludeAcceptanceId) {
                    $q->whereIn('status', [Acceptance::STATUS_DRAFT, Acceptance::STATUS_SUBMITTED, Acceptance::STATUS_POSTED]);
                    if ($excludeAcceptanceId) {
                        $q->where('id', '!=', $excludeAcceptanceId);
                    }
                });

            $cumOk = (float) $query->sum('quantity_ok');
            $cumReject = (float) (clone $query)->sum('quantity_rejected');
            $newOk = (float) ($newLine['quantity_ok'] ?? 0);
            $newReject = (float) ($newLine['quantity_rejected'] ?? 0);

            $total = $cumOk + $cumReject + $newOk + $newReject;
            $delivered = (float) $doLine->quantity;

            if ($total > $delivered) {
                throw ValidationException::withMessages([
                    'lines' => [__('acceptance.errors.over_accept', [
                        'delivered' => $delivered,
                        'cumulative' => $cumOk + $cumReject,
                        'new' => $newOk + $newReject,
                    ])],
                ]);
            }
        }
    }

    /**
     * Update delivery order status based on acceptance progress.
     * All lines fully resolved → CLOSED.
     */
    private function updateDeliveryOrderStatus(DeliveryOrder $delivery): void
    {
        $delivery->loadMissing('lines');
        $allResolved = true;

        foreach ($delivery->lines as $doLine) {
            $cumOk = (float) AcceptanceLine::query()
                ->where('delivery_order_line_id', $doLine->id)
                ->whereHas('acceptance', fn ($q) => $q->where('status', Acceptance::STATUS_POSTED))
                ->sum('quantity_ok');
            $cumReject = (float) AcceptanceLine::query()
                ->where('delivery_order_line_id', $doLine->id)
                ->whereHas('acceptance', fn ($q) => $q->where('status', Acceptance::STATUS_POSTED))
                ->sum('quantity_rejected');

            if ($cumOk + $cumReject < (float) $doLine->quantity) {
                $allResolved = false;
                break;
            }
        }

        if ($allResolved) {
            $delivery->update(['status' => DeliveryOrder::STATUS_CLOSED]);
        }
    }
}
