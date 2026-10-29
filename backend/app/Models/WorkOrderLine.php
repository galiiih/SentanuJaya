<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class WorkOrderLine extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'work_order_id',
        'goods_receipt_line_id',
        'customer_item_id',
        'color_specification',
        'treatment_type',
        'quantity',
        'quantity_completed',
        'quantity_rejected',
        'notes',
    ];

    protected $casts = [
        'quantity' => 'decimal:3',
        'quantity_completed' => 'decimal:3',
        'quantity_rejected' => 'decimal:3',
    ];

    public function workOrder()
    {
        return $this->belongsTo(WorkOrder::class);
    }

    public function goodsReceiptLine()
    {
        return $this->belongsTo(GoodsReceiptLine::class);
    }

    public function customerItem()
    {
        return $this->belongsTo(CustomerItem::class);
    }

    public function stageMovements()
    {
        return $this->hasMany(ProductionStageMovement::class);
    }

    public function qcInspections()
    {
        return $this->hasMany(InternalQcInspection::class);
    }
}
