<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class Company extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'code',
        'name',
        'legal_name',
        'npwp',
        'is_pkp',
        'pkp_date',
        'address',
        'phone',
        'email',
        'timezone',
        'currency',
        'system_start_date',
    ];

    public function branches()
    {
        return $this->hasMany(Branch::class);
    }
}
