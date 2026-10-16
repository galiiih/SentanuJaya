<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\BaseApiController;
use App\Models\Branch;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;

class BranchController extends BaseApiController
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): JsonResponse
    {
        $perPage = (int) $request->input('per_page', 20);
        $query = Branch::query()->with(['company']);

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('code', 'LIKE', '%' . $search . '%') ->orwhere('name', 'LIKE', '%' . $search . '%');
            });
        }

        $items = $query->paginate($perPage);
        return $this->sendResponse($items, 'Branch list retrieved successfully.');
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'company_id' => 'required|uuid|exists:companies,id',
            'code' => 'required|string|max:50|unique:branches,code',
            'name' => 'required|string|max:255',
            'address' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        if ($validator->fails()) {
            return $this->sendError('Validation Error.', $validator->errors(), 422);
        }

        $item = Branch::create($validator->validated());
        return $this->sendResponse($item, 'Branch created successfully.', 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id): JsonResponse
    {
        $item = Branch::with(['company'])->find($id);

        if (!$item) {
            return $this->sendError('Branch not found.', [], 404);
        }

        return $this->sendResponse($item, 'Branch retrieved successfully.');
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $item = Branch::find($id);

        if (!$item) {
            return $this->sendError('Branch not found.', [], 404);
        }

        $validator = Validator::make($request->all(), [
            'company_id' => 'sometimes|required|uuid|exists:companies,id',
            'code' => 'sometimes|required|string|max:50|unique:branches,code,' . $id,
            'name' => 'sometimes|required|string|max:255',
            'address' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        if ($validator->fails()) {
            return $this->sendError('Validation Error.', $validator->errors(), 422);
        }

        $item->update($validator->validated());
        return $this->sendResponse($item, 'Branch updated successfully.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id): JsonResponse
    {
        $item = Branch::find($id);

        if (!$item) {
            return $this->sendError('Branch not found.', [], 404);
        }

        if ($item->workers()->exists()) {
            return $this->sendError('Cannot delete branch with assigned workers.', [], 409);
        }

        $item->delete();
        return $this->sendResponse(null, 'Branch deleted successfully.');
    }
}
