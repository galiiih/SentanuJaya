<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class NanuIntent extends Model
{
    use HasUuids;

    protected $fillable = ['key', 'name', 'description', 'examples', 'is_active'];

    protected function casts(): array
    {
        return ['examples' => 'array', 'is_active' => 'boolean'];
    }

    public function qaExamples(): HasMany { return $this->hasMany(NanuQaExample::class, 'intent_id'); }
    public function toolMappings(): HasMany { return $this->hasMany(NanuToolMapping::class, 'intent_id'); }
}