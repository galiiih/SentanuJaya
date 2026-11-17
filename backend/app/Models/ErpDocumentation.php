<?php

namespace App\\Models;

use Illuminate\\Database\\Eloquent\\Concerns\\HasUuids;
use Illuminate\\Database\\Eloquent\\Model;
use Illuminate\\Database\\Eloquent\\Relations\\BelongsTo;
use Illuminate\\Database\\Eloquent\\Relations\\HasMany;

class ErpDocumentation extends Model
{
    use HasUuids;

    protected $table = 'erp_documentation';
    protected $fillable = ['category_id', 'slug', 'title', 'summary', 'body_markdown', 'module_key', 'keywords', 'related_slugs', 'minimum_role', 'publication_status', 'current_version', 'published_at', 'created_by', 'updated_by'];

    protected function casts(): array
    {
        return ['keywords' => 'array', 'related_slugs' => 'array', 'current_version' => 'integer', 'published_at' => 'datetime'];
    }

    public function category(): BelongsTo { return $this->belongsTo(ErpDocumentationCategory::class, 'category_id'); }
    public function versions(): HasMany { return $this->hasMany(ErpDocumentationVersion::class, 'documentation_id')->orderByDesc('version'); }
    public function feedback(): HasMany { return $this->hasMany(ErpDocumentationFeedback::class, 'documentation_id'); }
}