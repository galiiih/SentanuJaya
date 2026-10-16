<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class Uom extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'uoms';

    protected $fillable = [
        'code',
        'name',
        'category',
        'decimal_places',
        'is_active',
    ];

    public function customerItems()
    {
        return $this->hasMany(CustomerItem::class, 'uom_id');
    }

    public function purchaseMaterials()
    {
        return $this->hasMany(Material::class, 'purchase_uom_id');
    }

    public function stockMaterials()
    {
        return $this->hasMany(Material::class, 'stock_uom_id');
    }
}
