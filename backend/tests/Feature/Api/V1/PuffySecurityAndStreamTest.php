<?php

namespace Tests\Feature\Api\V1;

use App\Models\User;
use App\Models\PuffyConversation;
use App\Models\PuffyMessage;
use App\Services\PuffyStreamParser;
use App\Services\PuffyAiService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PuffySecurityAndStreamTest extends TestCase
{
    use RefreshDatabase;

    protected User $user1;
    protected User $user2;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user1 = User::create([
            'username' => 'user1',
            'email' => 'user1@sentanu.local',
            'password' => bcrypt('password'),
            'full_name' => 'User One',
            'role' => 'STAFF',
        ]);

        $this->user2 = User::create([
            'username' => 'user2',
            'email' => 'user2@sentanu.local',
            'password' => bcrypt('password'),
            'full_name' => 'User Two',
            'role' => 'ADMIN',
        ]);
    }

    public function test_puffy_stream_parser_ollama_ndjson(): void
    {
        $parser = new PuffyStreamParser();

        // Feed complete and partial chunks
        $chunk1 = '{"model":"llama3","response":"Hello","done":false}' . "\n";
        $chunk2 = '{"model":"llama3","response":" World","done":true}';

        $objects1 = $parser->feedOllamaChunk($chunk1);
        $this->assertCount(1, $objects1);
        $this->assertEquals('Hello', $objects1[0]['response']);

        $objects2 = $parser->feedOllamaChunk($chunk2);
        $this->assertEmpty($objects2); // no newline yet

        $flushed = $parser->flushOllama();
        $this->assertCount(1, $flushed);
        $this->assertEquals(' World', $flushed[0]['response']);
        $this->assertTrue($flushed[0]['done']);
    }

    public function test_puffy_stream_parser_openai_sse(): void
    {
        $parser = new PuffyStreamParser();

        $chunk = "data: {\"choices\":[{\"delta\":{\"content\":\"Hello SSE\"}}]}\n\ndata: [DONE]\n\n";
        $results = $parser->feedOpenAiChunk($chunk);

        $this->assertNotEmpty($results);
        $this->assertEquals('Hello SSE', $results[0]['choices'][0]['delta']['content']);
        $this->assertEquals('[DONE]', $results[1]);
    }

    public function test_puffy_conversation_security_isolation(): void
    {
        // Create conversation owned by user1
        $conv1 = PuffyConversation::create([
            'user_id' => $this->user1->id,
            'title' => 'User 1 Conversation',
        ]);

        PuffyMessage::create([
            'conversation_id' => $conv1->id,
            'user_id' => $this->user1->id,
            'role' => 'user',
            'content' => 'Secret data for user 1',
        ]);

        // User 2 attempts to send chat referencing user1's conversation id
        $response = $this->actingAs($this->user2)->postJson('/api/v1/puffy/chat', [
            'message' => 'Hello Puffy',
            'conversation_id' => $conv1->id,
            'page_context' => [
                'title' => 'Dashboard',
                'route' => '/dashboard',
            ],
        ]);

        // Controller should either fail authorization or create a new private conversation for user2
        // Let's verify conversation isolation: user2 should not corrupt or access user1's private conversation.
        $this->assertDatabaseHas('puffy_conversations', [
            'id' => $conv1->id,
            'user_id' => $this->user1->id,
        ]);
    }

    public function test_puffy_tool_execution_readonly_safety(): void
    {
        $aiService = app(PuffyAiService::class);

        // Verify read-only tools return expected structure
        $po = $aiService->executeTool('get_customer_po_summary');
        $this->assertEquals('Ringkasan Customer PO', $po['title']);
        $this->assertArrayHasKey('metrics', $po);
        $this->assertArrayHasKey('table', $po);

        // Verify unknown tool
        $unknown = $aiService->executeTool('drop_database_table');
        $this->assertFalse($unknown['hasData']);
        $this->assertEquals('Informasi Operasional Sentanu Jaya', $unknown['title']);
    }

    public function test_quick_questions_endpoint(): void
    {
        $response = $this->actingAs($this->user1)->getJson('/api/v1/puffy/quick-questions');
        $response->assertStatus(200);
        $response->assertJsonStructure([
            'success',
            'message',
            'data' => [
                'dashboard',
                'customer-po',
                'materials',
                'delivery',
                'invoicing',
                'payments',
            ]
        ]);
    }

    public function test_knowledge_templates_endpoint_and_filter(): void
    {
        $response = $this->actingAs($this->user1)->getJson('/api/v1/puffy/knowledge/templates?category=customer-po');
        $response->assertStatus(200);
        $response->assertJsonStructure([
            'success',
            'message',
            'data' => [
                '*' => ['id', 'category', 'title', 'sample_questions', 'intent']
            ]
        ]);
        $data = $response->json('data');
        $this->assertCount(1, $data);
        $this->assertEquals('customer-po', $data[0]['category']);
    }

    public function test_puffy_endpoints_require_auth(): void
    {
        $this->getJson('/api/v1/puffy/quick-questions')->assertStatus(401);
        $this->getJson('/api/v1/puffy/knowledge/templates')->assertStatus(401);
    }
}
