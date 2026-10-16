<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\BaseApiController;
use App\Models\CustomerItem;
use App\Models\CustomerPo;
use App\Models\CustomerPoLine;
use App\Services\SecurityAuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class CustomerPoController extends BaseApiController
{
    public function __construct(
        private SecurityAuditLogger $auditLogger,
    ) {
    }
    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()?->hasPermission('po.view'), 403, __('auth.unauthorized'));

        $query = CustomerPo::with(['customer:id,code,name', 'lines.customerItem:id,code,name', 'createdBy:id,full_name']);

        if ($request->filled('customer_id')) {
            $query->where('customer_id', $request->query('customer_id'));
        }

        if ($request->filled('status')) {
            $query->where('status', strtoupper($request->query('status')));
        }

        if ($request->filled('search')) {
            $search = '%' . $request->query('search') . '%';
            $query->where(function ($q) use ($search) {
                $q->where('po_number', 'like', $search)
                  ->orWhereHas('customer', function ($cq) use ($search) {
                      $cq->where('name', 'like', $search)->orWhere('code', 'like', $search);
                  });
            });
        }

        $pos = $query->orderBy('created_at', 'desc')->paginate(min($request->integer('per_page', 15), 100));

        return $this->sendResponse($pos, 'Customer PO listed');
    }

    public function store(Request $request): JsonResponse
    {
        abort_unless($request->user()?->hasPermission('po.create'), 403, __('auth.unauthorized'));

        $validated = $request->validate([
            'company_id' => 'required|uuid|exists:companies,id',
            'customer_id' => 'required|uuid|exists:customers,id',
            'po_number' => [
                'required',
                'string',
                'max:100',
                Rule::unique('customer_pos')->where('company_id', $request->input('company_id')),
            ],
            'po_date' => 'required|date',
            'expected_delivery_date' => 'nullable|date',
            'notes' => 'nullable|string',
            'lines' => 'required|array|min:1',
            'lines.*.customer_item_id' => 'required|uuid|exists:customer_items,id',
            'lines.*.color_code' => 'nullable|string|max:100',
            'lines.*.quantity' => 'required|numeric|gt:0',
            'lines.*.unit_price' => 'nullable|numeric|gte:0',
            'lines.*.notes' => 'nullable|string',
        ]);

        // Validate all lines belong to the target customer
        foreach ($validated['lines'] as $index => $line) {
            $item = CustomerItem::find($line['customer_item_id']);
            if (!$item || $item->customer_id !== $validated['customer_id']) {
                throw ValidationException::withMessages([
                    "lines.{$index}.customer_item_id" => ['Item does not belong to the selected customer.'],
                ]);
            }
        }

        $po = DB::transaction(function () use ($validated, $request) {
            $po = CustomerPo::create([
                'company_id' => $validated['company_id'],
                'customer_id' => $validated['customer_id'],
                'po_number' => $validated['po_number'],
                'po_date' => $validated['po_date'],
                'expected_delivery_date' => $validated['expected_delivery_date'] ?? null,
                'status' => CustomerPo::STATUS_DRAFT,
                'notes' => $validated['notes'] ?? null,
                'created_by' => $request->user()->id,
            ]);

            foreach ($validated['lines'] as $line) {
                $po->lines()->create([
                    'customer_item_id' => $line['customer_item_id'],
                    'color_code' => $line['color_code'] ?? null,
                    'quantity' => $line['quantity'],
                    'unit_price' => $line['unit_price'] ?? 0,
                    'notes' => $line['notes'] ?? null,
                ]);
            }

            $this->auditLogger->log(
                $request->user()->id, 'CREATE_PO', 'CUSTOMER_PO', $po->id,
                null, ['status' => CustomerPo::STATUS_DRAFT, 'po_number' => $po->po_number]
            );

            return $po->load(['customer', 'lines.customerItem']);
        });

        return $this->sendResponse($po, 'Customer PO draft created', 201);
    }

    public function show(Request $request, string $id): JsonResponse
    {
        abort_unless($request->user()?->hasPermission('po.view'), 403, __('auth.unauthorized'));

        $po = CustomerPo::with(['customer', 'company', 'lines.customerItem', 'deliveryOrders', 'createdBy:id,full_name'])->find($id);
        if (!$po) {
            return $this->sendError('Customer PO not found', [], 404);
        }

        return $this->sendResponse($po, 'Customer PO retrieved');
    }

    public function update(Request $request, string $id): JsonResponse
    {
        abort_unless($request->user()?->hasPermission('po.edit'), 403, __('auth.unauthorized'));

        $po = CustomerPo::with('lines')->find($id);
        if (!$po) {
            return $this->sendError('Customer PO not found', [], 404);
        }

        // State gate: CANCELLED and CLOSED are immutable
        if (in_array($po->status, [CustomerPo::STATUS_CANCELLED, CustomerPo::STATUS_CLOSED])) {
            return $this->sendError("Cannot modify a {$po->status} Customer PO", [], 422);
        }

        $isReferenced = $po->deliveryOrders()->where('status', '!=', 'CANCELLED')->exists();

        $validated = $request->validate([
            'customer_id' => 'sometimes|uuid|exists:customers,id',
            'po_number' => [
                'sometimes',
                'string',
                'max:100',
                Rule::unique('customer_pos')->where('company_id', $po->company_id)->ignore($po->id),
            ],
            'po_date' => 'sometimes|date',
            'expected_delivery_date' => 'nullable|date',
            'notes' => 'nullable|string',
            'lines' => 'sometimes|array|min:1',
            'lines.*.id' => 'nullable|uuid|exists:customer_po_lines,id',
            'lines.*.customer_item_id' => 'required_with:lines|uuid|exists:customer_items,id',
            'lines.*.color_code' => 'nullable|string|max:100',
            'lines.*.quantity' => 'required_with:lines|numeric|gt:0',
            'lines.*.unit_price' => 'nullable|numeric|gte:0',
            'lines.*.notes' => 'nullable|string',
        ]);

        // Historical Integrity Check: If PO has active SJ references, block critical modifications
        if ($isReferenced) {
            if (isset($validated['customer_id']) && $validated['customer_id'] !== $po->customer_id) {
                return $this->sendError('Cannot change customer on Customer PO referenced by Delivery Orders', [], 422);
            }
            if (isset($validated['po_number']) && $validated['po_number'] !== $po->po_number) {
                return $this->sendError('Cannot change PO number on Customer PO referenced by Delivery Orders', [], 422);
            }
        }

        $targetCustomerId = $validated['customer_id'] ?? $po->customer_id;

        if (isset($validated['lines'])) {
            foreach ($validated['lines'] as $index => $line) {
                $item = CustomerItem::find($line['customer_item_id']);
                if (!$item || $item->customer_id !== $targetCustomerId) {
                    throw ValidationException::withMessages([
                        "lines.{$index}.customer_item_id" => ['Item does not belong to the selected customer.'],
                    ]);
                }

                // Check quantity reduction against fulfilled quantity
                if (!empty($line['id'])) {
                    $existingLine = CustomerPoLine::find($line['id']);
                    if ($existingLine && $line['quantity'] < $existingLine->fulfilled_quantity) {
                        throw ValidationException::withMessages([
                            "lines.{$index}.quantity" => [
                                "Cannot reduce PO line quantity below already delivered quantity ({$existingLine->fulfilled_quantity}).",
                            ],
                        ]);
                    }
                }
            }
        }

        $oldData = ['status' => $po->status, 'po_number' => $po->po_number];

        DB::transaction(function () use ($po, $validated) {
            $po->update(array_filter([
                'customer_id' => $validated['customer_id'] ?? null,
                'po_number' => $validated['po_number'] ?? null,
                'po_date' => $validated['po_date'] ?? null,
                'expected_delivery_date' => array_key_exists('expected_delivery_date', $validated) ? $validated['expected_delivery_date'] : $po->expected_delivery_date,
                'notes' => array_key_exists('notes', $validated) ? $validated['notes'] : $po->notes,
            ], fn ($val) => $val !== null));

            if (isset($validated['lines'])) {
                $existingLineIds = $po->lines()->pluck('id')->toArray();
                $inputLineIds = array_filter(array_column($validated['lines'], 'id'));

                // Delete removed lines only if not referenced
                $toDeleteIds = array_diff($existingLineIds, $inputLineIds);
                foreach ($toDeleteIds as $delId) {
                    $delLine = CustomerPoLine::find($delId);
                    if ($delLine && $delLine->fulfilled_quantity > 0) {
                        throw new \RuntimeException('Cannot delete PO line with existing deliveries.');
                    }
                    if ($delLine) {
                        $delLine->delete();
                    }
                }

                foreach ($validated['lines'] as $line) {
                    if (!empty($line['id'])) {
                        CustomerPoLine::where('id', $line['id'])->update([
                            'customer_item_id' => $line['customer_item_id'],
                            'color_code' => $line['color_code'] ?? null,
                            'quantity' => $line['quantity'],
                            'unit_price' => $line['unit_price'] ?? 0,
                            'notes' => $line['notes'] ?? null,
                        ]);
                    } else {
                        $po->lines()->create([
                            'customer_item_id' => $line['customer_item_id'],
                            'color_code' => $line['color_code'] ?? null,
                            'quantity' => $line['quantity'],
                            'unit_price' => $line['unit_price'] ?? 0,
                            'notes' => $line['notes'] ?? null,
                        ]);
                    }
                }
            }
        });

        $this->auditLogger->log(
            $request->user()->id, 'UPDATE_PO', 'CUSTOMER_PO', $po->id,
            $oldData, ['po_number' => $po->fresh()->po_number]
        );

        return $this->sendResponse($po->fresh(['customer', 'lines.customerItem']), 'Customer PO updated');
    }

    public function activate(Request $request, string $id): JsonResponse
    {
        abort_unless($request->user()?->hasPermission('po.activate'), 403, __('auth.unauthorized'));

        $po = CustomerPo::find($id);
        if (!$po) {
            return $this->sendError('Customer PO not found', [], 404);
        }

        if ($po->status !== CustomerPo::STATUS_DRAFT) {
            return $this->sendError("Cannot activate PO with status {$po->status}", [], 422);
        }

        if ($po->lines()->count() === 0) {
            return $this->sendError('Cannot activate PO without lines', [], 422);
        }

        $po->update(['status' => CustomerPo::STATUS_OPEN]);

        $this->auditLogger->log(
            $request->user()->id, 'ACTIVATE_PO', 'CUSTOMER_PO', $po->id,
            ['status' => CustomerPo::STATUS_DRAFT], ['status' => CustomerPo::STATUS_OPEN]
        );

        return $this->sendResponse($po->fresh(['customer', 'lines.customerItem']), 'Customer PO activated');
    }

    public function cancel(Request $request, string $id): JsonResponse
    {
        abort_unless($request->user()?->hasPermission('po.cancel'), 403, __('auth.unauthorized'));

        $po = CustomerPo::find($id);
        if (!$po) {
            return $this->sendError('Customer PO not found', [], 404);
        }

        if (in_array($po->status, [CustomerPo::STATUS_CANCELLED, CustomerPo::STATUS_CLOSED])) {
            return $this->sendError("Cannot cancel PO with status {$po->status}", [], 422);
        }

        // Block if active (non-cancelled) SJ exist — no cascade cancellation
        if ($po->deliveryOrders()->where('status', '!=', 'CANCELLED')->exists()) {
            return $this->sendError('Cannot cancel Customer PO that has active Delivery Orders. Cancel all Surat Jalan first.', [], 422);
        }

        $old = $po->status;
        $po->update(['status' => CustomerPo::STATUS_CANCELLED]);

        $this->auditLogger->log(
            $request->user()->id, 'CANCEL_PO', 'CUSTOMER_PO', $po->id,
            ['status' => $old], ['status' => CustomerPo::STATUS_CANCELLED]
        );

        return $this->sendResponse($po->fresh(), 'Customer PO cancelled');
    }

    public function close(Request $request, string $id): JsonResponse
    {
        abort_unless($request->user()?->hasPermission('po.close'), 403, __('auth.unauthorized'));

        $po = CustomerPo::find($id);
        if (!$po) {
            return $this->sendError('Customer PO not found', [], 404);
        }

        if ($po->status !== CustomerPo::STATUS_OPEN) {
            return $this->sendError("Cannot close PO with status {$po->status}. Only OPEN POs can be closed.", [], 422);
        }

        $po->update(['status' => CustomerPo::STATUS_CLOSED]);

        $this->auditLogger->log(
            $request->user()->id, 'CLOSE_PO', 'CUSTOMER_PO', $po->id,
            ['status' => CustomerPo::STATUS_OPEN], ['status' => CustomerPo::STATUS_CLOSED]
        );

        return $this->sendResponse($po->fresh(['customer', 'lines.customerItem']), 'Customer PO closed');
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        return $this->sendError('Permanent deletion of historical PO is strictly forbidden. Use cancel instead.', [], 403);
    }
}
