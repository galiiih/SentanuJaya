<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class PriceListLine extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'price_list_id',
        'customer_item_id',
        'color_code',
        'treatment_type',
        'size',
        'unit_price',
        'minimum_charge',
        'discount_percent',
        'is_active',
    ];

    public function priceList()
    {
        return $this->belongsTo(PriceList::class);
    }

    public function customerItem()
    {
        return $this->belongsTo(CustomerItem::class);
    }
}
