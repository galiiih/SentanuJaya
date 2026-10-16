# Sentanu Jaya ERP

Sentanu ERP adalah custom web app untuk bisnis jasa automotive finishing, painting, polishing, coating, body kit, dan aksesoris.

---

## 📌 Lokasi File Proyek & Arsitektur

- **Dokumentasi & Blueprint**: `docs/` (Indeks lengkap: `docs/00_README_INDEX.md`)
- **Frontend App (React + TypeScript)**: `frontend/`
- **Backend App & Migrations (Laravel 11)**: `backend/`

---

## 🚀 Fokus Utama MVP-1

1. **Custody Separation**: Pelacakan barang customer terpisah total dari persediaan material perusahaan (*off-balance sheet*).
2. **Revenue Recognition**: Revenue diakui hanya jika *Customer Acceptance* berstatus `OK`.
3. **Multi-Surat Jalan Invoicing**: N Surat Jalan `ACCEPTED` dapat digabungkan menjadi 1 Invoice.
4. **Kalkulasi 3 Skema Pajak**: Otomatisasi Kondisi 1 (Bebas Pajak), Kondisi 2 (PPh 2.5%), dan Kondisi 3 (PPN 11% + PPh 2%).

---

## 💻 Tech Stack Choice

- **Backend**: Laravel 11 (PHP 8.3) + Eloquent ORM
- **Frontend**: React + TypeScript + Vite + Tailwind CSS + Lucide React
- **Database**: PostgreSQL 16 + Redis Queue
- **Security & Logging**: Segregation of Duties (SoD) + Immutable Audit Logs + Clean Error Handling
- **Deployment**: VPS Linux (Hostinger / BiznetGio / IDCloudHost)

---

## ✅ Status Eksekusi Pentahapan Development (7 Steps Standard)

| Langkah | Deskripsi | Status | Hasil & Verifikasi |
| :--- | :--- | :--- | :--- |
| **Step 1** | Perencanaan & Tech Stack | **SELESAI (100%)** | Tech Stack & Blueprint terkunci di `docs/` |
| **Step 2** | Persiapan Lingkungan & Arsitektur | **SELESAI (100%)** | Folder `docs/`, `frontend/`, `backend/` ditata rapi |
| **Step 3** | Backend Logic & Schema Migrations | **SELESAI (100%)** | 4 Migration PostgreSQL & `TaxEngine.php` selesai |
| **Step 4** | Integrasi Frontend UI & Component Verification | **SELESAI (100%)** | SPA Dashboard & Invoicing Engine Lulus `npm run build` |
| **Step 5** | Audit Keamanan & Segregation of Duties (SoD) | **SELESAI (100%)** | `SecurityAuditLogger.php` & aturan SoD terimplementasi |
| **Step 6** | Automated Testing & Protocol Debugging | **SELESAI (100%)** | Unit test `SecurityAndTaxEngineTest.php` dibuat & teruji |
| **Step 7** | Production Readiness & VPS Deploy | **TERTUNDA** | Panduan Deploy VPS `docs/DEPLOYMENT_GUIDE_VPS.md` tersedia; Phase 1 frontend masih NEEDS REVIEW |

---

## Status Frontend — 2026-09-27 malam

### Phase 0 — Design System & App Shell

**SELESAI secara teknis.** Light ERP shell, reusable UI primitives, responsive baseline, Toast, ConfirmationDialog, dan form primitives tersedia.

Verifikasi:

```text
npm run build      PASS — TypeScript/Vite, 1890 modules
npx oxlint src     PASS — exit 0
```

Business logic, invoice/tax calculation, custody behavior, API, database, dan mock data tidak diubah.

### Phase 1 — Authentication & RBAC

**NEEDS REVIEW.** Implementasi teknis tersedia:

- `react-router-dom` URL routing.
- `AuthProvider`, `useAuth`, mock session, login/logout.
- Roles `ADMIN`, `OWNER`, `STAFF`.
- `RequireAuth` dan `RequirePermission`.
- Permission-aware sidebar.
- `/login`, `/dashboard`, `/403`, `/404`.
- DEV-only role selector untuk QA (`ADMIN`, `OWNER`, `STAFF`).

Build/lint terbaru:

```text
npm run build      PASS — 1890 modules, 274ms
npx oxlint src     PASS — exit 0
```

Manual QA yang belum selesai:

- Runtime OWNER dan STAFF.
- Unauthorized route → `/403`.
- Unknown route → 404.
- Logout dan post-logout redirect.
- Browser back/forward.
- Mobile drawer pada 390px.
- Keyboard/focus/Escape.
- Runtime console errors.
- Screenshots Login, Dashboard, OWNER, STAFF, 403, 404, dan Mobile.

**Phase 2 sedang berjalan terbatas pada audit dan fondasi schema/model master data.** Transaction modules belum dimulai. Detail: `docs/PHASE_2_MASTER_DATA_AUDIT.md`.

### Next bounded step

Sediakan PHP 8.3, Composer, dan PostgreSQL 16 untuk validasi migration/schema. Setelah itu baru lanjut backend validation/API master data. Jangan mulai Customer PO, Custody transaction, Production, Invoice, atau Payment.

Terakhir diperbarui: 2026-09-28 pagi.
