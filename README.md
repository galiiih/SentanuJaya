# Sentanu Jaya ERP

Custom ERP web application untuk operasional **Sentanu Jaya**, usaha jasa pengecatan, finishing, polishing, dan pengerjaan body kit/aksesori otomotif.

Repository ini berisi aplikasi aktif, dokumentasi bisnis/teknis, automated tests, dan workflow CI. Aplikasi dibangun khusus untuk proses Sentanu Jaya — **bukan implementasi Odoo**.

## Tujuan

Mengelola proses bisnis dari penerimaan barang milik customer sampai penagihan dan pembayaran, dengan pemisahan antara:
- **Barang customer** yang dititipkan/dikerjakan (custody, bukan stok perusahaan).
- **Material perusahaan** yang digunakan dalam proses produksi.
- **Barang selesai, dikirim, dan diterima customer** sebagai dasar penagihan dan pengakuan pendapatan sesuai aturan bisnis.

## Alur bisnis

1. Customer konsultasi dan menerima penawaran.
2. Customer menyetujui pekerjaan dan menyerahkan barang beserta Customer PO.
3. Admin mencatat penerimaan barang customer (STB / Goods Receipt).
4. Barang diproses melalui produksi dan quality control internal.
5. Barang selesai dibuatkan Surat Jalan (Delivery Order).
6. Customer memeriksa barang dan menyatakan penerimaan/acceptance.
7. Invoice dibuat berdasarkan Surat Jalan yang memenuhi aturan penerimaan.
8. Pembayaran dicatat dan dialokasikan ke invoice.
9. Dashboard dan laporan menyajikan kondisi operasional, custody, material, piutang, dan keuangan.

**Aturan penting:** custody barang customer tidak boleh tercampur dengan inventory material perusahaan. Revenue mengikuti barang yang benar-benar diserahkan dan diterima customer sesuai aturan bisnis; kuantitas accepted menjadi dasar perhitungan.

## Modul ERP

| Modul | Cakupan |
|---|---|
| Authentication & Access | Session authentication, roles ADMIN/OWNER/STAFF, access control |
| Master Data | Customer, contact, item, supplier, material, UOM, color, treatment, price list, worker, warehouse, dan konfigurasi |
| Customer PO | Pencatatan dan lifecycle PO customer |
| Customer Goods Receipt / Custody | STB, custody balance, ledger, lokasi, lifecycle penerimaan |
| Material Inventory | Warehouse, material receipt/usage, stock, low stock, stock movement |
| Work Order / Production | Work order, stage movement, QC inspection |
| Delivery & Acceptance | Surat Jalan, delivery, customer acceptance |
| Invoicing | Invoice dan delivery orders yang memenuhi syarat |
| Payments | Pembayaran, outstanding, allocation |
| Dashboard & Reports | Summary, financial, receivables, operational, custody |
| Document Templates | Pengelolaan template dokumen; cek source dan branch aktif untuk status implementasi |

Daftar route API aktif ada di [`backend/routes/api.php`](backend/routes/api.php). UI, routing, dan E2E berada di `frontend/`.

## Teknologi

### Backend
- PHP 8.3
- Laravel 13 (lihat `backend/composer.json`)
- Eloquent ORM
- PostgreSQL sebagai database target
- Laravel session-based authentication
- PHPUnit / Laravel test runner

### Frontend
- React 19
- TypeScript 6
- Vite 8
- React Router 7
- Tailwind CSS 4
- Axios, Lucide React
- Playwright untuk browser E2E

Versi dependency yang berlaku adalah yang ada di `backend/composer.json` dan `frontend/package.json`. Dokumen fase lama tidak menjadi sumber versi.

## Struktur repository

```text
SentanuJaya/
├── .github/workflows/     # CI dan browser E2E
├── backend/              # Laravel API, domain logic, migrations, seeders, tests
├── frontend/             # React/TypeScript SPA, UI, API client, E2E
├── docs/                 # Dokumentasi bisnis, arsitektur, modul, testing, panduan
├── phase3_design/        # Dokumen desain fase; cek status sebelum digunakan
└── README.md             # Entry point proyek
```

Root README menjelaskan proyek saat ini. Dokumen phase/step lama adalah rekam jejak dan tidak otomatis menjadi instruksi implementasi.

## Menjalankan aplikasi lokal

### Backend

```bash
cd backend
composer install
```

Siapkan `.env` dari `.env.example`, lalu konfigurasi PostgreSQL lokal. Setelah database dipastikan benar:

```bash
php artisan key:generate
php artisan migrate
php artisan test
```

Jangan menjalankan `migrate:fresh` terhadap database berisi data penting. Test concurrency PostgreSQL harus menggunakan database test khusus yang sudah dipastikan aman.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Validasi frontend:

```bash
npm run build
npm run lint
npm run test:e2e
```

E2E memerlukan backend/test environment sesuai konfigurasi Playwright. Build atau unit test saja tidak membuktikan seluruh alur browser lulus.

## Dokumentasi dan referensi

- **Indeks dokumentasi:** [`docs/00_README_INDEX.md`](docs/00_README_INDEX.md)
- Dokumentasi bisnis, keputusan, arsitektur, dan modul: `docs/`
- Dokumentasi backend: [`backend/README.md`](backend/README.md)
- API routes: [`backend/routes/api.php`](backend/routes/api.php)
- Frontend: `frontend/`
- CI workflows: `.github/workflows/`

Gunakan keputusan bisnis owner yang disahkan sebagai aturan domain. Untuk implementasi, utamakan source code, migration, routes, tests, dan status CI terbaru. Laporan `STEP*_...` dan dokumen fase lama adalah histori, bukan status proyek saat ini.

## Konvensi kerja

1. Jangan mengubah aturan bisnis atau schema database tanpa memeriksa baseline dan test terkait.
2. Jangan menganggap dokumen lama masih aktif; cek tanggal, status, dan kesesuaian dengan source.
3. Jangan mencampur customer custody dengan company material inventory.
4. Jangan menyatakan test PASS kecuali command/CI relevan benar-benar selesai PASS.
5. Jangan commit credential, `.env`, database dump, build output, atau cache generated.
6. Perubahan struktur harus menjaga import, route, CI, dan E2E tetap berfungsi.

## Status proyek

Status modul dan testing bersifat dinamis. Periksa GitHub Actions dan test suite pada commit/branch yang sedang digunakan sebelum menyatakan release readiness.

Repository: https://github.com/galiiih/SentanuJaya
