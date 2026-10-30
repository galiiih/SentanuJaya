<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class PuffyConversation extends Model
{
    use HasUuids;

    protected $table = 'puffy_conversations';

    protected $fillable = [
        'user_id',
        'title',
        'metadata',
    ];

    protected $casts = [
        'metadata' => 'array',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function messages()
    {
        return $this->hasMany(PuffyMessage::class, 'conversation_id');
    }
}
