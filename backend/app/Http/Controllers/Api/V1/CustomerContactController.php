<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\BaseApiController;
use App\Models\CustomerContact;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;

class CustomerContactController extends BaseApiController
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): JsonResponse
    {
        $perPage = (int) $request->input('per_page', 20);
        $query = CustomerContact::query()->with(['customer']);

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'LIKE', '%' . $search . '%') ->orwhere('position', 'LIKE', '%' . $search . '%') ->orwhere('phone', 'LIKE', '%' . $search . '%') ->orwhere('email', 'LIKE', '%' . $search . '%');
            });
        }

        $items = $query->paginate($perPage);
        return $this->sendResponse($items, 'CustomerContact list retrieved successfully.');
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): JsonResponse
    {
        abort_unless($request->user()?->hasPermission('master.manage'), 403, 'Forbidden');
        $validator = Validator::make($request->all(), [
            'customer_id' => 'required|uuid|exists:customers,id',
            'name' => 'required|string|max:255',
            'position' => 'nullable|string|max:100',
            'phone' => 'nullable|string|max:50',
            'email' => 'nullable|email|max:255',
            'is_primary' => 'boolean',
            'is_active' => 'boolean',
        ]);

        if ($validator->fails()) {
            return $this->sendError('Validation Error.', $validator->errors(), 422);
        }

        $item = CustomerContact::create($validator->validated());
        return $this->sendResponse($item, 'CustomerContact created successfully.', 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id): JsonResponse
    {
        $item = CustomerContact::with(['customer'])->find($id);

        if (!$item) {
            return $this->sendError('CustomerContact not found.', [], 404);
        }

        return $this->sendResponse($item, 'CustomerContact retrieved successfully.');
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        abort_unless($request->user()?->hasPermission('master.manage'), 403, 'Forbidden');
        $item = CustomerContact::find($id);

        if (!$item) {
            return $this->sendError('CustomerContact not found.', [], 404);
        }

        $validator = Validator::make($request->all(), [
            'customer_id' => 'sometimes|required|uuid|exists:customers,id',
            'name' => 'sometimes|required|string|max:255',
            'position' => 'nullable|string|max:100',
            'phone' => 'nullable|string|max:50',
            'email' => 'nullable|email|max:255',
            'is_primary' => 'boolean',
            'is_active' => 'boolean',
        ]);

        if ($validator->fails()) {
            return $this->sendError('Validation Error.', $validator->errors(), 422);
        }

        $item->update($validator->validated());
        return $this->sendResponse($item, 'CustomerContact updated successfully.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id): JsonResponse
    {
        abort_unless(request()->user()?->hasPermission('master.manage'), 403, 'Forbidden');
        $item = CustomerContact::find($id);

        if (!$item) {
            return $this->sendError('CustomerContact not found.', [], 404);
        }


        $item->delete();
        return $this->sendResponse(null, 'CustomerContact deleted successfully.');
    }
}
