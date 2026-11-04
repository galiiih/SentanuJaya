<?php

namespace App\Services;

use App\Models\NanuKnowledgeBase;
use App\Models\NanuKnowledgeCandidate;

class NanuKnowledgeLearningService
{
    /**
     * Store unanswered question or user correction as a knowledge candidate.
     */
    public function submitCandidate(string $userId, string $question, string $answer, ?string $module = null, ?string $title = null): NanuKnowledgeCandidate
    {
        return NanuKnowledgeCandidate::create([
            'submitted_by' => $userId,
            'title' => $title ?: 'Knowledge Candidate: '.substr($question, 0, 50),
            'module' => $module ?: 'General',
            'question' => $question,
            'answer' => $answer,
            'status' => 'pending_review',
        ]);
    }

    /**
     * Review and approve/reject candidate knowledge (ADMIN/OWNER only).
     */
    public function reviewCandidate(string $candidateId, string $reviewerUserId, string $status, ?string $notes = null): ?NanuKnowledgeBase
    {
        $candidate = NanuKnowledgeCandidate::find($candidateId);
        if (! $candidate) {
            return null;
        }

        $candidate->update([
            'reviewed_by' => $reviewerUserId,
            'status' => $status, // 'approved', 'rejected'
            'reviewer_notes' => $notes,
        ]);

        if ($status === 'approved') {
            return NanuKnowledgeBase::create([
                'title' => $candidate->title,
                'module' => $candidate->module,
                'question_pattern' => $candidate->question,
                'content' => $candidate->answer,
                'audience_role' => 'ALL',
                'is_published' => true,
            ]);
        }

        return null;
    }

    /**
     * Search published knowledge base for relevant guidance.
     */
    public function findRelevantGuidance(string $query, string $role = 'STAFF'): ?string
    {
        $queryLower = strtolower($query);
        $records = NanuKnowledgeBase::where('is_published', true)
            ->where(function ($q) use ($role) {
                $q->where('audience_role', 'ALL')
                    ->orWhere('audience_role', $role);
            })->get();

        foreach ($records as $rec) {
            if (str_contains($queryLower, strtolower($rec->question_pattern)) || str_contains(strtolower($rec->question_pattern), $queryLower)) {
                return "📌 **{$rec->title}** (Modul: {$rec->module})\n\n{$rec->content}";
            }
        }

        // Fallback standard procedural guidance
        $isUpdateQuestion = str_contains($queryLower, 'update')
            || str_contains($queryLower, 'mengupdate')
            || str_contains($queryLower, 'ubah')
            || str_contains($queryLower, 'edit')
            || str_contains($queryLower, 'perbarui')
            || str_contains($queryLower, 'memperbarui');

        if ($isUpdateQuestion && (str_contains($queryLower, 'stok') || str_contains($queryLower, 'stock'))) {
            return "📌 **Cara Memperbarui Saldo Stok Material**\nSaldo stok tidak diubah langsung dari master material. Gunakan transaksi sesuai kejadian fisik:\n1. Untuk stok masuk, buat **Material Receipt**, pilih gudang, supplier, material, dan kuantitas, lalu posting setelah diverifikasi.\n2. Untuk stok keluar, buat **Material Usage**, pilih gudang, material, kuantitas, dan referensi Work Order bila ada, lalu posting.\n3. Periksa kembali saldo pada menu **Gudang Material** dan riwayat mutasi stok.\n\nDengan cara ini, saldo stok, nilai persediaan, dan audit trail tetap konsisten.";
        }

        if ($isUpdateQuestion && str_contains($queryLower, 'material')) {
            return "📌 **Cara Meng-update Master Material**\n1. Buka menu **Master Data**.\n2. Pilih tab **Material / Cat**.\n3. Cari material yang akan diubah, lalu klik **Edit**.\n4. Perbarui field yang diperlukan, seperti nama, kategori, satuan, minimum stock, reorder level, atau status aktif.\n5. Klik **Simpan** dan pastikan notifikasi berhasil tampil.\n\nCatatan: hanya user **ADMIN** atau **OWNER** yang memiliki hak mengubah master material. STAFF hanya dapat melihat data material. Jika yang ingin diubah adalah jumlah stok, jangan mengedit master material; catat melalui transaksi penerimaan atau pemakaian material agar saldo stok dan audit tetap benar.";
        }

        if ($isUpdateQuestion && str_contains($queryLower, 'customer')) {
            return "📌 **Cara Meng-update Data Customer**\n1. Buka menu **Master Data**.\n2. Pilih tab **Customer**.\n3. Cari customer yang akan diubah, lalu klik **Edit**.\n4. Perbarui data yang diperlukan, seperti nama, alamat, NPWP, status pajak, telepon, atau email.\n5. Klik **Simpan** dan periksa notifikasi berhasil.\n\nPerubahan master customer membutuhkan hak akses **ADMIN** atau **OWNER**.";
        }

        if ($isUpdateQuestion && str_contains($queryLower, 'supplier')) {
            return "📌 **Cara Meng-update Data Supplier**\n1. Buka menu **Master Data**.\n2. Pilih tab **Supplier**.\n3. Cari supplier yang akan diubah, lalu klik **Edit**.\n4. Perbarui nama, alamat, telepon, atau email.\n5. Klik **Simpan** dan pastikan perubahan berhasil.\n\nPerubahan master supplier membutuhkan hak akses **ADMIN** atau **OWNER**.";
        }

        if (str_contains($queryLower, 'penerimaan material') || str_contains($queryLower, 'material dari supplier')) {
            return "📌 **Panduan Penerimaan Material dari Supplier**\n1. Buka menu Material Receipt.\n2. Pilih gudang dan supplier.\n3. Isi tanggal penerimaan, material, kuantitas, satuan, dan biaya.\n4. Simpan draft lalu posting setelah data diverifikasi.";
        }
        if (str_contains($queryLower, 'pemakaian material') || str_contains($queryLower, 'pengeluaran material')) {
            return "📌 **Panduan Pemakaian Material**\n1. Buka menu Material Usage.\n2. Pilih gudang, tanggal, dan material yang digunakan.\n3. Isi kuantitas serta referensi Work Order bila ada.\n4. Simpan draft lalu posting setelah data diverifikasi.";
        }
        if (str_contains($queryLower, 'acceptance')) {
            return "📌 **Panduan Customer Acceptance**\n1. Buka menu Surat Jalan dan pilih pengiriman terkait.\n2. Buat Customer Acceptance.\n3. Isi jumlah diterima, jumlah ditolak, dan alasan penolakan bila ada.\n4. Submit, lalu posting sesuai hak akses.";
        }
        if (str_contains($queryLower, 'stb') || str_contains($queryLower, 'surat tanda barang')) {
            return "📌 **Panduan STB**\n1. Buka menu STB/Custody.\n2. Klik STB baru dan pilih customer, item, lokasi, serta kuantitas.\n3. Simpan draft lalu submit.\n4. User ADMIN atau OWNER dapat mem-posting STB setelah data diverifikasi.";
        }
        if (str_contains($queryLower, 'posting invoice') || str_contains($queryLower, 'membatalkan invoice')) {
            return "📌 **Panduan Invoice**\n1. Buka menu Invoice.\n2. Pilih surat jalan yang eligible.\n3. Verifikasi customer, nilai, dan pajak.\n4. Posting invoice jika data sudah benar; gunakan pembatalan sesuai hak akses bila terjadi kesalahan.";
        }
        if (str_contains($queryLower, 'invoice') && str_contains($queryLower, 'surat jalan')) {
            return "📌 **Panduan Membuat Invoice dari Surat Jalan**\n1. Buka menu Invoice.\n2. Pilih customer dan surat jalan yang eligible.\n3. Verifikasi kuantitas, nilai, DPP, dan pajak.\n4. Simpan draft lalu posting invoice sesuai hak akses.";
        }
        if (str_contains($queryLower, 'alokasikan pembayaran')) {
            return "📌 **Panduan Alokasi Pembayaran**\n1. Buka menu Pembayaran.\n2. Pilih customer dan invoice yang akan dibayar.\n3. Isi nominal alokasi sesuai pembayaran yang diterima.\n4. Simpan dan verifikasi sisa tagihan.";
        }
        if (str_contains($queryLower, 'material') || str_contains($queryLower, 'bahan')) {
            return "📌 **Panduan Input Material**\n1. Buka menu Master Data > Material.\n2. Klik tombol Tambah Material.\n3. Isi nama material, kode, satuan (UOM), kategori, dan minimum stok.\n4. Simpan data untuk mendaftarkan material ke sistem.";
        }
        if (str_contains($queryLower, 'po') || str_contains($queryLower, 'customer po')) {
            return "📌 **Panduan Customer PO**\n1. Buka menu Customer PO.\n2. Buat pesanan baru, pilih Customer, tanggal, dan item pesanan.\n3. Masukkan qty dan harga.\n4. Simpan PO untuk diproses ke tahap Surat Tanda Barang / Produksi.";
        }
        if (str_contains($queryLower, 'qc') || str_contains($queryLower, 'quality control')) {
            return "📌 **Panduan Quality Control (QC)**\n1. Buka menu QC / Inspeksi.\n2. Pilih Work Order atau Goods Receipt yang akan diinspeksi.\n3. Masukkan jumlah qty OK dan qty Reject.\n4. Simpan hasil inspeksi.";
        }
        if (str_contains($queryLower, 'surat jalan') || str_contains($queryLower, 'delivery')) {
            return "📌 **Panduan Surat Jalan (Delivery Order)**\n1. Buka menu Surat Jalan.\n2. Pilih Customer PO yang telah disetujui.\n3. Tentukan item dan qty yang akan dikirim (tidak boleh melebihi sisa PO).\n4. Cetak Surat Jalan dan berikan kepada pengemudi.";
        }
        if (str_contains($queryLower, 'invoice') || str_contains($queryLower, 'tagihan')) {
            return "📌 **Panduan Pembuatan Invoice**\n1. Buka menu Invoice.\n2. Pilih Surat Jalan yang sudah terkirim dan diterima (qty_ok).\n3. Verifikasi PPN dan nominal tagihan.\n4. Terbitkan Invoice untuk ditagihkan ke customer.";
        }
        if (str_contains($queryLower, 'pembayaran') || str_contains($queryLower, 'payment')) {
            return "📌 **Panduan Pencatatan Pembayaran**\n1. Buka menu Pembayaran / Piutang.\n2. Pilih Invoice yang akan dilunasi.\n3. Masukkan jumlah pembayaran, tanggal, dan metode bayar (Transfer/Cash).\n4. Simpan pembayaran untuk mengupdate status invoice menjadi LUNAS.";
        }

        return null;
    }
}
