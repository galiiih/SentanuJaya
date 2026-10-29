# Sentanu Jaya ERP — Dokumentasi

Indeks dokumentasi untuk ERP custom Sentanu Jaya. Dokumentasi ini mencakup aturan bisnis, desain, implementasi, testing, dan catatan historis.

## Cara menentukan dokumen yang berlaku

1. **Keputusan bisnis:** gunakan keputusan Owner terbaru dan baseline bisnis yang disahkan.
2. **Implementasi aktual:** periksa source code, migrations, routes, tests, dan CI pada branch/commit yang sedang dikerjakan.
3. **Roadmap:** gunakan roadmap yang telah diperbarui; jangan menganggap rencana fase lama sebagai status saat ini.
4. **Dokumen historis:** laporan `STEP*_...` dan `PHASE_*` adalah catatan pekerjaan pada waktu tertentu. Statusnya tidak otomatis mencerminkan kondisi repository sekarang.
5. **Jika ada konflik:** keputusan Owner terbaru mengalahkan dokumen lama; implementasi dan test terbaru menjadi bukti status teknis, bukan klaim laporan lama.

## Dokumen bisnis dan baseline

- `GREENFIELD_MASTER_BASELINE.md` — baseline aturan bisnis awal; cek keputusan Owner yang lebih baru sebelum menggunakannya.
- `OPEN_DECISIONS_RESOLVED.md` — kumpulan keputusan bisnis terdahulu.
- `PRD.md` — requirement dan acceptance criteria awal.
- `MVP_ROADMAP.md` — rencana pembagian MVP; status pelaksanaan harus diverifikasi terhadap source dan CI.
- `FORM_DIGITALIZATION.md` — pemetaan form bisnis.
- `ACCOUNTING_TAX_RECOMMENDATION.md` — rekomendasi accounting/tax; bukan pengganti keputusan akuntan atau regulasi terbaru.

## Arsitektur dan desain

- `TECH_STACK_DECISION.md` — keputusan stack historis; cek `backend/composer.json` dan `frontend/package.json` untuk versi dependency aktual.
- `DATABASE_SCHEMA.md` — rancangan schema; cek migrations aktif untuk schema aktual.
- `STATE_MACHINES.md` — rancangan lifecycle.
- `API_AND_WIREFRAME.md` — rancangan API/UI awal; cek route dan frontend aktual.
- `02_ERD.md` — ERD konseptual.
- `04_TECHNICAL_ARCHITECTURE.md` — rancangan arsitektur.
- `05_SECURITY.md` — security design.
- `07_SECURITY_AND_TESTING_WORKFLOW.md` — praktik keamanan dan testing.
- `AI_AGENT_ORCHESTRATION.md` — peran orchestrator/agent, delegasi, bukti, dan verifikasi.

## Implementasi dan audit historis

Laporan fase lama disimpan di `archive/phase-reports/`; laporan STEP di `archive/implementation-reports/`. Semua laporan tersebut merupakan snapshot pada commit tertentu dan bukan status terkini. `SYSTEM_CRITIQUE_AND_REFINEMENTS.md` dan `MASTER_PROMPT_SUMMARY.md` juga merupakan referensi desain/historis; cocokkan dengan keputusan Owner terbaru dan source aktif.

Untuk status terkini, gunakan GitHub Actions pada commit yang diperiksa dan jalankan test suite yang relevan. Jangan menyalin status PASS dari laporan lama ke status proyek saat ini.

## Referensi bisnis asli

- `DAFTAR TAGIHAN CUSTOMER.pdf`
- `PEMBELIAN.pdf`

Dokumen sumber ini dipertahankan sebagai referensi. Aturan yang berlaku tetap mengikuti keputusan Owner terbaru.

## Stack aktual yang tercatat di manifest

- Backend: Laravel 13, PHP 8.3 — `backend/composer.json`.
- Frontend: React 19, TypeScript 6, Vite 8, React Router 7, Tailwind CSS 4 — `frontend/package.json`.
- Database target: PostgreSQL; cek `.env.example`, config, migrations, dan CI untuk environment yang digunakan.

## Modul ERP saat ini

Repository sudah mencakup backend/API dan frontend untuk area Master Data, Customer PO, Goods Receipt/Custody, material inventory, Work Order/Production, Delivery/Acceptance, Invoice, Payments, Dashboard, dan Reports. Rincian route backend dapat diperiksa di `backend/routes/api.php`; status tiap alur harus dibuktikan dengan test/CI terbaru.

## Arsip dan dokumen historis

- `archive/legacy-odoo/` — dokumen dan konfigurasi dari pendekatan Odoo terdahulu; bukan implementasi aktif.
- `archive/implementation-reports/` — laporan STEP historis. Isi laporan tidak otomatis menggambarkan status saat ini.
- `archive/uat/` — dokumen hasil UAT historis; perlu dikaitkan dengan commit dan skenario yang diuji sebelum dijadikan bukti release.
- `archive/phase3-design/` — spesifikasi desain fase terdahulu; gunakan hanya sebagai referensi setelah dibandingkan dengan source dan keputusan terbaru.
- `archive/implementation-notes/phase4-chat-notes.txt` — catatan prompt/implementasi terdahulu, dipertahankan untuk histori dan bukan instruksi aktif.
- `archive/phase-reports/` — audit dan laporan fase 2–5; statusnya hanya berlaku pada commit/snapshot asal.

## Perubahan dokumentasi

Dokumentasi root dan indeks harus tetap menjawab: apa aplikasi ini, bagaimana struktur repository, cara menjalankan backend/frontend, dan di mana menemukan keputusan bisnis serta bukti test. Hindari memasukkan status fase yang kedaluwarsa ke dokumen entry point.

Terakhir diperbarui: 2026-10-29.
