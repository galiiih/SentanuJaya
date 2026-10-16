<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\BaseApiController;
use App\Models\Material;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;

class MaterialController extends BaseApiController
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): JsonResponse
    {
        $perPage = (int) $request->input('per_page', 20);
        $query = Material::query()->with(['company', 'purchaseUom', 'stockUom']);

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('code', 'LIKE', '%' . $search . '%') ->orwhere('name', 'LIKE', '%' . $search . '%') ->orwhere('category', 'LIKE', '%' . $search . '%');
            });
        }

        $items = $query->paginate($perPage);
        return $this->sendResponse($items, 'Material list retrieved successfully.');
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'company_id' => 'required|uuid|exists:companies,id',
            'code' => 'required|string|max:50|unique:materials,code',
            'name' => 'required|string|max:255',
            'category' => 'required|string|max:50',
            'unit' => 'required|string|max:50',
            'minimum_stock' => 'required|numeric|min:0',
            'reorder_level' => 'numeric|min:0',
            'is_batch_tracked' => 'boolean',
            'purchase_uom_id' => 'nullable|uuid|exists:uoms,id',
            'stock_uom_id' => 'nullable|uuid|exists:uoms,id',
            'is_active' => 'boolean',
        ]);

        if ($validator->fails()) {
            return $this->sendError('Validation Error.', $validator->errors(), 422);
        }

        $item = Material::create($validator->validated());
        return $this->sendResponse($item, 'Material created successfully.', 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id): JsonResponse
    {
        $item = Material::with(['company', 'purchaseUom', 'stockUom'])->find($id);

        if (!$item) {
            return $this->sendError('Material not found.', [], 404);
        }

        return $this->sendResponse($item, 'Material retrieved successfully.');
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $item = Material::find($id);

        if (!$item) {
            return $this->sendError('Material not found.', [], 404);
        }

        $validator = Validator::make($request->all(), [
            'company_id' => 'sometimes|required|uuid|exists:companies,id',
            'code' => 'sometimes|required|string|max:50|unique:materials,code,' . $id,
            'name' => 'sometimes|required|string|max:255',
            'category' => 'sometimes|required|string|max:50',
            'unit' => 'sometimes|required|string|max:50',
            'minimum_stock' => 'sometimes|required|numeric|min:0',
            'reorder_level' => 'sometimes|numeric|min:0',
            'is_batch_tracked' => 'boolean',
            'purchase_uom_id' => 'nullable|uuid|exists:uoms,id',
            'stock_uom_id' => 'nullable|uuid|exists:uoms,id',
            'is_active' => 'boolean',
        ]);

        if ($validator->fails()) {
            return $this->sendError('Validation Error.', $validator->errors(), 422);
        }

        $item->update($validator->validated());
        return $this->sendResponse($item, 'Material updated successfully.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id): JsonResponse
    {
        $item = Material::find($id);

        if (!$item) {
            return $this->sendError('Material not found.', [], 404);
        }


        $item->delete();
        return $this->sendResponse(null, 'Material deleted successfully.');
    }
}
