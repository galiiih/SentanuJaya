<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class Worker extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'branch_id',
        'code',
        'name',
        'type',
        'phone',
        'address',
        'join_date',
        'is_active',
        'notes',
    ];

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }
}
