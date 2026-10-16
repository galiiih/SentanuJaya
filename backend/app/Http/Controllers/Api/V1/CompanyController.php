<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\BaseApiController;
use App\Models\Company;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;

class CompanyController extends BaseApiController
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): JsonResponse
    {
        $perPage = (int) $request->input('per_page', 20);
        $query = Company::query()->with(['branches']);

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('code', 'LIKE', '%' . $search . '%') ->orwhere('name', 'LIKE', '%' . $search . '%') ->orwhere('legal_name', 'LIKE', '%' . $search . '%') ->orwhere('npwp', 'LIKE', '%' . $search . '%');
            });
        }

        $items = $query->paginate($perPage);
        return $this->sendResponse($items, 'Company list retrieved successfully.');
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'code' => 'required|string|max:50|unique:companies,code',
            'name' => 'required|string|max:255',
            'legal_name' => 'nullable|string|max:255',
            'npwp' => 'nullable|string|max:50',
            'is_pkp' => 'boolean',
            'pkp_date' => 'nullable|date',
            'address' => 'nullable|string',
            'phone' => 'nullable|string|max:50',
            'email' => 'nullable|email|max:255',
            'timezone' => 'string|max:50',
            'currency' => 'string|max:10',
            'system_start_date' => 'nullable|date',
        ]);

        if ($validator->fails()) {
            return $this->sendError('Validation Error.', $validator->errors(), 422);
        }

        $item = Company::create($validator->validated());
        return $this->sendResponse($item, 'Company created successfully.', 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id): JsonResponse
    {
        $item = Company::with(['branches'])->find($id);

        if (!$item) {
            return $this->sendError('Company not found.', [], 404);
        }

        return $this->sendResponse($item, 'Company retrieved successfully.');
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $item = Company::find($id);

        if (!$item) {
            return $this->sendError('Company not found.', [], 404);
        }

        $validator = Validator::make($request->all(), [
            'code' => 'sometimes|required|string|max:50|unique:companies,code,' . $id,
            'name' => 'sometimes|required|string|max:255',
            'legal_name' => 'nullable|string|max:255',
            'npwp' => 'nullable|string|max:50',
            'is_pkp' => 'boolean',
            'pkp_date' => 'nullable|date',
            'address' => 'nullable|string',
            'phone' => 'nullable|string|max:50',
            'email' => 'nullable|email|max:255',
            'timezone' => 'sometimes|string|max:50',
            'currency' => 'sometimes|string|max:10',
            'system_start_date' => 'nullable|date',
        ]);

        if ($validator->fails()) {
            return $this->sendError('Validation Error.', $validator->errors(), 422);
        }

        $item->update($validator->validated());
        return $this->sendResponse($item, 'Company updated successfully.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id): JsonResponse
    {
        $item = Company::find($id);

        if (!$item) {
            return $this->sendError('Company not found.', [], 404);
        }

        if ($item->branches()->exists()) {
            return $this->sendError('Cannot delete company with active branches.', [], 409);
        }

        $item->delete();
        return $this->sendResponse(null, 'Company deleted successfully.');
    }
}
