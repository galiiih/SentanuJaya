<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class NanuKnowledgeAuditLog extends Model
{
    use HasUuids;

    public $timestamps = false;
    protected $table = 'nanu_knowledge_audit_logs';
    protected $fillable = ['actor_id', 'entity_type', 'entity_id', 'action', 'before_state', 'after_state', 'created_at'];

    protected function casts(): array
    {
        return ['before_state' => 'array', 'after_state' => 'array', 'created_at' => 'datetime'];
    }

    public function actor(): BelongsTo { return $this->belongsTo(User::class, 'actor_id'); }
}
