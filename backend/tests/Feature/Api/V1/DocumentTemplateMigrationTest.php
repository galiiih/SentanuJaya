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
            'name' => 'Test Template',
            'document_type' => 'invoice',
            'format' => 'html',
            'content' => '<p>Content</p>',
            'css' => 'body { color: red; }',
            'gjs_project' => '{"project":1}',
            'version' => 1,
            'created_by' => $admin->id,
        ]);

        $record1 = [
            'document_template_id' => $template->id,
            'version' => 1,
            'name' => 'Test Template',
            'content' => '<p>Content</p>',
            'css' => 'body { color: red; }',
            'gjs_project' => '{"project":1}',
            'created_by' => $admin->id,
            'created_at' => now(),
            'updated_at' => now(),
        ];
        $record2 = [
            'document_template_id' => $template->id,
            'version' => 1,
            'name' => 'Test Template',
            'content' => '<p>Content</p>',
            'css' => 'body { color: blue; }', // Conflict in CSS!
            'gjs_project' => '{"project":1}',
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
        $this->assertStringContainsString('css', $exceptionCaught->getMessage(), 'Exception message should specify conflicting field [css].');
        $this->assertStringContainsString((string)$template->id, $exceptionCaught->getMessage(), 'Exception message should specify document_template_id.');

        $this->assertEquals(2, DocumentTemplateVersion::where('document_template_id', $template->id)->count(), 'Duplicate records should remain intact after failed migration transaction.');

        $fetchedRecords = DB::table('document_template_versions')->where('document_template_id', $template->id)->orderBy('created_at')->get();
        $this->assertEquals('body { color: red; }', $fetchedRecords[0]->css);
        $this->assertEquals('body { color: blue; }', $fetchedRecords[1]->css);

        $canInsertDuplicate = true;
        try {
            DB::table('document_template_versions')->insert([
                'document_template_id' => $template->id,
                'version' => 1,
                'name' => 'Test Template Duplicate Insert',
                'content' => '<p>Other</p>',
                'css' => 'body { color: green; }',
                'gjs_project' => '{"project":3}',
                'created_by' => $admin->id,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        } catch (\Exception $e) {
            $canInsertDuplicate = false;
        }
        $this->assertTrue($canInsertDuplicate, 'Unique index should not be active because transaction rolled back.');
    }

    public function test_migration_fails_on_conflicting_gjs_project_duplicate_and_rolls_back_completely(): void
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

        $record1 = [
            'document_template_id' => $template->id,
            'version' => 1,
            'name' => 'Test Template',
            'content' => '<p>Content</p>',
            'css' => 'body { color: red; }',
            'gjs_project' => '{"project":1}',
            'created_by' => $admin->id,
            'created_at' => now(),
            'updated_at' => now(),
        ];
        $record2 = [
            'document_template_id' => $template->id,
            'version' => 1,
            'name' => 'Test Template',
            'content' => '<p>Content</p>',
            'css' => 'body { color: red; }',
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
        $this->assertStringContainsString('gjs_project', $exceptionCaught->getMessage(), 'Exception message should specify conflicting field [gjs_project].');

        $this->assertEquals(2, DocumentTemplateVersion::where('document_template_id', $template->id)->count());
        $fetchedRecords = DB::table('document_template_versions')->where('document_template_id', $template->id)->orderBy('created_at')->get();
        $this->assertEquals('{"project":1}', $fetchedRecords[0]->gjs_project);
        $this->assertEquals('{"project":2}', $fetchedRecords[1]->gjs_project);
    }
}
