<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class NanuKnowledgeBase extends Model
{
    use HasUuids;

    protected $table = 'nanu_knowledge_base';

    protected $fillable = [
        'title',
        'module',
        'question_pattern',
        'content',
        'audience_role',
        'is_published',
    ];
}
