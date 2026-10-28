<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;
use App\Models\DocumentTemplate;
use App\Models\DocumentTemplateVersion;

return new class extends Migration
{
    public function up(): void
    {
        DB::transaction(function () {
            // 1. Backfill baseline versions for any legacy templates missing version snapshots safely & idempotently
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

            // 2. Detect potential duplicate (document_template_id, version) pairs before adding unique index
            $duplicates = DB::table('document_template_versions')
                ->select('document_template_id', 'version', DB::raw('count(*) as cnt'))
                ->groupBy('document_template_id', 'version')
                ->having(DB::raw('count(*)'), '>', 1)
                ->get();

            if ($duplicates->isNotEmpty()) {
                foreach ($duplicates as $dup) {
                    $versions = DB::table('document_template_versions')
                        ->where('document_template_id', $dup->document_template_id)
                        ->where('version', $dup->version)
                        ->orderBy('created_at', 'asc')
                        ->get();

                    $primary = $versions->first();
                    $redundants = $versions->slice(1);

                    foreach ($redundants as $redundant) {
                        $nameMatch = ($redundant->name === $primary->name);
                        $contentMatch = ($redundant->content === $primary->content);
                        $cssMatch = ($redundant->css === $primary->css);
                        $gjsMatch = ($redundant->gjs_project === $primary->gjs_project);

                        if ($nameMatch && $contentMatch && $cssMatch && $gjsMatch) {
                            // Exact duplicate across all payload fields: safe to delete redundant row
                            DB::table('document_template_versions')->where('id', $redundant->id)->delete();
                        } else {
                            // Conflicting payload fields (name, content, css, or gjs_project differ)
                            $conflicts = [];
                            if (!$nameMatch) $conflicts[] = 'name';
                            if (!$contentMatch) $conflicts[] = 'content';
                            if (!$cssMatch) $conflicts[] = 'css';
                            if (!$gjsMatch) $conflicts[] = 'gjs_project';

                            $conflictFields = implode(', ', $conflicts);
                            throw new \RuntimeException(
                                "Migration failed: Unresolvable duplicate conflict for document_template_id {$dup->document_template_id} " .
                                "at version {$dup->version}. Conflicting payload fields: [{$conflictFields}]."
                            );
                        }
                    }
                }
            }

            // 3. Add unique constraint safely
            Schema::table('document_template_versions', function (Blueprint $table) {
                $table->unique(['document_template_id', 'version'], 'doc_template_version_unique');
            });
        });
    }

    public function down(): void
    {
        Schema::table('document_template_versions', function (Blueprint $table) {
            $table->dropUnique('doc_template_version_unique');
        });
        // Note: down() drops the unique constraint but deliberately preserves all version history data.
    }
};
