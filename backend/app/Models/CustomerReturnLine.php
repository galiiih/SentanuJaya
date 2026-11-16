<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class CustomerReturnLine extends Model
{
    use HasUuids;

    protected $fillable = ['customer_return_id', 'delivery_order_line_id', 'quantity', 'reason', 'notes'];

    public function customerReturn() { return $this->belongsTo(CustomerReturn::class); }
    public function deliveryOrderLine() { return $this->belongsTo(DeliveryOrderLine::class); }
}
