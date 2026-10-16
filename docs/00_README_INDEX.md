# SENTANU ERP — DOCUMENT INDEX

## Source of truth

1. `GREENFIELD_MASTER_BASELINE.md` — aturan bisnis terkunci (V2.1 - All Decisions Resolved).
2. `OPEN_DECISIONS_RESOLVED.md` — 25 keputusan bisnis yang sudah dijawab Owner (2026-09-23).
3. `MVP_ROADMAP.md` — pembagian MVP-1 sampai MVP-4.
4. `TECH_STACK_DECISION.md` — keputusan stack (Laravel 11 + React/Vite + Eloquent + PostgreSQL + Redis).
5. `DATABASE_SCHEMA.md` — schema PostgreSQL MVP-first untuk Laravel Eloquent.
6. `STATE_MACHINES.md` — status dan transisi setiap menu.
7. `API_AND_WIREFRAME.md` — fungsi API, endpoint minimum, dan wireframe awal.
12|8. `ACCOUNTING_TAX_RECOMMENDATION.md` — rekomendasi akuntansi/pajak dan rujukan hukum.
13|9. `07_SECURITY_AND_TESTING_WORKFLOW.md` — standar keamanan, pemisahan tugas (SoD), dan testing/debugging suite.

## Dokumen pendukung

- `PRD.md` — requirement V1 dan acceptance criteria. Gunakan bersama `MVP_ROADMAP.md`; PRD lama belum menggantikan pembagian MVP baru.
- `02_ERD.md` — ERD konseptual V1; perlu diselaraskan saat migration MVP-1 dibuat.
- `04_TECHNICAL_ARCHITECTURE.md` — arsitektur teknis, mengikuti `TECH_STACK_DECISION.md`.
- `05_SECURITY.md` — security design.
- `06_BUILD_PLAN.md` — build plan jangka panjang; eksekusi aktual mengikuti `MVP_ROADMAP.md`.
- `FORM_DIGITALIZATION.md` — pemetaan form fisik.
- `SYSTEM_CRITIQUE_AND_REFINEMENTS.md` — analisis gap dan keputusan historis.
- `PHASE_2_MASTER_DATA_AUDIT.md` — audit schema/model dan status Phase 2.
- `PHASE_3_GOODS_RECEIPT_IMPLEMENTATION.md` — implementasi STB, custody, session auth Phase 3.
- `MASTER_PROMPT_SUMMARY.md` — ringkasan master prompt.
- `README.md` — ringkasan proyek.

## Referensi asli

- `DAFTAR TAGIHAN CUSTOMER.pdf`
- `PEMBELIAN.pdf`

## Aturan konflik

1. Keputusan Owner terbaru mengalahkan semua dokumen.
2. `GREENFIELD_MASTER_BASELINE.md` mengalahkan dokumen teknis jika konflik bisnis.
3. `MVP_ROADMAP.md` menentukan fitur tahap berjalan.
4. `DATABASE_SCHEMA.md` adalah schema aktif MVP-1; tabel fase berikutnya belum dibuat.
5. Dokumen historis dipertahankan hanya sebagai referensi, bukan instruksi implementasi.

## Status saat ini

```text
Dokumentasi bisnis       : SELESAI (V2.1 Baseline)
Open decisions           : 25/25 RESOLVED (2026-09-23)
MVP breakdown            : SELESAI (MVP-1 s/d MVP-4)
Tech stack final         : Laravel 13 + React/Vite/TS + Eloquent + PostgreSQL 16
Wireframe awal           : SELESAI
Schema MVP-1             : SELESAI (Laravel Eloquent compatible)
Hosting target           : VPS (Hostinger KVM / BiznetGio / IDCloudHost)

--- STATUS EKSEKUSI ---

Phase 0 — Design System & App Shell    : ✅ SELESAI
  build       : npm run build PASS
  lint        : npx oxlint src PASS
  komponen    : AppShell, Sidebar, Header, Breadcrumb, Button, Card,
                StatusBadge, DataTable, FormField, Input, Select, Alert,
                Modal, Toast, ConfirmationDialog, Textarea, NumberInput,
                CurrencyInput, Checkbox, Radio, FileUpload, DatePicker

Phase 1 — Authentication & RBAC        : ✅ SELESAI
  roles       : ADMIN, OWNER, STAFF
  auth        : Session-based (Laravel DB sessions, no Sanctum)
  guards      : auth middleware, canPostGoodsReceipt()
  browser     : Login, logout, session persistence verified

Phase 2 — Master Data Foundation       : ✅ SELESAI
  resources   : 17 master data resources, 85+ CRUD endpoints
  tests       : 11/11 PASS, 61 assertions
  detail      : docs/PHASE_2_MASTER_DATA_AUDIT.md

Phase 3 — Goods Receipt / STB          : ✅ SELESAI
  backend     : STB CRUD, submit/post/cancel, CustodyService,
                custody balance/ledger/locations API
  frontend    : STB list, draft editor, lifecycle actions,
                custody balance table, custody ledger table
  auth        : Session auth (login/me/logout), Vite API proxy
  tests       : 27 tests, 159 assertions PASS
  lint/build  : PASS
  browser E2E : STB-202610-0001 POSTED, 10 pcs, IN FROM CUSTOMER ✅
  translations: ID + EN complete (goods_receipt.*, auth.*)
  detail      : docs/PHASE_3_GOODS_RECEIPT_IMPLEMENTATION.md

Phase 4 — Surat Jalan & Acceptance     : DESIGN GATE
  status      : Design document drafted, business decisions pending
  blockers    : Invoice cardinality, partial acceptance policy,
                rejected goods treatment, delivery role matrix,
                Customer PO dependency
```

Terakhir diperbarui: 2026-10-04.
