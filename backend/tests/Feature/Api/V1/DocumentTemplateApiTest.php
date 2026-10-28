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

    protected function setUp(): void
    {
        parent::setUp();
        $this->adminUser = User::factory()->create([
            'role' => 'ADMIN',
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
    }

    public function test_can_update_template_version(): void
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
}
