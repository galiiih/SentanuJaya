# Sentanu Jaya ERP

Sentanu ERP adalah custom web app untuk bisnis jasa automotive finishing, painting, polishing, coating, body kit, dan aksesoris.

> **AI-agent workflow:** ChatGPT berperan sebagai Main Orchestrator untuk merencanakan, mendelegasikan, dan memverifikasi pekerjaan dari agent spesialis. E2E testing adalah salah satu task QA, bukan tujuan utama orchestration. Lihat [AI Agent Orchestration](docs/AI_AGENT_ORCHESTRATION.md).

## Lokasi proyek

- Dokumentasi & blueprint: `docs/` (indeks: `docs/00_README_INDEX.md`)
- Frontend: `frontend/` (React + TypeScript + Vite)
- Backend: `backend/` (Laravel 13)
- Database: PostgreSQL 16

## Fokus proses bisnis

1. **Customer-owned goods custody:** barang milik customer dilacak terpisah dari material perusahaan.
2. **Revenue recognition:** pengakuan revenue mengikuti customer acceptance sesuai baseline bisnis.
3. **Production & delivery:** PO customer, penerimaan barang, proses produksi, QC, dan Surat Jalan.
4. **Invoice & payment:** invoice dan alokasi pembayaran mengikuti relasi dokumen serta aturan pajak yang disetujui Owner.
5. **Document templates:** pengelolaan template dokumen tersedia di dalam aplikasi.

## Teknologi

- Backend: Laravel 13, PHP 8.3, Eloquent.
- Frontend: React 19, TypeScript, Vite, Tailwind CSS.
- Database: PostgreSQL 16.
- Testing: PHPUnit dan Playwright.

## Status pengembangan — 11 November 2026

Implementasi modul inti dan automated test suite telah berkembang melampaui baseline awal. Jangan gunakan angka modul/test dari snapshot lama di dokumen historis; lihat [Implementation Progress](docs/IMPLEMENTATION_PROGRESS.md) untuk status dan bukti terbaru.

Verifikasi pada commit `b2f0e1bd5143cb5d173f87e09f1e79571d7112ca`:
- PHP & PostgreSQL: 153 tests passed, 1,037 assertions.
- Browser E2E: 53 tests passed, 0 failed.
- Dedicated Login Intro E2E: 11 tests passed.
- Invoice & Payment integration subset: 24 tests passed, 113 assertions.
- Dedicated print E2E: 2 tests passed; Surat Jalan dan Invoice PDF masing-masing 1 halaman A4.
- Frontend TypeScript + Vite production build: PASS.

## Production readiness

**Belum siap dinyatakan production-ready.** Deployment VPS, UAT bisnis final, pengujian backup-restore, opening data, training, hardening environment, monitoring, dan Owner sign-off masih harus dilakukan. Build dan automated tests yang lulus tidak menggantikan UAT dan operational readiness.

## Branch aktif

Pengembangan berjalan di `feat/sidebar-collapse-navigation-new`. Belum ada merge ke `main` atau deployment production.
