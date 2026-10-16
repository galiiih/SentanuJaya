<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class TransportTemplate extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = ['name', 'distance_range', 'tarif', 'effective_date', 'expiry_date', 'notes', 'is_active'];
}
