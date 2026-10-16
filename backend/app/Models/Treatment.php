<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class Treatment extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = ['code', 'name', 'category', 'description', 'is_active'];
}
