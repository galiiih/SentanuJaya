<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class WorkOrder extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'company_id',
        'branch_id',
        'wo_number',
        'customer_id',
        'goods_receipt_id',
        'order_date',
        'target_date',
        'status',
        'notes',
        'created_by',
        'posted_by',
        'posted_at',
    ];

    protected $casts = [
        'order_date' => 'date',
        'target_date' => 'date',
        'posted_at' => 'datetime',
    ];

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

    public function goodsReceipt()
    {
        return $this->belongsTo(GoodsReceipt::class);
    }

    public function lines()
    {
        return $this->hasMany(WorkOrderLine::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function poster()
    {
        return $this->belongsTo(User::class, 'posted_by');
    }

    public function materialUsages()
    {
        return $this->hasMany(MaterialUsage::class, 'work_order_id');
    }
}
