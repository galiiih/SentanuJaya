<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MaterialBatch extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'material_id',
        'batch_number',
        'received_date',
        'expiry_date',
        'quantity_received',
        'quantity_remaining',
        'unit_cost',
        'status',
    ];

    protected $casts = [
        'received_date' => 'date',
        'expiry_date' => 'date',
        'quantity_received' => 'decimal:3',
        'quantity_remaining' => 'decimal:3',
        'unit_cost' => 'decimal:2',
    ];

    public function material()
    {
        return $this->belongsTo(Material::class);
    }
}
