# Graph Report - Sentanu Jaya Web App  (2026-09-27)

## Corpus Check
- 53 files · ~29,126 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 3 file(s) not represented in the graph (top: .css 2, (none) 1)

## Summary
- 642 nodes · 692 edges · 49 communities (48 shown, 1 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 8 edges (avg confidence: 0.95)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `05d3ae78`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- SecurityAuditLogger
- package.json
- FASE PEMBANGUNAN
- 7. KRITERIA PENERIMAAN (ACCEPTANCE CRITERIA)
- Open Decision Register — RESOLVED
- Illuminate\Database\Eloquent\Concerns\HasUuids
- 3. Tabel MVP-1
- 🔴 A. KRITIS (Potensi Salah Hitung / Masalah Legal & Keuangan)
- compilerOptions
- Rekomendasi akuntansi
- TECHNICAL ARCHITECTURE
- App.tsx
- State Machine — Sentanu ERP MVP-1
- compilerOptions
- ENTITY RELATIONSHIP DIAGRAM (ERD)
- 3. Wireframe MVP-1 — struktur layar
- 2026_09_24_000001_create_core_tables.php
- SOP KEAMANAN, TESTING & DEBUGGING (SECURITY & VERIFICATION STANDARDS)
- Roadmap MVP Sentanu ERP
- SECURITY DESIGN
- PANDUAN DEPLOYMENT SENTANU ERP KE VPS LINUX (UBUNTU 22.04 / 24.04 LTS)
- STEP 2 PLAN — INITIALIZATION & ARCHITECTURE SETUP
- Sentanu Jaya ERP Design System
- Master Prompt & Source of Truth - Sentanu Jaya ERP
- 5. KEAMANAN APLIKASI
- Pemetaan Form Fisik ke Modul Digital Web App (Update Lengkap V2.0)
- Sentanu ERP Master Baseline — V2.0 (FINAL BASELINE)
- Keputusan Tech Stack — Sentanu ERP
- SENTANU ERP — DOCUMENT INDEX
- 7B. KEAMANAN INFRASTRUKTUR & JARINGAN (agar tidak mudah dibobol)
- 📌 Status Terkini (Step 2 - Persiapan Lingkungan & Arsitektur)
- 3. OTORISASI
- 7. AUDIT TRAIL — IMMUTABLE / APPEND-ONLY (DETAIL IMPLEMENTASI)
- 7C. KEAMANAN DATABASE SECARA KHUSUS
- .oxlintrc.json
- Sentanu Jaya ERP
- 📌 Status Terkini (Step 3 - Backend & API Development)
- 📌 Status Terkini (Step 4 - Pengujian UI & Skenario Integrasi)
- 2. AUTENTIKASI
- 9. KEAMANAN OPERASIONAL
- 4. PERLINDUNGAN DATA
- 7D. PERLINDUNGAN TERHADAP VIRUS / MALWARE / RANSOMWARE
- React + TypeScript + Vite
- LAPORAN EKSEKUSI TAHAP MULTI-MODULE BACKEND & TESTING (V2.3)
- tsconfig.json
- ui.tsx
- mockData.ts
- Shared components
- main.tsx

## God Nodes (most connected - your core abstractions)
1. `Open Decision Register — RESOLVED` - 27 edges
2. `compilerOptions` - 18 edges
3. `SECURITY DESIGN` - 18 edges
4. `FASE PEMBANGUNAN` - 16 edges
5. `State Machine — Sentanu ERP MVP-1` - 16 edges
6. `compilerOptions` - 15 edges
7. `ENTITY RELATIONSHIP DIAGRAM (ERD)` - 15 edges
8. `7. KRITERIA PENERIMAAN (ACCEPTANCE CRITERIA)` - 13 edges
9. `PRODUCT REQUIREMENT DOCUMENT (PRD)` - 12 edges
10. `TECHNICAL ARCHITECTURE` - 11 edges

## Surprising Connections (you probably didn't know these)
- `3. DOMAIN SERVICE INTI` --references--> `TaxEngine`  [INFERRED]
  docs/04_TECHNICAL_ARCHITECTURE.md → backend/app/Services/TaxEngine.php
- `Unit Testing Backend (PHPUnit)` --references--> `TaxEngine`  [INFERRED]
  docs/05_SECURITY.md → backend/app/Services/TaxEngine.php
- `Shared components` --references--> `AppShell()`  [INFERRED]
  docs/DESIGN_SYSTEM.md → frontend/src/App.tsx
- `Shared components` --references--> `Button()`  [INFERRED]
  docs/DESIGN_SYSTEM.md → frontend/src/components/ui.tsx
- `Shared components` --references--> `StatusBadge()`  [INFERRED]
  docs/DESIGN_SYSTEM.md → frontend/src/components/ui.tsx

## Import Cycles
- None detected.

## Communities (49 total, 1 thin omitted)

### Community 0 - "SecurityAuditLogger"
Cohesion: 0.07
Nodes (20): App\Models\AcceptanceLine, App\Models\DeliveryOrder, App\Models\Invoice, App\Models\InvoiceLine, CustodyService, InvoiceService, SecurityAuditLogger, TaxEngine (+12 more)

### Community 1 - "package.json"
Cohesion: 0.05
Nodes (41): dependencies, autoprefixer, axios, lucide-react, postcss, react, react-dom, recharts (+33 more)

### Community 2 - "FASE PEMBANGUNAN"
Cohesion: 0.06
Nodes (34): 0.1 Tutup 15 Open Decision, 0.2 Kumpulkan Artefak Nyata, 0.3 Observasi Lapangan (1–2 hari), 0.4 Finalisasi Desain, 0.5 Siapkan Infrastruktur, BUILD PLAN — DARI 0 SAMPAI SIAP PAKAI, DEFINISI SELESAI (Definition of Done), FASE PEMBANGUNAN (+26 more)

### Community 3 - "7. KRITERIA PENERIMAAN (ACCEPTANCE CRITERIA)"
Cohesion: 0.06
Nodes (34): 10. RISIKO PRODUK, 1. RINGKASAN EKSEKUTIF, 2. MASALAH YANG DISELESAIKAN, 3.1 Owner / Bos, 3.2 Admin, 3.3 QC, 3.4 (V1.1) Produksi, Purchasing, Finance, 3. PENGGUNA & KEBUTUHAN (+26 more)

### Community 4 - "Open Decision Register — RESOLVED"
Cohesion: 0.07
Nodes (27): 10. Material, 11. Pemakaian Material, 12. Gudang, 13. Stock Opname, 14. Notifikasi Minimum Stock, 15. Status Produksi, 16. Work Order, 17. Transport (+19 more)

### Community 5 - "Illuminate\Database\Eloquent\Concerns\HasUuids"
Cohesion: 0.18
Nodes (8): CustodyLedger, Customer, CustomerItem, GoodsReceipt, GoodsReceiptLine, Illuminate\Database\Eloquent\Concerns\HasUuids, Illuminate\Database\Eloquent\Factories\HasFactory, Illuminate\Database\Eloquent\Model

### Community 6 - "3. Tabel MVP-1"
Cohesion: 0.10
Nodes (18): 1. Kontrak teknis, 2. Batas model bisnis, 3. Tabel MVP-1, 4. Tabel MVP-2/MVP-3, 5. Constraint wajib, 6. Index penting, 7. Implementasi Laravel, Core & security (+10 more)

### Community 7 - "🔴 A. KRITIS (Potensi Salah Hitung / Masalah Legal & Keuangan)"
Cohesion: 0.10
Nodes (19): 10. Reversal & Pembatalan Transaksi, 11. E-Faktur (Faktur Pajak Elektronik), 12. Price List Versioning & Surcharges, 13. Master Material & Satuan (UOM Conversion), 14. Kebijakan Penomoran Dokumen (Document Numbering Policy), 15. Tambahan Roadmap Deployment, 1. Surat Terima Barang (Inbound Receipt), 2. Dasar Pengenaan PPh (PPh Base) (+11 more)

### Community 8 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+11 more)

### Community 9 - "Rekomendasi akuntansi"
Cohesion: 0.11
Nodes (18): 1. Basis pencatatan, 1. Tax engine versioned, 2. Pemisahan objek, 2. PPN, 3. PPh jasa, 3. Revenue, 4. Faktur pajak, 4. Persediaan material (+10 more)

### Community 10 - "TECHNICAL ARCHITECTURE"
Cohesion: 0.11
Nodes (17): 1. PILIHAN TEKNOLOGI — DISETUJUI SEBAGAI REKOMENDASI, 2. ARSITEKTUR LAPISAN, 4. KONTRAK API, 5. STRUKTUR KODE (contoh Laravel), 6. BACKGROUND JOB, 7. STRATEGI TESTING, 8. ENVIRONMENT & DEPLOYMENT, 9. PERFORMA & SKALA (+9 more)

### Community 11 - "App.tsx"
Cohesion: 0.11
Nodes (12): currency, custodyColumns, deliveryColumns, materialColumns, navigation, NavItem, pageCopy, View (+4 more)

### Community 12 - "State Machine — Sentanu ERP MVP-1"
Cohesion: 0.12
Nodes (16): Audit rule, Customer Acceptance, Customer PO, Delivery Order / Surat Jalan, Goods Receipt / STB, Inbound QC, Invoice, Material Receipt (+8 more)

### Community 13 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 14 - "ENTITY RELATIONSHIP DIAGRAM (ERD)"
Cohesion: 0.12
Nodes (15): 0. PETA DOMAIN, 10. ACCOUNTING & COSTING, 11. RELASI LINTAS DOMAIN YANG PALING KRITIS, 12. ATURAN PENAMAAN & KONVENSI, 1. CORE & SECURITY, 2. MASTER DATA, 3. SALES & PRICING, 4. INBOUND & CUSTODY (inti pembeda sistem ini) (+7 more)

### Community 15 - "3. Wireframe MVP-1 — struktur layar"
Cohesion: 0.12
Nodes (15): 1. API untuk apa?, 2. Endpoint minimum MVP-1, 3. Wireframe MVP-1 — struktur layar, 4. Aturan UI, Acceptance, API dan Wireframe MVP-1, Custody Balance, Dashboard Owner/Admin (+7 more)

### Community 16 - "2026_09_24_000001_create_core_tables.php"
Cohesion: 0.19
Nodes (3): Illuminate\Database\Migrations\Migration, Illuminate\Database\Schema\Blueprint, Illuminate\Support\Facades\Schema

### Community 17 - "SOP KEAMANAN, TESTING & DEBUGGING (SECURITY & VERIFICATION STANDARDS)"
Cohesion: 0.18
Nodes (10): 🔒 1. PERNYATAAN & STANDAR KEAMANAN (SECURITY WORKFLOW), 🧪 2. ALUR TESTING & VERIFIKASI DUA TINGKAT, 🐛 3. PROTOKOL DEBUGGING & HANDLING ERROR, A. Pengujian Tingkat Kode (Unit & Integration Testing), A. Tiga Lapis Otorisasi Wajib (Backend Enforcement), B. Pemisahan Tugas (Segregation of Duties - SoD), B. Pengujian Skenario Bisnis Real (Acceptance Criteria Testing), C. Audit Log Imutabel (Append-Only) (+2 more)

### Community 18 - "Roadmap MVP Sentanu ERP"
Cohesion: 0.18
Nodes (10): Exit criteria, Modul, MVP-1 — Operasional inti dan tagihan, MVP-2 — Produksi dan biaya pekerjaan, MVP-3 — Keuangan dan pembelian lengkap, MVP-4 — Scale dan automation, Prinsip, Roadmap MVP Sentanu ERP (+2 more)

### Community 19 - "SECURITY DESIGN"
Cohesion: 0.20
Nodes (9): 0. PRIORITAS: VPS SEKARANG vs V2 NANTI, 10. CHECKLIST SEBELUM GO-LIVE, 11. PROSEDUR INSIDEN, 1. MODEL ANCAMAN, 6. INTEGRITAS TRANSAKSI, 8. BACKUP & PEMULIHAN, Perlindungan Ransomware, SECURITY DESIGN (+1 more)

### Community 20 - "PANDUAN DEPLOYMENT SENTANU ERP KE VPS LINUX (UBUNTU 22.04 / 24.04 LTS)"
Cohesion: 0.20
Nodes (9): 🛠️ Langkah 1: Install Dependency & Service Utama, 🐘 Langkah 2: Setup Database PostgreSQL 16, ⚙️ Langkah 3: Deployment Backend Laravel 11, 🎨 Langkah 4: Deployment Frontend React (Vite Build), 🌐 Langkah 5: Konfigurasi Nginx Server Block, 🔒 Langkah 6: Install SSL HTTPS (Certbot), 🔄 Langkah 7: Setup Queue Worker via Supervisor, PANDUAN DEPLOYMENT SENTANU ERP KE VPS LINUX (UBUNTU 22.04 / 24.04 LTS) (+1 more)

### Community 21 - "STEP 2 PLAN — INITIALIZATION & ARCHITECTURE SETUP"
Cohesion: 0.20
Nodes (9): 2.1 Pengelompokan Dokumentasi Proyek, 2.2 Inisialisasi Backend (Laravel 11 API), 2.3 Inisialisasi Frontend (React + Vite + TypeScript), Kebutuhan Lingkungan Lokal (Prerequisites), Status Eksekusi Saat Ini, STEP 2 PLAN — INITIALIZATION & ARCHITECTURE SETUP, Struktur Folder Proyek yang Akan Dibuat, Target (+1 more)

### Community 22 - "Sentanu Jaya ERP Design System"
Cohesion: 0.25
Nodes (7): Geometry, Interaction rules, Responsive contract, Sentanu Jaya ERP Design System, Tokens, Typography, Visual contract

### Community 23 - "Master Prompt & Source of Truth - Sentanu Jaya ERP"
Cohesion: 0.22
Nodes (8): 🗺 14 Tahap Pengembangan (Roadmap), 🔑 1. Fundamental Model Bisnis (PENTING), 📐 2. Aturan Pajak (Tax Rule Final), 🔗 3. Aturan Relasi Transaksi (N-to-1 Invoice Mapping - UPDATE REVISI USER), 💰 4. Pengakuan Pendapatan (Revenue Recognition), 📦 5. Material & Management P&L (V1), Breakdown Invoice (Jika PPN/PPh Berlaku):, Master Prompt & Source of Truth - Sentanu Jaya ERP

### Community 24 - "5. KEAMANAN APLIKASI"
Cohesion: 0.25
Nodes (8): 5. KEAMANAN APLIKASI, CSRF, HTTP Header Wajib, Rate Limiting, SQL Injection, Upload File, Validasi Input, XSS

### Community 25 - "Pemetaan Form Fisik ke Modul Digital Web App (Update Lengkap V2.0)"
Cohesion: 0.25
Nodes (7): 📄 1. Kartu Stok (Stock Ledger), 📄 2. Skedul Barang Masuk (Inbound Schedule & STB), 📄 3. Skedul Pengiriman (Outbound Schedule & SJ), 📄 4. DAFTAR TAGIHAN CUSTOMER (`DAFTAR TAGIHAN CUSTOMER.pdf`), 📄 5. PEMBELIAN SUPPLIER (`PEMBELIAN.pdf`), 📄 6. BUKU KAS MANUAL & TRANSPORT (Foto Buku Ledger), Pemetaan Form Fisik ke Modul Digital Web App (Update Lengkap V2.0)

### Community 26 - "Sentanu ERP Master Baseline — V2.0 (FINAL BASELINE)"
Cohesion: 0.25
Nodes (7): 🔑 1. Lima Aturan Emas Model Bisnis (DIKUNCI — Melanggar = Fatal), 🆕 2. Fitur & Komponen Baru di Baseline V2.0, 🔗 3. Aturan Relasi Transaksi Paling Utama, 📑 4. Matriks Jurnal Akuntansi Utama (Appendix A Snippet), ❓ 5. Daftar 15 Open Decisions — **SEMUA RESOLVED (2026-09-23)**, 📌 Document Metadata, Sentanu ERP Master Baseline — V2.0 (FINAL BASELINE)

### Community 27 - "Keputusan Tech Stack — Sentanu ERP"
Cohesion: 0.25
Nodes (7): Arsitektur final, Aturan implementasi, Ditunda, Kenapa bukan Prisma + Next.js, Keputusan Tech Stack — Sentanu ERP, Keputusan yang masih perlu persetujuan, Rekomendasi final

### Community 28 - "SENTANU ERP — DOCUMENT INDEX"
Cohesion: 0.29
Nodes (6): Aturan konflik, Dokumen pendukung, Referensi asli, SENTANU ERP — DOCUMENT INDEX, Source of truth, Status saat ini

### Community 29 - "7B. KEAMANAN INFRASTRUKTUR & JARINGAN (agar tidak mudah dibobol)"
Cohesion: 0.29
Nodes (7): 7B. KEAMANAN INFRASTRUKTUR & JARINGAN (agar tidak mudah dibobol), Manajemen Rahasia (Secrets Management), Monitoring & Deteksi Dini, Pemindaian Dependensi (Supply Chain Security), Pengerasan Server (Server Hardening), Topologi Jaringan, Web Application Firewall (WAF) & Anti-DDoS

### Community 30 - "📌 Status Terkini (Step 2 - Persiapan Lingkungan & Arsitektur)"
Cohesion: 0.29
Nodes (6): 1. Struktur Folder Fisik Proyek, 2. Frontend React Component Skeleton (Verifikasi Berhasil), 3. Skrip Migrasi Database Backend PostgreSQL (MVP-1), 🎯 Langkah Selanjutnya (Pindah ke Step 3: Backend & API Development), 📌 Status Terkini (Step 2 - Persiapan Lingkungan & Arsitektur), STEP 2 PROGRESS & NEXT MILESTONES

### Community 31 - "3. OTORISASI"
Cohesion: 0.33
Nodes (6): 3. OTORISASI, Field-Level Permission, Field-Level Security & Masking — DETAIL IMPLEMENTASI, Pemisahan Tugas (Segregation of Duties) — DETAIL IMPLEMENTASI, Prinsip, Tiga Lapis Pemeriksaan

### Community 32 - "7. AUDIT TRAIL — IMMUTABLE / APPEND-ONLY (DETAIL IMPLEMENTASI)"
Cohesion: 0.33
Nodes (6): 7. AUDIT TRAIL — IMMUTABLE / APPEND-ONLY (DETAIL IMPLEMENTASI), Format, Mekanisme Pencatatan (jangan andalkan disiplin developer semata), Membuat Tabel Benar-Benar Tidak Bisa Diubah (Database Level), Sifat, Yang Wajib Dicatat Otomatis

### Community 33 - "7C. KEAMANAN DATABASE SECARA KHUSUS"
Cohesion: 0.33
Nodes (6): 7C. KEAMANAN DATABASE SECARA KHUSUS, Audit Ekstensi Database (opsional, level lanjut), Koneksi Terenkripsi, Perlindungan dari SQL Injection (penegasan), Prinsip Least Privilege di Database, Row-Level Security untuk Isolasi Branch (opsional, level lanjut)

### Community 34 - ".oxlintrc.json"
Cohesion: 0.33
Nodes (5): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema

### Community 35 - "Sentanu Jaya ERP"
Cohesion: 0.33
Nodes (5): 🚀 Fokus Utama MVP-1, 📌 Lokasi File Proyek & Arsitektur, Sentanu Jaya ERP, ✅ Status Eksekusi Pentahapan Development (7 Steps Standard), 💻 Tech Stack Choice

### Community 36 - "📌 Status Terkini (Step 3 - Backend & API Development)"
Cohesion: 0.33
Nodes (5): 1. Migrasi Database PostgreSQL MVP-1 (Lengkap & Terstruktur), 2. Business Logic & Service Engine (`backend/app/Services/`), 🚀 Langkah Selanjutnya (Pindah ke Step 4: Integrasi Frontend UI & Testing), 📌 Status Terkini (Step 3 - Backend & API Development), STEP 3 COMPLETION REPORT — BACKEND & API ARCHITECTURE

### Community 37 - "📌 Status Terkini (Step 4 - Pengujian UI & Skenario Integrasi)"
Cohesion: 0.33
Nodes (5): 1. Integrasi Dashboard & Interaktif Invoicing Simulator (`frontend/`), 2. Verifikasi Kompilasi & Build Test, 🚀 Langkah Selanjutnya (Pindah ke Step 5: Pengujian & Panduan Deployment VPS), 📌 Status Terkini (Step 4 - Pengujian UI & Skenario Integrasi), STEP 4 COMPLETION REPORT — UI & INTEGRATION TESTING

### Community 38 - "2. AUTENTIKASI"
Cohesion: 0.40
Nodes (5): 2. AUTENTIKASI, MFA, Password, Perlindungan Brute Force, Session & Token

### Community 39 - "9. KEAMANAN OPERASIONAL"
Cohesion: 0.40
Nodes (5): 9. KEAMANAN OPERASIONAL, Akses Pengembang ke Production, Offboarding (wajib di hari terakhir), Onboarding, Tinjauan Berkala

### Community 40 - "4. PERLINDUNGAN DATA"
Cohesion: 0.50
Nodes (4): 4. PERLINDUNGAN DATA, Data Pribadi (UU PDP), Saat Disimpan, Saat Transit

### Community 41 - "7D. PERLINDUNGAN TERHADAP VIRUS / MALWARE / RANSOMWARE"
Cohesion: 0.50
Nodes (4): 7D. PERLINDUNGAN TERHADAP VIRUS / MALWARE / RANSOMWARE, Kebersihan Lingkungan Server, Pemindaian File Upload, Perlindungan Ransomware pada Backup

### Community 42 - "React + TypeScript + Vite"
Cohesion: 0.50
Nodes (3): Expanding the Oxlint configuration, React Compiler, React + TypeScript + Vite

### Community 43 - "LAPORAN EKSEKUSI TAHAP MULTI-MODULE BACKEND & TESTING (V2.3)"
Cohesion: 0.50
Nodes (3): 🛠️ Artefak Backend & Logic Services Terbangun, LAPORAN EKSEKUSI TAHAP MULTI-MODULE BACKEND & TESTING (V2.3), 📌 Status Terkini

### Community 45 - "ui.tsx"
Cohesion: 0.08
Nodes (13): Alert(), Breadcrumb(), ButtonProps, ButtonVariant, CardProps, ConfirmationDialog(), DataTableProps, FormFieldProps (+5 more)

### Community 46 - "mockData.ts"
Cohesion: 0.18
Nodes (10): CustodyItem, Customer, DeliveryOrder, Material, mockCustodyItems, mockCustomers, mockDeliveryOrders, mockMaterials (+2 more)

### Community 47 - "Shared components"
Cohesion: 0.33
Nodes (6): Shared components, AppShell(), Button(), DataTable(), PageHeader(), StatusBadge()

### Community 48 - "main.tsx"
Cohesion: 0.40
Nodes (4): App(), frontend_src_index, react, react-dom

## Knowledge Gaps
- **411 isolated node(s):** `$schema`, `plugins`, `react/rules-of-hooks`, `react/only-export-components`, `name` (+406 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 487 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `SECURITY DESIGN` connect `SECURITY DESIGN` to `7. AUDIT TRAIL — IMMUTABLE / APPEND-ONLY (DETAIL IMPLEMENTASI)`, `7C. KEAMANAN DATABASE SECARA KHUSUS`, `SecurityAuditLogger`, `2. AUTENTIKASI`, `9. KEAMANAN OPERASIONAL`, `4. PERLINDUNGAN DATA`, `7D. PERLINDUNGAN TERHADAP VIRUS / MALWARE / RANSOMWARE`, `5. KEAMANAN APLIKASI`, `7B. KEAMANAN INFRASTRUKTUR & JARINGAN (agar tidak mudah dibobol)`, `3. OTORISASI`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **Why does `9B. TESTING & DEBUGGING PROTOCOL (DETAIL IMPLEMENTASI)` connect `SecurityAuditLogger` to `SECURITY DESIGN`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **What connects `$schema`, `plugins`, `react/rules-of-hooks` to the rest of the system?**
  _411 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `SecurityAuditLogger` be split into smaller, more focused modules?**
  _Cohesion score 0.06620209059233449 - nodes in this community are weakly interconnected._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.048726467331118496 - nodes in this community are weakly interconnected._
- **Should `FASE PEMBANGUNAN` be split into smaller, more focused modules?**
  _Cohesion score 0.05714285714285714 - nodes in this community are weakly interconnected._
- **Should `7. KRITERIA PENERIMAAN (ACCEPTANCE CRITERIA)` be split into smaller, more focused modules?**
  _Cohesion score 0.05714285714285714 - nodes in this community are weakly interconnected._