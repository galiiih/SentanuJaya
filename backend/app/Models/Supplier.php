<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class Supplier extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'company_id',
        'code',
        'name',
        'address',
        'npwp',
        'phone',
        'email',
        'payment_terms_days',
        'is_active',
    ];

    public function company()
    {
        return $this->belongsTo(Company::class);
    }
}
