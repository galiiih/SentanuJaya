<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class CustomerItem extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'customer_id',
        'code',
        'name',
        'vehicle_model',
        'part_type',
        'size',
        'item_value',
        'uom_id',
        'is_active',
    ];

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    public function uom()
    {
        return $this->belongsTo(Uom::class);
    }
}
