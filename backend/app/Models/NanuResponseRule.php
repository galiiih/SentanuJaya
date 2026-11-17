<?php

namespace App\\Models;

use Illuminate\\Database\\Eloquent\\Concerns\\HasUuids;
use Illuminate\\Database\\Eloquent\\Model;

class NanuResponseRule extends Model
{
    use HasUuids;

    protected $fillable = ['key', 'name', 'instruction', 'scope', 'priority', 'conditions', 'is_active'];

    protected function casts(): array
    {
        return ['conditions' => 'array', 'is_active' => 'boolean', 'priority' => 'integer'];
    }
}