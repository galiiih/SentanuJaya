<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class CustodyLedger extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'custody_ledger';

    public $timestamps = false;

    protected $fillable = [
        'customer_id',
        'customer_item_id',
        'reference_type',
        'reference_id',
        'movement_type',
        'quantity_in',
        'quantity_out',
        'custody_location_id',
        'stage',
        'movement_date',
        'created_by',
        'notes',
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

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
