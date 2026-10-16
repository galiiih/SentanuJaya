<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class AcceptanceLine extends Model
{
    use HasUuids;

    protected $fillable = [
        'acceptance_id', 'delivery_order_line_id',
        'quantity_ok', 'quantity_rejected', 'reject_reason', 'notes',
    ];

    public function acceptance()
    {
        return $this->belongsTo(Acceptance::class);
    }

    public function deliveryOrderLine()
    {
        return $this->belongsTo(DeliveryOrderLine::class);
    }
}
