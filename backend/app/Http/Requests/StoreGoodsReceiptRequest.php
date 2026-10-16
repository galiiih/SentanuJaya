<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreGoodsReceiptRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'company_id' => ['required', 'uuid', 'exists:companies,id'],
            'branch_id' => ['required', 'uuid', 'exists:branches,id'],
            'customer_id' => ['required', 'uuid', 'exists:customers,id'],
            'received_date' => ['required', 'date'],
            'received_time' => ['nullable', 'date_format:H:i:s'],
            'delivered_by_name' => ['nullable', 'string', 'max:255'],
            'vehicle_plate' => ['nullable', 'string', 'max:30'],
            'notes' => ['nullable', 'string'],
            'lines' => ['required', 'array', 'min:1'],
            'lines.*.customer_item_id' => ['required', 'uuid', 'exists:customer_items,id'],
            'lines.*.color_code' => ['nullable', 'string', 'max:100'],
            'lines.*.quantity_received' => ['required', 'numeric', 'gt:0'],
            'lines.*.condition' => ['required', 'string', Rule::in(['GOOD', 'DENT', 'CRACK', 'OLD_PAINT', 'OTHER'])],
            'lines.*.damage_description' => ['nullable', 'string'],
            'lines.*.custody_location_id' => ['required', 'uuid', 'exists:custody_locations,id'],
            'lines.*.photo_path' => ['nullable', 'string', 'max:500'],
        ];
    }
}
