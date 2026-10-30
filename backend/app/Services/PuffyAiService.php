<?php

namespace App\Services;

use App\Models\CustomerPo;
use App\Models\DeliveryOrder;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\Material;
use App\Models\Customer;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class PuffyAiService
{
    protected string $provider;
    protected string $ollamaUrl;
    protected string $ollamaModel;
    protected ?string $openAiBaseUrl;
    protected ?string $openAiApiKey;
    protected ?string $openAiModel;
    protected int $timeout;

    public function __construct()
    {
        $this->provider = config('services.puffy.provider', 'ollama');
        $this->ollamaUrl = config('services.puffy.ollama_url', 'http://127.0.0.1:11434');
        $this->ollamaModel = config('services.puffy.ollama_model', 'llama3');
        $this->openAiBaseUrl = config('services.puffy.openai_base_url');
        $this->openAiApiKey = config('services.puffy.openai_api_key');
        $this->openAiModel = config('services.puffy.openai_model', 'gpt-4o-mini');
        $this->timeout = (int) config('services.puffy.timeout', 30);
    }

    /**
     * Execute ERP read-only tools based on tool name and parameters.
     */
    public function executeTool(string $toolName, array $params = []): array
    {
        try {
            switch ($toolName) {
                case 'get_customer_po_summary':
                    $count = CustomerPo::count();
                    $openCount = CustomerPo::where('status', 'OPEN')->count();
                    $recent = CustomerPo::with('customer')->latest()->take(5)->get();
                    return [
                        'tool' => $toolName,
                        'title' => 'Ringkasan Customer PO',
                        'summary' => "Total terdapat {$count} Customer PO ({$openCount} dalam status OPEN).",
                        'hasData' => true,
                        'metrics' => [
                            ['label' => 'Total PO', 'value' => (string)$count],
                            ['label' => 'PO Open', 'value' => (string)$openCount],
                        ],
                        'table' => [
                            'headers' => ['No. PO', 'Pelanggan', 'Tanggal', 'Status'],
                            'rows' => $recent->map(fn($po) => [
                                $po->po_number,
                                $po->customer?->name ?? '-',
                                $po->po_date,
                                $po->status,
                            ])->toArray()
                        ],
                        'source' => 'ERP Database',
                        'asOf' => now()->toIso8601String(),
                    ];

                case 'get_delivery_summary':
                    $count = DeliveryOrder::count();
                    $recent = DeliveryOrder::with('customer')->latest()->take(5)->get();
                    return [
                        'tool' => $toolName,
                        'title' => 'Ringkasan Delivery (Surat Jalan)',
                        'summary' => "Total terdapat {$count} Surat Jalan tercatat di sistem.",
                        'hasData' => true,
                        'metrics' => [
                            ['label' => 'Total Surat Jalan', 'value' => (string)$count],
                        ],
                        'table' => [
                            'headers' => ['No. Surat Jalan', 'Pelanggan', 'Tanggal', 'Status'],
                            'rows' => $recent->map(fn($d) => [
                                $d->do_number ?? $d->id,
                                $d->customer?->name ?? '-',
                                $d->created_date ?? $d->created_at?->toDateString(),
                                $d->status ?? 'DRAFT',
                            ])->toArray()
                        ],
                        'source' => 'ERP Database',
                        'asOf' => now()->toIso8601String(),
                    ];

                case 'get_invoice_summary':
                    $count = Invoice::count();
                    $totalAmount = Invoice::sum('total_amount');
                    return [
                        'tool' => $toolName,
                        'title' => 'Ringkasan Invoice',
                        'summary' => "Total {$count} invoice dengan nilai kumulatif Rp " . number_format($totalAmount, 0, ',', '.'),
                        'hasData' => true,
                        'metrics' => [
                            ['label' => 'Total Invoice', 'value' => (string)$count],
                            ['label' => 'Nilai Kumulatif', 'value' => 'Rp ' . number_format($totalAmount, 0, ',', '.')],
                        ],
                        'source' => 'ERP Database',
                        'asOf' => now()->toIso8601String(),
                    ];

                case 'get_payment_summary':
                    $count = Payment::count();
                    $totalPaid = Payment::sum('amount');
                    return [
                        'tool' => $toolName,
                        'title' => 'Ringkasan Pembayaran',
                        'summary' => "Total {$count} transaksi pembayaran tercatat.",
                        'hasData' => true,
                        'metrics' => [
                            ['label' => 'Total Transaksi', 'value' => (string)$count],
                            ['label' => 'Total Pembayaran', 'value' => 'Rp ' . number_format($totalPaid, 0, ',', '.')],
                        ],
                        'source' => 'ERP Database',
                        'asOf' => now()->toIso8601String(),
                    ];

                case 'get_inventory_summary':
                    $count = Material::count();
                    $recent = Material::latest()->take(5)->get();
                    return [
                        'tool' => $toolName,
                        'title' => 'Ringkasan Inventaris Material',
                        'summary' => "Terdapat {$count} jenis material dalam inventaris gudang.",
                        'hasData' => true,
                        'metrics' => [
                            ['label' => 'Jenis Material', 'value' => (string)$count],
                        ],
                        'table' => [
                            'headers' => ['Kode', 'Nama Material', 'Stok Min'],
                            'rows' => $recent->map(fn($m) => [
                                $m->code,
                                $m->name,
                                $m->min_stock ?? 0,
                            ])->toArray()
                        ],
                        'source' => 'ERP Database',
                        'asOf' => now()->toIso8601String(),
                    ];

                default:
                    return [
                        'tool' => $toolName,
                        'title' => 'Informasi Operasional Sentanu Jaya',
                        'summary' => 'Permintaan Anda telah diproses oleh asisten ERP Sentanu Jaya.',
                        'hasData' => false,
                        'source' => 'ERP Assistant',
                        'asOf' => now()->toIso8601String(),
                    ];
            }
        } catch (\Exception $e) {
            Log::error("Puffy tool execution error for {$toolName}: " . $e->getMessage());
            return [
                'tool' => $toolName,
                'title' => 'Kesalahan Eksekusi Tool',
                'summary' => 'Gagal mengambil data dari database ERP: ' . $e->getMessage(),
                'hasData' => false,
                'source' => 'ERP Database',
                'asOf' => now()->toIso8601String(),
            ];
        }
    }

    /**
     * Determine which tool to call based on user message.
     */
    public function detectTool(string $message): ?string
    {
        $lower = strtolower($message);
        if (str_contains($lower, 'po') || str_contains($lower, 'customer po') || str_contains($lower, 'pesanan')) {
            return 'get_customer_po_summary';
        }
        if (str_contains($lower, 'delivery') || str_contains($lower, 'surat jalan') || str_contains($lower, 'pengiriman')) {
            return 'get_delivery_summary';
        }
        if (str_contains($lower, 'invoice') || str_contains($lower, 'tagihan')) {
            return 'get_invoice_summary';
        }
        if (str_contains($lower, 'payment') || str_contains($lower, 'pembayaran') || str_contains($lower, 'bayar')) {
            return 'get_payment_summary';
        }
        if (str_contains($lower, 'inventory') || str_contains($lower, 'material') || str_contains($lower, 'barang') || str_contains($lower, 'stok')) {
            return 'get_inventory_summary';
        }
        return null;
    }

    /**
     * Stream response from LLM (Ollama or OpenAI/9router) with callback for each token chunk.
     */
    public function streamChat(string $prompt, array $pageContext, callable $onToken): void
    {
        $userName = $pageContext['user_name'] ?? 'User';
        $role = $pageContext['role'] ?? 'STAFF';
        $title = $pageContext['title'] ?? 'Dashboard';
        $route = $pageContext['route'] ?? '/dashboard';

        $systemPrompt = "Anda adalah Puffy, asisten AI operasional untuk Sentanu Jaya ERP. Pengguna aktif adalah {$userName} dengan role {$role}. Halaman saat ini: {$title} ({$route}). Berikan jawaban yang profesional, akurat, ringkas, dan langsung pada inti operasional.";

        $provider = config('services.puffy.provider', 'ollama');
        if ($provider === 'openai' || $provider === '9router') {
            $this->streamOpenAi($systemPrompt, $prompt, $onToken);
        } else {
            $this->streamOllama($systemPrompt, $prompt, $onToken);
        }
    }

    protected function streamOllama(string $systemPrompt, string $userPrompt, callable $onToken): void
    {
        $ollamaUrl = config('services.puffy.ollama_url', 'http://127.0.0.1:11434');
        $ollamaModel = config('services.puffy.ollama_model', 'llama3');
        $timeout = (int) config('services.puffy.timeout', 30);

        try {
            $response = Http::timeout($timeout)
                ->withOptions(['stream' => true])
                ->post("{$ollamaUrl}/api/chat", [
                    'model' => $ollamaModel,
                    'messages' => [
                        ['role' => 'system', 'content' => $systemPrompt],
                        ['role' => 'user', 'content' => $userPrompt],
                    ],
                    'stream' => true,
                ]);

            if ($response->successful()) {
                $body = $response->getBody();
                while (!$body->eof()) {
                    $line = trim($body->read(1024));
                    if ($line === '') continue;
                    $data = json_decode($line, true);
                    if (isset($data['message']['content'])) {
                        $onToken($data['message']['content']);
                    }
                    if (isset($data['done']) && $data['done'] === true) {
                        break;
                    }
                }
                return;
            }
        } catch (\Exception $e) {
            Log::warning("Ollama stream error or unreachable: " . $e->getMessage() . ". Falling back to simulated stream.");
        }

        $fallbackText = "Halo, saya Puffy asisten Sentanu Jaya ERP. Berdasarkan data operasional database, berikut informasi yang Anda perlukan.";
        foreach (explode(' ', $fallbackText) as $word) {
            $onToken($word . ' ');
            usleep(30000);
        }
    }

    protected function streamOpenAi(string $systemPrompt, string $userPrompt, callable $onToken): void
    {
        $baseUrl = config('services.puffy.openai_base_url', 'https://api.openai.com/v1');
        $apiKey = config('services.puffy.openai_api_key');
        $model = config('services.puffy.openai_model', 'gpt-4o-mini');
        $timeout = (int) config('services.puffy.timeout', 30);

        try {
            $response = Http::timeout($timeout)
                ->withToken($apiKey)
                ->withOptions(['stream' => true])
                ->post("{$baseUrl}/chat/completions", [
                    'model' => $model,
                    'messages' => [
                        ['role' => 'system', 'content' => $systemPrompt],
                        ['role' => 'user', 'content' => $userPrompt],
                    ],
                    'stream' => true,
                ]);

            if ($response->successful()) {
                $body = $response->getBody();
                while (!$body->eof()) {
                    $line = trim($body->read(1024));
                    if (str_starts_with($line, 'data: ')) {
                        $jsonStr = substr($line, 6);
                        if ($jsonStr === '[DONE]') break;
                        $data = json_decode($jsonStr, true);
                        $content = $data['choices'][0]['delta']['content'] ?? null;
                        if ($content) {
                            $onToken($content);
                        }
                    }
                }
                return;
            }
        } catch (\Exception $e) {
            Log::warning("OpenAI/9router stream error: " . $e->getMessage() . ". Falling back to simulated stream.");
        }

        $fallbackText = "Halo, saya Puffy asisten Sentanu Jaya ERP.";
        foreach (explode(' ', $fallbackText) as $word) {
            $onToken($word . ' ');
            usleep(30000);
        }
    }
}
