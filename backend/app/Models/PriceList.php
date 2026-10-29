<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class PriceList extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'company_id',
        'customer_id',
        'code',
        'name',
        'effective_date',
        'expiry_date',
        'is_active',
    ];

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    public function lines()
    {
        return $this->hasMany(PriceListLine::class);
    }
}
