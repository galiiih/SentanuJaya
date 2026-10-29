<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class Acceptance extends Model
{
    use HasUuids;

    protected $fillable = [
        'delivery_order_id', 'acceptance_number',
        'acceptance_date', 'status', 'notes', 'evidence_reference',
        'created_by',
    ];

    protected $casts = [
        'acceptance_date' => 'date',
    ];

    // Lifecycle: DRAFT → SUBMITTED → POSTED; DRAFT → CANCELLED
    public const STATUS_DRAFT = 'DRAFT';
    public const STATUS_SUBMITTED = 'SUBMITTED';
    public const STATUS_POSTED = 'POSTED';
    public const STATUS_CANCELLED = 'CANCELLED';

    public function deliveryOrder()
    {
        return $this->belongsTo(DeliveryOrder::class);
    }

    public function lines()
    {
        return $this->hasMany(AcceptanceLine::class);
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
