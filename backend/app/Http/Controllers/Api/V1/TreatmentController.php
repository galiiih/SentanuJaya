<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\BaseApiController;
use App\Models\Treatment;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;

class TreatmentController extends BaseApiController
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): JsonResponse
    {
        $perPage = (int) $request->input('per_page', 20);
        $query = Treatment::query();

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('code', 'LIKE', '%' . $search . '%') ->orwhere('name', 'LIKE', '%' . $search . '%') ->orwhere('category', 'LIKE', '%' . $search . '%');
            });
        }

        $items = $query->paginate($perPage);
        return $this->sendResponse($items, 'Treatment list retrieved successfully.');
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'code' => 'required|string|max:50|unique:treatments,code',
            'name' => 'required|string|max:255',
            'category' => 'required|string|max:50',
            'description' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        if ($validator->fails()) {
            return $this->sendError('Validation Error.', $validator->errors(), 422);
        }

        $item = Treatment::create($validator->validated());
        return $this->sendResponse($item, 'Treatment created successfully.', 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id): JsonResponse
    {
        $item = Treatment::find($id);

        if (!$item) {
            return $this->sendError('Treatment not found.', [], 404);
        }

        return $this->sendResponse($item, 'Treatment retrieved successfully.');
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $item = Treatment::find($id);

        if (!$item) {
            return $this->sendError('Treatment not found.', [], 404);
        }

        $validator = Validator::make($request->all(), [
            'code' => 'sometimes|required|string|max:50|unique:treatments,code,' . $id,
            'name' => 'sometimes|required|string|max:255',
            'category' => 'sometimes|required|string|max:50',
            'description' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        if ($validator->fails()) {
            return $this->sendError('Validation Error.', $validator->errors(), 422);
        }

        $item->update($validator->validated());
        return $this->sendResponse($item, 'Treatment updated successfully.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id): JsonResponse
    {
        $item = Treatment::find($id);

        if (!$item) {
            return $this->sendError('Treatment not found.', [], 404);
        }


        $item->delete();
        return $this->sendResponse(null, 'Treatment deleted successfully.');
    }
}
