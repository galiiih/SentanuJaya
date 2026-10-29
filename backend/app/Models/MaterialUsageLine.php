<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MaterialUsageLine extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'material_usage_id',
        'material_id',
        'batch_id',
        'quantity',
        'uom_id',
        'unit_cost_snapshot',
    ];

    protected $casts = [
        'quantity' => 'decimal:3',
        'unit_cost_snapshot' => 'decimal:2',
    ];

    public function materialUsage()
    {
        return $this->belongsTo(MaterialUsage::class);
    }

    public function material()
    {
        return $this->belongsTo(Material::class);
    }

    public function batch()
    {
        return $this->belongsTo(MaterialBatch::class, 'batch_id');
    }

    public function uom()
    {
        return $this->belongsTo(Uom::class);
    }
}
