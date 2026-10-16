<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateGoodsReceiptRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'received_date' => ['sometimes', 'date'],
            'received_time' => ['nullable', 'date_format:H:i:s'],
            'delivered_by_name' => ['nullable', 'string', 'max:255'],
            'vehicle_plate' => ['nullable', 'string', 'max:30'],
            'notes' => ['nullable', 'string'],
            'lines' => ['sometimes', 'array', 'min:1'],
            'lines.*.id' => ['required_with:lines', 'uuid'],
            'lines.*.quantity_received' => ['sometimes', 'numeric', 'gt:0'],
            'lines.*.condition' => ['sometimes', 'string', Rule::in(['GOOD', 'DENT', 'CRACK', 'OLD_PAINT', 'OTHER'])],
            'lines.*.color_code' => ['nullable', 'string', 'max:100'],
            'lines.*.damage_description' => ['nullable', 'string'],
            'lines.*.custody_location_id' => ['sometimes', 'uuid', 'exists:custody_locations,id'],
            'lines.*.photo_path' => ['nullable', 'string', 'max:500'],
        ];
    }
}
