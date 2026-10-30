<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class PuffyFeedback extends Model
{
    use HasUuids;

    protected $table = 'puffy_feedback';

    protected $fillable = [
        'message_id',
        'user_id',
        'value',
    ];

    public function message()
    {
        return $this->belongsTo(PuffyMessage::class, 'message_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
