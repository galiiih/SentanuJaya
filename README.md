# ERP Sentanu Jaya — Odoo 17

Implementasi ERP untuk **PT. Sentanu Jaya** (workshop car accessories painting) di atas
**Odoo 17 Community**, berjalan via Docker.

Sistem mengelola alur kerja workshop dari penerimaan barang customer, proses produksi
(raw → paint → polish), QC, pengiriman, invoice/pajak, hingga penanganan klaim.

## Alur Bisnis

```
Surat Jalan Masuk → Incoming QC → Production Batch
   → WO Raw → WO Paint → WO Polish → Final QC
   → Surat Jalan Keluar → Invoice & Payment
   → (jika ada keluhan) Customer Claim → Claim Rework → Redelivery
```

## Modul Custom (folder `extra-addons/`)

| Modul | Fungsi |
|-------|--------|
| `sj_security` | Security group bertingkat (User, QC Inspector, Manager, Administrator) |
| `sj_tax` | Tax Profile customer (Non, PPN 11%, PPh 23, PPN+PPh) |
| `sj_workshop_master` | Master data: warna, jasa, defect, alasan klaim, pricelist customer |
| `sj_receiving` | Surat Jalan Masuk + Incoming QC |
| `sj_production` | Production Batch, Work Order, Material Consumption, Final QC, Internal Rework |
| `sj_delivery` | Surat Jalan Keluar, Redelivery, Invoice otomatis + multi-template, Kwitansi |
| `sj_claim` | Customer Claim, Claim Rework |
| `custom_contact_fields` | Field tambahan di contact (NPWP, PPN/PPh) |

Modul lain di `extra-addons/` (om_account_*, accounting_pdf_reports, dms, mrp_*, stock_*)
adalah modul pihak ketiga pendukung akuntansi/manufaktur — bukan dependency langsung
modul Sentanu Jaya.

## Menjalankan (Docker)

```bash
# Start container
docker compose up -d

# Install / upgrade modul Sentanu Jaya
docker compose exec web odoo -d SentanuJaya \
  --db_host=db --db_user=odoo --db_password=odoo \
  --stop-after-init --no-http \
  -i custom_contact_fields,sj_security,sj_tax,sj_workshop_master,sj_receiving,sj_production,sj_delivery,sj_claim

# Restart agar service jalan normal
docker compose restart web
```

Odoo dapat diakses di `http://localhost:8069`.

## Urutan Install Modul

1. `custom_contact_fields`
2. `sj_security`
3. `sj_tax`
4. `sj_workshop_master`
5. `sj_receiving`
6. `sj_production`
7. `sj_delivery`
8. `sj_claim`

## Security Groups

Hierarki: **User → QC Inspector → Manager → Administrator**

| Group | Hak |
|-------|-----|
| User | Read / Write / Create (tanpa Delete) |
| QC Inspector | + operasi QC (Incoming/Final QC) |
| Manager | + Delete, Create Invoice, Reset Draft |
| Administrator | Full access + konfigurasi |

Catatan: akses model memakai group `sj_security.*` (bukan `base.group_user`).
User harus jadi anggota salah satu group agar menu Sentanu Jaya muncul.

## Invoice & Pajak

- Tombol **Create Invoice** di Surat Jalan Keluar membuat `account.move` otomatis.
- Report **Invoice** memilih template otomatis berdasarkan Tax Profile customer:
  PPN+PPh, PPN Only, PPh Only, atau Non Tax.
- Split harga: **Bahan 90% / Jasa 10%**. PPN 11% dari harga jual, PPh dari porsi jasa.
- Tersedia juga report **Kwitansi** dan dokumen Surat Jalan.
- Template invoice dikelola di: Sentanu Jaya → Configuration → Invoice Templates.

## Dokumentasi Lengkap

Detail teknis, changelog, dan catatan handoff ada di
[`SENTANU_JAYA_HANDOFF.md`](SENTANU_JAYA_HANDOFF.md).

Blueprint bisnis: `PROJECT Aplikasi SENTANU JAYA.docx`,
diagram alur: `workflow sentanu jaya.drawio`,
panduan operasional: `Panduan Operasional ERP Sentanu Jaya.docx`.

## Tools

Folder `tools/` berisi script bantu (dijalankan via Odoo shell):
- `smoke_test_shell.py` — verifikasi modul, group, report, dan field.
- `generate_invoice_samples.py` — generate PDF contoh invoice untuk semua skenario pajak.
- `build_sentanu_user_manual.py` — generator panduan user.

## Catatan

`docker-compose.yml` memakai kredensial DB default (`odoo/odoo`) untuk environment dev.
Untuk produksi, pindahkan kredensial ke file `.env` (sudah masuk `.gitignore`) dan ganti
password default.
