<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Stock extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'warehouse_id',
        'material_id',
        'quantity_on_hand',
        'average_unit_cost',
        'total_value',
        'last_movement_at',
    ];

    protected $casts = [
        'quantity_on_hand' => 'decimal:3',
        'average_unit_cost' => 'decimal:2',
        'total_value' => 'decimal:2',
        'last_movement_at' => 'datetime',
    ];

    public function warehouse()
    {
        return $this->belongsTo(Warehouse::class);
    }

    public function material()
    {
        return $this->belongsTo(Material::class);
    }
}
