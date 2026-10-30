<?php

namespace App\Services;

use App\Models\CustomerPo;
use App\Models\DeliveryOrder;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\Material;
use App\Models\Customer;
use App\Models\PuffyMessage;
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
    protected PuffyStreamParser $parser;

    public function __construct(PuffyStreamParser $parser)
    {
        $this->provider = config('services.puffy.provider', 'ollama');
        $this->ollamaUrl = config('services.puffy.ollama_url', 'http://127.0.0.1:11434');
        $this->ollamaModel = config('services.puffy.ollama_model', 'qwen3.5:9b');
        $this->openAiBaseUrl = config('services.puffy.openai_base_url', 'https://api.openai.com/v1');
        $this->openAiApiKey = config('services.puffy.openai_api_key');
        $this->openAiModel = config('services.puffy.openai_model', 'gpt-4o-mini');
        $this->timeout = (int) config('services.puffy.timeout', 30);
        $this->parser = $parser;
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
     * Get available ERP tool definitions for native LLM function calling.
     */
    public function getToolDefinitions(): array
    {
        return [
            [
                'type' => 'function',
                'function' => [
                    'name' => 'get_customer_po_summary',
                    'description' => 'Mendapatkan ringkasan dan statistik Customer PO (Pesanan Pelanggan) dari database ERP Sentanu Jaya.',
                    'parameters' => [
                        'type' => 'object',
                        'properties' => [],
                    ],
                ],
            ],
            [
                'type' => 'function',
                'function' => [
                    'name' => 'get_delivery_summary',
                    'description' => 'Mendapatkan ringkasan Surat Jalan (Delivery Orders) pengiriman barang dari gudang.',
                    'parameters' => [
                        'type' => 'object',
                        'properties' => [],
                    ],
                ],
            ],
            [
                'type' => 'function',
                'function' => [
                    'name' => 'get_invoice_summary',
                    'description' => 'Mendapatkan ringkasan Tagihan / Invoice dan total nilai finansial penagihan.',
                    'parameters' => [
                        'type' => 'object',
                        'properties' => [],
                    ],
                ],
            ],
            [
                'type' => 'function',
                'function' => [
                    'name' => 'get_payment_summary',
                    'description' => 'Mendapatkan ringkasan transaksi Pembayaran (Payments) dari pelanggan.',
                    'parameters' => [
                        'type' => 'object',
                        'properties' => [],
                    ],
                ],
            ],
            [
                'type' => 'function',
                'function' => [
                    'name' => 'get_inventory_summary',
                    'description' => 'Mendapatkan ringkasan inventaris material / barang di gudang.',
                    'parameters' => [
                        'type' => 'object',
                        'properties' => [],
                    ],
                ],
            ],
        ];
    }
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
     * Agentic chat execution supporting history, native tool calling loop (max 5 iterations), and robust parsing.
     */
    public function agenticChat(string $userMessage, ?string $conversationId, array $pageContext, callable $onStatus, callable $onToolResult, callable $onToken): array
    {
        $userName = $pageContext['user_name'] ?? 'User';
        $role = $pageContext['role'] ?? 'STAFF';
        $title = $pageContext['title'] ?? 'Dashboard';
        $route = $pageContext['route'] ?? '/dashboard';

        $systemPrompt = "Anda adalah Puffy, asisten AI operasional untuk Sentanu Jaya ERP. Pengguna aktif adalah {$userName} dengan role {$role}. Halaman saat ini: {$title} ({$route}). Gunakan tool ERP yang tersedia jika diperlukan untuk menjawab pertanyaan berbasis data aktual database. Jangan menebak angka atau data.";

        $messages = [
            ['role' => 'system', 'content' => $systemPrompt]
        ];

        if ($conversationId) {
            $pastMessages = PuffyMessage::where('conversation_id', $conversationId)
                ->orderBy('created_at', 'asc')
                ->take(10)
                ->get();

            foreach ($pastMessages as $msg) {
                $messages[] = [
                    'role' => $msg->role,
                    'content' => $msg->content,
                ];
            }
        }

        $messages[] = ['role' => 'user', 'content' => $userMessage];
        $tools = $this->getToolDefinitions();

        $iteration = 0;
        $maxIterations = 5;
        $finalReply = '';
        $executedToolResult = null;

        while ($iteration < $maxIterations) {
            $iteration++;
            $onStatus("Memproses analisis agen AI (Iterasi {$iteration})…", ['route' => $route]);

            $responsePayload = $this->callProviderWithToolsAndStream($messages, $tools, $onToken);

            if (isset($responsePayload['tool_calls']) && !empty($responsePayload['tool_calls'])) {
                $toolCall = $responsePayload['tool_calls'][0];
                $toolName = $toolCall['function']['name'] ?? null;
                $toolArgs = json_decode($toolCall['function']['arguments'] ?? '{}', true) ?? [];

                if ($toolName) {
                    $onStatus("Menjalankan tool ERP: {$toolName}…", ['route' => $route, 'target' => 'table']);
                    $executedToolResult = $this->executeTool($toolName, $toolArgs);
                    $onToolResult($executedToolResult);

                    $messages[] = [
                        'role' => 'assistant',
                        'content' => null,
                        'tool_calls' => [$toolCall],
                    ];
                    $messages[] = [
                        'role' => 'tool',
                        'name' => $toolName,
                        'content' => json_encode($executedToolResult),
                    ];
                    continue;
                }
            }

            // Fallback deterministic tool detection if LLM didn't call tool natively
            if (!$executedToolResult) {
                $detected = $this->detectTool($userMessage);
                if ($detected) {
                    $onStatus("Menjalankan tool ERP (fallback): {$detected}…", ['route' => $route, 'target' => 'table']);
                    $executedToolResult = $this->executeTool($detected);
                    $onToolResult($executedToolResult);
                    $messages[] = [
                        'role' => 'system',
                        'content' => "System injected ERP Tool Result for {$detected}:\n" . json_encode($executedToolResult),
                    ];
                    continue;
                }
            }

            $content = $responsePayload['content'] ?? '';
            if ($content !== '') {
                $finalReply = $content;
            } else if ($executedToolResult) {
                $finalReply = $executedToolResult['summary'] ?? "Berdasarkan data operasional Sentanu Jaya ERP, permintaan Anda telah diproses.";
                foreach (explode(' ', $finalReply) as $word) {
                    $onToken($word . ' ');
                    usleep(20000);
                }
            }
            break;
        }

        return [
            'reply' => trim($finalReply),
            'tool_result' => $executedToolResult,
        ];
    }

    protected function callProviderWithToolsAndStream(array $messages, array $tools, callable $onToken): array
    {
        try {
            if ($this->provider === 'openai' || $this->provider === '9router') {
                $response = Http::timeout($this->timeout)
                    ->withToken($this->openAiApiKey)
                    ->withOptions(['stream' => true])
                    ->post("{$this->openAiBaseUrl}/chat/completions", [
                        'model' => $this->openAiModel,
                        'messages' => $messages,
                        'tools' => $tools,
                        'tool_choice' => 'auto',
                        'stream' => true,
                    ]);

                if ($response->successful()) {
                    $body = $response->getBody();
                    $fullContent = '';
                    $toolCalls = null;
                    while (!$body->eof()) {
                        $chunk = $body->read(1024);
                        $parsedLines = $this->parser->feedOpenAiChunk($chunk);
                        foreach ($parsedLines as $item) {
                            if ($item === '[DONE]') break;
                            if (is_array($item)) {
                                $delta = $item['choices'][0]['delta'] ?? [];
                                $content = $delta['content'] ?? null;
                                if ($content) {
                                    $fullContent .= $content;
                                    $onToken($content);
                                }
                                if (isset($delta['tool_calls'])) {
                                    $toolCalls = $delta['tool_calls'];
                                }
                            }
                        }
                    }
                    return ['content' => $fullContent, 'tool_calls' => $toolCalls];
                }
            } else {
                // Ollama
                $response = Http::timeout($this->timeout)
                    ->withOptions(['stream' => true])
                    ->post("{$this->ollamaUrl}/api/chat", [
                        'model' => $this->ollamaModel,
                        'messages' => $messages,
                        'tools' => $tools,
                        'stream' => true,
                    ]);

                if ($response->successful()) {
                    $body = $response->getBody();
                    $fullContent = '';
                    $toolCalls = null;
                    while (!$body->eof()) {
                        $chunk = $body->read(1024);
                        $parsedObjects = $this->parser->feedOllamaChunk($chunk);
                        foreach ($parsedObjects as $data) {
                            $msg = $data['message'] ?? [];
                            $content = $msg['content'] ?? null;
                            if ($content) {
                                $fullContent .= $content;
                                $onToken($content);
                            }
                            if (isset($msg['tool_calls'])) {
                                $toolCalls = $msg['tool_calls'];
                            }
                            if (isset($data['done']) && $data['done'] === true) {
                                break 2;
                            }
                        }
                    }
                    // Flush remaining buffer
                    foreach ($this->parser->flushOllama() as $data) {
                        $msg = $data['message'] ?? [];
                        if (isset($msg['content'])) {
                            $fullContent += $msg['content'];
                            $onToken($msg['content']);
                        }
                        if (isset($msg['tool_calls'])) {
                            $toolCalls = $msg['tool_calls'];
                        }
                    }
                    return ['content' => $fullContent, 'tool_calls' => $toolCalls];
                }
            }
        } catch (\Exception $e) {
            Log::warning("AI Provider stream with tools failed: " . $e->getMessage());
        }

        // Fallback simulation if Ollama offline / unreachable
        $fallbackText = "Halo, saya Puffy asisten Sentanu Jaya ERP. Berdasarkan data operasional database, berikut informasi yang Anda perlukan.";
        foreach (explode(' ', $fallbackText) as $word) {
            $onToken($word . ' ');
            usleep(20000);
        }

        return ['content' => $fallbackText, 'tool_calls' => null];
    }
}
