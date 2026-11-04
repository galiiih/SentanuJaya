<?php

namespace App\Services;

use App\Models\Acceptance;
use App\Models\CustodyBalance;
use App\Models\CustomerPo;
use App\Models\DeliveryOrder;
use App\Models\GoodsReceipt;
use App\Models\InternalQcInspection;
use App\Models\Invoice;
use App\Models\Material;
use App\Models\Payment;
use App\Models\PuffyMessage;
use App\Models\Stock;
use App\Models\WorkOrder;
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
                            ['label' => 'Total PO', 'value' => (string) $count],
                            ['label' => 'PO Open', 'value' => (string) $openCount],
                        ],
                        'table' => [
                            'columns' => ['No. PO', 'Pelanggan', 'Tanggal', 'Status'],
                            'rows' => $recent->map(fn ($po) => [
                                $po->po_number,
                                $po->customer?->name ?? '-',
                                $po->po_date,
                                $po->status,
                            ])->toArray(),
                        ],
                        'source' => 'ERP Database',
                        'asOf' => now()->toIso8601String(),
                        'ui' => ['route' => '/customer-po', 'target' => 'customer-po-summary'],
                    ];

                case 'get_production_progress_summary':
                    $woCount = WorkOrder::count();
                    $openWoCount = WorkOrder::where('status', 'OPEN')->orWhere('status', 'IN_PROGRESS')->count();
                    $qcCount = InternalQcInspection::count();
                    $qcPassed = InternalQcInspection::where('result', 'PASS')->count();
                    $recentWo = WorkOrder::with(['customer', 'lines'])->latest()->take(5)->get();

                    return [
                        'tool' => $toolName,
                        'title' => 'Ringkasan Progres Produksi',
                        'summary' => "Total terdapat {$woCount} Work Order ({$openWoCount} sedang berjalan) dan {$qcCount} inspeksi QC ({$qcPassed} lolos).",
                        'hasData' => true,
                        'metrics' => [
                            ['label' => 'Total Work Order', 'value' => (string) $woCount],
                            ['label' => 'WO Berjalan', 'value' => (string) $openWoCount],
                            ['label' => 'Inspeksi QC Lolos', 'value' => "{$qcPassed}/{$qcCount}"],
                        ],
                        'table' => [
                            'columns' => ['No. WO', 'Pelanggan', 'Target Selesai', 'Status'],
                            'rows' => $recentWo->map(fn ($wo) => [
                                $wo->wo_number,
                                $wo->customer?->name ?? '-',
                                $wo->target_date?->toDateString() ?? '-',
                                $wo->status,
                            ])->toArray(),
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
                            ['label' => 'Total Surat Jalan', 'value' => (string) $count],
                        ],
                        'table' => [
                            'columns' => ['No. Surat Jalan', 'Pelanggan', 'Tanggal', 'Status'],
                            'rows' => $recent->map(fn ($d) => [
                                $d->sj_number ?? $d->do_number ?? $d->id,
                                $d->customer?->name ?? '-',
                                $d->delivery_date?->toDateString() ?? '-',
                                $d->status ?? 'DRAFT',
                            ])->toArray(),
                        ],
                        'source' => 'ERP Database',
                        'asOf' => now()->toIso8601String(),
                        'ui' => ['route' => '/delivery', 'target' => 'delivery-summary'],
                    ];

                case 'get_today_delivery_summary':
                    $today = now('Asia/Jakarta')->toDateString();
                    $todayDeliveries = DeliveryOrder::with('customer')
                        ->whereDate('delivery_date', $today)
                        ->where('status', '!=', DeliveryOrder::STATUS_CANCELLED)
                        ->latest('delivery_date')
                        ->latest('created_at')
                        ->take(5)
                        ->get();
                    $todayCount = DeliveryOrder::whereDate('delivery_date', $today)
                        ->where('status', '!=', DeliveryOrder::STATUS_CANCELLED)
                        ->count();

                    return [
                        'tool' => $toolName,
                        'title' => 'Surat Jalan Hari Ini',
                        'summary' => "Hari ini ({$today}) terdapat {$todayCount} Surat Jalan pengiriman.",
                        'hasData' => $todayCount > 0,
                        'metrics' => [
                            ['label' => 'Pengiriman Hari Ini', 'value' => (string) $todayCount],
                        ],
                        'table' => [
                            'columns' => ['No. Surat Jalan', 'Pelanggan', 'Tanggal Kirim', 'Status'],
                            'rows' => $todayDeliveries->map(fn ($d) => [
                                $d->sj_number ?? $d->do_number ?? $d->id,
                                $d->customer?->name ?? '-',
                                $d->delivery_date?->toDateString() ?? $today,
                                $d->status ?? 'DRAFT',
                            ])->toArray(),
                        ],
                        'source' => 'ERP Database',
                        'asOf' => now('Asia/Jakarta')->toIso8601String(),
                        'ui' => ['route' => '/delivery', 'target' => 'delivery-summary'],
                    ];

                case 'get_invoice_summary':
                    $count = Invoice::count();
                    $totalAmount = Invoice::sum('total_amount');
                    $recent = Invoice::with('customer')->latest()->take(5)->get();

                    return [
                        'tool' => $toolName,
                        'title' => 'Ringkasan Invoice',
                        'summary' => "Total {$count} invoice dengan nilai kumulatif Rp ".number_format($totalAmount, 0, ',', '.'),
                        'hasData' => true,
                        'metrics' => [
                            ['label' => 'Total Invoice', 'value' => (string) $count],
                            ['label' => 'Nilai Kumulatif', 'value' => 'Rp '.number_format($totalAmount, 0, ',', '.')],
                        ],
                        'table' => [
                            'columns' => ['No. Invoice', 'Pelanggan', 'Tanggal', 'Total', 'Status'],
                            'rows' => $recent->map(fn ($inv) => [
                                $inv->invoice_number,
                                $inv->customer?->name ?? '-',
                                $inv->invoice_date ?? $inv->created_at?->toDateString(),
                                'Rp '.number_format($inv->total_amount ?? 0, 0, ',', '.'),
                                $inv->status ?? 'DRAFT',
                            ])->toArray(),
                        ],
                        'source' => 'ERP Database',
                        'asOf' => now()->toIso8601String(),
                        'ui' => ['route' => '/invoicing', 'target' => 'invoice-summary'],
                    ];

                case 'get_invoice_tax_summary':
                    $invoiceCount = Invoice::count();
                    $dpp = (float) Invoice::sum('dpp');
                    $ppn = (float) Invoice::sum('ppn_amount');
                    $pph = (float) Invoice::sum('pph_amount');
                    $taxSummary = $invoiceCount === 0
                        ? 'Belum ada invoice yang memiliki data pajak di ERP.'
                        : "Dari {$invoiceCount} invoice, total DPP Rp ".number_format($dpp, 0, ',', '.').', PPN Rp '.number_format($ppn, 0, ',', '.').', dan PPh Rp '.number_format($pph, 0, ',', '.').'. Jika yang dimaksud invoice tertentu, sebutkan nomor invoice-nya ya.';

                    return [
                        'tool' => $toolName,
                        'title' => 'Ringkasan Pajak Invoice',
                        'summary' => $taxSummary,
                        'hasData' => $invoiceCount > 0,
                        'metrics' => [
                            ['label' => 'Invoice', 'value' => (string) $invoiceCount],
                            ['label' => 'DPP', 'value' => 'Rp '.number_format($dpp, 0, ',', '.')],
                            ['label' => 'PPN', 'value' => 'Rp '.number_format($ppn, 0, ',', '.')],
                            ['label' => 'PPh', 'value' => 'Rp '.number_format($pph, 0, ',', '.')],
                        ],
                        'table' => [
                            'columns' => ['Komponen', 'Total'],
                            'rows' => [
                                ['DPP', 'Rp '.number_format($dpp, 0, ',', '.')],
                                ['PPN', 'Rp '.number_format($ppn, 0, ',', '.')],
                                ['PPh', 'Rp '.number_format($pph, 0, ',', '.')],
                            ],
                        ],
                        'source' => 'ERP Database',
                        'asOf' => now('Asia/Jakarta')->toIso8601String(),
                        'ui' => ['route' => '/invoicing', 'target' => 'invoice-summary'],
                    ];

                case 'get_payment_summary':
                    $count = Payment::count();
                    $totalPaid = Payment::sum('amount');
                    $recent = Payment::with('customer')->latest()->take(5)->get();

                    return [
                        'tool' => $toolName,
                        'title' => 'Ringkasan Pembayaran',
                        'summary' => "Total {$count} transaksi pembayaran tercatat senilai Rp ".number_format($totalPaid, 0, ',', '.'),
                        'hasData' => true,
                        'metrics' => [
                            ['label' => 'Total Transaksi', 'value' => (string) $count],
                            ['label' => 'Total Pembayaran', 'value' => 'Rp '.number_format($totalPaid, 0, ',', '.')],
                        ],
                        'table' => [
                            'columns' => ['No. Pembayaran', 'Pelanggan', 'Tanggal', 'Jumlah', 'Metode'],
                            'rows' => $recent->map(fn ($p) => [
                                $p->payment_number,
                                $p->customer?->name ?? '-',
                                $p->payment_date ?? $p->created_at?->toDateString(),
                                'Rp '.number_format($p->amount ?? 0, 0, ',', '.'),
                                $p->payment_method ?? 'TRANSFER',
                            ])->toArray(),
                        ],
                        'source' => 'ERP Database',
                        'asOf' => now()->toIso8601String(),
                        'ui' => ['route' => '/payments', 'target' => 'payment-summary'],
                    ];

                case 'get_goods_received_summary':
                    $today = now('Asia/Jakarta')->toDateString();
                    $count = GoodsReceipt::count();
                    $todayCount = GoodsReceipt::whereDate('received_date', $today)->count();
                    $recent = GoodsReceipt::with(['customer', 'lines'])->latest()->take(5)->get();

                    return [
                        'tool' => $toolName,
                        'title' => 'Ringkasan Penerimaan Barang (Goods Received)',
                        'summary' => "Total terdapat {$count} Surat Tanda Barang (STB) / Goods Receipt ({$todayCount} diterima hari ini).",
                        'hasData' => true,
                        'metrics' => [
                            ['label' => 'Total Goods Receipt', 'value' => (string) $count],
                            ['label' => 'Diterima Hari Ini', 'value' => (string) $todayCount],
                        ],
                        'table' => [
                            'columns' => ['No. STB', 'Pelanggan', 'Tanggal Diterima', 'Status'],
                            'rows' => $recent->map(fn ($gr) => [
                                $gr->stb_number,
                                $gr->customer?->name ?? '-',
                                $gr->received_date,
                                $gr->status,
                            ])->toArray(),
                        ],
                        'source' => 'ERP Database',
                        'asOf' => now('Asia/Jakarta')->toIso8601String(),
                        'ui' => ['route' => '/goods-receipts', 'target' => 'goods-receipt-summary'],
                    ];

                case 'get_inventory_summary':
                    $materials = Material::with('stockUom')->get()->map(function (Material $material) {
                        $currentStock = (float) Stock::where('material_id', $material->id)->sum('quantity_on_hand');
                        $minimumStock = (float) ($material->minimum_stock ?? 0);
                        $reorderLevel = (float) ($material->reorder_level ?? 0);
                        $threshold = $reorderLevel > 0 ? $reorderLevel : $minimumStock;

                        return [
                            'code' => $material->code,
                            'name' => $material->name,
                            'stock' => $currentStock,
                            'threshold' => $threshold,
                            'unit' => $material->stockUom?->code ?? $material->unit,
                            'is_low' => $currentStock <= $threshold,
                        ];
                    });
                    $lowStock = $materials->filter(fn (array $material) => $material['is_low'])->values();
                    $displayMaterials = $lowStock->isNotEmpty() ? $lowStock : $materials->take(5)->values();
                    $lowCount = $lowStock->count();
                    $materialCount = $materials->count();

                    return [
                        'tool' => $toolName,
                        'title' => 'Ringkasan Inventaris Material',
                        'summary' => $lowCount > 0
                            ? "Ada {$lowCount} dari {$materialCount} jenis material yang stoknya menipis atau sudah mencapai batas minimum."
                            : "Tidak ada stok material yang menipis dari {$materialCount} jenis material yang terdaftar.",
                        'hasData' => $materialCount > 0,
                        'metrics' => [
                            ['label' => 'Jenis Material', 'value' => (string) $materialCount],
                            ['label' => 'Stok Menipis', 'value' => (string) $lowCount],
                        ],
                        'table' => [
                            'columns' => ['Kode', 'Nama Material', 'Stok Saat Ini', 'Batas Minimum', 'Satuan', 'Status'],
                            'rows' => $displayMaterials->map(fn (array $material) => [
                                $material['code'],
                                $material['name'],
                                $material['stock'],
                                $material['threshold'],
                                $material['unit'],
                                $material['is_low'] ? 'MENIPIS' : 'AMAN',
                            ])->toArray(),
                        ],
                        'source' => 'ERP Database',
                        'asOf' => now('Asia/Jakarta')->toIso8601String(),
                        'ui' => ['route' => '/materials', 'target' => 'material-stock-summary'],
                    ];

                case 'get_custody_summary':
                    $balances = CustodyBalance::with(['customer', 'customerItem', 'custodyLocation'])
                        ->where('balance_quantity', '>', 0)
                        ->latest('last_movement_at')
                        ->take(20)
                        ->get();
                    $totalQuantity = (float) CustodyBalance::where('balance_quantity', '>', 0)->sum('balance_quantity');

                    return [
                        'tool' => $toolName,
                        'title' => 'Ringkasan Custody Barang Customer',
                        'summary' => $balances->isEmpty()
                            ? 'Belum ada saldo custody barang customer yang aktif.'
                            : "Terdapat {$balances->count()} saldo custody aktif dengan total {$totalQuantity} unit barang customer.",
                        'hasData' => $balances->isNotEmpty(),
                        'metrics' => [
                            ['label' => 'Saldo Aktif', 'value' => (string) $balances->count()],
                            ['label' => 'Total Kuantitas', 'value' => (string) $totalQuantity],
                        ],
                        'table' => [
                            'columns' => ['Customer', 'Barang', 'Lokasi', 'Kuantitas', 'Tahap'],
                            'rows' => $balances->map(fn (CustodyBalance $balance) => [
                                $balance->customer?->name ?? '-',
                                $balance->customerItem?->name ?? '-',
                                $balance->custodyLocation?->name ?? '-',
                                (float) $balance->balance_quantity,
                                $balance->stage ?? '-',
                            ])->toArray(),
                        ],
                        'source' => 'ERP Database',
                        'asOf' => now('Asia/Jakarta')->toIso8601String(),
                        'ui' => ['route' => '/custody', 'target' => 'custody-summary'],
                    ];

                case 'get_acceptance_summary':
                    $acceptances = Acceptance::with(['deliveryOrder.customer'])
                        ->latest('acceptance_date')
                        ->latest('created_at')
                        ->take(20)
                        ->get();
                    $postedCount = Acceptance::where('status', Acceptance::STATUS_POSTED)->count();
                    $pendingCount = Acceptance::whereIn('status', [Acceptance::STATUS_DRAFT, Acceptance::STATUS_SUBMITTED])->count();

                    return [
                        'tool' => $toolName,
                        'title' => 'Ringkasan Customer Acceptance',
                        'summary' => $acceptances->isEmpty()
                            ? 'Belum ada customer acceptance yang tercatat.'
                            : "Terdapat {$acceptances->count()} customer acceptance, {$postedCount} sudah posted dan {$pendingCount} masih menunggu proses.",
                        'hasData' => $acceptances->isNotEmpty(),
                        'metrics' => [
                            ['label' => 'Total Acceptance', 'value' => (string) $acceptances->count()],
                            ['label' => 'Posted', 'value' => (string) $postedCount],
                            ['label' => 'Menunggu Proses', 'value' => (string) $pendingCount],
                        ],
                        'table' => [
                            'columns' => ['No. Acceptance', 'No. Surat Jalan', 'Customer', 'Tanggal', 'Status'],
                            'rows' => $acceptances->map(fn (Acceptance $acceptance) => [
                                $acceptance->acceptance_number,
                                $acceptance->deliveryOrder?->sj_number ?? '-',
                                $acceptance->deliveryOrder?->customer?->name ?? '-',
                                $acceptance->acceptance_date?->toDateString() ?? '-',
                                $acceptance->status,
                            ])->toArray(),
                        ],
                        'source' => 'ERP Database',
                        'asOf' => now('Asia/Jakarta')->toIso8601String(),
                        'ui' => ['route' => '/delivery', 'target' => 'delivery-summary'],
                    ];

                case 'get_operational_risk_summary':
                    $risks = [];
                    $openPoCount = CustomerPo::where('status', CustomerPo::STATUS_OPEN)->count();
                    $activeWorkOrderCount = WorkOrder::whereIn('status', ['OPEN', 'IN_PROGRESS'])->count();
                    $deliveryCount = DeliveryOrder::whereNotIn('status', [DeliveryOrder::STATUS_CANCELLED])->count();
                    $outstandingInvoiceCount = Invoice::whereIn('status', [Invoice::STATUS_POSTED, Invoice::STATUS_PARTIALLY_PAID, Invoice::STATUS_OVERDUE])->where('amount_due', '>', 0)->count();
                    $lowStockCount = Material::get()->filter(function (Material $material): bool {
                        $threshold = (float) ($material->reorder_level ?: $material->minimum_stock);

                        return (float) Stock::where('material_id', $material->id)->sum('quantity_on_hand') <= $threshold;
                    })->count();

                    if ($openPoCount === 0) {
                        $risks[] = 'Tidak ada Customer PO berstatus OPEN.';
                    }
                    if ($activeWorkOrderCount === 0) {
                        $risks[] = 'Tidak ada Work Order yang sedang berjalan.';
                    }
                    if ($deliveryCount === 0) {
                        $risks[] = 'Belum ada Surat Jalan aktif yang tercatat.';
                    }
                    if ($outstandingInvoiceCount > 0) {
                        $risks[] = "Ada {$outstandingInvoiceCount} invoice dengan saldo belum lunas.";
                    }
                    if ($lowStockCount > 0) {
                        $risks[] = "Ada {$lowStockCount} material pada atau di bawah batas minimum.";
                    }

                    return [
                        'tool' => $toolName,
                        'title' => 'Ringkasan Risiko Operasional',
                        'summary' => $risks === []
                            ? 'Tidak ditemukan indikator risiko operasional dari data ERP saat ini.'
                            : 'Indikator yang perlu diperhatikan: '.implode(' ', $risks),
                        'hasData' => $risks !== [],
                        'metrics' => [
                            ['label' => 'Indikator Risiko', 'value' => (string) count($risks)],
                            ['label' => 'PO Open', 'value' => (string) $openPoCount],
                            ['label' => 'WO Berjalan', 'value' => (string) $activeWorkOrderCount],
                            ['label' => 'Invoice Outstanding', 'value' => (string) $outstandingInvoiceCount],
                        ],
                        'table' => [
                            'columns' => ['Indikator'],
                            'rows' => array_map(static fn (string $risk): array => [$risk], $risks),
                        ],
                        'source' => 'ERP Database',
                        'asOf' => now('Asia/Jakarta')->toIso8601String(),
                        'ui' => ['route' => '/dashboard', 'target' => 'kpi'],
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
            Log::error("Puffy tool execution error for {$toolName}: ".$e->getMessage());

            return [
                'tool' => $toolName,
                'title' => 'Kesalahan Eksekusi Tool',
                'summary' => 'Gagal mengambil data dari database ERP: '.$e->getMessage(),
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
                        'properties' => new \stdClass,
                        'additionalProperties' => false,
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
                        'properties' => new \stdClass,
                        'additionalProperties' => false,
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
                        'properties' => new \stdClass,
                        'additionalProperties' => false,
                    ],
                ],
            ],
            [
                'type' => 'function',
                'function' => [
                    'name' => 'get_today_delivery_summary',
                    'description' => 'Menghitung jumlah Surat Jalan pengiriman hari ini berdasarkan delivery_date, tidak termasuk pengiriman yang dibatalkan.',
                    'parameters' => [
                        'type' => 'object',
                        'properties' => new \stdClass,
                        'additionalProperties' => false,
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
                        'properties' => new \stdClass,
                        'additionalProperties' => false,
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
                        'properties' => new \stdClass,
                        'additionalProperties' => false,
                    ],
                ],
            ],
            [
                'type' => 'function',
                'function' => [
                    'name' => 'get_invoice_tax_summary',
                    'description' => 'Mendapatkan ringkasan DPP, PPN, dan PPh dari invoice yang tersimpan di ERP. Jika invoice tertentu tidak disebutkan, jelaskan bahwa hasilnya adalah ringkasan seluruh invoice.',
                    'parameters' => [
                        'type' => 'object',
                        'properties' => new \stdClass,
                        'additionalProperties' => false,
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
                        'properties' => new \stdClass,
                        'additionalProperties' => false,
                    ],
                ],
            ],
            [
                'type' => 'function',
                'function' => [
                    'name' => 'get_inventory_summary',
                    'description' => 'Mendapatkan ringkasan stok material, termasuk material yang stoknya menipis atau berada di bawah batas minimum.',
                    'parameters' => [
                        'type' => 'object',
                        'properties' => new \stdClass,
                        'additionalProperties' => false,
                    ],
                ],
            ],
            [
                'type' => 'function',
                'function' => [
                    'name' => 'get_custody_summary',
                    'description' => 'Mendapatkan saldo aktif barang milik customer yang sedang berada di workshop/custody, termasuk customer, barang, lokasi, kuantitas, dan tahap.',
                    'parameters' => [
                        'type' => 'object',
                        'properties' => new \stdClass,
                        'additionalProperties' => false,
                    ],
                ],
            ],
            [
                'type' => 'function',
                'function' => [
                    'name' => 'get_acceptance_summary',
                    'description' => 'Mendapatkan ringkasan dan daftar customer acceptance berdasarkan surat jalan, termasuk status draft, submitted, posted, dan cancelled.',
                    'parameters' => [
                        'type' => 'object',
                        'properties' => new \stdClass,
                        'additionalProperties' => false,
                    ],
                ],
            ],
            [
                'type' => 'function',
                'function' => [
                    'name' => 'get_operational_risk_summary',
                    'description' => 'Menganalisis indikator risiko operasional dari PO open, Work Order berjalan, Surat Jalan, invoice outstanding, dan stok material minimum.',
                    'parameters' => [
                        'type' => 'object',
                        'properties' => new \stdClass,
                        'additionalProperties' => false,
                    ],
                ],
            ],
        ];
    }

    public function detectTool(string $message): ?string
    {
        $lower = strtolower($message);
        $hasTerm = static function (string ...$terms) use ($lower): bool {
            foreach ($terms as $term) {
                if (preg_match('/(?<!\pL)'.preg_quote($term, '/').'(?!\pL)/u', $lower) === 1) {
                    return true;
                }
            }

            return false;
        };

        if ($hasTerm('bagaimana', 'cara', 'panduan', 'langkah', 'how to')) {
            return null;
        }
        if ($hasTerm('acceptance', 'diterima customer', 'diterima sebagian', 'ditolak customer')) {
            return 'get_acceptance_summary';
        }
        if ($hasTerm('kirim', 'dikirim', 'dikirimkan', 'pengiriman')) {
            return $hasTerm('hari ini', 'today') ? 'get_today_delivery_summary' : 'get_delivery_summary';
        }
        if ($hasTerm('risiko operasional', 'risiko operasionalnya', 'risiko dari data')) {
            return 'get_operational_risk_summary';
        }
        if ($hasTerm('custody', 'saldo custody', 'lokasi barang', 'workshop') && ! $hasTerm('kirim', 'dikirim', 'dikirimkan', 'pengiriman', 'kirim kembali')) {
            return 'get_custody_summary';
        }
        if ($hasTerm('produksi', 'production', 'progress', 'progres', 'work order', 'wo')) {
            return 'get_production_progress_summary';
        }
        if ($hasTerm('po', 'customer po', 'pesanan')) {
            return 'get_customer_po_summary';
        }
        $asksToday = $hasTerm('hari ini', 'today');
        if ($asksToday && $hasTerm('kirim', 'pengiriman', 'surat jalan', 'delivery', 'deliveries')) {
            return 'get_today_delivery_summary';
        }
        if ($hasTerm('delivery', 'surat jalan', 'pengiriman')) {
            return 'get_delivery_summary';
        }
        if ($hasTerm('goods received', 'goods receipt', 'penerimaan barang', 'barang masuk', 'surat tanda barang', 'stb')) {
            return 'get_goods_received_summary';
        }
        if ($hasTerm('invoice', 'tagihan')) {
            if ($hasTerm('ppn', 'pph', 'dpp', 'pajak')) {
                return 'get_invoice_tax_summary';
            }

            return 'get_invoice_summary';
        }
        if ($hasTerm('payment', 'pembayaran', 'bayar')) {
            return 'get_payment_summary';
        }
        if ($hasTerm('inventory', 'material', 'stok', 'stock')) {
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
            ."ATURAN UTAMA & GUIDERAIL KETAT:\n"
            ."1. Nanu HANYA dan KHUSUS dirancang untuk membantu operasional, data ERP (Customer PO, Delivery/Surat Jalan, Invoice, Pembayaran/Payment, Inventaris/Material), proses bisnis, serta panduan fitur Sentanu Jaya Web App.\n"
            ."2. GUIDERAIL OUT-OF-SCOPE: Jika pengguna bertanya tentang topik di luar ERP Sentanu Jaya (seperti politik, cuaca, tokoh publik, pengetahuan umum, hiburan, pemrograman umum di luar project ini, atau hal lain yang tidak terkait Sentanu Jaya), TOLAK secara singkat dan tegas, contoh: 'Maaf, aku hanya dapat membantu pertanyaan seputar operasional, data, dan panduan ERP Sentanu Jaya ya.'\n"
            ."3. Berbicaralah dengan bahasa Indonesia yang sangat natural, ramah, ringkas, dan profesional seperti rekan kerja (misal: 'Aku cek dulu ya', 'Total tagihan bulan ini...').\n"
            ."4. JANGAN PERNAH mengawali jawaban dengan kalimat robotik kaku seperti perkenalan diri berulang.\n"
            ."5. Langsung jawab inti pertanyaan menggunakan data aktual dari tool ERP, dan jangan pernah mengarang nominal atau data.\n"
            .'6. Pertahankan konteks percakapan sebelumnya secara natural.';

        $knowledgeGuidance = $this->knowledgeService->findRelevantGuidance($userMessage);
        $learnedGuidance = $this->learningService->findRelevantGuidance($userMessage, $role);
        $combinedGuidance = implode("\n\n", array_filter([$knowledgeGuidance, $learnedGuidance]));
        if ($combinedGuidance) {
            $systemPrompt .= "\n\n[Panduan Knowledge & Intent]: {$combinedGuidance}";
        }

        $messages = [
            ['role' => 'system', 'content' => $systemPrompt],
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
        $isOutOfScope = preg_match('/(?<!\pL)(presiden|cuaca|politik|olahraga|hiburan|payroll|deployment|vps)(?!\pL)/u', $lowerUserMsg) === 1
            || str_contains($lowerUserMsg, 'job costing')
            || str_contains($lowerUserMsg, 'overhead produksi')
            || str_contains($lowerUserMsg, 'di luar data erp')
            || str_contains($lowerUserMsg, 'di luar erp');
        $tools = $isHowTo ? [] : $this->getToolDefinitions();

        if ($isOutOfScope) {
            $onStatus('Menyiapkan jawaban…', ['route' => $route]);
            $finalReply = 'Maaf ya, aku fokus membantu operasional dan penggunaan Sentanu Jaya ERP. Untuk pertanyaan di luar data atau fitur ERP, sebaiknya gunakan sumber atau tim yang sesuai.';
            foreach (explode(' ', $finalReply) as $word) {
                $onToken($word.' ');
                usleep(15000);
            }

            return [
                'reply' => $finalReply,
                'tool_result' => null,
            ];
        }

        // Pertanyaan harian yang sudah memiliki definisi bisnis yang pasti tidak perlu
        // melewati proses berpikir/tool-calling model. Selain lebih cepat, ini mencegah
        // request sederhana gagal karena batas waktu PHP saat model sedang cold start.
        $detectedBeforeProvider = $this->detectTool($userMessage);
        if (in_array($detectedBeforeProvider, [
            'get_today_delivery_summary',
            'get_goods_received_summary',
            'get_inventory_summary',
            'get_custody_summary',
            'get_acceptance_summary',
            'get_operational_risk_summary',
            'get_customer_po_summary',
            'get_production_progress_summary',
            'get_delivery_summary',
            'get_invoice_summary',
            'get_invoice_tax_summary',
            'get_payment_summary',
        ], true)) {
            $status = match ($detectedBeforeProvider) {
                'get_today_delivery_summary' => ['Memeriksa pengiriman hari ini…', ['route' => '/delivery', 'target' => 'delivery-summary']],
                'get_goods_received_summary' => ['Memeriksa barang masuk…', ['route' => '/goods-receipts', 'target' => 'goods-receipt-summary']],
                'get_custody_summary' => ['Memeriksa custody barang customer…', ['route' => '/custody', 'target' => 'custody-summary']],
                'get_acceptance_summary' => ['Memeriksa customer acceptance…', ['route' => '/delivery', 'target' => 'delivery-summary']],
                'get_operational_risk_summary' => ['Menganalisis risiko operasional…', ['route' => '/dashboard', 'target' => 'kpi']],
                'get_customer_po_summary' => ['Memeriksa Customer PO…', ['route' => '/customer-po', 'target' => 'customer-po-summary']],
                'get_production_progress_summary' => ['Memeriksa progres produksi…', ['route' => '/dashboard', 'target' => 'kpi']],
                'get_delivery_summary' => ['Memeriksa surat jalan…', ['route' => '/delivery', 'target' => 'delivery-summary']],
                'get_invoice_summary' => ['Memeriksa invoice…', ['route' => '/invoicing', 'target' => 'invoice-summary']],
                'get_invoice_tax_summary' => ['Memeriksa pajak invoice…', ['route' => '/invoicing', 'target' => 'invoice-summary']],
                'get_payment_summary' => ['Memeriksa pembayaran…', ['route' => '/payments', 'target' => 'payment-summary']],
                default => ['Memeriksa stok material…', ['route' => '/materials', 'target' => 'material-stock-summary']],
            };
            $onStatus($status[0], $status[1]);
            $executedToolResult = $this->executeTool($detectedBeforeProvider);
            $onToolResult($executedToolResult);
            $finalReply = $executedToolResult['summary'];
            foreach (explode(' ', $finalReply) as $word) {
                $onToken($word.' ');
                usleep(15000);
            }

            return [
                'reply' => trim($finalReply),
                'tool_result' => $executedToolResult,
            ];
        }

        $iteration = 0;
        $maxIterations = 5;
        $finalReply = '';
        $executedToolResult = null;

        if ($isHowTo) {
            $onStatus('Menyusun panduan operasional…', ['route' => $route]);
            $learnedGuide = $this->learningService->findRelevantGuidance($userMessage, $role);
            $guideText = $learnedGuide ?: $this->knowledgeService->findRelevantGuidance($userMessage);
            if (! $guideText) {
                $guideText = 'Aku bisa bantu menjelaskan langkahnya. Sebutkan nama modul atau dokumen yang ingin kamu proses, misalnya material, Customer PO, surat jalan, invoice, atau pembayaran, supaya panduannya tepat.';
            }
            $finalReply = $guideText;
            foreach (explode(' ', $finalReply) as $word) {
                $onToken($word.' ');
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
            $proxyOnToken = function ($token) use (&$iterationTokens) {
                $iterationTokens .= $token;
            };

            $responsePayload = $this->callProviderWithToolsAndStream($messages, $tools, $proxyOnToken);

            $hasToolCalls = isset($responsePayload['tool_calls']) && ! empty($responsePayload['tool_calls']);
            $detected = ! $hasToolCalls && ! $executedToolResult ? $this->detectTool($userMessage) : null;

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

            if ($detected && ! $executedToolResult) {
                $onStatus("Menjalankan tool ERP (fallback): {$detected}…", ['route' => $route, 'target' => 'table']);
                $executedToolResult = $this->executeTool($detected);
                $onToolResult($executedToolResult);
                $messages[] = [
                    'role' => 'assistant',
                    'content' => $iterationTokens,
                ];
                $messages[] = [
                    'role' => 'system',
                    'content' => "System injected ERP Tool Result for {$detected}:\n".json_encode($executedToolResult),
                ];

                continue;
            }

            if (! empty($responsePayload['provider_error']) && ! $executedToolResult) {
                $specificMsg = $responsePayload['error_message'] ?? 'Maaf, aku belum bisa terhubung ke model AI saat ini. Coba lagi sebentar ya.';
                $finalReply = "Maaf, {$specificMsg}";
                foreach (explode(' ', $finalReply) as $word) {
                    $onToken($word.' ');
                    usleep(15000);
                }
                break;
            }

            // Tool cards already contain the authoritative ERP result. Use its
            // deterministic summary as the final answer instead of allowing
            // the model to restate numbers, dates, or statuses inaccurately.
            if ($executedToolResult) {
                $finalReply = $executedToolResult['summary'] ?? 'Permintaan telah diproses berdasarkan data ERP Sentanu Jaya.';
                foreach (explode(' ', $finalReply) as $word) {
                    $onToken($word.' ');
                    usleep(15000);
                }
                break;
            }

            $content = $responsePayload['content'] !== '' ? $responsePayload['content'] : $iterationTokens;
            if ($content !== '') {
                $finalReply = $content;
                // Stream final content once to client
                foreach (explode(' ', $finalReply) as $word) {
                    $onToken($word.' ');
                    usleep(15000);
                }
            } elseif ($executedToolResult) {
                $finalReply = $executedToolResult['summary'] ?? 'Berdasarkan data operasional Sentanu Jaya ERP, permintaan Anda telah diproses.';
                foreach (explode(' ', $finalReply) as $word) {
                    $onToken($word.' ');
                    usleep(15000);
                }
            }
            break;
        }

        if ($finalReply === '') {
            $finalReply = $executedToolResult['summary']
                ?? 'Maaf, Nanu belum mendapatkan jawaban yang lengkap dari model. Silakan ulangi pertanyaannya dengan lebih spesifik.';
            foreach (explode(' ', $finalReply) as $word) {
                $onToken($word.' ');
                usleep(15000);
            }
        }

        return [
            'reply' => trim($finalReply),
            'tool_result' => $executedToolResult,
        ];
    }

    protected function callProviderWithToolsAndStream(array $messages, array $tools, callable $onToken): array
    {
        try {
            $isOllama = ($this->provider === 'ollama');
            $baseUrl = $isOllama ? "{$this->ollamaUrl}/v1" : $this->openAiBaseUrl;
            $apiKey = $isOllama ? 'ollama' : $this->openAiApiKey;
            $model = $isOllama ? $this->ollamaModel : $this->openAiModel;
            $timeout = max($this->timeout, 60);

            $payload = [
                'model' => $model,
                'messages' => $messages,
                'stream' => true,
            ];
            if (! empty($tools)) {
                $payload['tools'] = $tools;
                $payload['tool_choice'] = 'auto';
            }

            $response = Http::timeout($timeout)
                ->withToken($apiKey)
                ->withOptions(['stream' => true])
                ->post("{$baseUrl}/chat/completions", $payload);

            if (! $response->successful()) {
                $status = $response->status();
                $errorType = match (true) {
                    in_array($status, [401, 403]) => 'unauthorized',
                    $status === 404 => 'not_found',
                    $status === 429 => 'rate_limit',
                    $status >= 500 => 'server_error',
                    default => 'http_error',
                };
                Log::warning('Nanu AI provider returned unsuccessful HTTP response.', [
                    'provider' => $this->provider,
                    'model' => $model,
                    'http_status' => $status,
                    'body' => substr($response->body(), 0, 300),
                ]);

                return [
                    'content' => '',
                    'tool_calls' => null,
                    'provider_error' => $errorType,
                    'error_message' => match ($errorType) {
                        'unauthorized' => 'Autentikasi ke provider AI gagal (API key tidak valid).',
                        'not_found' => 'Endpoint atau model AI tidak ditemukan (404). Periksa konfigurasi model.',
                        'rate_limit' => 'Batas permintaan (rate limit) provider AI terlampaui.',
                        'server_error' => "Server provider AI mengalami gangguan internal (HTTP {$status}).",
                        default => "Provider AI mengembalikan error HTTP {$status}.",
                    },
                ];
            }

            if ($response->successful()) {
                $body = $response->getBody();
                $fullContent = '';
                $toolCalls = [];
                while (! $body->eof()) {
                    $chunk = $body->read(1024);
                    $parsedLines = $this->parser->feedOpenAiChunk($chunk);
                    foreach ($parsedLines as $item) {
                        if ($item === '[DONE]') {
                            break;
                        }
                        if (is_array($item)) {
                            $delta = $item['choices'][0]['delta'] ?? [];
                            $content = $delta['content'] ?? null;
                            if ($content) {
                                $fullContent .= $content;
                                $onToken($content);
                            }
                            foreach (($delta['tool_calls'] ?? []) as $toolIndex => $incomingToolCall) {
                                $index = $incomingToolCall['index'] ?? $toolIndex;
                                $toolCalls[$index] ??= [
                                    'id' => $incomingToolCall['id'] ?? null,
                                    'type' => $incomingToolCall['type'] ?? 'function',
                                    'function' => ['name' => '', 'arguments' => ''],
                                ];

                                if (! empty($incomingToolCall['id'])) {
                                    $toolCalls[$index]['id'] = $incomingToolCall['id'];
                                }
                                $incomingFunction = $incomingToolCall['function'] ?? [];
                                if (! empty($incomingFunction['name'])) {
                                    $toolCalls[$index]['function']['name'] .= $incomingFunction['name'];
                                }
                                if (array_key_exists('arguments', $incomingFunction)) {
                                    $arguments = $incomingFunction['arguments'];
                                    $toolCalls[$index]['function']['arguments'] .= is_string($arguments)
                                        ? $arguments
                                        : json_encode($arguments);
                                }
                            }
                        }
                    }
                }

                return ['content' => $fullContent, 'tool_calls' => array_values($toolCalls) ?: null];
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
