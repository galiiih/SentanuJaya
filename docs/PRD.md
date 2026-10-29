# PRODUCT REQUIREMENT DOCUMENT (PRD)
## Sentanu ERP — V1

| | |
|---|---|
| Versi | 1.0 |
| Status | Draft for Approval |
| Turunan dari | Master Project Prompt V2.0 |
| Tanggal | 2026 |

---

## 1. RINGKASAN EKSEKUTIF

Sentanu Jaya adalah penyedia **jasa** automotive finishing (painting, polishing, coating) untuk body kit dan aksesoris milik customer. Saat ini seluruh pencatatan dilakukan manual, sehingga perusahaan tidak dapat menjawab dengan cepat: berapa untung per pekerjaan, barang customer mana yang masih di workshop, dan berapa tagihan yang belum dibuat.

Sentanu ERP dibangun custom dari nol untuk menutup tiga masalah itu sekaligus, dengan satu prinsip yang membedakannya dari ERP manufaktur biasa: **barang yang dikerjakan bukan milik perusahaan.**

---

## 2. MASALAH YANG DISELESAIKAN

| # | Masalah Saat Ini | Dampak | Solusi di ERP |
|---|---|---|---|
| P1 | Barang customer dilacak manual/ingatan | Barang tertukar, hilang, klaim tidak terbantahkan | STB + Inbound QC berfoto + Custody Ledger |
| P2 | Tidak tahu untung per pekerjaan | Harga bisa terlalu murah tanpa disadari | Job Costing per WO |
| P3 | Tagihan terlambat/terlupa | Cash flow tertahan | Unbilled Revenue + aging + notifikasi |
| P4 | Reject & rework tidak tercatat | Biaya tersembunyi, akar masalah tak terlacak | Reject classification + Rework cost |
| P5 | Pemakaian material tidak terukur | Cat hilang/boros tidak ketahuan | Material consumption + stock opname |
| P6 | Gaji harian dihitung manual di Excel | Rawan salah, tidak terhubung ke job cost | Daily Worker Output → labor cost |
| P7 | Pajak & bukti potong tidak terkelola | Bukti potong hilang, kredit pajak hangus | Tax engine + withholding tracker |
| P8 | Tidak ada laporan keuangan real | Keputusan berbasis feeling | Double-entry accounting + P&L |

---

## 3. PENGGUNA & KEBUTUHAN

### 3.1 Owner / Bos
**Kebutuhan:** tahu kondisi bisnis dalam 30 detik tanpa bertanya siapa pun.
**Sukses jika:** bisa buka dashboard dan langsung lihat revenue bulan ini, gross profit, piutang jatuh tempo, dan tagihan yang belum dibuat.

### 3.2 Admin
**Kebutuhan:** input cepat, dokumen tercetak rapi, tidak ada pekerjaan ganda.
**Sukses jika:** dari terima barang sampai invoice, data hanya diinput sekali dan mengalir ke dokumen berikutnya.

### 3.3 QC
**Kebutuhan:** mencatat kondisi barang dan hasil pemeriksaan berikut foto.
**Sukses jika:** setiap klaim customer bisa dijawab dengan foto kondisi awal bertanggal.

### 3.4 (V1.1) Produksi, Purchasing, Finance
Role disiapkan di arsitektur, diaktifkan saat organisasi bertambah.

---

## 4. LINGKUP PRODUK V1

### In Scope
14 modul: Core Platform · Master Data · Sales & Pricing · Inbound & Custody · Production · Quality · Delivery & Revenue · Billing & AR · Purchasing & AP · Inventory · Tax · Accounting · Costing · Reporting.

### Out of Scope (V2)
Customer portal · mobile app · QR tracking · payroll penuh · e-Faktur API · scheduling otomatis · multi-currency · BI warehouse.

---

## 5. ALUR UTAMA PENGGUNA

### 5.1 Alur Terima Barang (Admin + QC)
1. Admin buat Customer PO dari PO fisik customer.
2. Barang datang → Admin buat STB, input qty & kondisi, unggah foto.
3. QC lakukan Inbound QC → PASS / PARTIAL / REJECT.
4. Sistem catat Custody Ledger IN. Barang resmi tercatat di workshop.

**Kriteria sukses:** waktu input STB < 5 menit untuk 10 item.

### 5.2 Alur Produksi (Admin + QC)
1. Admin buat WO dari STB.
2. Setiap stage dicatat: siapa, kapan, berapa unit.
3. Material dicatat saat dipakai, termasuk nomor batch cat.
4. Output pekerja harian dicatat per hari → otomatis jadi upah & job cost.
5. QC periksa → OK atau REJECT.
6. REJECT → Rework → QC ulang.

**Kriteria sukses:** biaya per WO terhitung otomatis tanpa input tambahan.

### 5.3 Alur Kirim & Pendapatan (Admin)
1. Buat Surat Jalan (1 SJ = 1 customer + 1 PO).
2. Barang dikirim, status DELIVERED.
3. SJ kembali ditandatangani → input Acceptance: qty OK & qty reject.
4. **Baru di titik ini revenue diakui** untuk qty OK.
5. Qty reject → Return From Customer → rework → SJ baru.

**Kriteria sukses:** tidak ada revenue tercatat tanpa bukti acceptance.

### 5.4 Alur Tagihan (Admin + Owner)
1. Admin lihat daftar SJ berstatus UNINVOICED per customer.
2. Pilih beberapa SJ → gabung jadi 1 Invoice.
3. Sistem hitung PPN/PPh sesuai kondisi pajak customer.
4. Invoice di-POST → jurnal terbentuk, Unbilled pindah ke Piutang.
5. Cetak invoice lengkap dengan terbilang.
6. Pembayaran masuk → alokasikan ke invoice.
7. Bukti potong PPh diterima → status RECEIVED.

**Kriteria sukses:** tidak ada SJ yang lewat 30 hari tanpa ditagih.

---

## 6. FITUR & PRIORITAS

| Prioritas | Arti |
|---|---|
| **P0** | Tanpa ini sistem tidak bisa dipakai sama sekali |
| **P1** | Wajib ada saat go-live |
| **P2** | Boleh menyusul di bulan pertama hypercare |

| Modul | Fitur | Prioritas |
|---|---|---|
| Core | Login, role, permission, audit trail | P0 |
| Core | Document numbering, attachment | P0 |
| Core | Notifikasi, print template | P1 |
| Core | Import framework | P1 |
| Master | Customer, Customer Item, Material, Supplier, Worker | P0 |
| Master | Price List versioning + approval | P0 |
| Master | Color formula, process template | P1 |
| Inbound | STB + foto | P0 |
| Inbound | Inbound QC | P0 |
| Inbound | Custody Ledger + laporan | P0 |
| Inbound | Custody aging, abandoned goods | P2 |
| Produksi | WO, stage, operation | P0 |
| Produksi | Material consumption + batch | P0 |
| Produksi | Daily worker output | P0 |
| Produksi | Subcontract | P2 |
| Quality | Production QC, Reject, Rework | P0 |
| Delivery | Surat Jalan | P0 |
| Delivery | Acceptance | P0 |
| Delivery | Return From Customer | P1 |
| Revenue | Revenue recognition + Unbilled | P0 |
| Billing | Invoice N:1 | P0 |
| Billing | Credit Note, DP, Partial Payment | P1 |
| Billing | AR Aging | P1 |
| Tax | Tax engine 3 kondisi | P0 |
| Tax | PPh dibayar dimuka + bukti potong | P0 |
| Tax | Faktur Pajak + NSFP | P1 (jika PKP) |
| Tax | PPN Masukan + SPT Masa | P1 |
| Purchasing | PO, Receipt, Supplier Invoice, AP | P1 |
| Inventory | Stock, movement, moving average | P0 |
| Inventory | Opname, batch expiry, low stock | P1 |
| Accounting | COA, Journal, Period | P0 |
| Accounting | Fixed asset & depresiasi | P2 |
| Costing | Job cost, WIP, profitability | P1 |
| Costing | Alokasi gaji bulanan & overhead | P1 |
| Reporting | Dashboard 3 role | P1 |
| Reporting | Laporan operasional & keuangan | P1 |

---

## 7. KRITERIA PENERIMAAN (ACCEPTANCE CRITERIA)

Ditulis dalam format yang bisa diuji langsung.

### AC-01 — Barang customer bukan inventory
> **Diberikan** STB berisi 10 unit body kit milik customer
> **Ketika** STB di-POST
> **Maka** tidak ada record di `stock_movements`, tidak ada jurnal terbentuk, dan `custody_ledger` bertambah 10.

### AC-02 — Revenue hanya setelah acceptance
> **Diberikan** SJ 100 unit berstatus DELIVERED
> **Ketika** belum ada Acceptance
> **Maka** akun Pendapatan Jasa tidak bertambah sama sekali.

### AC-03 — Revenue parsial
> **Diberikan** Acceptance dengan OK=95, Reject=5
> **Ketika** Acceptance di-POST
> **Maka** revenue = 95 × harga snapshot, dan 5 unit muncul di Outstanding Return.

### AC-04 — N SJ → 1 Invoice
> **Diberikan** 3 SJ customer sama berstatus UNINVOICED
> **Ketika** Admin gabung jadi 1 Invoice
> **Maka** ketiga SJ berubah jadi INVOICED dan total invoice = jumlah accepted qty × harga.

### AC-05 — Tagihan tidak melebihi acceptance
> **Diberikan** SJ dengan accepted qty 95
> **Ketika** Admin coba tagih 100
> **Maka** sistem menolak tanpa approval khusus.

### AC-06 — Pajak sesuai kondisi
> **Diberikan** customer dengan Tax Rule = Kondisi 2
> **Ketika** invoice dibuat senilai 10.000.000
> **Maka** PPN = 11% × DPP, PPh = 2% × selling price, keduanya memakai rate dari Tax Master (bukan kode).

### AC-07 — Jurnal selalu balance
> **Diberikan** transaksi apa pun yang menghasilkan jurnal
> **Ketika** di-POST
> **Maka** SUM(debit) = SUM(kredit), atau transaksi dibatalkan seluruhnya.

### AC-08 — Dokumen posted tidak bisa dihapus
> **Diberikan** invoice berstatus POSTED
> **Ketika** user mencoba delete atau edit
> **Maka** sistem menolak dan mengarahkan ke Credit Note.

### AC-09 — WIP nol setelah selesai
> **Diberikan** WO yang seluruh quantity-nya sudah di-accept
> **Ketika** WO COMPLETED
> **Maka** saldo WIP untuk WO tersebut = 0.

### AC-10 — Harga historis tidak berubah
> **Diberikan** invoice yang sudah POSTED
> **Ketika** price list diubah
> **Maka** nilai invoice lama tidak berubah sama sekali.

### AC-11 — Custody tidak negatif
> **Diberikan** custody balance 10 unit
> **Ketika** SJ mencoba mengirim 12 unit
> **Maka** sistem menolak.

### AC-12 — Audit trail
> **Diberikan** perubahan harga oleh Admin
> **Maka** tercatat user, waktu, nilai lama, nilai baru, dan alasan; record tidak dapat dihapus.

---

## 8. NON-FUNCTIONAL REQUIREMENT

| Kategori | Target |
|---|---|
| Response UI | < 2–3 detik |
| Response API standar | < 1–2 detik |
| Laporan berat | asynchronous + notifikasi |
| Uptime jam kerja | ≥ 99% |
| Concurrent user V1 | 10–20 |
| Data growth | ~50.000 transaksi/tahun |
| Backup | harian, off-site, retensi 30 hari + 12 bulan |
| RPO / RTO | ≤ 24 jam / ≤ 8 jam |
| Bahasa UI | Bahasa Indonesia |
| Browser | Chrome & Edge versi terkini, responsive tablet |
| Aksesibilitas | font minimal 14px, kontras memadai (dipakai di workshop) |

---

## 9. METRIK KEBERHASILAN

Diukur 3 bulan setelah go-live:

| Metrik | Baseline | Target |
|---|---|---|
| Waktu buat invoice | ? hari | < 1 hari setelah acceptance |
| SJ uninvoiced > 30 hari | tidak terukur | 0 |
| Selisih stok cat saat opname | tidak terukur | < 5% |
| Klaim customer tanpa bukti | sering | 0 |
| Waktu tutup buku bulanan | tidak ada | < 5 hari kerja |
| Owner tahu profit per job | tidak bisa | 100% job terukur |
| Bukti potong PPh tidak tertagih | tidak terukur | < 5% |

---

## 10. RISIKO PRODUK

| Risiko | Kemungkinan | Dampak | Mitigasi |
|---|---|---|---|
| User kembali ke cara manual | Tinggi | Fatal | Training + SOP + input disederhanakan + Owner menuntut laporan dari sistem |
| Input foto dianggap merepotkan | Sedang | Tinggi | Upload langsung dari kamera HP/tablet, maksimal 2 klik |
| Master data awal kotor | Tinggi | Tinggi | Bersihkan sebelum go-live, bukan sesudah |
| Open decision tidak kunjung ditutup | Sedang | Tinggi | Batas waktu di Phase 1, tidak boleh mulai Phase 4 sebelum tutup |
| Scope creep | Tinggi | Tinggi | Fitur baru masuk backlog V2, bukan V1 |
