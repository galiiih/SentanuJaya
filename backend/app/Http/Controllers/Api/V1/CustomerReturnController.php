<?php

namespace App\\Http\\Controllers\\Api\\V1;

use App\\Http\\Controllers\\Api\\BaseApiController;
use App\\Models\\Acceptance;
use App\\Models\\AcceptanceLine;
use App\\Models\\Company;
use App\\Models\\CustodyBalance;
use App\\Models\\CustodyLedger;
use App\\Models\\CustomerReturn;
use App\\Models\\DeliveryOrder;
use App\\Models\\DeliveryOrderLine;
use App\\Services\\SecurityAuditLogger;
use Illuminate\\Http\\JsonResponse;
use Illuminate\\Http\\Request;
use Illuminate\\Support\\Facades\\DB;
use Illuminate\\Validation\\ValidationException;

class CustomerReturnController extends BaseApiController
{
    public function __construct(private SecurityAuditLogger $auditLogger) {}

    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()?->hasPermission('return.view'), 403, 'Anda tidak memiliki akses melihat retur barang.');
        $items = CustomerReturn::query()
            ->with(['customer', 'deliveryOrder', 'lines.deliveryOrderLine.customerItem'])
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')))
            ->when($request->filled('delivery_order_id'), fn ($q) => $q->where('delivery_order_id', $request->string('delivery_order_id')))
            ->orderByDesc('return_date')->paginate(min($request->integer('per_page', 20), 100));
        return $this->sendResponse($items, 'Daftar retur barang berhasil dimuat.');
    }

    public function store(Request $request): JsonResponse
    {
        abort_unless($request->user()?->hasPermission('return.create'), 403, 'Anda tidak memiliki akses membuat retur barang.');
        $data = $request->validate([
            'delivery_order_id' => 'required|uuid|exists:delivery_orders,id',
            'return_date' => 'required|date',
            'notes' => 'nullable|string',
            'lines' => 'required|array|min:1',
            'lines.*.delivery_order_line_id' => 'required|uuid|distinct|exists:delivery_order_lines,id',
            'lines.*.quantity' => 'required|numeric|gt:0',
            'lines.*.reason' => 'nullable|string|max:100',
            'lines.*.notes' => 'nullable|string',
        ]);

        $record = DB::transaction(function () use ($data, $request) {
            $delivery = DeliveryOrder::query()->lockForUpdate()->findOrFail($data['delivery_order_id']);
            if (!in_array($delivery->status, [DeliveryOrder::STATUS_DELIVERED, DeliveryOrder::STATUS_CLOSED], true)) {
                throw ValidationException::withMessages(['delivery_order_id' => ['Retur hanya dapat dibuat untuk Surat Jalan yang sudah berstatus DELIVERED atau CLOSED.']]);
            }
            Company::query()->whereKey($delivery->company_id)->lockForUpdate()->firstOrFail();
            $prefix = 'RET-' . now()->format('Ym') . '-';
            $last = CustomerReturn::query()->where('company_id', $delivery->company_id)->where('return_number', 'like', $prefix . '%')->max('return_number');
            $seq = $last ? ((int) substr($last, -4)) + 1 : 1;

            $record = CustomerReturn::create([
                'company_id' => $delivery->company_id,
                'delivery_order_id' => $delivery->id,
                'customer_id' => $delivery->customer_id,
                'return_number' => $prefix . str_pad((string) $seq, 4, '0', STR_PAD_LEFT),
                'return_date' => $data['return_date'],
                'status' => 'DRAFT',
                'notes' => $data['notes'] ?? null,
                'created_by' => $request->user()->id,
            ]);

            foreach ($data['lines'] as $line) {
                $doLine = DeliveryOrderLine::query()->whereKey($line['delivery_order_line_id'])->lockForUpdate()->firstOrFail();
                if ($doLine->delivery_order_id !== $delivery->id) {
                    throw ValidationException::withMessages(['lines' => ['Baris barang tidak berasal dari Surat Jalan yang dipilih.']]);
                }
                $this->assertReturnableQuantity($doLine, (float) $line['quantity']);
                $record->lines()->create($line);
            }
            $this->auditLogger->log($request->user()->id, 'CREATE_RETURN', 'CUSTOMER_RETURN', $record->id, null, ['status' => 'DRAFT']);
            return $record;
        });

        return $this->sendResponse($record->load(['customer', 'deliveryOrder', 'lines.deliveryOrderLine.customerItem']), 'Draft retur barang berhasil dibuat.', 201);
    }

    public function show(Request $request, CustomerReturn $customerReturn): JsonResponse
    {
        abort_unless($request->user()?->hasPermission('return.view'), 403, 'Anda tidak memiliki akses melihat retur barang.');
        return $this->sendResponse($customerReturn->load(['customer', 'deliveryOrder', 'lines.deliveryOrderLine.customerItem']), 'Detail retur barang berhasil dimuat.');
    }

    public function post(Request $request, CustomerReturn $customerReturn): JsonResponse
    {
        abort_unless($request->user()?->hasPermission('return.post'), 403, 'Anda tidak memiliki akses mem-posting retur barang.');
        $record = DB::transaction(function () use ($customerReturn, $request) {
            $locked = CustomerReturn::query()->with('lines.deliveryOrderLine')->lockForUpdate()->findOrFail($customerReturn->id);
            if ($locked->status !== 'DRAFT') {
                throw ValidationException::withMessages(['status' => ['Hanya retur berstatus DRAFT yang dapat diposting.']]);
            }
            $delivery = DeliveryOrder::query()->lockForUpdate()->findOrFail($locked->delivery_order_id);
            if (!in_array($delivery->status, [DeliveryOrder::STATUS_DELIVERED, DeliveryOrder::STATUS_CLOSED], true)) {
                throw ValidationException::withMessages(['delivery_order_id' => ['Surat Jalan tidak lagi memenuhi syarat retur.']]);
            }

            foreach ($locked->lines as $returnLine) {
                $doLine = DeliveryOrderLine::query()->whereKey($returnLine->delivery_order_line_id)->lockForUpdate()->firstOrFail();
                $this->assertReturnableQuantity($doLine, (float) $returnLine->quantity, $locked->id);

                $locationId = $doLine->custody_location_id;
                $balanceQuery = CustodyBalance::query()
                    ->where('customer_id', $delivery->customer_id)
                    ->where('customer_item_id', $doLine->customer_item_id)
                    ->where('stage', 'RAW');
                $locationId ? $balanceQuery->where('custody_location_id', $locationId) : $balanceQuery->whereNull('custody_location_id');
                $balance = $balanceQuery->lockForUpdate()->first();
                if (!$balance) {
                    $balance = CustodyBalance::create([
                        'customer_id' => $delivery->customer_id,
                        'customer_item_id' => $doLine->customer_item_id,
                        'custody_location_id' => $locationId,
                        'stage' => 'RAW',
                        'balance_quantity' => 0,
                    ]);
                    $balance = CustodyBalance::query()->lockForUpdate()->findOrFail($balance->id);
                }

                CustodyLedger::create([
                    'customer_id' => $delivery->customer_id,
                    'customer_item_id' => $doLine->customer_item_id,
                    'reference_type' => 'CUSTOMER_RETURN',
                    'reference_id' => $locked->id,
                    'movement_type' => 'RETURN_FROM_CUSTOMER',
                    'quantity_in' => $returnLine->quantity,
                    'quantity_out' => 0,
                    'custody_location_id' => $locationId,
                    'stage' => 'RETURNED',
                    'movement_date' => $locked->return_date,
                    'created_by' => $request->user()->id,
                    'notes' => 'Retur dari Surat Jalan ' . $delivery->sj_number . ' (' . $locked->return_number . ')',
                ]);
                $balance->update([
                    'balance_quantity' => (float) $balance->balance_quantity + (float) $returnLine->quantity,
                    'last_movement_at' => now(),
                ]);
            }

            $locked->update(['status' => 'POSTED', 'posted_by' => $request->user()->id, 'posted_at' => now()]);
            $this->auditLogger->log($request->user()->id, 'POST_RETURN', 'CUSTOMER_RETURN', $locked->id, ['status' => 'DRAFT'], ['status' => 'POSTED']);
            return $locked->fresh(['customer', 'deliveryOrder', 'lines.deliveryOrderLine.customerItem']);
        });
        return $this->sendResponse($record, 'Retur berhasil diposting dan saldo custody diperbarui. Invoice dan pembayaran tidak diubah.');
    }

    public function cancel(Request $request, CustomerReturn $customerReturn): JsonResponse
    {
        abort_unless($request->user()?->hasPermission('return.create'), 403, 'Anda tidak memiliki akses membatalkan draft retur.');
        if ($customerReturn->status !== 'DRAFT') {
            throw ValidationException::withMessages(['status' => ['Hanya draft retur yang dapat dibatalkan.']]);
        }
        $customerReturn->update(['status' => 'CANCELLED']);
        $this->auditLogger->log($request->user()->id, 'CANCEL_RETURN', 'CUSTOMER_RETURN', $customerReturn->id, ['status' => 'DRAFT'], ['status' => 'CANCELLED']);
        return $this->sendResponse($customerReturn->fresh(), 'Draft retur dibatalkan.');
    }

    private function assertReturnableQuantity(DeliveryOrderLine $line, float $requested, ?string $excludeReturnId = null): void
    {
        $accepted = (float) AcceptanceLine::query()
            ->where('delivery_order_line_id', $line->id)
            ->whereHas('acceptance', fn ($q) => $q->where('status', Acceptance::STATUS_POSTED))
            ->sum('quantity_ok');
        $returnedQuery = DB::table('customer_return_lines')
            ->join('customer_returns', 'customer_returns.id', '=', 'customer_return_lines.customer_return_id')
            ->where('customer_return_lines.delivery_order_line_id', $line->id)
            ->where('customer_returns.status', 'POSTED');
        if ($excludeReturnId) $returnedQuery->where('customer_returns.id', '!=', $excludeReturnId);
        $returned = (float) $returnedQuery->sum('customer_return_lines.quantity');
        $remaining = max(0, $accepted - $returned);
        if ($requested > $remaining + 0.0001) {
            throw ValidationException::withMessages([
                'lines' => ["Jumlah retur melebihi kuantitas yang telah diterima customer. Diterima: {$accepted}; sudah diretur: {$returned}; sisa dapat diretur: {$remaining}."],
            ]);
        }
    }
}
