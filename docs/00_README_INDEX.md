# SENTANU ERP — DOCUMENT INDEX

## Source of truth

1. `GREENFIELD_MASTER_BASELINE.md` — aturan bisnis terkunci (V2.1).
2. `OPEN_DECISIONS_RESOLVED.md` — 25 keputusan bisnis Owner.
3. `MVP_ROADMAP.md` — pembagian MVP-1 sampai MVP-4.
4. `TECH_STACK_DECISION.md` — Laravel 13 + React/Vite + Eloquent + PostgreSQL + Redis.
5. `DATABASE_SCHEMA.md` — schema PostgreSQL MVP-first.
6. `STATE_MACHINES.md` — status dan transisi setiap menu.
7. `API_AND_WIREFRAME.md` — fungsi API, endpoint minimum, dan wireframe awal.
8. `ACCOUNTING_TAX_RECOMMENDATION.md` — rekomendasi akuntansi/pajak dan rujukan.
9. `07_SECURITY_AND_TESTING_WORKFLOW.md` — keamanan, SoD, dan testing/debugging.

## AI-agent orchestration

- `AI_AGENT_ORCHESTRATION.md` — peran ChatGPT sebagai Main Orchestrator, delegasi, verifikasi, dan kontrak bukti.

## Dokumen pendukung

- `PRD.md` — requirement V1 dan acceptance criteria; gunakan bersama `MVP_ROADMAP.md`.
- `02_ERD.md` — ERD konseptual historis.
- `04_TECHNICAL_ARCHITECTURE.md` — arsitektur teknis.
- `05_SECURITY.md` — security design.
- `06_BUILD_PLAN.md` — build plan jangka panjang.
- `FORM_DIGITALIZATION.md` — pemetaan form fisik.
- `SYSTEM_CRITIQUE_AND_REFINEMENTS.md` — analisis gap dan keputusan historis.
- `PHASE_2_MASTER_DATA_AUDIT.md` — audit schema/model Phase 2.
- `PHASE_3_GOODS_RECEIPT_IMPLEMENTATION.md` — implementasi STB, custody, session auth.
- `IMPLEMENTATION_PROGRESS.md` — snapshot implementasi dan hasil verifikasi terbaru.
- `NANU_QUESTION_BANK.md` — bank pertanyaan Nanu.
- `MASTER_PROMPT_SUMMARY.md` — ringkasan master prompt.
- `README.md` — ringkasan proyek.

## Aturan konflik

1. Keputusan Owner terbaru mengalahkan semua dokumen.
2. `GREENFIELD_MASTER_BASELINE.md` mengalahkan dokumen teknis jika ada konflik bisnis.
3. `MVP_ROADMAP.md` menentukan urutan dan batas tahap.
4. `DATABASE_SCHEMA.md` dan migration aktif menjadi acuan schema; jangan menganggap tabel fase berikutnya sudah ada tanpa memeriksa migration.
5. Dokumen historis adalah referensi, bukan instruksi implementasi bila sudah digantikan keputusan terbaru.

## Status eksekusi — snapshot 10 November 2026

- Implementasi inti Phase 0–5 tersedia; status per modul dan bukti terbaru tercatat di `IMPLEMENTATION_PROGRESS.md`.
- PHP/PostgreSQL workflow: 152 tests passed, 1,032 assertions.
- Browser E2E workflow: 48 tests passed; dedicated Login Intro suite 7 tests passed.
- Frontend TypeScript dan Vite production build: PASS.
- Production readiness: BELUM SELESAI. Deployment VPS, UAT bisnis final, training, backup-restore drill, opening data, dan Owner sign-off masih harus diselesaikan.
- Current branch: `feat/sidebar-collapse-navigation-new`; belum di-merge ke `main`.

Terakhir diperbarui: 2026-11-10.
