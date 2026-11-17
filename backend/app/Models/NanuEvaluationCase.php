<?php

namespace App\\Models;

use Illuminate\\Database\\Eloquent\\Concerns\\HasUuids;
use Illuminate\\Database\\Eloquent\\Model;

class NanuEvaluationCase extends Model
{
    use HasUuids;

    protected $fillable = ['name', 'question', 'expected_intent', 'expected_tools', 'expected_behavior', 'assertions', 'status'];

    protected function casts(): array
    {
        return ['expected_tools' => 'array', 'assertions' => 'array'];
    }
}