<?php

namespace Tests\Feature\Api\V1;

use App\Models\DocumentTemplate;
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

        $template->versions()->create([
            'version' => 1,
            'name' => 'Invoice Template',
            'content' => 'Old content',
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

        // Create v1 snapshot
        $template->versions()->create([
            'version' => 1,
            'name' => 'Invoice Template v1',
            'content' => 'Version 1 content',
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

    public function test_unauthorized_roles_cannot_modify_or_activate_templates(): void
    {
        $template = DocumentTemplate::create([
            'name' => 'Invoice Template',
            'document_type' => 'invoice',
            'format' => 'html',
            'content' => 'Content',
            'created_by' => $this->adminUser->id,
        ]);

        // Customer cannot create template
        $responseCreate = $this->actingAs($this->customerUser)
            ->postJson('/api/v1/document-templates', [
                'name' => 'Customer Template',
                'document_type' => 'invoice',
                'format' => 'html',
                'content' => 'Hack',
            ]);
        $responseCreate->assertStatus(403);

        // Staff cannot activate template (requires ADMIN or OWNER)
        $responseActivate = $this->actingAs($this->staffUser)
            ->postJson("/api/v1/document-templates/{$template->id}/activate");
        $responseActivate->assertStatus(403);

        // Customer cannot view templates
        $responseView = $this->actingAs($this->customerUser)
            ->getJson('/api/v1/document-templates');
        $responseView->assertStatus(403);
    }
}
