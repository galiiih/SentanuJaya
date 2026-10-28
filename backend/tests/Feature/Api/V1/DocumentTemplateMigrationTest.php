<?php

use App\Models\DocumentTemplate;
use App\Models\DocumentTemplateVersion;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Tests\TestCase;

class DocumentTemplateMigrationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        // Drop unique constraint temporarily so we can test migration up() behavior with duplicates
        Schema::table('document_template_versions', function (Blueprint $table) {
            $table->dropUnique('doc_template_version_unique');
        });
    }

    public function test_migration_reconciles_exact_duplicates_safely(): void
    {
        $admin = User::factory()->create(['role' => 'ADMIN']);
        $template = DocumentTemplate::create([
            'name' => 'Test Template',
            'document_type' => 'invoice',
            'format' => 'html',
            'content' => '<p>Content</p>',
            'css' => 'body { color: red; }',
            'gjs_project' => '{"project":1}',
            'version' => 1,
            'created_by' => $admin->id,
        ]);

        // Insert exact duplicate version 1 records manually without unique constraint
        DB::table('document_template_versions')->insert([
            [
                'document_template_id' => $template->id,
                'version' => 1,
                'name' => 'Test Template',
                'content' => '<p>Content</p>',
                'css' => 'body { color: red; }',
                'gjs_project' => '{"project":1}',
                'created_by' => $admin->id,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'document_template_id' => $template->id,
                'version' => 1,
                'name' => 'Test Template',
                'content' => '<p>Content</p>',
                'css' => 'body { color: red; }',
                'gjs_project' => '{"project":1}',
                'created_by' => $admin->id,
                'created_at' => now()->addSecond(),
                'updated_at' => now()->addSecond(),
            ]
        ]);

        $this->assertEquals(2, DocumentTemplateVersion::where('document_template_id', $template->id)->count());

        // Run migration up()
        $migration = include database_path('migrations/2026_10_28_000015_add_unique_constraint_to_document_template_versions.php');
        $migration->up();

        // Exact duplicate should be reconciled (1 record left) and unique constraint added successfully
        $this->assertEquals(1, DocumentTemplateVersion::where('document_template_id', $template->id)->count());
    }

    public function test_migration_fails_on_conflicting_css_duplicate(): void
    {
        $admin = User::factory()->create(['role' => 'ADMIN']);
        $template = DocumentTemplate::create([
            'name' => 'Test Template',
            'document_type' => 'invoice',
            'format' => 'html',
            'content' => '<p>Content</p>',
            'css' => 'body { color: red; }',
            'gjs_project' => '{"project":1}',
            'version' => 1,
            'created_by' => $admin->id,
        ]);

        DB::table('document_template_versions')->insert([
            [
                'document_template_id' => $template->id,
                'version' => 1,
                'name' => 'Test Template',
                'content' => '<p>Content</p>',
                'css' => 'body { color: red; }',
                'gjs_project' => '{"project":1}',
                'created_by' => $admin->id,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'document_template_id' => $template->id,
                'version' => 1,
                'name' => 'Test Template',
                'content' => '<p>Content</p>',
                'css' => 'body { color: blue; }', // Conflict!
                'gjs_project' => '{"project":1}',
                'created_by' => $admin->id,
                'created_at' => now()->addSecond(),
                'updated_at' => now()->addSecond(),
            ]
        ]);

        $this->expectException(RuntimeException::class);

        $migration = include database_path('migrations/2026_10_28_000015_add_unique_constraint_to_document_template_versions.php');
        $migration->up();
    }

    public function test_migration_fails_on_conflicting_gjs_project_duplicate(): void
    {
        $admin = User::factory()->create(['role' => 'ADMIN']);
        $template = DocumentTemplate::create([
            'name' => 'Test Template',
            'document_type' => 'invoice',
            'format' => 'html',
            'content' => '<p>Content</p>',
            'css' => 'body { color: red; }',
            'gjs_project' => '{"project":1}',
            'version' => 1,
            'created_by' => $admin->id,
        ]);

        DB::table('document_template_versions')->insert([
            [
                'document_template_id' => $template->id,
                'version' => 1,
                'name' => 'Test Template',
                'content' => '<p>Content</p>',
                'css' => 'body { color: red; }',
                'gjs_project' => '{"project":1}',
                'created_by' => $admin->id,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'document_template_id' => $template->id,
                'version' => 1,
                'name' => 'Test Template',
                'content' => '<p>Content</p>',
                'css' => 'body { color: red; }',
                'gjs_project' => '{"project":2}', // Conflict!
                'created_by' => $admin->id,
                'created_at' => now()->addSecond(),
                'updated_at' => now()->addSecond(),
            ]
        ]);

        $this->expectException(RuntimeException::class);

        $migration = include database_path('migrations/2026_10_28_000015_add_unique_constraint_to_document_template_versions.php');
        $migration->up();
    }
}
