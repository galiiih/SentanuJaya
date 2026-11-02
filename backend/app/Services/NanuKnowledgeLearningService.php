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
            'title' => $title ?: 'Knowledge Candidate: ' . substr($question, 0, 50),
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
        if (!$candidate) {
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
