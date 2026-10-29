<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class CustomerContact extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'customer_id',
        'name',
        'position',
        'phone',
        'email',
        'is_primary',
        'is_active',
    ];

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }
}
