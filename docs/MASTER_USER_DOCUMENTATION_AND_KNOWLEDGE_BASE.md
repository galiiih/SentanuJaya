# SENTANU JAYA ERP — MASTER USER DOCUMENTATION & KNOWLEDGE BASE
Version: 1.0.0
Last Verified: 2026-11-01
Scope: ADMIN, OWNER, STAFF Role Guides, Core Modules, Business Rules, and Nanu AI RAG Integration.

---

## 1. Company & ERP Overview
Sentanu Jaya Web App adalah sistem Enterprise Resource Planning (ERP) kustom yang dirancang khusus untuk mengelola operasional manufaktur, perdagangan, distribusi, pencatatan inventaris, pesanan pelanggan (Customer PO), penerimaan barang (Goods Receipt / STB), perintah kerja (Work Order), produksi, Quality Control (QC), surat jalan (Delivery Order), invoice, hingga pelunasan piutang (Payment).

### Struktur Peran Pengguna (Role-Based Access Control)
- **ADMIN**: Mengelola master data, konfigurasi sistem, memantau seluruh modul transaksi, mengelola user, template, serta supervisi operasional harian.
- **OWNER**: Memiliki hak akses monitoring eksekutif, laporan keuangan, pengawasan kas/piutang, approval transaksi penting, serta analisis performa bisnis secara menyeluruh.
- **STAFF**: Melakukan input data harian operasional, pencatatan transaksi sesuai penugasan unit kerja (gudang, produksi, sales, atau keuangan).

---

## 2. Core Business Processes
Alur bisnis utama Sentanu Jaya ERP berjalan secara berurutan dan terintegrasi:
1. **Master Data & Customer Setup**: Pendaftaran data customer, material, dan harga.
2. **Customer PO**: Pencatatan pesanan dari pelanggan (`CustomerPo`).
3. **Penerimaan Barang / STB**: Pencatatan penerimaan material atau barang (`GoodsReceipt`).
4. **Work Order & Produksi**: Perintah kerja produksi berdasarkan pesanan atau kebutuhan stok (`WorkOrder`).
5. **Quality Control (QC)**: Inspeksi hasil produksi (`InternalQcInspection`).
6. **Surat Jalan (Delivery Order)**: Pengiriman barang jadi ke pelanggan (`DeliveryOrder`).
7. **Invoice**: Penagihan berdasarkan pengiriman yang sah (`Invoice`).
8. **Pembayaran (Payment)**: Pelunasan tagihan dari customer (`Payment`).

---

## 3. Role-Based User Manuals

### A. ADMIN Manual
- **Dashboard**: Memantau ringkasan operasional harian.
- **Master Data**: Pengelolaan data Customer, Material, Supplier, UOM, Branch.
- **Transaksi**: Membuat dan memverifikasi Customer PO, Goods Receipt, Work Order, Surat Jalan, Invoice, dan Pembayaran.
- **Nanu AI**: Menggunakan asisten AI Nanu untuk kueri cepat data ERP dan panduan operasional.

### B. OWNER Manual
- **Dashboard Eksekutif**: Memantau KPI, ringkasan produksi, omzet, dan total piutang.
- **Laporan Keuangan & Piutang**: Analisis pembayaran bulan berjalan dan customer dengan tagihan terbesar.
- **Audit & Monitoring**: Pengawasan status transaksi tanpa melakukan modifikasi langsung pada operasional harian staf.

### C. STAFF Manual
- **Operasional Harian**: Menginput data transaksi sesuai unit tugas (contoh: Staff Gudang mencatat penerimaan barang/STB dan stok material).
- **Panduan Nanu AI**: Mengajukan pertanyaan panduan (*how-to*) untuk memastikan kepatuhan terhadap SOP perusahaan.

---

## 4. Nanu AI RAG & Knowledge Integration Architecture
Nanu AI menggunakan arsitektur **Retrieval-Augmented Generation (RAG)** yang didukung oleh:
- **Backend Source of Truth**: Laravel 13 + PostgreSQL 16.
- **Dual LLM Provider Support**: Ollama (`http://127.0.0.1:11434`, model `qwen3.5:9b`) dan 9Router (`http://localhost:20128/v1`).
- **Knowledge Retrieval & Guards**: Pemisahan tegas antara kueri panduan (GUIDE) dan kueri data operasional (DATA_QUERY), dengan proteksi *guiderail* terhadap topik di luar domain ERP Sentanu Jaya.
- **Feedback & Learning Workflow**: Setiap interaksi dan umpan balik pengguna dicatat untuk penyempurnaan basis pengetahuan secara berkelanjutan.
