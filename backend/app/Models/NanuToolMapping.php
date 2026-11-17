<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class NanuToolMapping extends Model
{
    use HasUuids;

    protected $fillable = ['intent_id', 'tool_key', 'description', 'parameter_schema', 'requires_live_data', 'is_active'];

    protected function casts(): array
    {
        return ['parameter_schema' => 'array', 'requires_live_data' => 'boolean', 'is_active' => 'boolean'];
    }

    public function intent(): BelongsTo { return $this->belongsTo(NanuIntent::class, 'intent_id'); }
}