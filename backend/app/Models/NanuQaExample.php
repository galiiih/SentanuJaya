<?php

namespace App\\Models;

use Illuminate\\Database\\Eloquent\\Concerns\\HasUuids;
use Illuminate\\Database\\Eloquent\\Model;
use Illuminate\\Database\\Eloquent\\Relations\\BelongsTo;

class NanuQaExample extends Model
{
    use HasUuids;

    protected $fillable = ['knowledge_id', 'intent_id', 'question', 'reference_answer', 'audience_role', 'status'];

    public function knowledge(): BelongsTo { return $this->belongsTo(NanuKnowledgeBase::class, 'knowledge_id'); }
    public function intent(): BelongsTo { return $this->belongsTo(NanuIntent::class, 'intent_id'); }
}