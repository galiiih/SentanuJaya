<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class Branch extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = ['company_id', 'code', 'name', 'address', 'is_active'];

    protected $casts = ['is_active' => 'boolean'];

    public function company()
    {
        return $this->belongsTo(Company::class);
    }

    public function workers()
    {
        return $this->hasMany(Worker::class);
    }

    public function custodyLocations()
    {
        return $this->hasMany(CustodyLocation::class);
    }

    public function goodsReceipts()
    {
        return $this->hasMany(GoodsReceipt::class);
    }

    public function warehouses()
    {
        return $this->hasMany(Warehouse::class);
    }

    public function deliveryOrders()
    {
        return $this->hasMany(DeliveryOrder::class);
    }

    public function invoices()
    {
        return $this->hasMany(Invoice::class);
    }
}
