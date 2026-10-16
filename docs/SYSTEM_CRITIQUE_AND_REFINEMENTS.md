# Analisis Kritis & Penyesuaian Sistem Sentanu Jaya ERP

Dokumen ini memuat evaluasi mendalam terhadap celah proses, potensi kesalahan perhitungan, dan kebutuhan fungsional/non-fungsional tambahan yang wajib diakomodasi dalam perancangan ERP.

---

## 🔴 A. KRITIS (Potensi Salah Hitung / Masalah Legal & Keuangan)

### 1. Surat Terima Barang (Inbound Receipt)
- **Masalah**: Belum ada entitas resmi untuk mencatat barang customer saat masuk.
- **Solusi**: Dibuat entitas `InboundReceipt` (`surat_terima_barang_no`, `tanggal_terima`, `qty_terima`, `kondisi_awal` [penyok/retak/bekas cat], `foto_bukti_urls`, `po_id`).
- **Dampak**: Menjadi titik awal resmi WIP (Work In Progress) & dasar hukum membantah klaim kerusakan bawaan dari customer.

### 2. Dasar Pengenaan PPh (PPh Base)
- **Keputusan PPh Base**: 
  * Jika PPh 23 (Jasa Finishing): `pph_base = service_component` (10% dari selling price).
  * Jika PPh Final/Umum: `pph_base = selling_price`.
- **Ekspansi Schema**: Tambahkan `pphBaseType` di konfigurasi pajak agar tidak terjadi ambigu saat pemeriksaan pajak.

### 3. Perlakuan Akuntansi PPh (Bukti Potong PPh)
- **Solusi**: PPh yang dipotong customer dicatat sebagai **Pajak Dibayar Di Muka (Prepaid Tax Asset)**, bukan beban.
- **Tracking Bukti Potong**: Tabel `invoice_tax_slips` (`invoice_id`, `bukti_potong_no`, `tanggal_terima_bukpot`, `amount`, `status_bukpot` [PENDING / RECEIVED]).

### 4. Dynamic Tax Rates (`tax_rates` Table)
- **Solusi**: Tarif PPN (11%/12%) dan PPh (2%/2.5%) TIDAK di-hardcode di kodingan.
- **Tabel `tax_rates`**: `id`, `tax_type` (PPN/PPH23/PPH21), `rate_percent`, `effective_from`, `effective_to`, `is_active`.

### 5. Unbilled Revenue Tracking
- **Masalah**: Pendapatan diakui saat barang diterima, namun invoice bisa dibuat belakangan (muncul saldo *Unbilled Revenue*).
- **Solusi**: Laporan & Dashboard khusus *Unbilled SJ* + Aturan Maksimal Umur SJ `UNINVOICED` (misal: max 7 hari) untuk mencegah SJ tertinggal tanpa ditagih.

### 6. Mekanisme Konfirmasi Penerimaan (Customer Acceptance)
- **Alur**:
  1. Delivery dikirim $\rightarrow$ Status SJ: `DELIVERED_PENDING_CONFIRMATION`.
  2. Customer Tanda Tangan SJ / Bukti WA Uploaded $\rightarrow$ Status: `ACCEPTED`.
  3. **Auto-Accept Rule**: Jika dalam $N$ hari (misal 3 hari) tidak ada respon/komplain dari customer, sistem otomatis mengubah status menjadi `AUTO_ACCEPTED` dan mengakui revenue.

### 7. Alokasi Biaya Tenaga Kerja & Overhead (P&L Akurat)
- **Solusi V1**: Selain pemakaian material, tambahkan komponen **Alokasi Biaya Operasional**:
  * Direct Labor Cost (Jam kerja/Unit dicat).
  * Factory Overhead Allocation (Listrik, Gas Oven, Ampelas/Dempul umum).

---

## 🟡 B. PENTING (Celah Alur Proses & Operasional)

### 8. Klasifikasi Defect Reject & Rework
- **Klasifikasi Defect**:
  * `INTERNAL_DEFECT` (Kesalahan cat/oven $\rightarrow$ Biaya ditanggung Sentanu Jaya).
  * `CUSTOMER_MATERIAL_DEFECT` (Bahan body kit retak/cacat pabrik $\rightarrow$ Ditagihkan ke customer atau butuh approval persetujuan khusus).
- **Limit Rework**: Maksimal 2x Rework sebelum eskalasi ke Owner.

### 9. Uang Muka (DP), Partial Payment & Retur
- **DP / Down Payment**: Mendukung pencatatan DP per Customer PO sebelum barang dikerjakan.
- **Credit Note / Sales Return**: Dokumen revisi jika Invoice terlanjur terbit dan ada penyesuaian/retur.

### 10. Reversal & Pembatalan Transaksi
- Tidak ada penghapusan data transaksi secara fisik.
- Reversal menggunakan dokumen kontra / audit log (`reversal_reason`, `reversed_by`, `reversed_at`).

### 11. E-Faktur (Faktur Pajak Elektronik)
- Field tambahan di Invoice: `faktur_pajak_no`, `faktur_pajak_date`, `status_efaktur` (DRAFT / APPROVED / REJECTED).

### 12. Price List Versioning & Surcharges
- Master `customer_price_lists` memiliki `version`, `effective_date`, `expiry_date`.
- Support **Surcharge Warna Khusus** (Candy, Chrome, Matte, Carbon Finish).

### 13. Master Material & Satuan (UOM Conversion)
- Pembelian dalam Satuan Beli (Drum, Galon, Box).
- Pemakaian dalam Satuan Pakai (Liter, ML, Pcs).
- Metode Costing: **Moving Average Costing**.

---

## 🔵 C. KELENGKAPAN DOKUMEN & ROADMAP IMPLEMENTASI

### 14. Kebijakan Penomoran Dokumen (Document Numbering Policy)
- Customer PO: `PO-[CUST_CODE]-[YYMM]-[SEQ]`
- Inbound Receipt: `STB-[YYMM]-[SEQ]`
- Work Order: `WO-[YYMM]-[SEQ]`
- Surat Jalan: `SJ-[YYMM]-[SEQ]`
- Invoice: `INV-[YYMM]-[SEQ]`

### 15. Tambahan Roadmap Deployment
- Phase 11.5: **Migrasi Data Spreadsheet Lama** (Master Customer, Price List, Material).
- Phase 12.5: **Pelatihan Staf Admin & Operator Gudang**.
- Phase 13.5: **Pendampingan Post Go-Live (30 Hari)**.
