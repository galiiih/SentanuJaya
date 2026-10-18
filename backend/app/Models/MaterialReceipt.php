<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MaterialReceipt extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'company_id',
        'warehouse_id',
        'receipt_number',
        'supplier_id',
        'receipt_date',
        'reference_no',
        'status',
        'notes',
        'created_by',
        'posted_by',
        'posted_at',
    ];

    protected $casts = [
        'receipt_date' => 'date',
        'posted_at' => 'datetime',
    ];

    public function company()
    {
        return $this->belongsTo(Company::class);
    }

    public function warehouse()
    {
        return $this->belongsTo(Warehouse::class);
    }

    public function supplier()
    {
        return $this->belongsTo(Supplier::class);
    }

    public function lines()
    {
        return $this->hasMany(MaterialReceiptLine::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function poster()
    {
        return $this->belongsTo(User::class, 'posted_by');
    }
}
