<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class PuffyPendingAction extends Model
{
    use HasUuids;

    protected $table = 'puffy_pending_actions';

    protected $fillable = [
        'user_id',
        'action_type',
        'payload',
        'status',
        'expires_at',
        'executed_at',
    ];

    protected $casts = [
        'payload' => 'array',
        'expires_at' => 'datetime',
        'executed_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
