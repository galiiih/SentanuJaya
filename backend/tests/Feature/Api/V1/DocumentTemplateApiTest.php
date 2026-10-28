<?php

namespace Tests\Feature\Api\V1;

use App\Models\DocumentTemplate;
use App\Models\DocumentTemplateVersion;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DocumentTemplateApiTest extends TestCase
{
    use RefreshDatabase;

    protected User $adminUser;
    protected User $staffUser;
    protected User $customerUser;

    protected function setUp(): void
    {
        parent::setUp();
        $this->adminUser = User::factory()->create([
            'role' => 'ADMIN',
        ]);
        $this->staffUser = User::factory()->create([
            'role' => 'STAFF',
        ]);
        $this->customerUser = User::factory()->create([
            'role' => 'CUSTOMER',
        ]);
    }

    public function test_can_list_templates(): void
    {
        DocumentTemplate::create([
            'name' => 'Template 1',
            'document_type' => 'invoice',
            'format' => 'html',
            'content' => '<p>Test</p>',
            'created_by' => $this->adminUser->id,
        ]);

        $response = $this->actingAs($this->adminUser)
            ->getJson('/api/v1/document-templates');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'status',
                'data' => [
                    '*' => ['id', 'name', 'document_type', 'format', 'version', 'is_active', 'status'],
                ],
            ]);
    }

    public function test_can_create_html_template(): void
    {
        $payload = [
            'name' => 'Default Invoice Template',
            'document_type' => 'invoice',
            'format' => 'html',
            'content' => '<html><body><h1>Invoice {{invoice_number}}</h1></body></html>',
            'css' => 'body { font-family: sans-serif; }',
            'gjs_project' => '{"pages":[{"frames":[{"component":{}}]}]}',
        ];

        $response = $this->actingAs($this->adminUser)
            ->postJson('/api/v1/document-templates', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.name', 'Default Invoice Template')
            ->assertJsonPath('data.version', 1);

        $this->assertDatabaseHas('document_templates', [
            'name' => 'Default Invoice Template',
            'document_type' => 'invoice',
            'format' => 'html',
        ]);

        $this->assertDatabaseHas('document_template_versions', [
            'version' => 1,
            'name' => 'Default Invoice Template',
        ]);
    }

    public function test_legacy_template_without_snapshot_gets_baseline_idempotently(): void
    {
        $legacyTemplate = DocumentTemplate::create([
            'name' => 'Legacy Template',
            'document_type' => 'invoice',
            'format' => 'html',
            'content' => 'Legacy raw content',
            'version' => 1,
            'created_by' => $this->adminUser->id,
        ]);

        // Verify initially 0 versions
        $this->assertEquals(0, $legacyTemplate->versions()->count());

        // Access template via show endpoint (triggers ensureBaselineVersion)
        $response = $this->actingAs($this->staffUser)
            ->getJson("/api/v1/document-templates/{$legacyTemplate->id}");

        $response->assertStatus(200);

        // Verify baseline snapshot v1 was created
        $this->assertEquals(1, $legacyTemplate->fresh()->versions()->count());
        $this->assertDatabaseHas('document_template_versions', [
            'document_template_id' => $legacyTemplate->id,
            'version' => 1,
            'content' => 'Legacy raw content',
        ]);

        // Calling versions again (repeated baseline call / idempotency) should not create duplicate snapshot
        $versionsResponse = $this->actingAs($this->staffUser)
            ->getJson("/api/v1/document-templates/{$legacyTemplate->id}/versions");

        $versionsResponse->assertStatus(200)
            ->assertJsonCount(1, 'data');
    }

    public function test_can_update_template_version_and_fetch_history(): void
    {
        $template = DocumentTemplate::create([
            'name' => 'Invoice Template',
            'document_type' => 'invoice',
            'format' => 'html',
            'content' => 'Old content',
            'version' => 1,
            'created_by' => $this->adminUser->id,
        ]);

        $response = $this->actingAs($this->adminUser)
            ->putJson("/api/v1/document-templates/{$template->id}", [
                'content' => 'New updated content',
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.version', 2);

        $this->assertDatabaseHas('document_templates', [
            'id' => $template->id,
            'content' => 'New updated content',
            'version' => 2,
        ]);

        // Test version history endpoint
        $versionsResponse = $this->actingAs($this->adminUser)
            ->getJson("/api/v1/document-templates/{$template->id}/versions");

        $versionsResponse->assertStatus(200)
            ->assertJsonCount(2, 'data');
    }

    public function test_can_restore_previous_version(): void
    {
        $template = DocumentTemplate::create([
            'name' => 'Invoice Template',
            'document_type' => 'invoice',
            'format' => 'html',
            'content' => 'Version 1 content',
            'version' => 1,
            'created_by' => $this->adminUser->id,
        ]);

        // Update to version 2
        $this->actingAs($this->adminUser)
            ->putJson("/api/v1/document-templates/{$template->id}", [
                'content' => 'Version 2 content',
            ]);

        // Restore version 1
        $restoreResponse = $this->actingAs($this->adminUser)
            ->postJson("/api/v1/document-templates/{$template->id}/restore/1");

        $restoreResponse->assertStatus(200)
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.version', 3);

        $this->assertDatabaseHas('document_templates', [
            'id' => $template->id,
            'content' => 'Version 1 content',
            'version' => 3,
        ]);
    }

    public function test_can_activate_template(): void
    {
        $template1 = DocumentTemplate::create([
            'name' => 'Invoice Template 1',
            'document_type' => 'invoice',
            'format' => 'html',
            'content' => 'Content 1',
            'is_active' => false,
            'created_by' => $this->adminUser->id,
        ]);

        $template2 = DocumentTemplate::create([
            'name' => 'Invoice Template 2',
            'document_type' => 'invoice',
            'format' => 'html',
            'content' => 'Content 2',
            'is_active' => false,
            'created_by' => $this->adminUser->id,
        ]);

        $response = $this->actingAs($this->adminUser)
            ->postJson("/api/v1/document-templates/{$template2->id}/activate");

        $response->assertStatus(200)
            ->assertJsonPath('data.is_active', true);

        $this->assertTrue($template2->fresh()->is_active);
        $this->assertFalse($template1->fresh()->is_active);
    }

    public function test_customer_role_denied_on_all_template_endpoints_and_state_unchanged(): void
    {
        $template = DocumentTemplate::create([
            'name' => 'Protected Template',
            'document_type' => 'invoice',
            'format' => 'html',
            'content' => 'Original Content',
            'version' => 1,
            'created_by' => $this->adminUser->id,
        ]);

        // 1. Index / List
        $this->actingAs($this->customerUser)->getJson('/api/v1/document-templates')->assertStatus(403);

        // 2. Store / Create
        $this->actingAs($this->customerUser)->postJson('/api/v1/document-templates', [
            'name' => 'Customer Malicious Template',
            'document_type' => 'invoice',
            'format' => 'html',
            'content' => 'Hacked',
        ])->assertStatus(403);

        // 3. Show
        $this->actingAs($this->customerUser)->getJson("/api/v1/document-templates/{$template->id}")->assertStatus(403);

        // 4. Update
        $this->actingAs($this->customerUser)->putJson("/api/v1/document-templates/{$template->id}", [
            'content' => 'Hacked Content',
        ])->assertStatus(403);

        // 5. Versions history
        $this->actingAs($this->customerUser)->getJson("/api/v1/document-templates/{$template->id}/versions")->assertStatus(403);

        // 6. Restore
        $this->actingAs($this->customerUser)->postJson("/api/v1/document-templates/{$template->id}/restore/1")->assertStatus(403);

        // 7. Activate
        $this->actingAs($this->customerUser)->postJson("/api/v1/document-templates/{$template->id}/activate")->assertStatus(403);

        // 8. Delete
        $this->actingAs($this->customerUser)->deleteJson("/api/v1/document-templates/{$template->id}")->assertStatus(403);

        // Verify database state is completely unchanged
        $this->assertDatabaseHas('document_templates', [
            'id' => $template->id,
            'content' => 'Original Content',
            'version' => 1,
        ]);
        $this->assertEquals(0, DocumentTemplateVersion::where('document_template_id', $template->id)->count());
    }
}
