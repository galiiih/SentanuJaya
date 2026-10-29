<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MaterialReceiptLine extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'material_receipt_id',
        'material_id',
        'batch_number',
        'expiry_date',
        'quantity',
        'uom_id',
        'unit_cost',
        'subtotal',
    ];

    protected $casts = [
        'expiry_date' => 'date',
        'quantity' => 'decimal:3',
        'unit_cost' => 'decimal:2',
        'subtotal' => 'decimal:2',
    ];

    public function materialReceipt()
    {
        return $this->belongsTo(MaterialReceipt::class);
    }

    public function material()
    {
        return $this->belongsTo(Material::class);
    }

    public function uom()
    {
        return $this->belongsTo(Uom::class);
    }
}
