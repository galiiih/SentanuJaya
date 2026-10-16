<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class DeliveryOrderLine extends Model
{
    use HasUuids;

    protected $fillable = [
        'delivery_order_id', 'customer_po_line_id', 'customer_item_id', 'color_code',
        'quantity', 'unit_price', 'unit_price_snapshot', 'qty_accepted', 'qty_rejected', 'qty_invoiced', 'notes',
    ];

    public function deliveryOrder()
    {
        return $this->belongsTo(DeliveryOrder::class);
    }

    public function customerPoLine()
    {
        return $this->belongsTo(CustomerPoLine::class);
    }

    public function customerItem()
    {
        return $this->belongsTo(CustomerItem::class);
    }

    public function acceptanceLines()
    {
        return $this->hasMany(AcceptanceLine::class);
    }
}
