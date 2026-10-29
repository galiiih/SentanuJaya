<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\BaseApiController;
use App\Models\Supplier;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;

class SupplierController extends BaseApiController
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): JsonResponse
    {
        $perPage = (int) $request->input('per_page', 20);
        $query = Supplier::query()->with(['company']);

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('code', 'LIKE', '%' . $search . '%') ->orwhere('name', 'LIKE', '%' . $search . '%') ->orwhere('npwp', 'LIKE', '%' . $search . '%') ->orwhere('phone', 'LIKE', '%' . $search . '%') ->orwhere('email', 'LIKE', '%' . $search . '%');
            });
        }

        $items = $query->paginate($perPage);
        return $this->sendResponse($items, 'Supplier list retrieved successfully.');
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): JsonResponse
    {
        abort_unless($request->user()?->hasPermission('master.manage'), 403, 'Forbidden');
        
        $defaultCompany = \App\Models\Company::query()->first();
        if ($defaultCompany) {
            $request->merge(['company_id' => $defaultCompany->id]);
        }

        $validator = Validator::make($request->all(), [
            'company_id' => 'required|uuid|exists:companies,id',
            'code' => 'required|string|max:50|unique:suppliers,code',
            'name' => 'required|string|max:255',
            'address' => 'nullable|string',
            'npwp' => 'nullable|string|max:50',
            'phone' => 'nullable|string|max:50',
            'email' => 'nullable|email|max:255',
            'payment_terms_days' => 'nullable|integer|min:0',
            'is_active' => 'boolean',
        ]);

        if ($validator->fails()) {
            return $this->sendError('Validation Error.', $validator->errors(), 422);
        }

        $item = Supplier::create($validator->validated());
        return $this->sendResponse($item, 'Supplier created successfully.', 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id): JsonResponse
    {
        $item = Supplier::with(['company'])->find($id);

        if (!$item) {
            return $this->sendError('Supplier not found.', [], 404);
        }

        return $this->sendResponse($item, 'Supplier retrieved successfully.');
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        abort_unless($request->user()?->hasPermission('master.manage'), 403, 'Forbidden');
        $item = Supplier::find($id);

        if (!$item) {
            return $this->sendError('Supplier not found.', [], 404);
        }

        $validator = Validator::make($request->all(), [
            'company_id' => 'sometimes|required|uuid|exists:companies,id',
            'code' => 'sometimes|required|string|max:50|unique:suppliers,code,' . $id,
            'name' => 'sometimes|required|string|max:255',
            'address' => 'nullable|string',
            'npwp' => 'nullable|string|max:50',
            'phone' => 'nullable|string|max:50',
            'email' => 'nullable|email|max:255',
            'payment_terms_days' => 'sometimes|integer|min:0',
            'is_active' => 'boolean',
        ]);

        if ($validator->fails()) {
            return $this->sendError('Validation Error.', $validator->errors(), 422);
        }

        $item->update($validator->validated());
        return $this->sendResponse($item, 'Supplier updated successfully.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id): JsonResponse
    {
        abort_unless(request()->user()?->hasPermission('master.manage'), 403, 'Forbidden');
        $item = Supplier::find($id);

        if (!$item) {
            return $this->sendError('Supplier not found.', [], 404);
        }


        $item->delete();
        return $this->sendResponse(null, 'Supplier deleted successfully.');
    }
}
