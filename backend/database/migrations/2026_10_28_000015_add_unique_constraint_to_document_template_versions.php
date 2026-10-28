<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use App\Models\DocumentTemplate;
use App\Models\DocumentTemplateVersion;

return new class extends Migration
{
    public function up(): void
    {
        // Backfill baseline versions for any legacy templates missing version snapshots safely & idempotently
        $templates = DocumentTemplate::all();
        foreach ($templates as $tpl) {
            if ($tpl->versions()->count() === 0) {
                DocumentTemplateVersion::firstOrCreate(
                    [
                        'document_template_id' => $tpl->id,
                        'version' => $tpl->version ?? 1,
                    ],
                    [
                        'name' => $tpl->name,
                        'content' => $tpl->content,
                        'css' => $tpl->css,
                        'gjs_project' => $tpl->gjs_project,
                        'created_by' => $tpl->created_by,
                    ]
                );
            }
        }

        Schema::table('document_template_versions', function (Blueprint $table) {
            $table->unique(['document_template_id', 'version'], 'doc_template_version_unique');
        });
    }

    public function down(): void
    {
        Schema::table('document_template_versions', function (Blueprint $table) {
            $table->dropUnique('doc_template_version_unique');
        });
    }
};
