<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class ProductionStageMovement extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'work_order_line_id',
        'from_status_id',
        'to_status_id',
        'quantity',
        'worker_id',
        'notes',
        'created_by',
        'moved_at',
    ];

    protected $casts = [
        'quantity' => 'decimal:3',
        'moved_at' => 'datetime',
    ];

    public function workOrderLine()
    {
        return $this->belongsTo(WorkOrderLine::class);
    }

    public function fromStatus()
    {
        return $this->belongsTo(ProductionStatus::class, 'from_status_id');
    }

    public function toStatus()
    {
        return $this->belongsTo(ProductionStatus::class, 'to_status_id');
    }

    public function worker()
    {
        return $this->belongsTo(Worker::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
