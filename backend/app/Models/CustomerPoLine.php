<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class CustomerPoLine extends Model
{
    use HasUuids;

    protected $fillable = [
        'customer_po_id', 'customer_item_id', 'color_code',
        'quantity', 'unit_price', 'notes',
    ];

    protected $appends = ['fulfilled_quantity', 'remaining_quantity'];

    public function customerPo()
    {
        return $this->belongsTo(CustomerPo::class);
    }

    public function customerItem()
    {
        return $this->belongsTo(CustomerItem::class);
    }

    public function deliveryOrderLines()
    {
        return $this->hasMany(DeliveryOrderLine::class, 'customer_po_line_id');
    }

    public function getFulfilledQuantityAttribute(): float
    {
        // Sum quantity from active (non-CANCELLED) Delivery Orders
        $directSum = (float) DeliveryOrderLine::where('customer_po_line_id', $this->id)
            ->whereHas('deliveryOrder', function ($query) {
                $query->where('status', '!=', 'CANCELLED');
            })
            ->sum('quantity');

        if ($directSum > 0) {
            return $directSum;
        }

        // Fallback for legacy DOs matching PO + item
        return (float) DeliveryOrderLine::whereHas('deliveryOrder', function ($query) {
            $query->where('customer_po_id', $this->customer_po_id)
                ->where('status', '!=', 'CANCELLED');
        })
        ->where('customer_item_id', $this->customer_item_id)
        ->sum('quantity');
    }

    public function getRemainingQuantityAttribute(): float
    {
        return max(0, (float) $this->quantity - $this->fulfilled_quantity);
    }
}
