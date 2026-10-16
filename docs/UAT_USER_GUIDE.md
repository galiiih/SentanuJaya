# PANDUAN USER ACCEPTANCE TESTING (UAT) — SENTANU JAYA ERP

Dokumen ini memandu pengujian fungsional dan bisnis (UAT) bagi pengguna atau tim QA untuk memastikan modul **Executive Dashboard & Advanced Reporting** serta alur transaksi ERP berjalan sesuai aturan bisnis Sentanu Jaya.

---

## 1. Persiapan Pengujian (Prasyarat)
1. **Akses Aplikasi**: Buka URL aplikasi Sentanu Jaya Web App di browser Anda.
2. **Akun Penguji (Roles)**:
   - **STAFF**: Pengoperasian harian (STB, PO, Delivery Order, Acceptance).
   - **ADMIN**: Verifikasi posting, manajemen invoice, dan laporan.
   - **OWNER**: Akses penuh eksekutif dan persetujuan final.

---

## 2. Scenario Uji 1: Executive Dashboard
- **Tujuan**: Memastikan KPI operasional dan finansial bersumber dari data aktual.
- **Langkah**:
  1. Login sebagai `ADMIN` atau `OWNER`.
  2. Buka halaman utama **/dashboard**.
  3. Periksa kartu KPI (Custody Active, PO Aktif, Siap Ditagihkan, Tagihan Berjalan / AR).
  4. Periksa grafik tahap produksi dan ringkasan finansial.
- **Expected Result**: Angka merefleksikan data transaksi nyata di database, bukan angka statis atau dummy. Tombol "Muat ulang" berhasil mengambil data terbaru dari endpoint `/api/v1/dashboard/summary`.

---

## 3. Scenario Uji 2: Financial & Receivables Reporting
- **Tujuan**: Memastikan laporan keuangan dan piutang mematuhi aturan pembayaran `POSTED`.
- **Langkah**:
  1. Panggil endpoint reporting via API client atau akses menu laporan (jika UI tersedia):
     - `GET /api/v1/reports/financial`
     - `GET /api/v1/reports/receivables`
  2. Uji filter periode tanggal.
- **Expected Result**: 
  - Total pembayaran hanya menghitung transaksi berstatus `POSTED`.
  - Outstanding per customer dihitung dari total invoice `POSTED` dikurangi alokasi pembayaran yang sah.

---

## 4. Scenario Uji 3: Operational & Custody Reporting
- **Tujuan**: Memastikan pemisahan mutlak antara stok internal perusahaan dan barang titipan customer.
- **Langkah**:
  1. Periksa endpoint `/api/v1/reports/operational` dan `/api/v1/reports/custody`.
- **Expected Result**: 
  - Saldo kustodi menampilkan barang customer berdasarkan ledger aktual (masuk, keluar, reject, dan sisa).
  - Barang customer tidak tercampur dengan material operasional internal perusahaan.

---

## 5. Scenario Uji 4: Authorization & Hak Akses
- **Tujuan**: Memastikan pembatasan peran (`STAFF`, `ADMIN`, `OWNER`) berfungsi di backend dan frontend.
- **Langkah**:
  1. Login sebagai `STAFF` dan coba akses fitur terbatas atau endpoint eksklusif laporan keuangan tingkat lanjut.
- **Expected Result**: Sistem menolak akses dengan respons HTTP 403 (Forbidden) bagi role yang tidak berwenang.

---

## 6. Lembar Hasil UAT (Checklist)
| No | Modul / Skenario Uji | Status (PASS / FAIL) | Catatan / Temuan |
|---|---|---|---|
| 1 | Executive Dashboard Summary API & UI | [ ] PASS | |
| 2 | Financial & Receivables Report | [ ] PASS | |
| 3 | Operational & Custody Report | [ ] PASS | |
| 4 | Security & Role Authorization | [ ] PASS | |
