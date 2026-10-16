<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class InvoiceLine extends Model
{
    use HasUuids;

    protected $fillable = [
        'invoice_id', 'delivery_order_line_id', 'customer_item_id', 'description',
        'quantity', 'unit_price', 'unit_price_snapshot', 'subtotal', 'line_total',
    ];

    protected $casts = [
        'unit_price' => 'decimal:4',
        'line_total' => 'decimal:2',
    ];

    public function invoice()
    {
        return $this->belongsTo(Invoice::class);
    }

    public function customerItem()
    {
        return $this->belongsTo(CustomerItem::class);
    }

    public function deliveryOrderLine()
    {
        return $this->belongsTo(DeliveryOrderLine::class);
    }
}
