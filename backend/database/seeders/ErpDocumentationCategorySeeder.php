<?php

namespace Database\\Seeders;

use App\\Models\\ErpDocumentationCategory;
use Illuminate\\Database\\Seeder;

class ErpDocumentationCategorySeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            ['dashboard', 'Dashboard', 'Ringkasan operasional, indikator, dan pemantauan aktivitas ERP.'],
            ['master-data', 'Master Data', 'Pengelolaan data dasar perusahaan, cabang, gudang, pelanggan, material, dan referensi.'],
            ['customer-po', 'Customer PO', 'Pencatatan dan pengelolaan pesanan pelanggan.'],
            ['material-inventory', 'Material & Inventory', 'Data material, gudang, saldo stok, penerimaan, pemakaian, dan pergerakan persediaan.'],
            ['work-order-production', 'Work Order & Production', 'Pengelolaan perintah kerja dan tahapan proses produksi.'],
            ['quality-control', 'Quality Control', 'Pencatatan pemeriksaan kualitas dan hasil QC.'],
            ['surat-jalan', 'Surat Jalan', 'Pembuatan, pengajuan, dan pencatatan pengiriman barang.'],
            ['invoice', 'Invoice', 'Penagihan berdasarkan Surat Jalan dan informasi perpajakan invoice.'],
            ['payment', 'Payment', 'Pencatatan pembayaran dan alokasi pembayaran ke tagihan.'],
            ['financial-reports', 'Financial Reports', 'Laporan keuangan, piutang, dan ringkasan transaksi.'],
            ['user-management-rbac', 'User Management & RBAC', 'Pengguna, role, dan hak akses aplikasi.'],
            ['template-management', 'Template Management', 'Pengelolaan template dokumen dan versi template.'],
            ['troubleshooting', 'Troubleshooting', 'Panduan diagnosis masalah dan penanganan kendala aplikasi.'],
            ['faq', 'FAQ', 'Pertanyaan umum mengenai penggunaan Sentanu Jaya ERP.'],
        ];

        foreach ($categories as $index => [$slug, $name, $description]) {
            ErpDocumentationCategory::updateOrCreate(
                ['slug' => $slug],
                [
                    'name' => $name,
                    'description' => $description,
                    'sort_order' => $index + 1,
                    'is_active' => true,
                ]
            );
        }
    }
}
