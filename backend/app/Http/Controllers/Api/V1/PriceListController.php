<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\BaseApiController;
use App\Models\PriceList;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;

class PriceListController extends BaseApiController
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): JsonResponse
    {
        $perPage = (int) $request->input('per_page', 20);
        $query = PriceList::query()->with(['customer', 'lines']);

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('code', 'LIKE', '%' . $search . '%') ->orwhere('name', 'LIKE', '%' . $search . '%');
            });
        }

        $items = $query->paginate($perPage);
        return $this->sendResponse($items, 'PriceList list retrieved successfully.');
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'company_id' => 'required|uuid|exists:companies,id',
            'customer_id' => 'nullable|uuid|exists:customers,id',
            'code' => 'required|string|max:50|unique:price_lists,code',
            'name' => 'required|string|max:255',
            'effective_date' => 'required|date',
            'expiry_date' => 'nullable|date|after_or_equal:effective_date',
            'is_active' => 'boolean',
        ]);

        if ($validator->fails()) {
            return $this->sendError('Validation Error.', $validator->errors(), 422);
        }

        $item = PriceList::create($validator->validated());
        return $this->sendResponse($item, 'PriceList created successfully.', 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id): JsonResponse
    {
        $item = PriceList::with(['customer', 'lines'])->find($id);

        if (!$item) {
            return $this->sendError('PriceList not found.', [], 404);
        }

        return $this->sendResponse($item, 'PriceList retrieved successfully.');
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $item = PriceList::find($id);

        if (!$item) {
            return $this->sendError('PriceList not found.', [], 404);
        }

        $validator = Validator::make($request->all(), [
            'company_id' => 'sometimes|required|uuid|exists:companies,id',
            'customer_id' => 'nullable|uuid|exists:customers,id',
            'code' => 'sometimes|required|string|max:50|unique:price_lists,code,' . $id,
            'name' => 'sometimes|required|string|max:255',
            'effective_date' => 'sometimes|required|date',
            'expiry_date' => 'nullable|date|after_or_equal:effective_date',
            'is_active' => 'boolean',
        ]);

        if ($validator->fails()) {
            return $this->sendError('Validation Error.', $validator->errors(), 422);
        }

        $item->update($validator->validated());
        return $this->sendResponse($item, 'PriceList updated successfully.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id): JsonResponse
    {
        $item = PriceList::find($id);

        if (!$item) {
            return $this->sendError('PriceList not found.', [], 404);
        }

        if ($item->lines()->exists()) {
            return $this->sendError('Cannot delete price list with existing lines.', [], 409);
        }

        $item->delete();
        return $this->sendResponse(null, 'PriceList deleted successfully.');
    }
}
