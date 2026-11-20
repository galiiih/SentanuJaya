<?php

namespace Tests\Feature;

use App\Services\PuffyAiService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class NanuOperationalRiskSummaryTest extends TestCase
{
    use RefreshDatabase;

    public function test_operational_risk_tool_is_available_and_detects_indonesian_and_english_prompts(): void
    {
        $service = app(PuffyAiService::class);

        $this->assertSame('get_operational_risk_summary', $service->detectTool('Tampilkan risiko operasional hari ini'));
        $this->assertSame('get_operational_risk_summary', $service->detectTool('Show the operational risk summary'));
        $this->assertContains(
            'get_operational_risk_summary',
            array_map(
                static fn (array $tool): string => $tool['function']['name'],
                $service->getToolDefinitions()
            )
        );
    }

    public function test_operational_risk_summary_returns_localized_english_output_for_empty_database(): void
    {
        $result = app(PuffyAiService::class)->executeTool('get_operational_risk_summary', [
            '_language' => 'en',
        ]);

        $this->assertTrue($result['hasData']);
        $this->assertSame('Operational Risk Summary', $result['title']);
        $this->assertSame(['Indicator', 'Count', 'Status', 'Details'], $result['table']['columns']);
        $this->assertStringContainsString('Operational review completed', $result['summary']);
        $this->assertCount(6, $result['metrics']);
    }

    public function test_operational_risk_summary_defaults_to_indonesian_output(): void
    {
        $result = app(PuffyAiService::class)->executeTool('get_operational_risk_summary');

        $this->assertSame('Ringkasan Risiko Operasional', $result['title']);
        $this->assertSame(['Indikator', 'Jumlah', 'Status', 'Keterangan'], $result['table']['columns']);
    }

    public function test_nanu_operational_risk_chat_uses_active_english_language(): void
    {
        $statuses = [];

        $result = app(PuffyAiService::class)->agenticChat(
            'Show the operational risk summary',
            null,
            ['language' => 'en', 'user_name' => 'Test User', 'role' => 'ADMIN', 'title' => 'Dashboard', 'route' => '/dashboard'],
            static function (string $message, ?array $ui = null) use (&$statuses): void {
                $statuses[] = $message;
            },
            static function (array $toolResult): void {},
            static function (string $token): void {},
        );

        $this->assertSame('Operational Risk Summary', $result['tool_result']['title']);
        $this->assertStringContainsString('Operational review completed', $result['reply']);
        $this->assertContains('Analyzing operational risks…', $statuses);
    }

    public function test_nanu_operational_risk_chat_defaults_to_indonesian_language(): void
    {
        $statuses = [];

        $result = app(PuffyAiService::class)->agenticChat(
            'Tampilkan ringkasan risiko operasional',
            null,
            ['language' => 'id', 'user_name' => 'Test User', 'role' => 'ADMIN', 'title' => 'Dashboard', 'route' => '/dashboard'],
            static function (string $message, ?array $ui = null) use (&$statuses): void {
                $statuses[] = $message;
            },
            static function (array $toolResult): void {},
            static function (string $token): void {},
        );

        $this->assertSame('Ringkasan Risiko Operasional', $result['tool_result']['title']);
        $this->assertStringContainsString('Pemeriksaan berhasil', $result['reply']);
        $this->assertContains('Menganalisis risiko operasional…', $statuses);
    }

    public function test_nanu_out_of_scope_response_defaults_to_indonesian_language(): void
    {
        $result = app(PuffyAiService::class)->agenticChat(
            'Bagaimana cuaca hari ini?',
            null,
            ['language' => 'id', 'user_name' => 'Test User', 'role' => 'ADMIN', 'title' => 'Dashboard', 'route' => '/dashboard'],
            static function (string $message, ?array $ui = null): void {},
            static function (?array $toolResult): void {},
            static function (string $token): void {},
        );

        $this->assertStringContainsString('Saya hanya dapat membantu operasional Sentanu Jaya ERP', $result['reply']);
    }

    public function test_nanu_out_of_scope_response_uses_active_english_language(): void
    {
        $result = app(PuffyAiService::class)->agenticChat(
            'What is the weather today?',
            null,
            ['language' => 'en', 'user_name' => 'Test User', 'role' => 'ADMIN', 'title' => 'Dashboard', 'route' => '/dashboard'],
            static function (string $message, ?array $ui = null): void {},
            static function (?array $toolResult): void {},
            static function (string $token): void {},
        );

        $this->assertStringContainsString('I can help with Sentanu Jaya ERP operations', $result['reply']);
    }
}
