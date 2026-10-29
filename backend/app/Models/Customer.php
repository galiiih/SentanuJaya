<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class Customer extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'company_id',
        'code',
        'name',
        'company_name',
        'billing_address',
        'shipping_address',
        'npwp',
        'tax_condition',
        'default_tax_rule_id',
        'payment_terms_days',
        'credit_limit',
        'phone',
        'email',
        'is_active',
    ];

    public function contacts()
    {
        return $this->hasMany(CustomerContact::class);
    }

    public function items()
    {
        return $this->hasMany(CustomerItem::class);
    }

    public function priceLists()
    {
        return $this->hasMany(PriceList::class);
    }

    public function goodsReceipts()
    {
        return $this->hasMany(GoodsReceipt::class);
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
