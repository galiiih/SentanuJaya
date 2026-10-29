<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class Color extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = ['code', 'name', 'hex_code', 'description', 'is_active'];
}
