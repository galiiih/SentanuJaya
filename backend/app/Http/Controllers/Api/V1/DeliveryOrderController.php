<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\BaseApiController;
use App\Models\Company;
use App\Models\CustomerItem;
use App\Models\CustomerPo;
use App\Models\CustomerPoLine;
use App\Models\DeliveryOrder;
use App\Models\DeliveryOrderLine;
use App\Services\CustodyService;
use App\Services\SecurityAuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class DeliveryOrderController extends BaseApiController
{
    public function __construct(
        private CustodyService $custodyService,
        private SecurityAuditLogger $auditLogger,
    ) {
    }

    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()?->hasPermission('delivery.view'), 403, __('delivery_order.errors.forbidden'));

        $orders = DeliveryOrder::query()
            ->with(['customer', 'customerPo', 'lines.customerItem', 'lines.customerPoLine'])
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')))
            ->when($request->filled('customer_id'), fn ($q) => $q->where('customer_id', $request->string('customer_id')))
            ->orderByDesc('delivery_date')
            ->paginate(min($request->integer('per_page', 20), 100));

        return $this->sendResponse($orders, __('delivery_order.messages.listed'));
    }

    public function store(Request $request): JsonResponse
    {
        abort_unless($request->user()?->hasPermission('delivery.create'), 403, __('delivery_order.errors.forbidden'));

        $data = $request->validate([
            'company_id' => 'required|uuid|exists:companies,id',
            'branch_id' => 'required|uuid|exists:branches,id',
            'customer_id' => 'required|uuid|exists:customers,id',
            'customer_po_id' => 'required|uuid|exists:customer_pos,id',
            'customer_po_number' => 'nullable|string|max:100',
            'delivery_date' => 'required|date',
            'shipping_address' => 'nullable|string|max:500',
            'driver_name' => 'nullable|string|max:255',
            'vehicle_plate' => 'nullable|string|max:30',
            'notes' => 'nullable|string',
            'lines' => 'required|array|min:1',
            'lines.*.customer_item_id' => 'required|uuid|exists:customer_items,id',
            'lines.*.customer_po_line_id' => 'required|uuid|exists:customer_po_lines,id',
            'lines.*.color_code' => 'nullable|string|max:100',
            'lines.*.quantity' => 'required|numeric|gt:0',
            'lines.*.unit_price' => 'nullable|numeric|min:0',
            'lines.*.custody_location_id' => 'nullable|uuid|exists:custody_locations,id',
            'lines.*.notes' => 'nullable|string',
        ]);

        $order = DB::transaction(function () use ($data, $request) {
            Company::query()->whereKey($data['company_id'])->lockForUpdate()->firstOrFail();

            // Lock Customer PO & validate owner customer match
            $po = CustomerPo::query()->whereKey($data['customer_po_id'])->lockForUpdate()->firstOrFail();
            if ($po->customer_id !== $data['customer_id']) {
                throw ValidationException::withMessages(['customer_po_id' => ['Customer PO does not belong to the selected customer.']]);
            }
            if (in_array($po->status, [CustomerPo::STATUS_CANCELLED, CustomerPo::STATUS_CLOSED])) {
                throw ValidationException::withMessages(['customer_po_id' => ['Cannot create Surat Jalan for a cancelled or closed Customer PO.']]);
            }

            $prefix = 'SJ-' . now()->format('Ym') . '-';
            $last = DeliveryOrder::where('company_id', $data['company_id'])
                ->where('sj_number', 'like', $prefix . '%')
                ->max('sj_number');
            $seq = $last ? ((int) substr($last, -4)) + 1 : 1;
            $doNumber = $prefix . str_pad((string) $seq, 4, '0', STR_PAD_LEFT);

            $order = DeliveryOrder::create([
                ...collect($data)->except('lines')->all(),
                'sj_number' => $doNumber,
                'customer_po_number' => $po->po_number,
                'status' => DeliveryOrder::STATUS_DRAFT,
                'created_by' => $request->user()?->id,
            ]);

            foreach ($data['lines'] as $index => $line) {
                $item = CustomerItem::findOrFail($line['customer_item_id']);
                if ($item->customer_id !== $order->customer_id) {
                    throw ValidationException::withMessages(['lines' => [__('delivery_order.errors.customer_item_mismatch')]]);
                }

                // Match Customer PO line
                $poLineQuery = CustomerPoLine::where('customer_po_id', $po->id);
                if (!empty($line['customer_po_line_id'])) {
                    $poLine = $poLineQuery->where('id', $line['customer_po_line_id'])->first();
                    if (!$poLine) {
                        throw ValidationException::withMessages([
                            "lines.{$index}.customer_po_line_id" => ["Customer PO Line does not belong to Customer PO {$po->po_number}."],
                        ]);
                    }
                    if ($poLine->customer_item_id !== $item->id) {
                        throw ValidationException::withMessages([
                            "lines.{$index}.customer_item_id" => ["Customer item does not match selected Customer PO line item."],
                        ]);
                    }
                } else {
                    $poLine = $poLineQuery->where('customer_item_id', $item->id)->first();
                    if (!$poLine) {
                        throw ValidationException::withMessages([
                            "lines.{$index}.customer_item_id" => ["Item '{$item->name}' is not included in Customer PO {$po->po_number}."],
                        ]);
                    }
                }

                // Lock PO line and calculate remaining quantity
                $lockedPoLine = CustomerPoLine::query()->whereKey($poLine->id)->lockForUpdate()->first();

                $deliveredQtySoFar = (float) DeliveryOrderLine::where('customer_po_line_id', $lockedPoLine->id)
                    ->whereHas('deliveryOrder', function ($q) {
                        $q->where('status', '!=', 'CANCELLED');
                    })
                    ->sum('quantity');

                $remainingQty = max(0, (float) $lockedPoLine->quantity - $deliveredQtySoFar);
                $requestedQty = (float) $line['quantity'];

                if ($requestedQty > $remainingQty + 0.0001) {
                    throw ValidationException::withMessages([
                        "lines.{$index}.quantity" => [
                            "Requested quantity ({$requestedQty}) exceeds remaining PO quantity ({$remainingQty}) for item '{$item->name}'.",
                        ],
                    ]);
                }

                $order->lines()->create([
                    ...collect($line)->except('unit_price')->all(),
                    'customer_po_line_id' => $lockedPoLine->id,
                    'unit_price_snapshot' => $line['unit_price'] ?? $lockedPoLine->unit_price ?? 0,
                ]);
            }

            $this->auditLogger->log($request->user()?->id, 'CREATE_SJ', 'DELIVERY_ORDER', $order->id, null, ['status' => 'DRAFT']);
            return $order;
        });

        return $this->sendResponse(
            $order->load(['customer', 'customerPo', 'lines.customerItem']),
            __('delivery_order.messages.created'),
            201
        );
    }

    public function show(Request $request, DeliveryOrder $deliveryOrder): JsonResponse
    {
        abort_unless($request->user()?->hasPermission('delivery.view'), 403, __('delivery_order.errors.forbidden'));
        return $this->sendResponse(
            $deliveryOrder->load(['customer', 'customerPo', 'lines.customerItem', 'lines.customerPoLine', 'acceptances.lines']),
            __('delivery_order.messages.retrieved')
        );
    }

    public function update(Request $request, DeliveryOrder $deliveryOrder): JsonResponse
    {
        abort_unless($request->user()?->hasPermission('delivery.create'), 403, __('delivery_order.errors.forbidden'));

        if ($deliveryOrder->status !== DeliveryOrder::STATUS_DRAFT) {
            return $this->sendError(__('delivery_order.errors.update_only_draft'), [], 422);
        }

        $data = $request->validate([
            'customer_po_id' => 'sometimes|uuid|exists:customer_pos,id',
            'customer_po_number' => 'nullable|string|max:100',
            'delivery_date' => 'sometimes|date',
            'shipping_address' => 'nullable|string|max:500',
            'driver_name' => 'nullable|string|max:255',
            'vehicle_plate' => 'nullable|string|max:30',
            'notes' => 'nullable|string',
            'lines' => 'sometimes|array|min:1',
            'lines.*.id' => 'required|uuid',
            'lines.*.quantity' => 'sometimes|numeric|gt:0',
            'lines.*.unit_price' => 'nullable|numeric|min:0',
            'lines.*.notes' => 'nullable|string',
        ]);

        $updated = DB::transaction(function () use ($data, $deliveryOrder) {
            $locked = DeliveryOrder::query()->lockForUpdate()->findOrFail($deliveryOrder->id);

            $targetPoId = $data['customer_po_id'] ?? $locked->customer_po_id;
            $po = CustomerPo::query()->whereKey($targetPoId)->lockForUpdate()->firstOrFail();

            if ($po->customer_id !== $locked->customer_id) {
                throw ValidationException::withMessages(['customer_po_id' => ['Customer PO does not belong to the selected customer.']]);
            }
            if (in_array($po->status, [CustomerPo::STATUS_CANCELLED, CustomerPo::STATUS_CLOSED])) {
                throw ValidationException::withMessages(['customer_po_id' => ['Cannot use a cancelled or closed Customer PO.']]);
            }

            $locked->update(collect($data)->except('lines', 'status')->all());

            if (array_key_exists('lines', $data)) {
                foreach ($data['lines'] as $index => $line) {
                    $existing = $locked->lines()->findOrFail($line['id']);
                    $requestedQty = (float) ($line['quantity'] ?? $existing->quantity);

                    $poLine = CustomerPoLine::query()->whereKey($existing->customer_po_line_id)->lockForUpdate()->first();
                    if ($poLine) {
                        $deliveredOtherDos = (float) DeliveryOrderLine::where('customer_po_line_id', $poLine->id)
                            ->where('delivery_order_id', '!=', $locked->id)
                            ->whereHas('deliveryOrder', function ($q) {
                                $q->where('status', '!=', 'CANCELLED');
                            })
                            ->sum('quantity');

                        $remainingQty = max(0, (float) $poLine->quantity - $deliveredOtherDos);
                        if ($requestedQty > $remainingQty + 0.0001) {
                            throw ValidationException::withMessages([
                                "lines.{$index}.quantity" => [
                                    "Requested quantity ({$requestedQty}) exceeds remaining PO quantity ({$remainingQty}).",
                                ],
                            ]);
                        }
                    }

                    unset($line['id']);
                    $existing->update($line);
                }
            }
            return $locked;
        });

        return $this->sendResponse(
            $updated->fresh()->load(['customer', 'customerPo', 'lines.customerItem', 'lines.customerPoLine']),
            __('delivery_order.messages.updated')
        );
    }

    public function submit(Request $request, DeliveryOrder $deliveryOrder): JsonResponse
    {
        abort_unless($request->user()?->hasPermission('delivery.submit'), 403, __('delivery_order.errors.forbidden'));

        $order = DB::transaction(function () use ($deliveryOrder, $request) {
            $locked = DeliveryOrder::query()->lockForUpdate()->findOrFail($deliveryOrder->id);
            if ($locked->status !== DeliveryOrder::STATUS_DRAFT) {
                throw ValidationException::withMessages(['status' => [__('delivery_order.errors.submit_only_draft')]]);
            }
            $locked->update(['status' => DeliveryOrder::STATUS_SUBMITTED]);
            $this->auditLogger->log($request->user()->id, 'SUBMIT_SJ', 'DELIVERY_ORDER', $locked->id,
                ['status' => 'DRAFT'], ['status' => 'SUBMITTED']);
            return $locked->fresh('lines.customerItem', 'customer');
        });

        return $this->sendResponse($order, __('delivery_order.messages.submitted'));
    }

    public function deliver(Request $request, DeliveryOrder $deliveryOrder): JsonResponse
    {
        abort_unless($request->user()?->hasPermission('delivery.deliver'), 403, __('delivery_order.errors.forbidden'));

        $order = DB::transaction(function () use ($deliveryOrder, $request) {
            $locked = DeliveryOrder::query()->with('lines.customerItem')->lockForUpdate()->findOrFail($deliveryOrder->id);
            if ($locked->status !== DeliveryOrder::STATUS_SUBMITTED) {
                throw ValidationException::withMessages(['status' => [__('delivery_order.errors.deliver_only_submitted')]]);
            }

            // Custody OUT_TO_CUSTOMER
            $this->custodyService->createOutToCustomer($locked, $request->user()->id);

            $locked->update([
                'status' => DeliveryOrder::STATUS_DELIVERED,
            ]);

            $this->auditLogger->log($request->user()->id, 'DELIVER_SJ', 'DELIVERY_ORDER', $locked->id,
                ['status' => 'SUBMITTED'], ['status' => 'DELIVERED']);
            return $locked->fresh('lines.customerItem', 'customer');
        });

        return $this->sendResponse($order, __('delivery_order.messages.delivered'));
    }

    public function cancel(Request $request, DeliveryOrder $deliveryOrder): JsonResponse
    {
        $canCancelDraft = $request->user()?->hasPermission('delivery.cancel_draft');
        $canCancelPosted = $request->user()?->hasPermission('delivery.cancel_posted');

        if (!$canCancelDraft && !$canCancelPosted) {
            abort(403, __('delivery_order.errors.forbidden'));
        }

        $order = DB::transaction(function () use ($deliveryOrder, $request, $canCancelPosted) {
            $locked = DeliveryOrder::query()->lockForUpdate()->findOrFail($deliveryOrder->id);

            if ($locked->status === DeliveryOrder::STATUS_DRAFT) {
                // OK — any cancel permission
            } elseif (in_array($locked->status, [DeliveryOrder::STATUS_SUBMITTED, DeliveryOrder::STATUS_DELIVERED]) && $canCancelPosted) {
                // OWNER only for non-draft cancel
            } else {
                throw ValidationException::withMessages(['status' => [__('delivery_order.errors.cannot_cancel')]]);
            }

            $old = $locked->status;
            $locked->update(['status' => DeliveryOrder::STATUS_CANCELLED]);
            $this->auditLogger->log($request->user()->id, 'CANCEL_SJ', 'DELIVERY_ORDER', $locked->id,
                ['status' => $old], ['status' => 'CANCELLED']);
            return $locked->fresh('lines.customerItem', 'customer');
        });

        return $this->sendResponse($order, __('delivery_order.messages.cancelled'));
    }

    public function destroy(Request $request, DeliveryOrder $deliveryOrder): JsonResponse
    {
        abort_unless($request->user()?->hasPermission('delivery.create'), 403, __('delivery_order.errors.forbidden'));

        if ($deliveryOrder->status !== DeliveryOrder::STATUS_DRAFT) {
            return $this->sendError(__('delivery_order.errors.delete_only_draft'), [], 409);
        }
        $deliveryOrder->delete();

        return $this->sendResponse([], __('delivery_order.messages.deleted'));
    }
}
