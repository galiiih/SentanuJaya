<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class GoodsReceipt extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'company_id',
        'branch_id',
        'stb_number',
        'customer_id',
        'received_date',
        'received_time',
        'delivered_by_name',
        'vehicle_plate',
        'status',
        'notes',
        'created_by',
        'posted_by',
        'posted_at',
    ];

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    public function lines()
    {
        return $this->hasMany(GoodsReceiptLine::class);
    }

    public function company()
    {
        return $this->belongsTo(Company::class);
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function postedBy()
    {
        return $this->belongsTo(User::class, 'posted_by');
    }
}
