<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\BaseApiController;
use App\Models\Customer;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;

class CustomerController extends BaseApiController
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): JsonResponse
    {
        $perPage = (int) $request->input('per_page', 20);
        $query = Customer::query()->with(['contacts', 'items', 'priceLists']);

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('code', 'LIKE', '%' . $search . '%') ->orwhere('name', 'LIKE', '%' . $search . '%') ->orwhere('company_name', 'LIKE', '%' . $search . '%') ->orwhere('npwp', 'LIKE', '%' . $search . '%') ->orwhere('phone', 'LIKE', '%' . $search . '%') ->orwhere('email', 'LIKE', '%' . $search . '%');
            });
        }

        $items = $query->paginate($perPage);
        return $this->sendResponse($items, 'Customer list retrieved successfully.');
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): JsonResponse
    {
        abort_unless($request->user()?->hasPermission('master.manage'), 403, 'Forbidden');
        $validator = Validator::make($request->all(), [
            'company_id' => 'nullable|uuid|exists:companies,id',
            'code' => 'required|string|max:50|unique:customers,code',
            'name' => 'required|string|max:255',
            'company_name' => 'nullable|string|max:255',
            'billing_address' => 'nullable|string',
            'shipping_address' => 'nullable|string',
            'npwp' => 'nullable|string|max:50',
            'tax_condition' => 'nullable|integer|in:1,2,3',
            'default_tax_rule_id' => 'nullable|uuid',
            'payment_terms_days' => 'integer|min:0',
            'credit_limit' => 'numeric|min:0',
            'phone' => 'nullable|string|max:50',
            'email' => 'nullable|email|max:255',
            'is_active' => 'boolean',
        ]);

        if ($validator->fails()) {
            return $this->sendError('Validation Error.', $validator->errors(), 422);
        }

        $item = Customer::create($validator->validated());
        return $this->sendResponse($item, 'Customer created successfully.', 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id): JsonResponse
    {
        $item = Customer::with(['contacts', 'items', 'priceLists'])->find($id);

        if (!$item) {
            return $this->sendError('Customer not found.', [], 404);
        }

        return $this->sendResponse($item, 'Customer retrieved successfully.');
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        abort_unless($request->user()?->hasPermission('master.manage'), 403, 'Forbidden');
        $item = Customer::find($id);

        if (!$item) {
            return $this->sendError('Customer not found.', [], 404);
        }

        $validator = Validator::make($request->all(), [
            'company_id' => 'sometimes|required|uuid|exists:companies,id',
            'code' => 'sometimes|required|string|max:50|unique:customers,code,' . $id,
            'name' => 'sometimes|required|string|max:255',
            'company_name' => 'nullable|string|max:255',
            'billing_address' => 'nullable|string',
            'shipping_address' => 'nullable|string',
            'npwp' => 'nullable|string|max:50',
            'tax_condition' => 'sometimes|nullable|integer|in:1,2,3',
            'default_tax_rule_id' => 'nullable|uuid',
            'payment_terms_days' => 'sometimes|integer|min:0',
            'credit_limit' => 'sometimes|numeric|min:0',
            'phone' => 'nullable|string|max:50',
            'email' => 'nullable|email|max:255',
            'is_active' => 'boolean',
        ]);

        if ($validator->fails()) {
            return $this->sendError('Validation Error.', $validator->errors(), 422);
        }

        $item->update($validator->validated());
        return $this->sendResponse($item, 'Customer updated successfully.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id): JsonResponse
    {
        abort_unless(request()->user()?->hasPermission('master.manage'), 403, 'Forbidden');
        $item = Customer::find($id);

        if (!$item) {
            return $this->sendError('Customer not found.', [], 404);
        }

        if ($item->contacts()->exists()) {
            return $this->sendError('Cannot delete customer with assigned contacts.', [], 409);
        }
        if ($item->items()->exists()) {
            return $this->sendError('Cannot delete customer with assigned customer items.', [], 409);
        }
        if ($item->priceLists()->exists()) {
            return $this->sendError('Cannot delete customer with assigned price lists.', [], 409);
        }

        $item->delete();
        return $this->sendResponse(null, 'Customer deleted successfully.');
    }
}
