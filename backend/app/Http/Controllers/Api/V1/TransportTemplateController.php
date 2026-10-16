<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\BaseApiController;
use App\Models\TransportTemplate;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;

class TransportTemplateController extends BaseApiController
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): JsonResponse
    {
        $perPage = (int) $request->input('per_page', 20);
        $query = TransportTemplate::query();

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'LIKE', '%' . $search . '%') ->orwhere('distance_range', 'LIKE', '%' . $search . '%');
            });
        }

        $items = $query->paginate($perPage);
        return $this->sendResponse($items, 'TransportTemplate list retrieved successfully.');
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): JsonResponse
    {
        abort_unless($request->user()?->hasPermission('master.manage'), 403, 'Forbidden');
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'distance_range' => 'nullable|string|max:100',
            'tarif' => 'required|numeric|min:0',
            'effective_date' => 'required|date',
            'expiry_date' => 'nullable|date|after_or_equal:effective_date',
            'notes' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        if ($validator->fails()) {
            return $this->sendError('Validation Error.', $validator->errors(), 422);
        }

        $item = TransportTemplate::create($validator->validated());
        return $this->sendResponse($item, 'TransportTemplate created successfully.', 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id): JsonResponse
    {
        $item = TransportTemplate::find($id);

        if (!$item) {
            return $this->sendError('TransportTemplate not found.', [], 404);
        }

        return $this->sendResponse($item, 'TransportTemplate retrieved successfully.');
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        abort_unless($request->user()?->hasPermission('master.manage'), 403, 'Forbidden');
        $item = TransportTemplate::find($id);

        if (!$item) {
            return $this->sendError('TransportTemplate not found.', [], 404);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:255',
            'distance_range' => 'nullable|string|max:100',
            'tarif' => 'sometimes|required|numeric|min:0',
            'effective_date' => 'sometimes|required|date',
            'expiry_date' => 'nullable|date|after_or_equal:effective_date',
            'notes' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        if ($validator->fails()) {
            return $this->sendError('Validation Error.', $validator->errors(), 422);
        }

        $item->update($validator->validated());
        return $this->sendResponse($item, 'TransportTemplate updated successfully.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id): JsonResponse
    {
        abort_unless(request()->user()?->hasPermission('master.manage'), 403, 'Forbidden');
        $item = TransportTemplate::find($id);

        if (!$item) {
            return $this->sendError('TransportTemplate not found.', [], 404);
        }


        $item->delete();
        return $this->sendResponse(null, 'TransportTemplate deleted successfully.');
    }
}
