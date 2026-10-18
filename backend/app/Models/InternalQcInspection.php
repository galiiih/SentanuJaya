<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class InternalQcInspection extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'work_order_line_id',
        'quantity_inspected',
        'quantity_passed',
        'quantity_rejected',
        'result',
        'notes',
        'inspector_id',
        'inspected_at',
    ];

    protected $casts = [
        'quantity_inspected' => 'decimal:3',
        'quantity_passed' => 'decimal:3',
        'quantity_rejected' => 'decimal:3',
        'inspected_at' => 'datetime',
    ];

    public function workOrderLine()
    {
        return $this->belongsTo(WorkOrderLine::class);
    }

    public function inspector()
    {
        return $this->belongsTo(User::class, 'inspector_id');
    }
}
