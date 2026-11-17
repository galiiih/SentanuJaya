<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ErpDocumentationVersion extends Model
{
    use HasUuids;

    public $timestamps = false;
    protected $table = 'erp_documentation_versions';
    protected $fillable = ['documentation_id', 'version', 'title', 'summary', 'body_markdown', 'change_summary', 'created_by', 'created_at'];

    protected function casts(): array
    {
        return ['change_summary' => 'array', 'created_at' => 'datetime', 'version' => 'integer'];
    }

    public function documentation(): BelongsTo { return $this->belongsTo(ErpDocumentation::class, 'documentation_id'); }
}