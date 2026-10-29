<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class InvoiceDeliveryLink extends Model
{
    use HasUuids;

    protected $fillable = [
        'invoice_id', 'delivery_order_id', 'amount_billed',
    ];

    protected $casts = [
        'amount_billed' => 'decimal:2',
    ];

    public function invoice()
    {
        return $this->belongsTo(Invoice::class);
    }

    public function deliveryOrder()
    {
        return $this->belongsTo(DeliveryOrder::class);
    }
}
