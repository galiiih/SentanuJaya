<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\BaseApiController;
use App\Http\Requests\StoreGoodsReceiptRequest;
use App\Http\Requests\UpdateGoodsReceiptRequest;
use App\Models\Company;
use App\Models\CustomerItem;
use App\Models\GoodsReceipt;
use App\Services\CustodyService;
use App\Services\SecurityAuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class GoodsReceiptController extends BaseApiController
{
    public function __construct(
        private CustodyService $custodyService,
        private SecurityAuditLogger $auditLogger,
    ) {
    }

    public function index(Request $request): JsonResponse
    {
        $receipts = GoodsReceipt::query()->with(['customer', 'lines.customerItem', 'lines.custodyLocation'])
            ->when($request->filled('status'), fn ($query) => $query->where('status', $request->string('status')))
            ->orderByDesc('received_date')
            ->paginate(min($request->integer('per_page', 20), 100));

        return $this->sendResponse($receipts, __('goods_receipt.messages.listed'));
    }

    public function store(StoreGoodsReceiptRequest $request): JsonResponse
    {
        $data = $request->validated();
        $receipt = DB::transaction(function () use ($data, $request) {
            $companyId = $data['company_id'];
            Company::query()->whereKey($companyId)->lockForUpdate()->firstOrFail();
            $prefix = 'STB-' . now()->format('Ym') . '-';
            $lastNumber = GoodsReceipt::query()->where('company_id', $companyId)->where('stb_number', 'like', $prefix . '%')->max('stb_number');
            $sequence = $lastNumber ? ((int) substr($lastNumber, -4)) + 1 : 1;

            $receipt = GoodsReceipt::create([
                ...collect($data)->except('lines')->all(),
                'stb_number' => $prefix . str_pad((string) $sequence, 4, '0', STR_PAD_LEFT),
                'status' => 'DRAFT',
                'created_by' => $request->user()?->id,
            ]);

            foreach ($data['lines'] as $line) {
                $item = CustomerItem::findOrFail($line['customer_item_id']);
                if ($item->customer_id !== $receipt->customer_id) {
                    throw ValidationException::withMessages(['lines' => [__('goods_receipt.errors.customer_item_mismatch')]]);
                }
                $receipt->lines()->create($line);
            }

            $this->auditLogger->log($request->user()?->id, 'CREATE_STB', 'GOODS_RECEIPT', $receipt->id, null, ['status' => 'DRAFT']);
            return $receipt;
        });

        return $this->sendResponse($receipt->load(['customer', 'lines.customerItem', 'lines.custodyLocation']), __('goods_receipt.messages.created'), 201);
    }

    public function show(GoodsReceipt $goodsReceipt): JsonResponse
    {
        return $this->sendResponse($goodsReceipt->load(['customer', 'lines.customerItem', 'lines.custodyLocation']), __('goods_receipt.messages.retrieved'));
    }

    public function update(UpdateGoodsReceiptRequest $request, GoodsReceipt $goodsReceipt): JsonResponse
    {
        if ($goodsReceipt->status !== 'DRAFT') {
            return $this->sendError(__('goods_receipt.errors.update_only_draft'), [], 422);
        }

        $data = $request->validated();
        $updated = DB::transaction(function () use ($data, $goodsReceipt) {
            $locked = GoodsReceipt::query()->lockForUpdate()->findOrFail($goodsReceipt->id);
            $locked->update(collect($data)->except('lines', 'status')->all());
            if (array_key_exists('lines', $data)) {
                foreach ($data['lines'] as $line) {
                    $lineId = $line['id'];
                    $existing = $locked->lines()->findOrFail($lineId);
                    unset($line['id']);
                    $existing->update($line);
                }
            }
            $this->custodyService->validateCustomerOwnership($locked);

            return $locked;
        });

        return $this->sendResponse($updated->fresh()->load(['customer', 'lines.customerItem', 'lines.custodyLocation']), __('goods_receipt.messages.updated'));
    }

    public function destroy(GoodsReceipt $goodsReceipt): JsonResponse
    {
        if ($goodsReceipt->status !== 'DRAFT') {
            return $this->sendError(__('goods_receipt.errors.delete_only_draft'), [], 409);
        }
        $goodsReceipt->delete();

        return $this->sendResponse([], __('goods_receipt.messages.deleted'));
    }

    public function submit(Request $request, GoodsReceipt $goodsReceipt): JsonResponse
    {
        $this->authorizePosting($request);
        return $this->sendResponse($this->custodyService->submitGoodsReceipt($goodsReceipt, $request->user()->id), __('goods_receipt.messages.submitted'));
    }

    public function post(Request $request, GoodsReceipt $goodsReceipt): JsonResponse
    {
        $this->authorizePosting($request);
        return $this->sendResponse($this->custodyService->postGoodsReceipt($goodsReceipt, $request->user()->id), __('goods_receipt.messages.posted'));
    }

    public function cancel(Request $request, GoodsReceipt $goodsReceipt): JsonResponse
    {
        return $this->sendResponse($this->custodyService->cancelGoodsReceipt($goodsReceipt, $request->user()->id), __('goods_receipt.messages.cancelled'));
    }

    private function authorizePosting(Request $request): void
    {
        abort_unless($request->user()?->canPostGoodsReceipt(), 403, __('goods_receipt.errors.forbidden'));
    }
}
