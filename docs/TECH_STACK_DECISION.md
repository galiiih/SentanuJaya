# Keputusan Tech Stack — Sentanu ERP

## Rekomendasi final

| Lapisan | Pilihan |
|---|---|
| Backend + API | Laravel 11, PHP 8.3 |
| Frontend | React + TypeScript + Vite |
| UI | Tailwind CSS, shadcn/ui, Lucide React |
| Database | PostgreSQL 16 |
| ORM | Laravel Eloquent |
| Migration | Laravel Migrations |
| Queue/cache | Redis + Laravel Queue |
| File storage | S3-compatible object storage |
| PDF | Laravel-compatible PDF renderer |
| Chart | Recharts |
| Testing | Pest/PHPUnit, Laravel HTTP tests, Playwright |
| Deployment | Cloud VPS/container yang mendukung Laravel + managed PostgreSQL |

## Kenapa bukan Prisma + Next.js

Prisma + Next.js tetap layak, tetapi bukan pilihan utama untuk Sentanu ERP:

- ERP membutuhkan transaksi, policy, approval, queue, PDF, scheduler, dan authorization backend yang kuat.
- Laravel menyediakan Eloquent, Form Request, Policy, Queue, Scheduler, Events, Notifications, dan filesystem dalam satu ekosistem.
- Tim Indonesia lebih mudah mencari developer Laravel.
- React tetap dipakai untuk UI interaktif tanpa memaksa backend ikut Node.js.
- PostgreSQL tetap menjadi sumber kebenaran transaksi.

Prisma tidak dipakai agar tidak ada dua ORM atau dua backend. Database schema harus ditulis sebagai Laravel migration, bukan schema Prisma.

## Arsitektur final

```text
React/Vite SPA
    ↓ HTTPS JSON
Laravel 11 API
    ↓ service/domain layer
Eloquent + PostgreSQL
    ├── Redis Queue
    ├── Object Storage
    └── Scheduler
```

## Aturan implementasi

- Controller hanya menerima request dan mengembalikan response.
- Business rule berada di Action/Service/Domain layer.
- Semua posting stock, custody, revenue, dan journal memakai satu `DB::transaction()`.
- Semua uang memakai PostgreSQL `NUMERIC`, ditampilkan sebagai string di API.
- Semua transaksi POST memakai `Idempotency-Key`.
- Draft boleh diubah; posted hanya reversal/correction.
- `branch_id` wajib pada transaksi operasional.
- Customer-owned goods hanya berada di custody tables.

## Ditunda

Microservice, GraphQL, mobile native, Kubernetes, dan event bus tidak diperlukan untuk 10–20 user dan sekitar 50.000 transaksi/tahun. Tambahkan hanya jika beban nyata menuntutnya.

## Keputusan yang masih perlu persetujuan

Stack ini rekomendasi teknis, tetapi `OPEN DECISION #10` belum final sampai Owner menyetujui hosting dan bentuk deployment.
