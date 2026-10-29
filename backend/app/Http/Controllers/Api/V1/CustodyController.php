<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\BaseApiController;
use App\Models\CustodyBalance;
use App\Models\CustodyLedger;
use App\Models\CustodyLocation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CustodyController extends BaseApiController
{
    public function locations(Request $request): JsonResponse
    {
        $locations = CustodyLocation::query()
            ->when($request->filled('branch_id'), fn ($query) => $query->where('branch_id', $request->string('branch_id')))
            ->where('is_active', true)
            ->orderBy('code')
            ->paginate(min($request->integer('per_page', 100), 100));

        return $this->sendResponse($locations, __('goods_receipt.messages.custody_locations_listed'));
    }

    public function balances(Request $request): JsonResponse
    {
        $balances = CustodyBalance::query()
            ->with(['customer', 'customerItem', 'custodyLocation'])
            ->when($request->filled('customer_id'), fn ($query) => $query->where('customer_id', $request->string('customer_id')))
            ->orderByDesc('last_movement_at')
            ->paginate(min($request->integer('per_page', 20), 100));

        return $this->sendResponse($balances, __('goods_receipt.messages.custody_balances_listed'));
    }

    public function ledger(Request $request): JsonResponse
    {
        $ledger = CustodyLedger::query()
            ->with(['customer', 'customerItem', 'custodyLocation'])
            ->when($request->filled('customer_id'), fn ($query) => $query->where('customer_id', $request->string('customer_id')))
            ->orderByDesc('movement_date')
            ->orderByDesc('created_at')
            ->paginate(min($request->integer('per_page', 20), 100));

        return $this->sendResponse($ledger, __('goods_receipt.messages.custody_ledger_listed'));
    }
}
