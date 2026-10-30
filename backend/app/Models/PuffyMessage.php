<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class PuffyMessage extends Model
{
    use HasUuids;

    protected $table = 'puffy_messages';

    protected $fillable = [
        'conversation_id',
        'user_id',
        'role',
        'content',
        'tool_calls',
        'tool_result',
        'metadata',
    ];

    protected $casts = [
        'tool_calls' => 'array',
        'tool_result' => 'array',
        'metadata' => 'array',
    ];

    public function conversation()
    {
        return $this->belongsTo(PuffyConversation::class, 'conversation_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function feedback()
    {
        return $this->hasMany(PuffyFeedback::class, 'message_id');
    }
}
