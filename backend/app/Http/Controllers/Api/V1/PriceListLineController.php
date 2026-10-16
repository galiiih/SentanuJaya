<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\BaseApiController;
use App\Models\PriceListLine;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;

class PriceListLineController extends BaseApiController
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): JsonResponse
    {
        $perPage = (int) $request->input('per_page', 20);
        $query = PriceListLine::query()->with(['priceList', 'customerItem']);

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('color_code', 'LIKE', '%' . $search . '%') ->orwhere('treatment_type', 'LIKE', '%' . $search . '%') ->orwhere('size', 'LIKE', '%' . $search . '%');
            });
        }

        $items = $query->paginate($perPage);
        return $this->sendResponse($items, 'PriceListLine list retrieved successfully.');
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'price_list_id' => 'required|uuid|exists:price_lists,id',
            'customer_item_id' => 'required|uuid|exists:customer_items,id',
            'color_code' => 'nullable|string|max:50',
            'treatment_type' => 'nullable|string|max:50',
            'size' => 'nullable|string|max:50',
            'unit_price' => 'required|numeric|min:0',
            'minimum_charge' => 'numeric|min:0',
            'discount_percent' => 'numeric|min:0|max:100',
            'is_active' => 'boolean',
        ]);

        if ($validator->fails()) {
            return $this->sendError('Validation Error.', $validator->errors(), 422);
        }

        $item = PriceListLine::create($validator->validated());
        return $this->sendResponse($item, 'PriceListLine created successfully.', 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id): JsonResponse
    {
        $item = PriceListLine::with(['priceList', 'customerItem'])->find($id);

        if (!$item) {
            return $this->sendError('PriceListLine not found.', [], 404);
        }

        return $this->sendResponse($item, 'PriceListLine retrieved successfully.');
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $item = PriceListLine::find($id);

        if (!$item) {
            return $this->sendError('PriceListLine not found.', [], 404);
        }

        $validator = Validator::make($request->all(), [
            'price_list_id' => 'sometimes|required|uuid|exists:price_lists,id',
            'customer_item_id' => 'sometimes|required|uuid|exists:customer_items,id',
            'color_code' => 'nullable|string|max:50',
            'treatment_type' => 'nullable|string|max:50',
            'size' => 'nullable|string|max:50',
            'unit_price' => 'sometimes|required|numeric|min:0',
            'minimum_charge' => 'sometimes|numeric|min:0',
            'discount_percent' => 'sometimes|numeric|min:0|max:100',
            'is_active' => 'boolean',
        ]);

        if ($validator->fails()) {
            return $this->sendError('Validation Error.', $validator->errors(), 422);
        }

        $item->update($validator->validated());
        return $this->sendResponse($item, 'PriceListLine updated successfully.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id): JsonResponse
    {
        $item = PriceListLine::find($id);

        if (!$item) {
            return $this->sendError('PriceListLine not found.', [], 404);
        }


        $item->delete();
        return $this->sendResponse(null, 'PriceListLine deleted successfully.');
    }
}
