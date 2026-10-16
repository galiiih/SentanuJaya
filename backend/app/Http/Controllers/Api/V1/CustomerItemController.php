<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\BaseApiController;
use App\Models\CustomerItem;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;

class CustomerItemController extends BaseApiController
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): JsonResponse
    {
        $perPage = (int) $request->input('per_page', 20);
        $query = CustomerItem::query()->with(['customer', 'uom']);

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('code', 'LIKE', '%' . $search . '%') ->orwhere('name', 'LIKE', '%' . $search . '%') ->orwhere('vehicle_model', 'LIKE', '%' . $search . '%') ->orwhere('part_type', 'LIKE', '%' . $search . '%');
            });
        }

        $items = $query->paginate($perPage);
        return $this->sendResponse($items, 'CustomerItem list retrieved successfully.');
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'customer_id' => 'required|uuid|exists:customers,id',
            'code' => 'required|string|max:50|unique:customer_items,code',
            'name' => 'required|string|max:255',
            'vehicle_model' => 'nullable|string|max:100',
            'part_type' => 'nullable|string|max:100',
            'size' => 'nullable|string|max:50',
            'item_value' => 'nullable|numeric|min:0',
            'uom_id' => 'nullable|uuid|exists:uoms,id',
            'is_active' => 'boolean',
        ]);

        if ($validator->fails()) {
            return $this->sendError('Validation Error.', $validator->errors(), 422);
        }

        $item = CustomerItem::create($validator->validated());
        return $this->sendResponse($item, 'CustomerItem created successfully.', 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id): JsonResponse
    {
        $item = CustomerItem::with(['customer', 'uom'])->find($id);

        if (!$item) {
            return $this->sendError('CustomerItem not found.', [], 404);
        }

        return $this->sendResponse($item, 'CustomerItem retrieved successfully.');
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $item = CustomerItem::find($id);

        if (!$item) {
            return $this->sendError('CustomerItem not found.', [], 404);
        }

        $validator = Validator::make($request->all(), [
            'customer_id' => 'sometimes|required|uuid|exists:customers,id',
            'code' => 'sometimes|required|string|max:50|unique:customer_items,code,' . $id,
            'name' => 'sometimes|required|string|max:255',
            'vehicle_model' => 'nullable|string|max:100',
            'part_type' => 'nullable|string|max:100',
            'size' => 'nullable|string|max:50',
            'item_value' => 'nullable|numeric|min:0',
            'uom_id' => 'nullable|uuid|exists:uoms,id',
            'is_active' => 'boolean',
        ]);

        if ($validator->fails()) {
            return $this->sendError('Validation Error.', $validator->errors(), 422);
        }

        $item->update($validator->validated());
        return $this->sendResponse($item, 'CustomerItem updated successfully.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id): JsonResponse
    {
        $item = CustomerItem::find($id);

        if (!$item) {
            return $this->sendError('CustomerItem not found.', [], 404);
        }


        $item->delete();
        return $this->sendResponse(null, 'CustomerItem deleted successfully.');
    }
}
