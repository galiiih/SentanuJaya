<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class NanuKnowledgeBase extends Model
{
    use HasUuids;

    protected $table = 'nanu_knowledge_base';

    protected $fillable = [
        'title', 'module', 'question_pattern', 'content', 'audience_role',
        'is_published', 'slug', 'version', 'publication_status', 'published_at',
        'created_by', 'updated_by',
    ];

    protected function casts(): array
    {
        return [
            'is_published' => 'boolean',
            'version' => 'integer',
            'published_at' => 'datetime',
        ];
    }

    public function qaExamples(): HasMany
    {
        return $this->hasMany(NanuQaExample::class, 'knowledge_id');
    }
}
