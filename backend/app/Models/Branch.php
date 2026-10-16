<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class Branch extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = ['company_id', 'code', 'name', 'address', 'is_active'];

    public function company()
    {
        return $this->belongsTo(Company::class);
    }

    public function workers()
    {
        return $this->hasMany(Worker::class);
    }
}
