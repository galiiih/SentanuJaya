<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ErpDocumentationCategory extends Model
{
    use HasUuids;

    protected $table = 'erp_documentation_categories';
    protected $fillable = ['name', 'slug', 'description', 'sort_order', 'is_active'];

    protected function casts(): array
    {
        return ['sort_order' => 'integer', 'is_active' => 'boolean'];
    }

    public function articles(): HasMany { return $this->hasMany(ErpDocumentation::class, 'category_id'); }
}