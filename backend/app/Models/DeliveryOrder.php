<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class DeliveryOrder extends Model
{
    use HasUuids;

    protected $fillable = [
        'company_id', 'branch_id', 'sj_number', 'do_number', 'customer_id', 'customer_po_id',
        'customer_po_number', 'delivery_date', 'shipping_address',
        'driver_name', 'vehicle_plate', 'status', 'invoice_status', 'notes',
        'created_by',
    ];

    protected $casts = [
        'delivery_date' => 'date',
    ];

    // Lifecycle: DRAFT → SUBMITTED → DELIVERED → CLOSED; DRAFT → CANCELLED
    public const STATUS_DRAFT = 'DRAFT';
    public const STATUS_SUBMITTED = 'SUBMITTED';
    public const STATUS_DELIVERED = 'DELIVERED';
    public const STATUS_CLOSED = 'CLOSED';
    public const STATUS_CANCELLED = 'CANCELLED';

    public function company()
    {
        return $this->belongsTo(Company::class);
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    public function customerPo()
    {
        return $this->belongsTo(CustomerPo::class);
    }

    public function lines()
    {
        return $this->hasMany(DeliveryOrderLine::class);
    }

    public function acceptances()
    {
        return $this->hasMany(Acceptance::class);
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
