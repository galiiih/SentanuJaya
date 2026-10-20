<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class StockMovement extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'warehouse_id',
        'material_id',
        'batch_id',
        'movement_type',
        'reference_type',
        'reference_id',
        'quantity_in',
        'quantity_out',
        'unit_cost',
        'value_in',
        'value_out',
        'balance_qty_after',
        'balance_value_after',
        'movement_date',
        'created_by',
        'notes',
    ];

    protected $casts = [
        'quantity_in' => 'decimal:3',
        'quantity_out' => 'decimal:3',
        'unit_cost' => 'decimal:2',
        'value_in' => 'decimal:2',
        'value_out' => 'decimal:2',
        'balance_qty_after' => 'decimal:3',
        'balance_value_after' => 'decimal:2',
        'movement_date' => 'date',
    ];

    public function warehouse()
    {
        return $this->belongsTo(Warehouse::class);
    }

    public function material()
    {
        return $this->belongsTo(Material::class);
    }

    public function batch()
    {
        return $this->belongsTo(MaterialBatch::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
