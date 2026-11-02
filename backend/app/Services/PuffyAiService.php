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
    protected PuffyKnowledgeService $knowledgeService;
    protected NanuKnowledgeLearningService $learningService;

    public function __construct(PuffyStreamParser $parser, PuffyKnowledgeService $knowledgeService, NanuKnowledgeLearningService $learningService)
    {
        $this->provider = config('services.puffy.provider', 'ollama');
        $this->ollamaUrl = config('services.puffy.ollama_url', 'http://127.0.0.1:11434');
        $this->ollamaModel = config('services.puffy.ollama_model', 'qwen3.5:9b');
        $this->openAiBaseUrl = config('services.puffy.openai_base_url', 'https://api.openai.com/v1');
        $this->openAiApiKey = config('services.puffy.openai_api_key');
        $this->openAiModel = config('services.puffy.openai_model', 'gpt-4o-mini');
        $this->timeout = (int) config('services.puffy.timeout', 30);
        $this->parser = $parser;
        $this->knowledgeService = $knowledgeService;
        $this->learningService = $learningService;
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
                            'columns' => ['No. PO', 'Pelanggan', 'Tanggal', 'Status'],
                            'rows' => $recent->map(fn($po) => [
                                $po->po_number,
                                $po->customer?->name ?? '-',
                                $po->po_date,
                                $po->status,
                            ])->toArray()
                        ],
                        'source' => 'ERP Database',
                        'asOf' => now()->toIso8601String(),
                        'ui' => ['route' => '/customer-po', 'target' => 'customer-po-summary'],
                    ];

                case 'get_production_progress_summary':
                    $woCount = \App\Models\WorkOrder::count();
                    $openWoCount = \App\Models\WorkOrder::where('status', 'OPEN')->orWhere('status', 'IN_PROGRESS')->count();
                    $qcCount = \App\Models\InternalQcInspection::count();
                    $qcPassed = \App\Models\InternalQcInspection::where('result', 'PASS')->count();
                    $recentWo = \App\Models\WorkOrder::with(['customer', 'lines'])->latest()->take(5)->get();
                    return [
                        'tool' => $toolName,
                        'title' => 'Ringkasan Progres Produksi',
                        'summary' => "Total terdapat {$woCount} Work Order ({$openWoCount} sedang berjalan) dan {$qcCount} inspeksi QC ({$qcPassed} lolos).",
                        'hasData' => true,
                        'metrics' => [
                            ['label' => 'Total Work Order', 'value' => (string)$woCount],
                            ['label' => 'WO Berjalan', 'value' => (string)$openWoCount],
                            ['label' => 'Inspeksi QC Lolos', 'value' => "{$qcPassed}/{$qcCount}"],
                        ],
                        'table' => [
                            'columns' => ['No. WO', 'Pelanggan', 'Target Selesai', 'Status'],
                            'rows' => $recentWo->map(fn($wo) => [
                                $wo->wo_number,
                                $wo->customer?->name ?? '-',
                                $wo->target_date?->toDateString() ?? '-',
                                $wo->status,
                            ])->toArray()
                        ],
                        'source' => 'ERP Database',
                        'asOf' => now()->toIso8601String(),
                        'ui' => ['route' => '/production', 'target' => 'production-progress-summary'],
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
                            'columns' => ['No. Surat Jalan', 'Pelanggan', 'Tanggal', 'Status'],
                            'rows' => $recent->map(fn($d) => [
                                $d->sj_number ?? $d->do_number ?? $d->id,
                                $d->customer?->name ?? '-',
                                $d->created_date ?? $d->created_at?->toDateString(),
                                $d->status ?? 'DRAFT',
                            ])->toArray()
                        ],
                        'source' => 'ERP Database',
                        'asOf' => now()->toIso8601String(),
                        'ui' => ['route' => '/delivery', 'target' => 'delivery-summary'],
                    ];

                case 'get_invoice_summary':
                    $count = Invoice::count();
                    $totalAmount = Invoice::sum('total_amount');
                    $recent = Invoice::with('customer')->latest()->take(5)->get();
                    return [
                        'tool' => $toolName,
                        'title' => 'Ringkasan Invoice',
                        'summary' => "Total {$count} invoice dengan nilai kumulatif Rp " . number_format($totalAmount, 0, ',', '.'),
                        'hasData' => true,
                        'metrics' => [
                            ['label' => 'Total Invoice', 'value' => (string)$count],
                            ['label' => 'Nilai Kumulatif', 'value' => 'Rp ' . number_format($totalAmount, 0, ',', '.')],
                        ],
                        'table' => [
                            'columns' => ['No. Invoice', 'Pelanggan', 'Tanggal', 'Total', 'Status'],
                            'rows' => $recent->map(fn($inv) => [
                                $inv->invoice_number,
                                $inv->customer?->name ?? '-',
                                $inv->invoice_date ?? $inv->created_at?->toDateString(),
                                'Rp ' . number_format($inv->total_amount ?? 0, 0, ',', '.'),
                                $inv->status ?? 'DRAFT',
                            ])->toArray()
                        ],
                        'source' => 'ERP Database',
                        'asOf' => now()->toIso8601String(),
                        'ui' => ['route' => '/invoicing', 'target' => 'invoice-summary'],
                    ];

                case 'get_payment_summary':
                    $count = Payment::count();
                    $totalPaid = Payment::sum('amount');
                    $recent = Payment::with('customer')->latest()->take(5)->get();
                    return [
                        'tool' => $toolName,
                        'title' => 'Ringkasan Pembayaran',
                        'summary' => "Total {$count} transaksi pembayaran tercatat senilai Rp " . number_format($totalPaid, 0, ',', '.'),
                        'hasData' => true,
                        'metrics' => [
                            ['label' => 'Total Transaksi', 'value' => (string)$count],
                            ['label' => 'Total Pembayaran', 'value' => 'Rp ' . number_format($totalPaid, 0, ',', '.')],
                        ],
                        'table' => [
                            'columns' => ['No. Pembayaran', 'Pelanggan', 'Tanggal', 'Jumlah', 'Metode'],
                            'rows' => $recent->map(fn($p) => [
                                $p->payment_number,
                                $p->customer?->name ?? '-',
                                $p->payment_date ?? $p->created_at?->toDateString(),
                                'Rp ' . number_format($p->amount ?? 0, 0, ',', '.'),
                                $p->payment_method ?? 'TRANSFER',
                            ])->toArray()
                        ],
                        'source' => 'ERP Database',
                        'asOf' => now()->toIso8601String(),
                        'ui' => ['route' => '/payments', 'target' => 'payment-summary'],
                    ];

                case 'get_goods_received_summary':
                    $today = now('Asia/Jakarta')->toDateString();
                    $count = \App\Models\GoodsReceipt::count();
                    $todayCount = \App\Models\GoodsReceipt::whereDate('received_date', $today)->count();
                    $recent = \App\Models\GoodsReceipt::with(['customer', 'lines'])->latest()->take(5)->get();
                    return [
                        'tool' => $toolName,
                        'title' => 'Ringkasan Penerimaan Barang (Goods Received)',
                        'summary' => "Total terdapat {$count} Surat Tanda Barang (STB) / Goods Receipt ({$todayCount} diterima hari ini).",
                        'hasData' => true,
                        'metrics' => [
                            ['label' => 'Total Goods Receipt', 'value' => (string)$count],
                            ['label' => 'Diterima Hari Ini', 'value' => (string)$todayCount],
                        ],
                        'table' => [
                            'columns' => ['No. STB', 'Pelanggan', 'Tanggal Diterima', 'Status'],
                            'rows' => $recent->map(fn($gr) => [
                                $gr->stb_number,
                                $gr->customer?->name ?? '-',
                                $gr->received_date,
                                $gr->status,
                            ])->toArray()
                        ],
                        'source' => 'ERP Database',
                        'asOf' => now('Asia/Jakarta')->toIso8601String(),
                        'ui' => ['route' => '/goods-receipts', 'target' => 'goods-receipt-summary'],
                    ];
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
                            'columns' => ['Kode', 'Nama Material', 'Stok Min'],
                            'rows' => $recent->map(fn($m) => [
                                $m->code,
                                $m->name,
                                $m->min_stock ?? 0,
                            ])->toArray()
                        ],
                        'source' => 'ERP Database',
                        'asOf' => now()->toIso8601String(),
                        'ui' => ['route' => '/materials', 'target' => 'material-stock-summary'],
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
                    'name' => 'get_production_progress_summary',
                    'description' => 'Mendapatkan ringkasan progress produksi, Work Order (WO) yang berjalan, status pengerjaan, dan inspeksi QC di Sentanu Jaya.',
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
                    'name' => 'get_goods_received_summary',
                    'description' => 'Mendapatkan ringkasan penerimaan barang (Goods Received / Surat Tanda Barang / STB).',
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
        if (str_contains($lower, 'bagaimana') || str_contains($lower, 'cara') || str_contains($lower, 'panduan') || str_contains($lower, 'langkah') || str_contains($lower, 'how to')) {
            return null;
        }
        if (str_contains($lower, 'produksi') || str_contains($lower, 'production') || str_contains($lower, 'progress') || str_contains($lower, 'progres') || str_contains($lower, 'work order') || str_contains($lower, 'wo')) {
            return 'get_production_progress_summary';
        }
        if (str_contains($lower, 'po') || str_contains($lower, 'customer po') || str_contains($lower, 'pesanan')) {
            return 'get_customer_po_summary';
        }
        if (str_contains($lower, 'delivery') || str_contains($lower, 'surat jalan') || str_contains($lower, 'pengiriman')) {
            return 'get_delivery_summary';
        }
        if (str_contains($lower, 'goods received') || str_contains($lower, 'goods receipt') || str_contains($lower, 'penerimaan barang') || str_contains($lower, 'surat tanda barang') || str_contains($lower, 'stb')) {
            return 'get_goods_received_summary';
        }
        if (str_contains($lower, 'invoice') || str_contains($lower, 'tagihan')) {
            return 'get_invoice_summary';
        }
        if (str_contains($lower, 'payment') || str_contains($lower, 'pembayaran') || str_contains($lower, 'bayar')) {
            return 'get_payment_summary';
        }
        if (str_contains($lower, 'inventory') || str_contains($lower, 'material') || str_contains($lower, 'stok') || str_contains($lower, 'stock')) {
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

        $systemPrompt = "Anda adalah Nanu, asisten operasional Sentanu Jaya ERP. Pengguna aktif: {$userName} (Role: {$role}). Halaman: {$title} ({$route}).\n\n"
            . "ATURAN UTAMA & GUIDERAIL KETAT:\n"
            . "1. Nanu HANYA dan KHUSUS dirancang untuk membantu operasional, data ERP (Customer PO, Delivery/Surat Jalan, Invoice, Pembayaran/Payment, Inventaris/Material), proses bisnis, serta panduan fitur Sentanu Jaya Web App.\n"
            . "2. GUIDERAIL OUT-OF-SCOPE: Jika pengguna bertanya tentang topik di luar ERP Sentanu Jaya (seperti politik, cuaca, tokoh publik, pengetahuan umum, hiburan, pemrograman umum di luar project ini, atau hal lain yang tidak terkait Sentanu Jaya), TOLAK secara singkat dan tegas, contoh: 'Maaf, aku hanya dapat membantu pertanyaan seputar operasional, data, dan panduan ERP Sentanu Jaya ya.'\n"
            . "3. Berbicaralah dengan bahasa Indonesia yang sangat natural, ramah, ringkas, dan profesional seperti rekan kerja (misal: 'Aku cek dulu ya', 'Total tagihan bulan ini...').\n"
            . "4. JANGAN PERNAH mengawali jawaban dengan kalimat robotik kaku seperti perkenalan diri berulang.\n"
            . "5. Langsung jawab inti pertanyaan menggunakan data aktual dari tool ERP, dan jangan pernah mengarang nominal atau data.\n"
            . "6. Pertahankan konteks percakapan sebelumnya secara natural.";

        $knowledgeGuidance = $this->knowledgeService->findRelevantGuidance($userMessage);
        $learnedGuidance = $this->learningService->findRelevantGuidance($userMessage, $role);
        $combinedGuidance = implode("\n\n", array_filter([$knowledgeGuidance, $learnedGuidance]));
        if ($combinedGuidance) {
            $systemPrompt .= "\n\n[Panduan Knowledge & Intent]: {$combinedGuidance}";
        }

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
        $lowerUserMsg = strtolower($userMessage);
        $isHowTo = str_contains($lowerUserMsg, 'bagaimana') || str_contains($lowerUserMsg, 'cara') || str_contains($lowerUserMsg, 'panduan') || str_contains($lowerUserMsg, 'langkah') || str_contains($lowerUserMsg, 'how to');
        $tools = $isHowTo ? [] : $this->getToolDefinitions();

        $iteration = 0;
        $maxIterations = 5;
        $finalReply = '';
        $executedToolResult = null;

        if ($isHowTo) {
            $onStatus("Menyusun panduan operasional…", ['route' => $route]);
            $guideText = $this->knowledgeService->findRelevantGuidance($userMessage);
            $learnedGuide = $this->learningService->findRelevantGuidance($userMessage, $role);
            if ($learnedGuide) {
                $guideText = $guideText ? ($guideText . "\n\n" . $learnedGuide) : $learnedGuide;
            }
            if (!$guideText) {
                $guideText = "Berikut adalah panduan umum untuk '{$userMessage}' di Sentanu Jaya ERP:\n1. Pastikan Anda memiliki hak akses (RBAC) yang sesuai dengan menu terkait.\n2. Navigasikan ke menu yang relevan melalui sidebar aplikasi.\n3. Ikuti form atau tombol aksi yang tersedia sesuai alur dokumen standar.";
            }
            $finalReply = $guideText;
            foreach (explode(' ', $finalReply) as $word) {
                $onToken($word . ' ');
                usleep(15000);
            }
            return [
                'reply' => trim($finalReply),
                'tool_result' => null,
            ];
        }

        while ($iteration < $maxIterations) {
            $iteration++;
            $onStatus("Memproses analisis agen AI (Iterasi {$iteration})…", ['route' => $route]);

            // Buffer tokens during intermediate tool-seeking iterations to avoid double streaming
            $iterationTokens = '';
            $proxyOnToken = function($token) use (&$iterationTokens) {
                $iterationTokens .= $token;
            };

            $responsePayload = $this->callProviderWithToolsAndStream($messages, $tools, $proxyOnToken);

            $hasToolCalls = isset($responsePayload['tool_calls']) && !empty($responsePayload['tool_calls']);
            $detected = !$hasToolCalls && !$executedToolResult ? $this->detectTool($userMessage) : null;

            if ($hasToolCalls) {
                $toolCall = $responsePayload['tool_calls'][0];
                $toolName = $toolCall['function']['name'] ?? null;
                $toolArgs = json_decode($toolCall['function']['arguments'] ?? '{}', true) ?? [];

                if ($toolName) {
                    $onStatus("Menjalankan tool ERP: {$toolName}…", ['route' => $route, 'target' => 'table']);
                    $executedToolResult = $this->executeTool($toolName, $toolArgs);
                    $onToolResult($executedToolResult);

                    $messages[] = [
                        'role' => 'assistant',
                        'content' => $responsePayload['content'] ?? $iterationTokens,
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

            if ($detected && !$executedToolResult) {
                $onStatus("Menjalankan tool ERP (fallback): {$detected}…", ['route' => $route, 'target' => 'table']);
                $executedToolResult = $this->executeTool($detected);
                $onToolResult($executedToolResult);
                $messages[] = [
                    'role' => 'assistant',
                    'content' => $iterationTokens,
                ];
                $messages[] = [
                    'role' => 'system',
                    'content' => "System injected ERP Tool Result for {$detected}:\n" . json_encode($executedToolResult),
                ];
                continue;
            }

            if (!empty($responsePayload['provider_error']) && !$executedToolResult) {
                $specificMsg = $responsePayload['error_message'] ?? "Maaf, aku belum bisa terhubung ke model AI saat ini. Coba lagi sebentar ya.";
                $finalReply = "Maaf, {$specificMsg}";
                foreach (explode(' ', $finalReply) as $word) {
                    $onToken($word . ' ');
                    usleep(15000);
                }
                break;
            }

            $content = $responsePayload['content'] !== '' ? $responsePayload['content'] : $iterationTokens;
            if ($content !== '') {
                $finalReply = $content;
                // Stream final content once to client
                foreach (explode(' ', $finalReply) as $word) {
                    $onToken($word . ' ');
                    usleep(15000);
                }
            } else if ($executedToolResult) {
                $finalReply = $executedToolResult['summary'] ?? "Berdasarkan data operasional Sentanu Jaya ERP, permintaan Anda telah diproses.";
                foreach (explode(' ', $finalReply) as $word) {
                    $onToken($word . ' ');
                    usleep(15000);
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

                if (!$response->successful()) {
                    $status = $response->status();
                    $errorType = match(true) {
                        in_array($status, [401, 403]) => 'unauthorized',
                        $status === 404 => 'not_found',
                        $status === 429 => 'rate_limit',
                        $status >= 500 => 'server_error',
                        default => 'http_error',
                    };
                    Log::warning('Nanu AI provider returned unsuccessful HTTP response.', [
                        'provider' => $this->provider,
                        'model' => $this->provider === 'ollama' ? $this->ollamaModel : $this->openAiModel,
                        'http_status' => $status,
                        'body' => substr($response->body(), 0, 300),
                    ]);
                    return [
                        'content' => '',
                        'tool_calls' => null,
                        'provider_error' => $errorType,
                        'error_message' => match($errorType) {
                            'unauthorized' => 'Autentikasi ke provider AI gagal (API key tidak valid).',
                            'not_found' => "Endpoint atau model AI tidak ditemukan (404). Periksa konfigurasi model.",
                            'rate_limit' => 'Batas permintaan (rate limit) provider AI terlampaui.',
                            'server_error' => "Server provider AI mengalami gangguan internal (HTTP {$status}).",
                            default => "Provider AI mengembalikan error HTTP {$status}.",
                        },
                    ];
                }

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
                $payload = [
                    'model' => $this->ollamaModel,
                    'messages' => $messages,
                    'stream' => true,
                ];
                if (!empty($tools)) {
                    $payload['tools'] = $tools;
                }
                $response = Http::timeout($this->timeout)
                    ->withOptions(['stream' => true])
                    ->post("{$this->ollamaUrl}/api/chat", $payload);

                if (!$response->successful()) {
                    $status = $response->status();
                    $errorType = match(true) {
                        in_array($status, [401, 403]) => 'unauthorized',
                        $status === 404 => 'not_found',
                        $status === 429 => 'rate_limit',
                        $status >= 500 => 'server_error',
                        default => 'http_error',
                    };
                    Log::warning('Nanu Ollama provider returned unsuccessful HTTP response.', [
                        'provider' => $this->provider,
                        'model' => $this->ollamaModel,
                        'http_status' => $status,
                        'body' => substr($response->body(), 0, 300),
                    ]);
                    return [
                        'content' => '',
                        'tool_calls' => null,
                        'provider_error' => $errorType,
                        'error_message' => match($errorType) {
                            'unauthorized' => 'Autentikasi ke Ollama gagal.',
                            'not_found' => "Model Ollama '{$this->ollamaModel}' tidak ditemukan (404). Periksa apakah model sudah di-pull.",
                            'rate_limit' => 'Batas permintaan Ollama terlampaui.',
                            'server_error' => "Server Ollama mengalami gangguan internal (HTTP {$status}).",
                            default => "Ollama mengembalikan error HTTP {$status}.",
                        },
                    ];
                }

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
                        $fullContent .= $msg['content'];
                        $onToken($msg['content']);
                    }
                    if (isset($msg['tool_calls'])) {
                        $toolCalls = $msg['tool_calls'];
                    }
                }
                return ['content' => $fullContent, 'tool_calls' => $toolCalls];
            }
        } catch (\Throwable $e) {
            $msg = strtolower($e->getMessage());
            $errorType = 'provider_exception';
            $errorDesc = 'Terjadi kesalahan pada sistem AI.';
            if (str_contains($msg, 'timeout') || str_contains($msg, 'timed out')) {
                $errorType = 'timeout';
                $errorDesc = 'Permintaan ke model AI melebihi batas waktu (timeout).';
            } elseif (str_contains($msg, 'connection') || str_contains($msg, 'refused') || str_contains($msg, 'could not resolve')) {
                $errorType = 'connection_refused';
                $errorDesc = 'Tidak dapat terhubung ke server LLM (Ollama/9Router offline).';
            }

            Log::warning('Nanu LLM provider request failed with exception.', [
                'provider' => $this->provider,
                'model' => $this->provider === 'ollama' ? $this->ollamaModel : $this->openAiModel,
                'exception' => $e::class,
                'message' => $e->getMessage(),
            ]);

            return [
                'content' => '',
                'tool_calls' => null,
                'provider_error' => $errorType,
                'error_message' => $errorDesc,
            ];
        }

        // Do not disguise an unsuccessful provider response as a successful generic greeting.
        Log::warning('Nanu LLM provider returned an unsuccessful HTTP response.', [
            'provider' => $this->provider,
            'model' => $this->provider === 'ollama' ? $this->ollamaModel : $this->openAiModel,
        ]);

        return [
            'content' => '',
            'tool_calls' => null,
            'provider_error' => 'provider_http_error',
        ];
    }
}
