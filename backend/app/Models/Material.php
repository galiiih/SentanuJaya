<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class Material extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'company_id',
        'code',
        'name',
        'category',
        'unit',
        'minimum_stock',
        'reorder_level',
        'is_batch_tracked',
        'purchase_uom_id',
        'stock_uom_id',
        'is_active',
    ];

    public function company()
    {
        return $this->belongsTo(Company::class);
    }

    public function purchaseUom()
    {
        return $this->belongsTo(Uom::class, 'purchase_uom_id');
    }

    public function stockUom()
    {
        return $this->belongsTo(Uom::class, 'stock_uom_id');
    }
}
