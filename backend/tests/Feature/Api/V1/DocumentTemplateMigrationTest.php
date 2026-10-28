<?php

namespace Tests\Feature\Api\V1;

use App\Models\DocumentTemplate;
use App\Models\DocumentTemplateVersion;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Tests\TestCase;
use RuntimeException;

class DocumentTemplateMigrationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        if (Schema::hasTable('document_template_versions')) {
            Schema::table('document_template_versions', function (Blueprint $table) {
                try {
                    $table->dropUnique('doc_template_version_unique');
                } catch (\Exception $e) {
                    // index might not exist yet in some test setups
                }
            });
        }
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

        $migration = include database_path('migrations/2026_10_28_000015_add_unique_constraint_to_document_template_versions.php');
        $migration->up();

        // Exact duplicate reconciled: 1 record left and unique constraint successfully created
        $this->assertEquals(1, DocumentTemplateVersion::where('document_template_id', $template->id)->count());
        
        $this->expectException(\Illuminate\Database\QueryException::class);
        DB::table('document_template_versions')->insert([
            'document_template_id' => $template->id,
            'version' => 1,
            'name' => 'Test Template 2',
            'content' => '<p>Content 2</p>',
            'css' => 'body { color: blue; }',
            'gjs_project' => '{"project":2}',
            'created_by' => $admin->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function test_migration_fails_on_conflicting_css_duplicate_and_rolls_back_completely(): void
    {
        $admin = User::factory()->create(['role' => 'ADMIN']);
        $template = DocumentTemplate::create([
            'name' => 'Legacy Template Without Initial Version',
            'document_type' => 'quotation',
            'format' => 'html',
            'content' => '<p>Legacy Content</p>',
            'css' => 'body { color: green; }',
            'gjs_project' => '{"project":99}',
            'version' => 1,
            'created_by' => $admin->id,
        ]);

        // Insert conflicting duplicate version 1 records
        $record1 = [
            'document_template_id' => $template->id,
            'version' => 1,
            'name' => 'Legacy Template Without Initial Version',
            'content' => '<p>Legacy Content</p>',
            'css' => 'body { color: green; }',
            'gjs_project' => '{"project":99}',
            'created_by' => $admin->id,
            'created_at' => now(),
            'updated_at' => now(),
        ];
        $record2 = [
            'document_template_id' => $template->id,
            'version' => 1,
            'name' => 'Legacy Template Without Initial Version',
            'content' => '<p>Legacy Content</p>',
            'css' => 'body { color: red; }', // Conflict in CSS!
            'gjs_project' => '{"project":99}',
            'created_by' => $admin->id,
            'created_at' => now()->addSecond(),
            'updated_at' => now()->addSecond(),
        ];

        DB::table('document_template_versions')->insert([$record1, $record2]);
        $this->assertEquals(2, DocumentTemplateVersion::where('document_template_id', $template->id)->count());

        $migration = include database_path('migrations/2026_10_28_000015_add_unique_constraint_to_document_template_versions.php');

        $exceptionCaught = null;
        try {
            $migration->up();
        } catch (RuntimeException $e) {
            $exceptionCaught = $e;
        }

        $this->assertNotNull($exceptionCaught, 'Expected RuntimeException was not thrown.');
        $this->assertStringContainsString('css', $exceptionCaught->getMessage(), 'Exception message must specify conflicting field [css].');
        $this->assertStringContainsString((string)$template->id, $exceptionCaught->getMessage(), 'Exception message must specify document_template_id.');

        // Verify duplicate records remain intact and payload unchanged
        $this->assertEquals(2, DocumentTemplateVersion::where('document_template_id', $template->id)->count());
        $fetchedRecords = DB::table('document_template_versions')->where('document_template_id', $template->id)->orderBy('created_at')->get();
        $this->assertEquals('body { color: green; }', $fetchedRecords[0]->css);
        $this->assertEquals('body { color: red; }', $fetchedRecords[1]->css);

        // Verify unique index doc_template_version_unique was NOT created because transaction rolled back completely
        $canInsertDuplicate = true;
        try {
            DB::table('document_template_versions')->insert([
                'document_template_id' => $template->id,
                'version' => 1,
                'name' => 'Another Test',
                'content' => '<p>Other</p>',
                'css' => 'body { color: yellow; }',
                'gjs_project' => '{"project":100}',
                'created_by' => $admin->id,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        } catch (\Exception $e) {
            $canInsertDuplicate = false;
        }
        $this->assertTrue($canInsertDuplicate, 'Unique index doc_template_version_unique should not exist after migration rollback.');
    }

    public function test_migration_fails_on_conflicting_gjs_project_duplicate_and_rolls_back_completely(): void
    {
        $admin = User::factory()->create(['role' => 'ADMIN']);
        $template = DocumentTemplate::create([
            'name' => 'Legacy Template GJS Conflict',
            'document_type' => 'invoice',
            'format' => 'html',
            'content' => '<p>Content</p>',
            'css' => 'body { color: black; }',
            'gjs_project' => '{"project":1}',
            'version' => 1,
            'created_by' => $admin->id,
        ]);

        $record1 = [
            'document_template_id' => $template->id,
            'version' => 1,
            'name' => 'Legacy Template GJS Conflict',
            'content' => '<p>Content</p>',
            'css' => 'body { color: black; }',
            'gjs_project' => '{"project":1}',
            'created_by' => $admin->id,
            'created_at' => now(),
            'updated_at' => now(),
        ];
        $record2 = [
            'document_template_id' => $template->id,
            'version' => 1,
            'name' => 'Legacy Template GJS Conflict',
            'content' => '<p>Content</p>',
            'css' => 'body { color: black; }',
            'gjs_project' => '{"project":2}', // Conflict in gjs_project!
            'created_by' => $admin->id,
            'created_at' => now()->addSecond(),
            'updated_at' => now()->addSecond(),
        ];

        DB::table('document_template_versions')->insert([$record1, $record2]);
        $this->assertEquals(2, DocumentTemplateVersion::where('document_template_id', $template->id)->count());

        $migration = include database_path('migrations/2026_10_28_000015_add_unique_constraint_to_document_template_versions.php');

        $exceptionCaught = null;
        try {
            $migration->up();
        } catch (RuntimeException $e) {
            $exceptionCaught = $e;
        }

        $this->assertNotNull($exceptionCaught, 'Expected RuntimeException was not thrown.');
        $this->assertStringContainsString('gjs_project', $exceptionCaught->getMessage(), 'Exception message must specify conflicting field [gjs_project].');
        $this->assertStringContainsString((string)$template->id, $exceptionCaught->getMessage(), 'Exception message must specify document_template_id.');

        // Verify duplicate records remain intact and payload unchanged
        $this->assertEquals(2, DocumentTemplateVersion::where('document_template_id', $template->id)->count());
        $fetchedRecords = DB::table('document_template_versions')->where('document_template_id', $template->id)->orderBy('created_at')->get();
        $this->assertEquals('{"project":1}', $fetchedRecords[0]->gjs_project);
        $this->assertEquals('{"project":2}', $fetchedRecords[1]->gjs_project);

        // Verify unique index doc_template_version_unique was NOT created
        $canInsertDuplicate = true;
        try {
            DB::table('document_template_versions')->insert([
                'document_template_id' => $template->id,
                'version' => 1,
                'name' => 'Another Test GJS',
                'content' => '<p>Other</p>',
                'css' => 'body { color: cyan; }',
                'gjs_project' => '{"project":500}',
                'created_by' => $admin->id,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        } catch (\Exception $e) {
            $canInsertDuplicate = false;
        }
        $this->assertTrue($canInsertDuplicate, 'Unique index doc_template_version_unique should not exist after migration rollback.');
    }
}
