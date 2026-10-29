<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\BaseApiController;
use App\Models\Warehouse;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;

class WarehouseController extends BaseApiController
{
    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()?->hasPermission('master.view'), 403, 'Forbidden');
        $warehouses = Warehouse::with('branch')->get();
        return $this->sendResponse($warehouses, 'Warehouses retrieved successfully.');
    }

    public function store(Request $request): JsonResponse
    {
        abort_unless($request->user()?->hasPermission('master.manage'), 403, 'Forbidden');
        $validator = Validator::make($request->all(), [
            'branch_id' => 'required|uuid|exists:branches,id',
            'code' => 'required|string|max:50',
            'name' => 'required|string|max:255',
            'is_active' => 'boolean',
        ]);

        if ($validator->fails()) {
            return $this->sendError('Validation Error.', $validator->errors(), 422);
        }

        $warehouse = Warehouse::create($validator->validated());
        return $this->sendResponse($warehouse, 'Warehouse created successfully.', 201);
    }

    public function show(string $id): JsonResponse
    {
        abort_unless(request()->user()?->hasPermission('master.view'), 403, 'Forbidden');
        $warehouse = Warehouse::with('branch')->find($id);
        if (!$warehouse) {
            return $this->sendError('Warehouse not found.', [], 404);
        }
        return $this->sendResponse($warehouse, 'Warehouse retrieved successfully.');
    }
}
