<?php

namespace App\Services;

class PuffyKnowledgeService
{
    protected array $templates = [
        [
            'id' => 'kb-dashboard',
            'category' => 'dashboard',
            'title' => 'Dashboard & Ringkasan Bisnis',
            'sample_questions' => [
                'Bagaimana kondisi bisnis hari ini?',
                'Ada pekerjaan yang belum selesai?',
                'Apa yang perlu saya perhatikan hari ini?',
                'Berapa total pekerjaan yang sedang berjalan?',
                'Bagaimana progres pekerjaan saat ini?',
            ],
            'intent' => 'dashboard_summary',
            'description' => 'Memantau metrik operasional dan ringkasan eksekutif harian Sentanu Jaya ERP.',
            'required_tools' => [],
            'response_guidance' => 'Berikan ringkasan operasional dengan ramah, langsung pada intinya, dan gunakan bahasa operasional profesional.',
            'route' => '/dashboard',
            'target' => 'kpi',
            'is_dynamic' => true,
        ],
        [
            'id' => 'kb-customer-po',
            'category' => 'customer-po',
            'title' => 'Customer PO (Pesanan Pelanggan)',
            'sample_questions' => [
                'Tampilkan PO customer.',
                'Ada PO yang belum diproses?',
                'Cari PO berdasarkan nomor PO.',
                'Berapa total PO yang masuk bulan ini?',
                'PO ini sudah masuk produksi belum?',
                'Siapa customer dari PO ini?',
            ],
            'intent' => 'customer_po',
            'description' => 'Mengelola dan memeriksa data Customer PO menggunakan nomor PO bisnis (po_number).',
            'required_tools' => ['get_customer_po_summary'],
            'response_guidance' => 'Tampilkan data PO dengan nomor PO bisnis aktual. Jangan gunakan UUID sebagai nomor dokumen.',
            'route' => '/customer-po',
            'target' => 'customer-po-summary',
            'is_dynamic' => true,
        ],
        [
            'id' => 'kb-materials',
            'category' => 'materials',
            'title' => 'Material dan Persediaan',
            'sample_questions' => [
                'Tampilkan stok material.',
                'Material apa yang stoknya menipis?',
                'Apakah stok cat masih tersedia?',
                'Berapa stok berdasarkan kode material?',
                'Material apa yang paling banyak digunakan?',
                'Apakah ada material yang stoknya kosong?',
            ],
            'intent' => 'inventory',
            'description' => 'Memeriksa persediaan gudang material, stok kritis, dan minimum reorder level.',
            'required_tools' => ['get_inventory_summary'],
            'response_guidance' => 'Gunakan kode material (code) dan nama aktual. Tandai jika stok di bawah minimum.',
            'route' => '/materials',
            'target' => 'material-stock-summary',
            'is_dynamic' => true,
        ],
        [
            'id' => 'kb-production',
            'category' => 'production',
            'title' => 'Produksi dan QC',
            'sample_questions' => [
                'Tampilkan pekerjaan yang sedang diproduksi.',
                'Pekerjaan mana yang belum selesai?',
                'Ada barang yang belum QC?',
                'Berapa jumlah barang yang lolos QC?',
                'Ada barang yang ditolak QC?',
                'Pekerjaan ini sudah selesai diproduksi?',
            ],
            'intent' => 'production',
            'description' => 'Memantau work order dan hasil inspeksi quality control (QC). Catatan: Jika tool belum tersedia di database, jelaskan dengan jujur.',
            'required_tools' => [],
            'response_guidance' => 'Jawab dengan ramah. Jika data produksi belum didukung tool otomatis, jelaskan secara transparan sebagai future enhancement.',
            'route' => '/dashboard',
            'target' => 'card',
            'is_dynamic' => false,
        ],
        [
            'id' => 'kb-delivery',
            'category' => 'delivery',
            'title' => 'Surat Jalan dan Pengiriman',
            'sample_questions' => [
                'Tampilkan surat jalan.',
                'Ada SJ yang belum dikirim?',
                'Apakah SJ tertentu sudah dikirim?',
                'Berapa SJ yang sudah dikirim bulan ini?',
                'Ada barang yang belum diserahkan ke customer?',
                'Tampilkan detail surat jalan terakhir.',
            ],
            'intent' => 'delivery',
            'description' => 'Melacak pengiriman barang menggunakan nomor Surat Jalan bisnis (sj_number).',
            'required_tools' => ['get_delivery_summary'],
            'response_guidance' => 'Selalu tampilkan nomor Surat Jalan bisnis (sj_number), bukan UUID.',
            'route' => '/delivery',
            'target' => 'delivery-summary',
            'is_dynamic' => true,
        ],
        [
            'id' => 'kb-invoicing',
            'category' => 'invoicing',
            'title' => 'Invoice dan Pajak',
            'sample_questions' => [
                'Tampilkan invoice.',
                'Ada invoice yang belum dibayar?',
                'Berapa total invoice bulan ini?',
                'Cari invoice berdasarkan nomor invoice.',
                'Berapa PPN invoice ini?',
                'Berapa PPh 23 yang dikenakan?',
                'Bagaimana cara menghitung DPP?',
                'Invoice ini berasal dari SJ mana?',
            ],
            'intent' => 'invoicing',
            'description' => 'Mengelola penagihan, nomor invoice (invoice_number), PPN, DPP, dan kaitan Surat Jalan.',
            'required_tools' => ['get_invoice_summary'],
            'response_guidance' => 'Tampilkan nomor invoice bisnis aktual dan rincian pajak sesuai konfigurasi ERP.',
            'route' => '/invoicing',
            'target' => 'invoice-summary',
            'is_dynamic' => true,
        ],
        [
            'id' => 'kb-payments',
            'category' => 'payments',
            'title' => 'Pembayaran dan Piutang',
            'sample_questions' => [
                'Tampilkan pembayaran customer.',
                'Ada invoice yang belum lunas?',
                'Berapa total pembayaran bulan ini?',
                'Cari pembayaran berdasarkan nomor pembayaran.',
                'Pembayaran ini untuk invoice mana?',
                'Berapa sisa tagihan customer?',
                'Apakah invoice ini sudah lunas?',
            ],
            'intent' => 'payments',
            'description' => 'Pencatatan pembayaran, alokasi dana, dan sisa piutang (payment_number).',
            'required_tools' => ['get_payment_summary'],
            'response_guidance' => 'Gunakan nomor pembayaran (payment_number) dan tampilkan sisa tagihan secara transparan.',
            'route' => '/payments',
            'target' => 'payment-summary',
            'is_dynamic' => true,
        ],
        [
            'id' => 'kb-navigation',
            'category' => 'navigation',
            'title' => 'Navigasi dan Panduan ERP',
            'sample_questions' => [
                'Buka halaman invoice.',
                'Saya mau melihat stok.',
                'Buka halaman customer PO.',
                'Tampilkan halaman surat jalan.',
                'Buka pembayaran.',
                'Bagaimana cara membuat invoice?',
                'Bagaimana cara membuat surat jalan?',
                'Bagaimana cara memasukkan PO customer?',
            ],
            'intent' => 'navigation',
            'description' => 'Panduan navigasi menu dan cara operasional modul di Sentanu Jaya ERP.',
            'required_tools' => [],
            'response_guidance' => 'Berikan panduan singkat dan arahkan rute serta maskot dengan tepat.',
            'route' => '/dashboard',
            'target' => 'header',
            'is_dynamic' => false,
        ],
    ];

    public function getQuickQuestions(): array
    {
        $grouped = [];
        foreach ($this->templates as $tmpl) {
            $grouped[$tmpl['category']] = [
                'title' => $tmpl['title'],
                'route' => $tmpl['route'],
                'questions' => $tmpl['sample_questions'],
            ];
        }
        return $grouped;
    }

    public function getTemplates(?string $category = null): array
    {
        if ($category) {
            return array_values(array_filter($this->templates, fn($t) => $t['category'] === $category));
        }
        return $this->templates;
    }

    public function findRelevantGuidance(string $message): ?string
    {
        $lower = mb_strtolower($message);
        foreach ($this->templates as $tmpl) {
            foreach ($tmpl['sample_questions'] as $q) {
                if (str_contains($lower, mb_strtolower(substr($q, 0, 10)))) {
                    return "Panduan Intent [{$tmpl['intent']}] ({$tmpl['title']}): {$tmpl['response_guidance']}";
                }
            }
        }
        return null;
    }
}
