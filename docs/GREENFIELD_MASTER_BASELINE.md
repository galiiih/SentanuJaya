# Sentanu ERP Master Baseline — V2.0 (FINAL BASELINE)

## 📌 Document Metadata
- **Versi Baseline**: 2.1 (ALL DECISIONS RESOLVED)
- **Status**: Single Source of Truth Resmi — Siap Coding MVP-1
- **Timezone / Currency**: Asia/Jakarta (WIB, UTC+7) / IDR (Single Currency V1)
- **Bahasa**: Indonesia (UI/Dokumentasi), English (Kode/Database)

---

## 🔑 1. Lima Aturan Emas Model Bisnis (DIKUNCI — Melanggar = Fatal)
1. **Jasa, Bukan Produk**: Sentanu Jaya **menjual JASA** (painting, finishing, polishing, coating). Akun pendapatan = `Pendapatan Jasa`.
2. **Barang Customer BUKAN Inventory**: Body kit/aksesoris customer **TIDAK BOLEH** masuk tabel `stocks`, valuasi persediaan, atau neraca sebagai aset. Barang dilacak di **Custody Ledger** terpisah (off-balance sheet / kuantitas saja tanpa nilai).
3. **Inventory HANYA untuk Material Sendiri**: Cat, Thinner, Epoxy, Dempul, Amplas, Clear Coat, Hardener, Masking.
4. **Harga Jual dari Price List**: Diambil dari `customer_price_lists` (per customer & per item), **BUKAN** dihitung dari harga beli material (cost-plus).
5. **Revenue Diakui Saat Customer Menerima (Acceptance OK)**: Pendapatan diakui **HANYA** jika $\text{Delivered} + \text{Customer Received} + \text{Status} = \text{OK}$. Bukan saat invoice dibuat atau payment diterima.

---

## 🆕 2. Fitur & Komponen Baru di Baseline V2.0
- **Customer Custody Ledger**: Modul pencatatan pergerakan barang customer (`IN_FROM_CUSTOMER`, `MOVE_TO_PRODUCTION`, `STAGE_MOVE`, `OUT_TO_CUSTOMER`, `RETURN_FROM_CUSTOMER`, `LOST`, `DAMAGED_INTERNAL`).
- **Return From Customer**: Penanganan resmi barang reject yang secara fisik kembali ke workshop.
- **Siklus Accounts Payable (AP)**: Supplier Invoice/Bill, AP Aging, Supplier Payment, GR-IR Clearing.
- **PPN Masukan (Input Tax)**: Pencatatan PPN Masukan dari supplier PKP & Rekonsiliasi SPT Masa PPN.
- **Akuntansi WIP Jasa**: Alokasi `WIP Jasa – Material`, `WIP Jasa – Labor`, `WIP Jasa – Overhead` yang membalik ke `COGS` saat Acceptance OK.
- **Matriks Jurnal Lengkap (Appendix A)**: Pemetaan otomatis jurnal untuk Pembelian, Produksi, Pendapatan, Pajak, dan Penutupan.
- **Fixed Asset Register & Depresiasi**: Pencatatan booth, oven, kompresor (Metode Straight-Line V1) yang memotong overhead produksi.
- **Cash, Bank, Petty Cash**: Manajemen rekening bank dan kas kecil untuk operasional & pembayaran.
- **Batch / Lot & Shelf Life Material**: Pelacakan nomor batch cat & tanggal kedaluwarsa untuk konsistensi warna.
- **Paint Recipe / Color Formula**: Master formula racikan cat terikat ke `CustomerItemMaster`.
- **Faktur Pajak & Register NSFP**: Pengelolaan kisaran NSFP dari DJP dan pencatatan manual e-Faktur di V1.
- **Cetak & Template Dokumen**: Dukungan fungsi **Terbilang**, meterai, kop surat branch, dan rangkap label.

---

## 🔗 3. Aturan Relasi Transaksi Paling Utama
- **1 Surat Jalan = 1 Customer + 1 Customer PO**
- **1 Invoice dapat menggabungkan N Surat Jalan** (milik Customer yang sama berstatus `UNINVOICED`).
- **Billable Quantity = Accepted Quantity** (Bukan Quantity Shipped).

---

## 📑 4. Matriks Jurnal Akuntansi Utama (Appendix A Snippet)

| Event Bisnis | Debit | Kredit |
| :--- | :--- | :--- |
| **Material Consumption** | `WIP Jasa — Material` | `Persediaan Material` |
| **Daily Worker Output** | `WIP Jasa — Labor` | `Hutang Upah (Accrued Wages)` |
| **Customer Acceptance OK (Revenue)** | `Piutang Belum Ditagih (Unbilled)` | `Pendapatan Jasa` |
| **Customer Acceptance OK (COGS)** | `Beban Pokok Jasa (COGS)` | `WIP Jasa` (proporsional) |
| **Invoice (Kondisi 2 - PPN 11% + PPh 2%)**| `Piutang Usaha` + `PPh Dibayar Dimuka` | `Piutang Belum Ditagih` + `PPN Keluaran` |
| **Supplier Invoice (Beli Material)** | `GR-IR Clearing` + `PPN Masukan` | `Hutang Usaha (AP)` |

---

## ❓ 5. Daftar 15 Open Decisions — **SEMUA RESOLVED (2026-09-23)**

Seluruh keputusan telah dijawab Owner. Detail lengkap di `OPEN_DECISIONS_RESOLVED.md`.

1. `#1 Alokasi gaji bulanan`: Ditunda ke MVP-2 (daily worker aktual dulu).
2. `#2 Alokasi overhead`: Ditunda ke MVP-2/3 (overhead sederhana dulu).
3. `#3 Template gaji & transport`: Transport pakai template tarif Owner berdasarkan jarak. Gaji import ditunda.
4. `#4 PPh Base`: Tanpa PPN → PPh 2,5%. Dengan PPN → PPh 2%. Configurable, verifikasi bukti potong.
5. `#5 Breakdown 90/10`: Ditunda, invoice tidak memaksakan breakdown 90/10 di MVP-1.
6. `#6 PPN atas DP`: DP tidak masuk MVP-1.
7. `#7 Quotation`: Tidak masuk MVP-1.
8. `#8 Abandoned Goods`: Ditunda, belum prioritas MVP-1.
9. `#9 Subkontrak`: Ada (chrome, repair, coating). Tabel sederhana disiapkan, bukan contract management penuh.
10. `#10 Tech Stack`: Laravel 11 + React/Vite + Eloquent + PostgreSQL + Redis. Hosting VPS (Hostinger KVM / BiznetGio / IDCloudHost).
11. `#11 Status PKP`: Sudah PKP, pakai Coretax DJP. Tanggal PKP dikonfirmasi kemudian.
12. `#12 Credit Limit`: Disiapkan di schema, enforcement otomatis ditunda.
13. `#13 Transfer antar Branch`: Tidak perlu MVP-1, satu workshop.
14. `#14 Klaim barang hilang/rusak`: Rekonsiliasi dulu → claim dengan approval Owner → ganti rugi berdasarkan harga barang customer.
15. `#15 QR Tracking`: Ditunda ke V2.
