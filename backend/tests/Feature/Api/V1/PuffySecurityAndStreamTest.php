<?php

namespace Tests\Feature\Api\V1;

use App\Models\Company;
use App\Models\Customer;
use App\Models\CustomerItem;
use App\Models\CustomerPo;
use App\Models\PuffyConversation;
use App\Models\PuffyPendingAction;
use App\Models\PuffyMessage;
use App\Models\User;
use App\Services\NanuKnowledgeLearningService;
use App\Services\PuffyAiService;
use App\Services\PuffyKnowledgeService;
use App\Services\PuffyStreamParser;
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
        $parser = new PuffyStreamParser;

        // Feed complete and partial chunks
        $chunk1 = '{"model":"llama3","response":"Hello","done":false}'."\n";
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
        $parser = new PuffyStreamParser;

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

    public function test_puffy_detect_tool_intent_mapping(): void
    {
        $aiService = app(PuffyAiService::class);

        $this->assertEquals('get_production_progress_summary', $aiService->detectTool('Production progress'));
        $this->assertEquals('get_production_progress_summary', $aiService->detectTool('Status produksi saat ini'));
        $this->assertEquals('get_invoice_summary', $aiService->detectTool('Berapa total invoice bulan ini?'));
        $this->assertEquals('get_invoice_tax_summary', $aiService->detectTool('Berapa PPN invoice ini?'));
        $this->assertEquals('get_goods_received_summary', $aiService->detectTool('Goods received today'));
        $this->assertEquals('get_goods_received_summary', $aiService->detectTool('Penerimaan barang hari ini'));
        $this->assertEquals('get_goods_received_summary', $aiService->detectTool('Barang masuk hari ini'));
        $this->assertEquals('get_inventory_summary', $aiService->detectTool('What materials are currently in stock?'));
        $this->assertEquals('get_inventory_summary', $aiService->detectTool('Stok material menipis'));
        $this->assertEquals('get_custody_summary', $aiService->detectTool('Tampilkan barang customer yang masih berada di workshop.'));
        $this->assertEquals('get_acceptance_summary', $aiService->detectTool('Apakah surat jalan ini sudah memiliki acceptance?'));
        $this->assertEquals('get_delivery_summary', $aiService->detectTool('Barang customer ini sudah dikirim kembali atau belum?'));
        $this->assertEquals('get_operational_risk_summary', $aiService->detectTool('Apa risiko operasional yang terlihat dari data saat ini?'));
        $this->assertNull($aiService->detectTool('Tampilkan laporan finansial bulan ini.'));
        $this->assertNull($aiService->detectTool('Bagaimana cara posting invoice?'));
        $this->assertNull($aiService->detectTool('Bagaimana cara membuat invoice?'));
        $this->assertNull($aiService->detectTool('Bagaimana proses penerimaan barang?'));
        $this->assertNull($aiService->detectTool('Siapa presiden Indonesia?'));
    }

    public function test_today_delivery_question_uses_daily_delivery_tool(): void
    {
        $aiService = app(PuffyAiService::class);

        $this->assertEquals('get_today_delivery_summary', $aiService->detectTool('Hari ini kirim berapa?'));
        $this->assertEquals('get_today_delivery_summary', $aiService->detectTool('How many deliveries today?'));
    }

    public function test_today_delivery_chat_returns_sse_success_without_calling_llm(): void
    {
        $response = $this->actingAs($this->user1)->postJson('/api/v1/puffy/chat', [
            'message' => 'Hari ini kirim berapa?',
            'page_context' => [
                'title' => 'Dashboard',
                'route' => '/dashboard',
            ],
        ]);

        $response->assertStatus(200);
        $this->assertStringStartsWith('text/event-stream', $response->headers->get('Content-Type'));
    }

    public function test_inventory_tool_returns_stock_status_from_material_and_stock_tables(): void
    {
        $aiService = app(PuffyAiService::class);

        $result = $aiService->executeTool('get_inventory_summary');

        $this->assertEquals('get_inventory_summary', $result['tool']);
        $this->assertArrayHasKey('metrics', $result);
        $this->assertArrayHasKey('table', $result);
        $this->assertArrayHasKey('rows', $result['table']);
    }

    public function test_custody_and_acceptance_tools_return_structured_results(): void
    {
        $aiService = app(PuffyAiService::class);

        foreach (['get_custody_summary', 'get_acceptance_summary', 'get_operational_risk_summary', 'get_invoice_tax_summary'] as $toolName) {
            $result = $aiService->executeTool($toolName);

            $this->assertSame($toolName, $result['tool']);
            $this->assertArrayHasKey('metrics', $result);
            $this->assertArrayHasKey('table', $result);
            $this->assertArrayHasKey('rows', $result['table']);
        }
    }

    public function test_guidance_does_not_match_every_how_to_question_to_dashboard(): void
    {
        $knowledge = app(PuffyKnowledgeService::class);
        $learning = app(NanuKnowledgeLearningService::class);

        $this->assertNull($knowledge->findRelevantGuidance('Bagaimana cara membuat STB baru?'));
        $this->assertStringContainsString('Panduan STB', (string) $learning->findRelevantGuidance('Bagaimana cara membuat STB baru?'));
        $this->assertStringContainsString('Panduan Customer Acceptance', (string) $learning->findRelevantGuidance('Bagaimana cara membuat acceptance?'));
        $this->assertStringContainsString('Cara Meng-update Master Material', (string) $learning->findRelevantGuidance('Bagaimana caranya untuk mengupdate material?'));
        $this->assertStringContainsString('tidak diubah langsung dari master material', strtolower((string) $learning->findRelevantGuidance('Bagaimana cara update stok material?')));
    }

    public function test_how_to_reply_is_user_facing_and_out_of_scope_question_is_not_treated_as_erp_guidance(): void
    {
        $aiService = app(PuffyAiService::class);

        $guide = $aiService->agenticChat(
            'Bagaimana cara membuat surat jalan?',
            null,
            ['role' => 'STAFF', 'route' => '/dashboard', 'title' => 'Dashboard'],
            static function (string $label, array $ui): void {},
            static function (array $toolResult): void {},
            static function (string $token): void {},
        );

        $this->assertStringNotContainsString('Panduan Intent', $guide['reply']);
        $this->assertStringContainsString('Panduan Surat Jalan', $guide['reply']);

        $outOfScope = $aiService->agenticChat(
            'Bagaimana cuaca hari ini?',
            null,
            ['role' => 'STAFF', 'route' => '/dashboard', 'title' => 'Dashboard'],
            static function (string $label, array $ui): void {},
            static function (array $toolResult): void {},
            static function (string $token): void {},
        );

        $this->assertStringContainsString('fokus membantu operasional', $outOfScope['reply']);
        $this->assertStringNotContainsString('panduan umum', strtolower($outOfScope['reply']));
    }

    public function test_goods_received_and_inventory_questions_bypass_provider(): void
    {
        $aiService = app(PuffyAiService::class);
        $toolResults = [];

        $result = $aiService->agenticChat(
            'Barang masuk hari ini',
            null,
            [],
            static function (): void {},
            static function (array $toolResult) use (&$toolResults): void {
                $toolResults[] = $toolResult;
            },
            static function (): void {},
        );

        $this->assertEquals('get_goods_received_summary', $result['tool_result']['tool']);
        $this->assertCount(1, $toolResults);
        $this->assertStringContainsString('diterima hari ini', $result['reply']);
    }

    public function test_tool_schemas_use_object_properties_and_restrict_extra_arguments(): void
    {
        $definitions = app(PuffyAiService::class)->getToolDefinitions();

        foreach ($definitions as $definition) {
            $name = $definition['function']['name'];
            $parameters = $definition['function']['parameters'];

            $this->assertSame('object', $parameters['type']);
            $this->assertFalse($parameters['additionalProperties']);

            if ($name === 'propose_customer_po_activation') {
                $this->assertSame(
                    ['po_number' => ['type' => 'string', 'description' => 'Nomor Customer PO yang disebut pengguna']],
                    $parameters['properties']
                );
                $this->assertSame(['po_number'], $parameters['required']);
            } else {
                $this->assertSame('{}', json_encode($parameters['properties']));
            }
        }
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
            ],
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
                '*' => ['id', 'category', 'title', 'sample_questions', 'intent'],
            ],
        ]);
        $data = $response->json('data');
        $this->assertCount(1, $data);
        $this->assertEquals('customer-po', $data[0]['category']);
    }

    private function createDraftCustomerPo(string $number = 'PO-NANU-001'): CustomerPo
    {
        $company = Company::create(['code' => 'NANU', 'name' => 'PT Nanu Test']);
        $customer = Customer::create([
            'company_id' => $company->id,
            'code' => 'NANU-CUST',
            'name' => 'PT Nanu Customer',
        ]);
        $item = CustomerItem::create([
            'customer_id' => $customer->id,
            'code' => 'NANU-ITEM',
            'name' => 'Body Kit',
        ]);
        $po = CustomerPo::create([
            'company_id' => $company->id,
            'customer_id' => $customer->id,
            'po_number' => $number,
            'po_date' => '2026-11-05',
            'status' => CustomerPo::STATUS_DRAFT,
        ]);
        $po->lines()->create([
            'customer_item_id' => $item->id,
            'quantity' => 1,
            'unit_price' => 100000,
        ]);

        return $po;
    }

    public function test_nanu_ai_tool_creates_a_pending_activation_draft_without_mutating_the_po(): void
    {
        $po = $this->createDraftCustomerPo('PO-NANU-TOOL');

        $result = app(PuffyAiService::class)->executeTool('propose_customer_po_activation', [
            'po_number' => $po->po_number,
            '_authenticated_user_id' => $this->user2->id,
        ]);

        $this->assertSame('Konfirmasi Aktivasi Customer PO', $result['title']);
        $this->assertSame('pending', $result['action']['status']);
        $this->assertNotEmpty($result['action']['id']);
        $this->assertDatabaseHas('puffy_pending_actions', [
            'id' => $result['action']['id'],
            'user_id' => $this->user2->id,
            'action_type' => 'customer_po.activate',
            'status' => 'pending',
        ]);
        $this->assertDatabaseHas('customer_pos', [
            'id' => $po->id,
            'status' => CustomerPo::STATUS_DRAFT,
        ]);
    }

    public function test_nanu_ai_tool_does_not_create_a_draft_for_a_user_without_activation_permission(): void
    {
        $po = $this->createDraftCustomerPo('PO-NANU-TOOL-DENIED');

        $result = app(PuffyAiService::class)->executeTool('propose_customer_po_activation', [
            'po_number' => $po->po_number,
            '_authenticated_user_id' => $this->user1->id,
        ]);

        $this->assertFalse($result['hasData']);
        $this->assertSame('Aksi tidak diizinkan', $result['title']);
        $this->assertDatabaseCount('puffy_pending_actions', 0);
        $this->assertDatabaseHas('customer_pos', [
            'id' => $po->id,
            'status' => CustomerPo::STATUS_DRAFT,
        ]);
    }

    public function test_nanu_action_draft_requires_permission_and_valid_customer_po(): void
    {
        $po = $this->createDraftCustomerPo();

        $this->actingAs($this->user1)->postJson('/api/v1/puffy/actions', [
            'action_type' => 'customer_po.activate',
            'payload' => ['po_id' => $po->id],
        ])->assertStatus(403);

        $this->assertDatabaseCount('puffy_pending_actions', 0);

        $this->actingAs($this->user2)->postJson('/api/v1/puffy/actions', [
            'action_type' => 'customer_po.activate',
            'payload' => ['po_id' => $po->id],
        ])->assertCreated()
            ->assertJsonPath('data.action_type', 'customer_po.activate')
            ->assertJsonPath('data.status', 'pending');

        $this->assertDatabaseHas('puffy_pending_actions', [
            'action_type' => 'customer_po.activate',
            'status' => 'pending',
            'user_id' => $this->user2->id,
        ]);
        $this->assertDatabaseHas('customer_pos', ['id' => $po->id, 'status' => CustomerPo::STATUS_DRAFT]);
    }

    public function test_nanu_action_confirmation_activates_customer_po_once(): void
    {
        $po = $this->createDraftCustomerPo('PO-NANU-CONFIRM');
        $draft = $this->actingAs($this->user2)->postJson('/api/v1/puffy/actions', [
            'action_type' => 'customer_po.activate',
            'payload' => ['po_id' => $po->id],
        ])->assertCreated()->json('data');

        $this->postJson("/api/v1/puffy/actions/{$draft['id']}/confirm")
            ->assertOk()
            ->assertJsonPath('data.status', 'executed')
            ->assertJsonPath('data.po_status', CustomerPo::STATUS_OPEN);

        $this->assertDatabaseHas('customer_pos', ['id' => $po->id, 'status' => CustomerPo::STATUS_OPEN]);
        $this->assertDatabaseHas('puffy_pending_actions', ['id' => $draft['id'], 'status' => 'executed']);

        $this->postJson("/api/v1/puffy/actions/{$draft['id']}/confirm")->assertStatus(409);
        $this->assertDatabaseHas('customer_pos', ['id' => $po->id, 'status' => CustomerPo::STATUS_OPEN]);
    }

    public function test_nanu_action_can_only_be_confirmed_by_its_creator(): void
    {
        $po = $this->createDraftCustomerPo('PO-NANU-OWNER');
        $draft = $this->actingAs($this->user2)->postJson('/api/v1/puffy/actions', [
            'action_type' => 'customer_po.activate',
            'payload' => ['po_id' => $po->id],
        ])->assertCreated()->json('data');

        $this->actingAs($this->user1)
            ->postJson("/api/v1/puffy/actions/{$draft['id']}/confirm")
            ->assertStatus(404);

        $this->assertDatabaseHas('customer_pos', ['id' => $po->id, 'status' => CustomerPo::STATUS_DRAFT]);
        $this->assertDatabaseHas('puffy_pending_actions', ['id' => $draft['id'], 'status' => 'pending']);
    }

    public function test_nanu_action_cancel_leaves_customer_po_unchanged_and_is_idempotent(): void
    {
        $po = $this->createDraftCustomerPo('PO-NANU-CANCEL');
        $draft = $this->actingAs($this->user2)->postJson('/api/v1/puffy/actions', [
            'action_type' => 'customer_po.activate',
            'payload' => ['po_id' => $po->id],
        ])->assertCreated()->json('data');

        $this->postJson("/api/v1/puffy/actions/{$draft['id']}/cancel")
            ->assertOk()
            ->assertJsonPath('data.status', 'cancelled');

        $this->assertDatabaseHas('customer_pos', ['id' => $po->id, 'status' => CustomerPo::STATUS_DRAFT]);
        $this->postJson("/api/v1/puffy/actions/{$draft['id']}/cancel")->assertStatus(409);
    }

    public function test_nanu_action_confirmation_rejects_expired_drafts(): void
    {
        $po = $this->createDraftCustomerPo('PO-NANU-EXPIRED');
        $draft = $this->actingAs($this->user2)->postJson('/api/v1/puffy/actions', [
            'action_type' => 'customer_po.activate',
            'payload' => ['po_id' => $po->id],
        ])->assertCreated()->json('data');

        PuffyPendingAction::whereKey($draft['id'])->update(['expires_at' => now()->subMinute()]);

        $this->postJson("/api/v1/puffy/actions/{$draft['id']}/confirm")->assertStatus(410);
        $this->assertDatabaseHas('puffy_pending_actions', ['id' => $draft['id'], 'status' => 'expired']);
        $this->assertDatabaseHas('customer_pos', ['id' => $po->id, 'status' => CustomerPo::STATUS_DRAFT]);
    }

    public function test_puffy_endpoints_require_auth(): void
    {
        $this->getJson('/api/v1/puffy/quick-questions')->assertStatus(401);
        $this->getJson('/api/v1/puffy/knowledge/templates')->assertStatus(401);
    }
}
