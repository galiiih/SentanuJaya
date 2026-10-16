<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class CustodyBalance extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'custody_balances';

    protected $fillable = [
        'customer_id',
        'customer_item_id',
        'custody_location_id',
        'stage',
        'balance_quantity',
        'last_movement_at',
    ];

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    public function customerItem()
    {
        return $this->belongsTo(CustomerItem::class);
    }

    public function custodyLocation()
    {
        return $this->belongsTo(CustodyLocation::class, 'custody_location_id');
    }
}