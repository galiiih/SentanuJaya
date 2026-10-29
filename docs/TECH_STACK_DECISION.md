# Keputusan Tech Stack — Sentanu Jaya ERP

Dokumen ini menggabungkan catatan keputusan arsitektur awal dan kondisi stack yang terverifikasi dari manifest repository. Jika berbeda, manifest, konfigurasi aktif, migrations, source code, dan CI pada branch/commit yang diperiksa adalah acuan implementasi.

## Stack aplikasi saat ini (berdasarkan manifest)

| Lapisan | Kondisi yang tercatat |
|---|---|
| Backend + API | Laravel Framework ^13.17, PHP ^8.3 — backend/composer.json |
| Frontend | React ^19.2.8, TypeScript ~6.0.2, Vite ^8.3.0 — frontend/package.json |
| Routing UI | React Router DOM ^7.18.4 |
| Styling | Tailwind CSS ^4.3.3 |
| Charts | Recharts ^3.10.1 |
| HTTP client | Axios ^1.20.0 |
| Browser testing | Playwright ^1.64.1 |
| Database target | PostgreSQL; konfigurasi koneksi juga menyediakan SQLite untuk development/test tertentu |
| ORM / migrations | Laravel Eloquent dan Laravel Migrations |

Versi di atas adalah rentang dependency dari manifest, bukan klaim bahwa semua versi tersebut telah terpasang pada environment produksi.

## Rekomendasi arsitektur awal (historis)

Pilihan Laravel + React SPA dipertahankan karena memisahkan aturan bisnis/API dari UI dan mendukung validasi server, otorisasi, transaksi database, serta testing terstruktur. Dokumen awal pernah menyebut Laravel 11; versi tersebut sudah tidak sesuai dengan manifest saat ini yang mensyaratkan Laravel 13.

```text
React/Vite SPA
    ↓ authenticated HTTP API
Laravel 13 API
    ↓ application/domain logic
Eloquent + configured database
```

Redis Queue, object storage S3-compatible, PDF renderer tertentu, dan deployment container adalah opsi rancangan awal, bukan bukti bahwa service tersebut sudah dikonfigurasi atau digunakan. Periksa backend/config/, backend/composer.json, environment, dan workflow sebelum mengaktifkannya.

## Prinsip implementasi domain

- Aturan bisnis harus ditegakkan di backend, bukan hanya di browser.
- Perubahan stok material dan custody barang customer harus atomik dan tidak boleh mencampur kedua ledger.
- Barang milik customer bukan inventory perusahaan.
- Invoice/revenue mengikuti barang yang dikirim dan diterima customer dengan status acceptance OK, sesuai keputusan bisnis terbaru.
- Perubahan schema harus melalui Laravel migrations dan diuji terhadap database yang didukung.
- Jangan mengklaim fitur idempotency, journal, Redis, object storage, atau accounting lengkap sebelum source dan test membuktikannya.

## Yang belum dianggap keputusan deployment final

Hosting, domain, backup/restore, monitoring, mail delivery, queue worker, object storage, dan strategi release perlu diverifikasi serta disetujui sebelum production. Gunakan docs/DEPLOYMENT_GUIDE_VPS.md sebagai checklist rancangan, bukan instruksi yang telah terbukti di production.
