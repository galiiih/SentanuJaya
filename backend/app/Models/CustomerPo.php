<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class CustomerPo extends Model
{
    use HasUuids;

    public const STATUS_DRAFT = 'DRAFT';
    public const STATUS_OPEN = 'OPEN';
    public const STATUS_CLOSED = 'CLOSED';
    public const STATUS_CANCELLED = 'CANCELLED';

    protected $fillable = [
        'company_id', 'customer_id', 'po_number', 'po_date',
        'expected_delivery_date', 'status', 'notes', 'created_by',
    ];

    public function company()
    {
        return $this->belongsTo(Company::class);
    }

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    public function lines()
    {
        return $this->hasMany(CustomerPoLine::class);
    }

    public function deliveryOrders()
    {
        return $this->hasMany(DeliveryOrder::class);
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
