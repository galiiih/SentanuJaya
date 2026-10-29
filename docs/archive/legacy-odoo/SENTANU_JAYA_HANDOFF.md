# Sentanu Jaya Odoo Project Handoff

Tanggal update: 2026-06-08

## Konteks

Project ini adalah implementasi awal ERP Sentanu Jaya di Odoo 17 Community.
Blueprint bisnis mengacu ke dokumen `PROJECT Aplikasi SENTANU JAYA.docx` dan diagram
`workflow sentanu jaya.drawio`.

Alur utama:

1. Customer mengirim barang dengan Surat Jalan Masuk.
2. Barang diterima dan melewati Incoming QC.
3. Barang yang lolos QC dibuat menjadi Production Batch.
4. Batch diproses melalui WO Raw, WO Paint, dan WO Polish.
5. Barang melewati Final QC.
6. Barang lolos QC dikirim dengan Surat Jalan Keluar.
7. Invoice dan Payment dilakukan berdasarkan Surat Jalan Keluar.
8. Jika ada Customer Claim, claim harus mengacu ke Surat Jalan Keluar asal.
9. Claim valid dapat menghasilkan Claim Rework dan Surat Jalan Pengiriman Ulang.

## Modul Custom yang Dibuat

### `sj_security`

Fungsi:

- Menambahkan kategori modul "Sentanu Jaya".
- Menyediakan 4 security group bertingkat:
  - `User` — akses dasar read/write/create
  - `QC Inspector` — inherit User, akses QC operations
  - `Manager` — inherit QC, akses full operasional + delete
  - `Administrator` — inherit Manager, full access
- User `admin` (base.user_admin) dan `__system__` (base.user_root) otomatis dimasukkan ke group Administrator lewat data XML, agar menu Sentanu Jaya langsung muncul setelah install.

Depends:

- `base`

Catatan penting:

- Karena akses model dipindah dari `base.group_user` ke group `sj_security.*`, user yang BELUM jadi anggota salah satu group Sentanu Jaya tidak akan melihat menu Sentanu Jaya sama sekali. Tambahkan user ke group lewat Settings → Users.

### `sj_tax`

Fungsi:

- Menambahkan model `sj.tax.profile`.
- Menyediakan data awal Tax Profile:
  - `NON` - Non Tax
  - `PPN` - PPN 11%
  - `PPH` - PPh 23
  - `BOTH` - PPN + PPh
- Menambahkan field `sj_tax_profile_id` ke `res.partner`.
- Sinkronisasi Tax Profile ke field existing dari `custom_contact_fields`:
  - `default_ppn`
  - `default_pph`
  - `pph_rate`

Depends:

- `account`
- `contacts`
- `custom_contact_fields`

### `sj_workshop_master`

Fungsi:

- Master warna: `sj.color`
- Master jasa/service: `sj.service`
- Master defect: `sj.defect`
- Master alasan claim: `sj.claim.reason`
- Customer pricelist: `sj.customer.pricelist`

Pricing split:

- `price_service` = 10% dari harga jual
- `price_material` = 90% dari harga jual

Depends:

- `contacts`
- `product`
- `sj_tax`

### `sj_receiving`

Fungsi:

- Surat Jalan Masuk: `sj.receiving`
- Detail item SJ Masuk: `sj.receiving.line`
- Tracking customer, nomor SJ customer, tanggal terima, item, warna, qty, dan status Incoming QC.
- Sequence: `SJM/<year>/xxxxx`

State:

- `draft`
- `received`
- `qc_pass`
- `qc_reject`
- `returned`
- `cancel`

Depends:

- `mail`
- `sj_workshop_master`

### `sj_production`

Fungsi:

- Production Batch: `sj.production.batch`
- Work Order: `sj.work.order`
- Material Consumption: `sj.material.consumption`
- Final QC: `sj.final.qc`
- Internal Rework: `sj.internal.rework`

Sequence:

- Production Batch: `PB/<year>/xxxxx`
- Work Order: `WO/<year>/xxxxx`
- Internal Rework: `IRW/<year>/xxxxx`

Work Order type:

- `raw`
- `paint`
- `polish`
- `rework`

Catatan:

- Production Batch dibuat dari `sj.receiving.line`.
- Ada constraint agar total batch quantity tidak melebihi qty di SJ Masuk line.
- Internal Rework diarahkan kembali ke WO Paint atau WO Polish sesuai pilihan `target_wo_type`.

Depends:

- `hr`
- `mail`
- `sj_receiving`

### `sj_delivery`

Fungsi:

- Surat Jalan Keluar: `sj.delivery`
- Detail SJ Keluar: `sj.delivery.line`
- Invoice Template master: `sj.invoice.template`
- Extension `res.partner`: field `sj_invoice_template_id` (default template per customer)
- Mendukung partial delivery berbasis Production Batch.
- Mendukung Redelivery / Surat Jalan Pengiriman Ulang.
- Link manual ke invoice Odoo: `account.move`.
- Invoice otomatis + report invoice multi-template + report Kwitansi.

Sequence:

- Normal Delivery: `SJK/<year>/xxxxx`
- Redelivery: `SJU/<year>/xxxxx`

State:

- `draft`
- `ready`
- `delivered`
- `invoiced`
- `cancel`

Field amount di `sj.delivery` (computed, store):

- `amount_untaxed` — jumlah harga jual sebelum pajak
- `amount_total` — sama dengan amount_untaxed (dipertahankan untuk kompatibilitas view/report)
- `amount_ppn` — PPN 11% dari amount_untaxed (jika tax profile use_ppn)
- `amount_pph` — PPh dari total jasa (jika tax profile use_pph), default rate 2%
- `amount_grand_total` — amount_untaxed + PPN − PPh

Field di `sj.delivery.line` (computed split 90/10):

- `price_unit` — harga jual per unit (auto-fill dari Customer Pricelist)
- `price_material_unit` = price_unit × 90%
- `price_service_unit` = price_unit × 10%
- `total_material`, `total_service`, `price_subtotal`

Catatan:

- Normal delivery tidak boleh melebihi qty Production Batch.
- Redelivery dipisahkan dengan `delivery_type = redelivery`, karena pengiriman ulang claim tidak boleh memblokir constraint total normal delivery.

Depends:

- `account`
- `mail`
- `sj_production`
- `sj_security`
- `sj_workshop_master`

### `sj_claim`

Fungsi:

- Customer Claim: `sj.customer.claim`
- Claim line: `sj.customer.claim.line`
- Claim Rework: `sj.claim.rework`

Sequence:

- Customer Claim: `CLM/<year>/xxxxx`
- Claim Rework: `CRW/<year>/xxxxx`

State claim:

- `draft`
- `review`
- `invalid`
- `valid`
- `returned`
- `rework`
- `done`
- `closed`

Catatan:

- Customer Claim wajib mengacu ke `sj.delivery` asal.
- Claim line mengacu ke `sj.delivery.line`.
- Claim Rework dapat membuat WO Rework.
- Claim Rework dapat membuat Redelivery (`sj.delivery` dengan `delivery_type = redelivery`).

Depends:

- `mail`
- `sj_delivery`

## Urutan Install yang Disarankan

1. `custom_contact_fields`
2. `sj_security`
3. `sj_tax`
4. `sj_workshop_master`
5. `sj_receiving`
6. `sj_production`
7. `sj_delivery`
8. `sj_claim`

Odoo biasanya akan meng-install dependency otomatis, tetapi urutan di atas lebih mudah untuk debugging.

## Security Groups

Modul `sj_security` menyediakan 4 security group bertingkat:

| Group | Hak Akses |
|-------|-----------|
| User | Read, Write, Create (tidak bisa Delete) |
| QC Inspector | Inherit User + bisa melakukan QC Pass/Reject/Final QC |
| Manager | Inherit QC + bisa Delete, Create Invoice, Reset Draft |
| Administrator | Full access termasuk konfigurasi |

Hierarki: User → QC Inspector → Manager → Administrator

## Fitur UI yang Ditambahkan

- **Smart Buttons**: batch_count di SJ Masuk, wo_count + delivery_count di Production Batch, rework_count di Claim, invoice di Delivery
- **Kanban View**: Work Orders (grouped by state)
- **Search Views + Filter**: Di semua modul utama (Receiving, Production, Work Order, Delivery, Claim, Final QC)
- **Button Visibility**: Tombol aksi hanya muncul sesuai state (invisible attrs)
- **Badge Widgets**: State dan QC result ditampilkan sebagai badge berwarna
- **Tree Decoration**: Row coloring berdasarkan state

## Report PDF

Report PDF yang tersedia melalui Print menu:

| Report | Model | File |
|--------|-------|------|
| Surat Jalan Masuk | sj.receiving | sj_receiving/report/sj_receiving_report.xml |
| Surat Jalan Keluar | sj.delivery | sj_delivery/report/sj_delivery_report.xml |
| Invoice Sentanu Jaya | sj.delivery | sj_delivery/report/sj_invoice_report.xml |
| Kwitansi | sj.delivery | sj_delivery/report/sj_invoice_report.xml |
| Customer Claim | sj.customer.claim | sj_claim/report/sj_claim_report.xml |

### Logo Perusahaan

- Logo disimpan di `sj_delivery/static/src/img/logo_sentanu.png`.
- Logo di-embed ke report Invoice & Kwitansi sebagai base64 lewat method `sj.delivery._sj_logo_b64()`.
- Pendekatan base64 dipilih agar logo tetap muncul di semua kondisi render, termasuk saat generate PDF lewat Odoo shell (`--no-http`) yang tidak bisa fetch URL static.
- Untuk mengganti logo: timpa file `logo_sentanu.png` lalu upgrade module `sj_delivery`.

## Invoice Otomatis

Tombol "Create Invoice" di Surat Jalan Keluar (state=delivered):
- Membuat `account.move` (Customer Invoice) otomatis
- Line items diambil dari delivery lines (product, qty, price)
- Tax otomatis diterapkan dari Tax Profile customer (PPN/PPh)
- Delivery otomatis pindah ke state `invoiced`

## Pricing di Delivery

Field di `sj.delivery.line` (split otomatis 90/10):
- `service_id`: referensi ke jasa yang dikerjakan
- `price_unit`: harga jual per unit (auto-fill dari Customer Pricelist via onchange)
- `price_material_unit` = price_unit × 90% (Biaya Bahan)
- `price_service_unit` = price_unit × 10% (Biaya Jasa)
- `total_material` = qty × price_material_unit
- `total_service` = qty × price_service_unit
- `price_subtotal` = total_material + total_service (computed)

Field amount di header `sj.delivery`:
- `amount_untaxed` = sum price_subtotal (jumlah harga jual)
- `amount_ppn`, `amount_pph`, `amount_grand_total`

## Perhitungan Pajak (Invoice)

Logika di `sj.delivery._compute_amount_total()`:

- **PPN** (jika `tax_profile.use_ppn`): `amount_untaxed × 11%`
- **PPh 23** (jika `tax_profile.use_pph`): `total_service × pph_rate%` (default 2% jika rate kosong). PPh dihitung dari porsi JASA saja, bukan total.
- **Grand Total**: `amount_untaxed + PPN − PPh`

Contoh (20 pcs × Rp187.500 = Rp3.750.000, jasa 10% = Rp375.000):

| Skenario | Harga Jual | PPN 11% | PPh 2% (jasa) | Total Tagihan |
|----------|-----------|---------|---------------|---------------|
| PPN + PPh | 3.750.000 | 412.500 | 7.500 | 4.155.000 |
| PPN Only | 3.750.000 | 412.500 | - | 4.162.500 |
| PPh Only | 3.750.000 | - | 7.500 | 3.742.500 |
| Non Tax | 3.750.000 | - | - | 3.750.000 |

## Invoice Template System

Sistem invoice menggunakan **1 report action tunggal** ("Invoice Sentanu Jaya") yang secara otomatis memilih body template berdasarkan prioritas:

1. `sj.delivery.invoice_template_id` (override per delivery)
2. `res.partner.sj_invoice_template_id` (default per customer)
3. Auto-detect dari Tax Profile customer (method `_get_invoice_template()`)

### Template Bawaan

Data di `sj_delivery/data/sj_invoice_template_data.xml` (model `sj.invoice.template`):

| Code | Nama | Format |
|------|------|--------|
| `PPN_PPH` | Invoice PPN + PPh | Tabel split Bahan/Jasa + DPP + PPN 11% + potong PPh 23 |
| `PPN_ONLY` | Invoice PPN Only | Tabel split Bahan/Jasa + PPN 11% |
| `PPH_ONLY` | Invoice PPh Only | Tabel split Bahan/Jasa + potong PPh 23 |
| `NON_TAX` | Invoice Non Tax | Tabel simpel (No, Qty, Sat, Nama, Warna, Harga, Ket, Jumlah) + catatan |

### Fitur Tambahan Template

- Header menampilkan logo PT. Sentanu Jaya (embed base64) + alamat + tujuan customer.
- "Terbilang" otomatis dari `_sj_amount_to_words()` (konversi angka ke teks Bahasa Indonesia).
- Tanda **METERAI TEMPEL** muncul otomatis di footer jika `amount_grand_total >= 5.000.000`.
- Info bank (BCA) + tanda tangan Tri Sutanti.

### Tambah Template Baru

1. Buat QWeb template baru di `report/sj_invoice_report.xml`:
   ```xml
   <template id="report_invoice_body_custom">...</template>
   ```
2. Tambahkan record di `sj.invoice.template` (code: `CUSTOM_CODE`, qweb_template: `sj_delivery.report_invoice_body_custom`)
3. Tambahkan `t-elif` di dispatcher utama `report_sj_invoice_document`:
   ```xml
   <t t-elif="tpl_code == 'CUSTOM_CODE'" t-call="sj_delivery.report_invoice_body_custom"/>
   ```
4. Assign template ke customer (Default Invoice Template) atau ke delivery (Invoice Template).

### Arsitektur Report

```
report_sj_invoice_document (main dispatcher)
├── report_invoice_header (common: logo + no invoice + tujuan)
├── report_invoice_body_* (per template code)
│   ├── report_invoice_body_ppn_pph
│   ├── report_invoice_body_ppn_only
│   ├── report_invoice_body_pph_only
│   └── report_invoice_body_non_tax
└── report_invoice_footer (common: bank + ttd + meterai)
```

Menu konfigurasi: Sentanu Jaya → Configuration → Invoice Templates

## Perubahan Docker Compose

File `docker-compose.yml` sudah diperbaiki agar `addons_path` terbaca sebagai satu argumen:

```yaml
command:
  - odoo
  - --addons-path=/usr/lib/python3/dist-packages/odoo/addons,/mnt/extra-addons
```

Sebelumnya `--addons-path=` terpisah dari path-nya dan mengarah ke folder yang tidak ada.

## Validasi yang Sudah Dilakukan

Validasi statis sudah lolos:

- Manifest dapat dibaca dengan `ast.literal_eval`.
- Semua file `data` di manifest ditemukan.
- Semua file Python berhasil di-compile.
- Semua file XML berhasil di-parse.
- `docker compose config` berhasil membaca konfigurasi compose.

Validasi install langsung di Odoo sudah dilakukan pada database `SentanuJaya`:

- Container aktif:
  - `odooproject-db-1`
  - `odooproject-web-1`
- Command install yang berhasil:

```bash
docker compose exec web odoo -d SentanuJaya --db_host=db --db_user=odoo --db_password=odoo --stop-after-init --no-http -i custom_contact_fields,sj_tax,sj_workshop_master,sj_receiving,sj_production,sj_delivery,sj_claim
```

- Hasil verifikasi module state:
  - `custom_contact_fields`: installed
  - `sj_tax`: installed
  - `sj_workshop_master`: installed
  - `sj_receiving`: installed
  - `sj_production`: installed
  - `sj_delivery`: installed
  - `sj_claim`: installed

Smoke test runtime berhasil lewat Odoo shell dan di-rollback agar tidak meninggalkan data dummy.
Workflow yang diuji:

1. Membuat customer, item, material, color, service, defect, claim reason.
2. Membuat Customer Pricelist dan memverifikasi split harga:
   - Jasa 10%
   - Bahan 90%
3. Membuat Surat Jalan Masuk dan menjalankan Incoming QC pass.
4. Membuat Production Batch.
5. Membuat WO Raw, WO Paint, WO Polish.
6. Menjalankan start/done Work Order.
7. Membuat Material Consumption.
8. Membuat Final QC pass.
9. Membuat Surat Jalan Keluar normal dan menjalankan ready/delivered.
10. Membuat Customer Claim dari Surat Jalan Keluar.
11. Membuat Claim Rework.
12. Membuat Surat Jalan Pengiriman Ulang / Redelivery.

Sequence yang terverifikasi pada smoke test:

- `SJM/2026/00001`
- `PB/2026/00001`
- `SJK/2026/00001`
- `CLM/2026/00001`
- `SJU/2026/00001`

Setelah install dan smoke test, service `web` sudah direstart:

```bash
docker compose restart web
```

Catatan teknis:

- Saat menjalankan Odoo CLI di container, parameter database harus eksplisit memakai `--db_host=db --db_user=odoo --db_password=odoo`.
- Jika parameter itu tidak diberikan, Odoo CLI mencoba konek ke socket Postgres lokal container dan gagal.
- Warning missing license pada `custom_contact_fields` sudah diperbaiki dengan menambahkan `license: LGPL-3` di manifest.

## Cleanup Modul extra-addons (2026-06-08)

Folder `extra-addons` dibersihkan dari modul yang tidak dipakai Sentanu Jaya.

**Dihapus: 78 folder** (modul yang TIDAK ter-install di database + folder temp `_invoice_samples`).
Aman dihapus karena hanya file di disk, tanpa dampak ke database. Registry Odoo
diverifikasi tetap load tanpa error setelah penghapusan.

**Sisa 20 folder di extra-addons:**

Modul Sentanu Jaya (8) — dipakai:
- `custom_contact_fields`, `sj_security`, `sj_tax`, `sj_workshop_master`,
  `sj_receiving`, `sj_production`, `sj_delivery`, `sj_claim`

Modul lain (12) — ter-install di DB, BUKAN dependency SJ, sengaja DIPERTAHANKAN
(keputusan: biarkan saja, kemungkinan dipakai untuk akuntansi/manufaktur):
- Akuntansi: `om_account_accountant`, `om_account_asset`, `om_account_budget`,
  `om_account_daily_reports`, `om_account_followup`, `om_fiscal_year`,
  `om_recurring_payments`, `accounting_pdf_reports`
- Lainnya: `dms`, `mrp_multi_level`, `mrp_warehouse_calendar`, `stock_warehouse_calendar`

Catatan: 12 modul di atas tidak menjadi dependency modul SJ manapun. Jika suatu saat
ingin dihapus juga, harus di-uninstall dari database dulu (lewat Apps), baru folder-nya
dihapus, supaya Odoo tidak error saat restart.

## Changelog Update 2026-06-08

Perubahan yang dilakukan pada sesi ini:

1. **Modul `sj_security` baru** — 4 security group bertingkat (User, QC Inspector, Manager, Administrator). Admin & root otomatis masuk group Administrator.
2. **Semua `ir.model.access.csv` diupdate** — dari `base.group_user` ke group `sj_security.*` (User tanpa delete, Manager full).
3. **Perbaikan UI** — button visibility per state, search view + filter, kanban Work Order, badge widget, tree decoration, smart buttons.
4. **Report PDF baru** — Surat Jalan Masuk, Surat Jalan Keluar, Customer Claim.
5. **Invoice otomatis** — tombol Create Invoice dari SJ Keluar (state delivered) → account.move + tax dari profile.
6. **Pricing split 90/10** di delivery line (Biaya Bahan / Biaya Jasa).
7. **Invoice Template System** — model `sj.invoice.template`, 4 template bawaan (PPN+PPh, PPN, PPh, Non Tax), 1 report dispatcher.
8. **Field amount** baru di delivery: `amount_untaxed`, `amount_ppn`, `amount_pph`, `amount_grand_total`.
9. **Perhitungan pajak** — PPN 11% dari harga jual, PPh dari porsi jasa.
10. **Logo perusahaan** — embed base64 di header Invoice & Kwitansi (`logo_sentanu.png`).
11. **Report Kwitansi** — format receipt sederhana.
12. **Terbilang otomatis** — `_sj_amount_to_words()` konversi angka ke teks Indonesia.
13. **Meterai tempel otomatis** muncul jika total >= 5jt.

### Validasi Update

- Semua manifest, Python, dan XML lolos validasi statis.
- Module `sj_security` + semua modul `sj_*` berhasil di-install/upgrade di database `SentanuJaya` tanpa error.
- PDF contoh ke-4 skenario template + Kwitansi berhasil di-generate (folder sementara `extra-addons/_invoice_samples/`, bisa dihapus).
- Verifikasi field & group lewat Odoo shell: 4 group ada, admin jadi anggota, 7 modul installed.

Catatan tooling:

- Script generate contoh PDF: `tools/generate_invoice_samples.py` (dijalankan via odoo shell, data dummy di-rollback otomatis).
- Saat generate PDF lewat shell (`--no-http`) muncul warning `ContentNotFoundError`/`ProtocolUnknownError` dari wkhtmltopdf — itu hanya untuk fetch URL eksternal (logo company di external_layout). Logo invoice tetap muncul karena pakai base64. Saat print dari browser, warning tidak relevan.

## Yang Belum Selesai

Prioritas tinggi:

1. Uji workflow manual dari UI browser Odoo (end-to-end):
   - Customer, Tax Profile, Customer Pricelist
   - Surat Jalan Masuk, Incoming QC
   - Production Batch, WO Raw/Paint/Polish, Final QC
   - Surat Jalan Keluar, Invoice (print semua template), Kwitansi
   - Customer Claim, Claim Rework, Redelivery
2. ~~Tambahkan security group khusus Sentanu Jaya.~~ ✅ DONE
3. ~~Rapikan UI dengan smart button, kanban, search filter.~~ ✅ DONE
4. ~~Tambahkan report PDF untuk dokumen utama.~~ ✅ DONE
5. ~~Buat flow invoice otomatis dari Surat Jalan Keluar.~~ ✅ DONE

Prioritas menengah:

1. ~~Integrasi invoice otomatis dari Surat Jalan Keluar.~~ ✅ DONE
2. ~~Integrasi product/service line accounting (split Jasa 10% / Bahan 90%).~~ ✅ DONE
3. Integrasi stock move atau inventory material consumption.
4. Attachment foto untuk Incoming QC, Final QC, dan Customer Claim.
5. ~~Report PDF untuk Surat Jalan Masuk, Surat Jalan Keluar, Redelivery, dan Claim.~~ ✅ DONE
6. ~~Logo perusahaan di report.~~ ✅ DONE
7. Sequence per company jika multi-company digunakan.
8. Set logo yang sama ke Company (Settings → Companies) agar warning external_layout hilang.

Prioritas lanjutan:

1. Dashboard progress produksi.
2. KPI per PIC dan department.
3. Lead time produksi.
4. Portal/customer-facing claim tracking.
5. Migration script jika struktur berubah setelah data real masuk.
