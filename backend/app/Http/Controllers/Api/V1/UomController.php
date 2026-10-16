<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\BaseApiController;
use App\Models\Uom;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;

class UomController extends BaseApiController
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): JsonResponse
    {
        $perPage = (int) $request->input('per_page', 20);
        $query = Uom::query();

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('code', 'LIKE', '%' . $search . '%') ->orwhere('name', 'LIKE', '%' . $search . '%') ->orwhere('category', 'LIKE', '%' . $search . '%');
            });
        }

        $items = $query->paginate($perPage);
        return $this->sendResponse($items, 'Uom list retrieved successfully.');
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): JsonResponse
    {
        abort_unless($request->user()?->hasPermission('master.manage'), 403, 'Forbidden');
        $validator = Validator::make($request->all(), [
            'code' => 'required|string|max:50|unique:uoms,code',
            'name' => 'required|string|max:255',
            'category' => 'required|string|max:50',
            'decimal_places' => 'integer|min:0|max:6',
            'is_active' => 'boolean',
        ]);

        if ($validator->fails()) {
            return $this->sendError('Validation Error.', $validator->errors(), 422);
        }

        $item = Uom::create($validator->validated());
        return $this->sendResponse($item, 'Uom created successfully.', 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id): JsonResponse
    {
        $item = Uom::find($id);

        if (!$item) {
            return $this->sendError('Uom not found.', [], 404);
        }

        return $this->sendResponse($item, 'Uom retrieved successfully.');
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        abort_unless($request->user()?->hasPermission('master.manage'), 403, 'Forbidden');
        $item = Uom::find($id);

        if (!$item) {
            return $this->sendError('Uom not found.', [], 404);
        }

        $validator = Validator::make($request->all(), [
            'code' => 'sometimes|required|string|max:50|unique:uoms,code,' . $id,
            'name' => 'sometimes|required|string|max:255',
            'category' => 'sometimes|required|string|max:50',
            'decimal_places' => 'sometimes|integer|min:0|max:6',
            'is_active' => 'boolean',
        ]);

        if ($validator->fails()) {
            return $this->sendError('Validation Error.', $validator->errors(), 422);
        }

        $item->update($validator->validated());
        return $this->sendResponse($item, 'Uom updated successfully.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id): JsonResponse
    {
        abort_unless(request()->user()?->hasPermission('master.manage'), 403, 'Forbidden');
        $item = Uom::find($id);

        if (!$item) {
            return $this->sendError('Uom not found.', [], 404);
        }

        if ($item->customerItems()->exists()) {
            return $this->sendError('Cannot delete UOM because it is assigned to customer items.', [], 409);
        }
        if ($item->purchaseMaterials()->exists()) {
            return $this->sendError('Cannot delete UOM because it is assigned to material purchase units.', [], 409);
        }
        if ($item->stockMaterials()->exists()) {
            return $this->sendError('Cannot delete UOM because it is assigned to material stock units.', [], 409);
        }

        $item->delete();
        return $this->sendResponse(null, 'Uom deleted successfully.');
    }
}
