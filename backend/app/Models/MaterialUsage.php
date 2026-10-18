<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MaterialUsage extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'company_id',
        'warehouse_id',
        'usage_number',
        'usage_date',
        'reference_type',
        'reference_id',
        'status',
        'notes',
        'created_by',
        'posted_by',
        'posted_at',
    ];

    protected $casts = [
        'usage_date' => 'date',
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

    public function lines()
    {
        return $this->hasMany(MaterialUsageLine::class);
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
