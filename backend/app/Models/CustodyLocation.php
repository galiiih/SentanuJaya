<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class CustodyLocation extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'branch_id',
        'code',
        'name',
        'description',
        'is_active',
    ];

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }
}