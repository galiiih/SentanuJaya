# BUILD PLAN — DARI 0 SAMPAI SIAP PAKAI
## Sentanu ERP — V1

> **Status dokumen: roadmap historis.** Repository sudah memiliki implementasi aktif; larangan lama “tidak boleh ada satu baris kode” dan daftar open decision pada dokumen ini bukan gate proyek saat ini. Gunakan MVP_ROADMAP.md untuk arah produk, keputusan Owner terbaru untuk aturan bisnis, dan source/tests/CI untuk status implementasi. Jangan mengikuti sprint ini secara mekanis tanpa audit ulang.

Rencana ini disusun per sprint 2 minggu. Total **17 sprint ≈ 8 bulan** untuk tim 3–4 orang.

---

## TAHAP 0 — SEBELUM CODING (2–3 minggu)

**Tidak boleh ada satu baris kode ditulis sebelum tahap ini selesai.**

### 0.1 Catatan historis: daftar open decision lama (jangan dianggap masih terbuka)
Prioritas berdasarkan dampak jika salah:

| Urutan | Open Decision | Kenapa mendesak |
|---|---|---|
| 1 | #11 Status PKP | Menentukan apakah modul Faktur Pajak masuk V1 |
| 2 | #4 PPh Base | Salah = risiko pemeriksaan pajak; konsultasi akuntan pajak |
| 3 | #5 Breakdown 90/10 | Mempengaruhi struktur tabel invoice |
| 4 | #10 Tech Stack | Menentukan rekrutmen & arsitektur |
| 5 | #1 Alokasi gaji bulanan | Mempengaruhi tabel costing |
| 6 | #2 Alokasi overhead | Sama |
| 7 | #3 Template gaji & transport | Diperlukan sebelum modul import |
| 8 | #6 PPN atas DP | Mempengaruhi jurnal DP |
| 9 | #9 Subkontrak | Jika ada, mempengaruhi custody |
| 10 | #12 Credit limit | Mempengaruhi validasi PO |
| 11 | #7 Quotation, #8 Abandoned goods, #13 Transfer branch, #14 Klaim, #15 QR | Dapat diputuskan menyusul |

### 0.2 Kumpulkan Artefak Nyata
```text
[ ] Contoh Customer PO dari 3 customer berbeda
[ ] Contoh Surat Jalan yang dipakai sekarang
[ ] Contoh Invoice yang dipakai sekarang
[ ] Template gaji harian (Excel asli)
[ ] Template transport (Excel asli)
[ ] Daftar customer aktif
[ ] Daftar item/body kit yang sering dikerjakan
[ ] Daftar material & supplier
[ ] Price list yang berlaku
[ ] Foto proses produksi tiap stage (untuk memahami alur)
```

### 0.3 Observasi Lapangan (1–2 hari)
Developer **wajib** datang ke workshop, mengikuti satu barang dari datang sampai dikirim. Tanpa ini, sistem akan dibuat berdasarkan asumsi.

### 0.4 Finalisasi Desain
```text
[ ] ERD final disetujui
[ ] Skema database final
[ ] Matriks jurnal divalidasi akuntan
[ ] COA final
[ ] Tax master final
[ ] Wireframe 10 layar utama
[ ] Kontrak API modul inti
```

### 0.5 Siapkan Infrastruktur
```text
[ ] Repository + branching strategy
[ ] Environment dev, staging, production
[ ] CI pipeline
[ ] Error tracking & logging
[ ] Backup otomatis (sejak hari pertama, bukan nanti)
```

**Exit criteria Tahap 0:** seluruh Open Decision prioritas 1–7 ditutup tertulis oleh Owner.

---

## FASE PEMBANGUNAN

### Sprint 1–2 · FONDASI (4 minggu)
```text
Autentikasi, session, refresh token
User, Role, Permission, Branch
Audit trail (append-only)
Document numbering (uji tahan race condition)
Attachment & file storage
Settings
Layout aplikasi, navigasi, komponen dasar UI
```
**Selesai jika:** bisa login, buat user, beri permission, dan setiap perubahan tercatat di audit trail.

### Sprint 3 · MASTER DATA (2 minggu)
```text
Customer + Contact
Customer Item + Color Formula
Supplier, Material, UoM + konversi
Worker + rate
COA, Tax Master, Overhead Rule, Bank Account
Process Template
```
**Selesai jika:** seluruh master bisa diinput dan dicari; tidak ada angka pajak/harga di kode.

### Sprint 4 · PRICING & CUSTOMER PO (2 minggu)
```text
Price List + versioning + approval
Pricing Engine (surcharge, minimum charge, diskon)
Customer PO + line + snapshot harga
Quotation (jika diputuskan masuk V1)
```
**Selesai jika:** PO otomatis mengambil harga yang benar dan harga historis tidak berubah saat price list diperbarui.

### Sprint 5 · INBOUND & CUSTODY (2 minggu) ⭐
```text
Surat Terima Barang + foto
Inbound QC
Custody Ledger + Custody Balance
Laporan Barang Customer di Workshop
```
**Selesai jika:** AC-01 lulus — STB tidak membuat jurnal dan tidak menyentuh tabel stok.
> Sprint paling penting. Ini yang membedakan sistem ini dari ERP manufaktur.

### Sprint 6–7 · PRODUKSI (4 minggu)
```text
Work Order + line
Production Operation per stage
Material Consumption + batch
Batch Consumption + alokasi ke banyak WO
Daily Worker Output → upah
Perpindahan custody antar stage
```
**Selesai jika:** biaya material dan upah otomatis terakumulasi di WO.

### Sprint 8 · QUALITY (2 minggu)
```text
Production QC
Reject + klasifikasi + cost responsibility
Rework + biaya rework
Laporan reject & rework
```
**Selesai jika:** siklus QC → reject → rework → QC ulang berjalan tanpa jalan buntu.

### Sprint 9 · DELIVERY, ACCEPTANCE & REVENUE (2 minggu) ⭐
```text
Surat Jalan (3 tipe)
Customer Acceptance + evidence
Return From Customer
Revenue Recognition + jurnal
Unbilled Revenue + aging
```
**Selesai jika:** AC-02 & AC-03 lulus — revenue nol sebelum acceptance, dan acceptance parsial menghasilkan revenue parsial.

### Sprint 10 · PAJAK (2 minggu)
```text
Tax Engine 3 kondisi
Perhitungan DPP, PPN, PPh, pembulatan
Faktur Pajak + NSFP register
Withholding certificate tracker
```
**Selesai jika:** AC-06 lulus dan mengubah rate di master langsung berlaku tanpa deployment.

### Sprint 11 · BILLING & AR (2 minggu)
```text
Invoice N SJ → 1 (InvoiceBuilder)
Credit Note
Down Payment
Payment + alokasi
AR Aging
Cetak invoice + terbilang
```
**Selesai jika:** AC-04 & AC-05 lulus.

### Sprint 12 · PURCHASING, AP & INVENTORY (2 minggu)
```text
Purchase Order → Receipt
Supplier Invoice + PPN Masukan
AP + AP Aging + Supplier Payment
Stock, Stock Movement, Moving Average
Stock Opname + Adjustment
Batch & expiry
```
**Selesai jika:** moving average terbukti benar melalui test beberapa siklus beli–pakai.

### Sprint 13 · AKUNTANSI (2 minggu) ⭐
```text
Journal + Journal Line
Accounting Event Mapping (jurnal sebagai data)
Accounting Period + closing
Opening Balance
Fixed Asset + depresiasi
Trial Balance, Neraca, P&L
```
**Selesai jika:** AC-07 lulus dan trial balance seimbang setelah seluruh skenario UAT dijalankan.

### Sprint 14 · COSTING (2 minggu)
```text
WIP Balance per WO
Alokasi gaji bulanan & overhead
Job Cost & Job Profitability
Management P&L
Rekonsiliasi WIP vs GL
```
**Selesai jika:** AC-09 lulus — WIP nol setelah WO selesai.

### Sprint 15 · LAPORAN & DASHBOARD (2 minggu)
```text
Dashboard Owner, Admin, QC
Seluruh laporan operasional, biaya, keuangan, pajak, inventory
Export Excel & PDF
Laporan berat via background job
```

### Sprint 16 · PENGERASAN & IMPORT (2 minggu)
```text
Import framework + template gaji & transport
Notifikasi & reminder
Print template seluruh dokumen
Security hardening + checklist go-live
Optimasi performa
Perbaikan bug
```

### Sprint 17 · UAT & PERSIAPAN GO-LIVE (2 minggu)
```text
UAT seluruh skenario Master Prompt Bab 64
Perbaikan temuan
Training Owner, Admin, QC
SOP & User Guide
Input master data production
Opening balance + custody opening
Uji restore backup
Sign-off Owner
```

---

## GO-LIVE

### Strategi: Paralel 2 Minggu
Sistem baru dan pencatatan manual berjalan bersamaan selama 2 minggu, lalu dibandingkan. Ini menambah beban sementara tetapi jauh lebih aman daripada pindah langsung.

```text
H-7   Master data final diinput & diverifikasi
H-3   Stock opname fisik material
H-2   Opname fisik barang customer di workshop → custody opening
H-1   Opening balance (kas, bank, AR, AP, inventory, aset)
H-1   Backup + uji restore
H     SYSTEM START DATE aktif, seluruh transaksi baru lewat sistem
H+1..14  Paralel dengan manual, bandingkan setiap hari
H+15  Manual dihentikan
H+30  Tutup buku bulan pertama di sistem
```

### Kriteria Go / No-Go
```text
[ ] Seluruh skenario UAT kritikal PASS
[ ] Tidak ada bug severity 1 terbuka
[ ] Checklist keamanan lengkap
[ ] Restore test berhasil
[ ] Training selesai & user bisa input mandiri
[ ] Master data & opening balance terverifikasi
[ ] Rollback plan siap
[ ] Owner menandatangani sign-off
```

Jika satu saja tidak terpenuhi → **tunda**. Go-live paksa adalah penyebab kegagalan ERP nomor satu.

---

## HYPERCARE (4–8 minggu)

```text
Minggu 1–2  Developer siaga penuh, respon < 2 jam, cek data harian
Minggu 3–4  Respon < 1 hari, fokus perbaikan & penyesuaian laporan
Minggu 5–8  Dukungan normal, tutup buku bulan pertama, validasi laporan keuangan
```

**Exit criteria:** tidak ada bug kritikal, tutup buku bulan pertama berhasil, laporan keuangan divalidasi, user bekerja tanpa pendampingan.

---

## TIM & PERAN

### Minimum (3 orang, ~8–10 bulan)
```text
1 Backend Developer senior   — domain, akuntansi, pajak
1 Fullstack Developer        — API + UI
1 Project Manager / BA       — merangkap QA, jembatan ke Owner
```

### Ideal (6 orang, ~5–6 bulan)
```text
1 Tech Lead
2 Backend Developer
2 Frontend Developer
1 QA
+ Konsultan akuntan/pajak paruh waktu (validasi jurnal & pajak)
```

**Dari pihak Sentanu (wajib ada, tidak bisa diwakilkan):**
```text
Owner      — pengambil keputusan, 2 jam/minggu
Admin      — narasumber proses & penguji UAT, 4 jam/minggu
QC         — narasumber & penguji, 2 jam/minggu
```

---

## URUTAN JIKA ANGGARAN TERBATAS

Jika harus dipotong, bangun bertahap dengan urutan ini. Setiap tahap sudah bisa dipakai sendiri:

```text
TAHAP A (3 bulan) — "Berhenti kehilangan barang & tagihan"
  Core + Master + PO + STB + Custody + WO sederhana
  + Surat Jalan + Acceptance + Invoice + Pajak
  → Sudah menyelesaikan masalah P1, P3, P7

TAHAP B (2 bulan) — "Tahu biaya sebenarnya"
  Material consumption + Inventory + Daily worker
  + QC/Reject/Rework + Job Costing
  → Menyelesaikan P2, P4, P5, P6

TAHAP C (2 bulan) — "Pembukuan rapi"
  Purchasing + AP + Akuntansi penuh + Laporan keuangan
  → Menyelesaikan P8

TAHAP D (1 bulan) — "Pengerasan"
  Dashboard, notifikasi, import, security hardening, aset tetap
```

---

## RISIKO PROYEK & MITIGASI

| Risiko | Mitigasi |
|---|---|
| Open decision tidak ditutup, proyek jalan dengan asumsi | Batas waktu tegas; tidak masuk Sprint 4 sebelum ditutup |
| Developer tidak paham bisnis jasa (bukan manufaktur) | Wajib observasi lapangan di Tahap 0 |
| Scope bertambah di tengah jalan | Fitur baru masuk backlog V2, bukan V1 |
| Akuntansi salah dan baru ketahuan di akhir | Validasi matriks jurnal oleh akuntan di Tahap 0, bukan Sprint 13 |
| User menolak memakai sistem | Libatkan Admin & QC sejak wireframe, bukan saat training |
| Data master kotor terbawa ke sistem baru | Bersihkan di Tahap 0, jangan tunggu go-live |
| Vendor/developer berhenti di tengah jalan | Kode di repository milik Sentanu, dokumentasi wajib tiap sprint |

---

## DEFINISI SELESAI (Definition of Done)

Sebuah fitur selesai hanya jika **seluruhnya** terpenuhi:

```text
[ ] Migration database
[ ] Business logic di domain layer
[ ] Validasi backend
[ ] Permission enforcement
[ ] API endpoint + dokumentasi
[ ] UI yang bisa dipakai
[ ] Dampak akuntansi & pajak terimplementasi
[ ] Audit trail
[ ] Unit test + integration test hijau
[ ] Laporan terkait
[ ] Print template (jika dokumen dicetak)
[ ] Demo ke Owner/Admin dan disetujui
```

"UI sudah jadi" **bukan** definisi selesai.
