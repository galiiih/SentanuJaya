<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class NanuKnowledgeCandidate extends Model
{
    use HasUuids;

    protected $table = 'nanu_knowledge_candidates';

    protected $fillable = [
        'submitted_by',
        'reviewed_by',
        'title',
        'module',
        'question',
        'answer',
        'status',
        'reviewer_notes',
    ];

    public function submitter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'submitted_by');
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}
