# STEP 2 PLAN — INITIALIZATION & ARCHITECTURE SETUP

## Target
Mempersiapkan struktur proyek fisik, repository, skema migrasi database PostgreSQL, dan arsitektur aplikasi sesuai `DATABASE_SCHEMA.md` & `TECH_STACK_DECISION.md`.

## Kebutuhan Lingkungan Lokal (Prerequisites)
Sebelum mengeksekusi skrip inisialisasi dan migrasi di mesin ini, berikut lingkungan yang dibutuhkan:

1. **PHP 8.2+ / 8.3** & **Composer** (untuk runtime & dependensi Laravel 11).
2. **PostgreSQL 16** (Database lokal atau cloud instance seperti Supabase / Neon / Aiven / VPS).
3. **Node.js (v18+) & npm** (Sudah terverifikasi: Node `v22.22.3`, npm `10.9.8`).
4. **Git** (Sudah terverifikasi).

---

## Struktur Folder Proyek yang Akan Dibuat

```text
D:\ProyekAsistenAI\sunday-brain\01_Proyek\Sentanu Jaya Web App\
├── docs/                        (Arsip seluruh dokumen spesifikasi & baseline)
│   ├── 00_README_INDEX.md
│   ├── GREENFIELD_MASTER_BASELINE.md
│   ├── OPEN_DECISIONS_RESOLVED.md
│   ├── DATABASE_SCHEMA.md
│   └── ...
├── backend/                     (Laravel 11 Application API)
│   ├── app/
│   │   ├── Domain/              (Business & Accounting Rules)
│   │   ├── Services/            (Custody, Inventory, Tax Engine)
│   │   └── Http/Controllers/Api/V1/
│   ├── database/migrations/     (Skrip Migrasi PostgreSQL MVP-1)
│   ├── database/seeders/        (Seeder Master Data & Company Baseline)
│   └── routes/api.php
└── frontend/                    (React + TypeScript + Vite + Tailwind + shadcn/ui)
    ├── src/
    │   ├── components/          (Komponen UI & Layout)
    │   ├── pages/               (Halaman Dashboard, Custody, Gudang, Invoicing)
    │   └── services/            (API Client & Axios Services)
    └── vite.config.ts
```

---

## Urutan Eksekusi Tahap 2

### 2.1 Pengelompokan Dokumentasi Proyek
Memindahkan seluruh dokumen spesifikasi ke dalam folder `docs/` agar root proyek bersih dan siap diisi folder `backend/` dan `frontend/`.

### 2.2 Inisialisasi Backend (Laravel 11 API)
- Membuat proyek Laravel 11 di folder `backend/`.
- Menyiapkan konfigurasi `.env` untuk PostgreSQL & Redis.
- Menulis skrip migrasi database PostgreSQL lengkap untuk MVP-1:
  - `0001_create_companies_and_branches_table.php`
  - `0002_create_users_and_rbac_tables.php`
  - `0003_create_master_data_tables.php` (Customers, Items, Materials, Suppliers, Price Lists)
  - `0004_create_custody_tables.php` (Goods Receipts, Inbound QC, Custody Ledger & Balances)
  - `0005_create_inventory_tables.php` (Material Receipts, Usages, Stock Movements, Stocks)
  - `0006_create_delivery_and_acceptance_tables.php` (Delivery Orders, Acceptances, Customer Returns)
  - `0007_create_billing_and_payment_tables.php` (Invoices, Invoice Lines, Payments, Allocations)
  - `0008_create_tax_and_transport_tables.php` (Tax Codes, Tax Rates, Tax Rules, Transport Templates, Claims)

### 2.3 Inisialisasi Frontend (React + Vite + TypeScript)
- Inisialisasi React TypeScript via Vite di folder `frontend/`.
- Install dependensi UI: Tailwind CSS, shadcn/ui dependencies, Lucide React, Axios, Recharts.
- Menyiapkan arsitektur halaman dan komponen sesuai `API_AND_WIREFRAME.md`.

---

## Status Eksekusi Saat Ini
- Document Index & Specification: **LENGKAP (100%)**
- Lingkungan Mesin Lokal: **Node.js & Git Siap**. *PHP & PostgreSQL perlu disiapkan/dikonfigurasi untuk eksekusi CLI backend.*

```text
[Step 2 Plan Created] → File: STEP2_INIT_PLAN.md
Next Step: Konfirmasi apakah PHP & PostgreSQL sudah siap di-install/dihubungkan, atau lanjut buat struktur folder & skrip migrasi database dulu.
```
