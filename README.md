# Sentanu Jaya ERP

Sentanu ERP adalah custom web app untuk bisnis jasa automotive finishing, painting, polishing, coating, body kit, dan aksesoris.

> **AI-agent workflow:** ChatGPT berperan sebagai Main Orchestrator untuk merencanakan, mendelegasikan, dan memverifikasi pekerjaan dari agent spesialis. E2E testing adalah salah satu task QA, bukan tujuan utama orchestration. Lihat [AI Agent Orchestration](docs/AI_AGENT_ORCHESTRATION.md).

---

## 📌 Lokasi File Proyek & Arsitektur

- **Dokumentasi & Blueprint**: `docs/` (Indeks lengkap: `docs/00_README_INDEX.md`)
- **Frontend App (React + TypeScript)**: `frontend/`
- **Backend App & Migrations (Laravel 13)**: `backend/`

---

## 🚀 Fokus Utama MVP-1

1. **Custody Separation**: Pelacakan barang customer terpisah total dari persediaan material perusahaan (*off-balance sheet*).
2. **Revenue Recognition**: Revenue diakui hanya jika *Customer Acceptance* berstatus `OK`.
3. **Multi-Surat Jalan Invoicing**: N Surat Jalan `ACCEPTED` dapat digabungkan menjadi 1 Invoice.
4. **Kalkulasi 3 Skema Pajak**: Otomatisasi Kondisi 1 (Bebas Pajak), Kondisi 2 (PPh 2.5%), dan Kondisi 3 (PPN 11% + PPh 2%).

---

## 💻 Tech Stack Choice

- **Backend**: Laravel 13 (PHP 8.3) + Eloquent ORM
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
| **Step 7** | Production Readiness & VPS Deploy | **TERTUNDA** | Panduan tersedia; deployment VPS, UAT final, training, backup-restore, dan sign-off Owner belum selesai |

---

## Status Frontend — 2026-09-27 malam

### Phase 0 — Design System & App Shell

**SELESAI secara teknis.** Light ERP shell, reusable UI primitives, responsive baseline, Toast, ConfirmationDialog, dan form primitives tersedia.

Verifikasi:

```text
npm run build      PASS — TypeScript/Vite, 2553 modules
npx oxlint src     berjalan dengan warning yang masih perlu dibersihkan
```

Business logic, invoice/tax calculation, custody behavior, API, database, dan mock data telah berkembang setelah baseline awal ini.

### Phase 1 — Authentication & RBAC

**SELESAI secara teknis.** Implementasi yang tersedia:

- `react-router-dom` URL routing.
- `AuthProvider`, `useAuth`, mock session, login/logout.
- Roles `ADMIN`, `OWNER`, `STAFF`.
- `RequireAuth` dan `RequirePermission`.
- Permission-aware sidebar.
- `/login`, `/dashboard`, `/403`, `/404`.
- DEV-only role selector untuk QA (`ADMIN`, `OWNER`, `STAFF`).

Build terbaru:

```text
npm run build      PASS — 2553 modules
npx oxlint src     berjalan dengan warning yang masih perlu dibersihkan
```

QA teknis dasar sudah tersedia melalui PHPUnit, Playwright, dan browser smoke test. UAT bisnis penuh, deployment production, training, backup-restore, dan sign-off Owner masih belum selesai.

Phase 2 master data dan modul transaksi sudah berjalan. Lihat status terbaru di `docs/00_README_INDEX.md` dan `docs/IMPLEMENTATION_PROGRESS.md`.

Terakhir diperbarui: 2026-11-03.
