<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class GoodsReceiptLine extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'goods_receipt_id',
        'customer_item_id',
        'color_code',
        'quantity_received',
        'condition',
        'damage_description',
        'custody_location_id',
        'photo_path',
    ];

    public function goodsReceipt()
    {
        return $this->belongsTo(GoodsReceipt::class);
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
