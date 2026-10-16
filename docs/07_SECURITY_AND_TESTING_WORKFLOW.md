# SOP KEAMANAN, TESTING & DEBUGGING (SECURITY & VERIFICATION STANDARDS)

## 📌 Prinsip Utama
Setiap modul dan fitur yang dikembangkan di Sentanu ERP **WAJIB** melalui pengujian keamanan (*Security Audit*) dan pengujian fungsi (*Verification & Debugging*) sebelum dinyatakan selesai (*Definition of Done*).

---

## 🔒 1. PERNYATAAN & STANDAR KEAMANAN (SECURITY WORKFLOW)

### A. Tiga Lapis Otorisasi Wajib (Backend Enforcement)
Setiap endpoint API dan Controller Laravel **wajib** melewati 3 lapis pemeriksaan:
1. **Permission Check**: Memeriksa apakah role user memiliki hak akses (contoh: `invoice.post`).
2. **Branch Scoping Check**: Memastikan user hanya mengakses data cabang yang diizinkan (`branch_id`).
3. **Document State Machine Check**: Memastikan dokumen transaksi dalam status yang sesuai (contoh: invoice hanya bisa terbit dari SJ berstatus `ACCEPTED`).

### B. Pemisahan Tugas (Segregation of Duties - SoD)
- User yang membuat draft transaksi (**Creator**) **DILARANG** menyetujui/mem-posting transaksi yang sama (**Approver**).
- Sistem menolak secara otomatis via `SecurityAuditLogger::enforceSegregationOfDuties()`.

### C. Audit Log Imutabel (Append-Only)
- Semua aksi `CREATE`, `UPDATE`, `DELETE`, `POST`, `CANCEL`, dan `REVERSAL` **wajib** mencatat entri ke `audit_logs`.
- Data `audit_logs` bersifat *read-only* & *append-only* (tidak ada tombol ubah/hapus).

---

## 🧪 2. ALUR TESTING & VERIFIKASI DUA TINGKAT

### A. Pengujian Tingkat Kode (Unit & Integration Testing)
- **Backend PHPUnit / Pest**: Menguji logika perhitungan pajak (`TaxEngineTest`), aturan SoD (`SecurityTest`), dan transisi status (`StateMachineTest`).
- **Frontend TypeScript Static Check & Build**: Menjalankan `tsc -b && vite build` untuk memastikan 0 error tipe data & kompilasi UI.

### B. Pengujian Skenario Bisnis Real (Acceptance Criteria Testing)
- **AC-01 (Custody Isolation)**: Memastikan STB tidak memotong/menambah saldo inventori persediaan material.
- **AC-02 (Negative Stock Prevention)**: Memastikan form pengeluaran material menolak jika qty keluar > stok aktual gudang.
- **AC-03 (Customer Acceptance Gate)**: Memastikan revenue tidak diakui jika status pengiriman belum `ACCEPTED` oleh customer.
- **AC-04 (Multi-SJ Invoicing)**: Memastikan N Surat Jalan `UNINVOICED` milik customer yang sama sukses digabungkan dalam 1 Invoice.
- **AC-05 (Immutable Ledger & Reversal)**: Memastikan dokumen transaksi `POSTED` tidak dapat dihapus, hanya bisa dikontra (*reversal*).

---

## 🐛 3. PROTOKOL DEBUGGING & HANDLING ERROR

1. **Clean Error Response (Anti-Information Leakage)**:
   - Error API di lingkungan produksi **TIDAK BOLEH** menampilkan *stack trace* atau kueri SQL mentah ke pengguna.
   - Mengembalikan pesan operasional terstruktur: `{ "success": false, "code": "INVALID_STATE", "message": "Dokumen sudah diposting." }`.
2. **Centralized Logging**:
   - Seluruh exception dan error operasional dicatat di `storage/logs/laravel.log` (atau Sentry/Bugsnag untuk produksi).
3. **State Rollback (Atomic Database Transactions)**:
   - Semua operasi multi-tabel (misal: Post Invoice + Update SJ status + Audit Log) **wajib** dibungkus dalam `DB::transaction()`. Jika ada 1 gagal, seluruh perubahan di-rollback total.
