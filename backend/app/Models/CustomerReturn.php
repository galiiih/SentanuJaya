<?php

namespace App\\Models;

use Illuminate\\Database\\Eloquent\\Model;
use Illuminate\\Database\\Eloquent\\Concerns\\HasUuids;

class CustomerReturn extends Model
{
    use HasUuids;

    protected $fillable = [
        'company_id', 'delivery_order_id', 'customer_id', 'return_number',
        'return_date', 'status', 'notes', 'created_by', 'posted_by', 'posted_at',
    ];

    protected $casts = ['return_date' => 'date', 'posted_at' => 'datetime'];

    public function deliveryOrder() { return $this->belongsTo(DeliveryOrder::class); }
    public function customer() { return $this->belongsTo(Customer::class); }
    public function lines() { return $this->hasMany(CustomerReturnLine::class); }
}
