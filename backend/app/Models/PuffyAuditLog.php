<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class PuffyAuditLog extends Model
{
    use HasUuids;

    protected $table = 'puffy_audit_logs';

    protected $fillable = [
        'user_id',
        'action',
        'details',
        'ip_address',
    ];

    protected $casts = [
        'details' => 'array',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
