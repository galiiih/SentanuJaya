# Master Prompt & Source of Truth - Sentanu Jaya ERP

Dokumen ini disalin dari Master Prompt resmi sebagai landasan utama (*source of truth*) pengembangan **Sentanu Jaya ERP**.

---

## 🔑 1. Fundamental Model Bisnis (PENTING)
1. **Jasa, Bukan Produk**: Sentanu Jaya **menjual JASA painting/finishing**, bukan menjual produk body kit.
2. **Kepemilikan Barang Customer**: Body kit / aksesoris yang dikirim customer **BUKAN persediaan/inventory Sentanu Jaya**. ERP hanya melacak quantity, tahapan produksi (RAW → PAINT → DRYING → POLISH → QC → PACKING), pengiriman, dan reject/rework.
3. **Inventory HANYA untuk Bahan Baku**: Inventory Sentanu Jaya hanya berisi material milik sendiri (Cat, Thinner, Epoxy, Dempul, Amplas, dsb).
4. **Harga Jual dari Price List**: Harga jual berasal dari `customer_price_lists` (ditetapkan per customer & item), **BUKAN** dihitung dari harga beli material.

---

## 📐 2. Aturan Pajak (Tax Rule Final)
- **Kondisi 1 (Tanpa Pajak)**: PPN 0%, PPh 0%. Invoice menampilkan harga jual dasar.
- **Kondisi 2 (Kena PPN)**: PPN 11% + PPh 2% (Otomatis terikat, user tidak memilih PPh terpisah).
- **Kondisi 3 (Hanya PPh)**: PPN 0% + PPh 2.5%.

### Breakdown Invoice (Jika PPN/PPh Berlaku):
- `material_component` = `selling_price` × 90%
- `service_component` = `selling_price` × 10%

---

## 🔗 3. Aturan Relasi Transaksi (N-to-1 Invoice Mapping - UPDATE REVISI USER)
- **1 Surat Jalan = 1 Customer + 1 Customer PO**
- **1 Invoice dapat menggabungkan BEBERAPA Surat Jalan (N Surat Jalan → 1 Invoice)**.
- Admin bebas menentukan kapan invoice dibuat dan memilih Surat Jalan (milik customer yang sama) yang statusnya `UNINVOICED` untuk digabung dalam 1 Invoice.
- Indikator Status Surat Jalan: `UNINVOICED` (Belum Ditagih) vs `INVOICED` (Sudah Masuk Invoice).

---

## 💰 4. Pengakuan Pendapatan (Revenue Recognition)
- Revenue diakui **HANYA saat Customer Menerima Barang** (`quantity_accepted` OK pada Delivery), **BUKAN** saat Invoice dibuat atau saat Payment diterima.
- Barang reject tidak dihitung revenue, melainkan masuk alur Rework → Re-delivery (SJ Baru) → Invoice Baru.

---

## 📦 5. Material & Management P&L (V1)
- Pemakaian material menggunakan **Actual Usage** (`material_usages`), bukan BOM kaku.
- Setiap Pembelian Material menghasilkan:
  1. Inventory Stock IN.
  2. Operational Expense (langsung memotong P&L Manajemen V1).

---

## 🗺 14 Tahap Pengembangan (Roadmap)
1. Business Process
2. Business Rules
3. Requirement Matrix
4. Role & Permission Matrix
5. Status & Workflow
6. Entity/Data Model
7. ERD
8. PRD Final
9. System Architecture
10. UI/UX
11. Development Roadmap
12. Implementation
13. Testing/UAT
14. Deployment
