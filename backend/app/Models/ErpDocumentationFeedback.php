<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ErpDocumentationFeedback extends Model
{
    use HasUuids;

    protected $table = 'erp_documentation_feedback';
    protected $fillable = ['documentation_id', 'user_id', 'was_helpful', 'comment'];

    protected function casts(): array
    {
        return ['was_helpful' => 'boolean'];
    }

    public function documentation(): BelongsTo { return $this->belongsTo(ErpDocumentation::class, 'documentation_id'); }
}