# TECHNICAL ARCHITECTURE
## Sentanu ERP — V1

---

## 1. PILIHAN TEKNOLOGI — DOKUMEN DESAIN HISTORIS

> Catatan: tabel berikut berasal dari rancangan awal. Manifest saat ini mensyaratkan Laravel Framework ^13.17, PHP ^8.3, React ^19.2.8, TypeScript ~6.0.2, Vite ^8.3.0, React Router DOM ^7.18.4, dan Tailwind CSS ^4.3.3. Redis dan object storage tidak boleh dianggap aktif tanpa bukti konfigurasi. Source code, manifest, migrations, dan CI terbaru adalah acuan implementasi.

Detail keputusan ada di `TECH_STACK_DECISION.md`.

| Lapisan | Pilihan |
|---|---|
| Backend/API | Laravel 13, PHP 8.3 (manifest aktual) |
| Frontend | React + TypeScript + Vite |
| Database | PostgreSQL 16 |
| ORM/migration | Laravel Eloquent + Laravel Migrations |
| Queue/cache | Redis + Laravel Queue |
| UI | Tailwind CSS, shadcn/ui, Lucide React |
| Charts | Recharts |
| Storage | S3-compatible object storage |

PostgreSQL wajib karena transaksi membutuhkan ACID, `NUMERIC` presisi, `JSONB`, dan row locking. Prisma dan Next.js tidak dipakai agar tidak ada dua ORM atau dua backend. Owner tetap harus mengesahkan hosting pada `OPEN DECISION #10`.

---

## 2. ARSITEKTUR LAPISAN

```text
┌─────────────────────────────────────────────┐
│  CLIENT (Browser / Tablet workshop)          │
└──────────────────┬──────────────────────────┘
                   │ HTTPS
┌──────────────────▼──────────────────────────┐
│  REVERSE PROXY (Nginx) — TLS, rate limit     │
└──────────────────┬──────────────────────────┘
┌──────────────────▼──────────────────────────┐
│  API LAYER                                   │
│  routing · auth · validation · permission    │
│  TIDAK BOLEH berisi business rule            │
└──────────────────┬──────────────────────────┘
┌──────────────────▼──────────────────────────┐
│  APPLICATION / SERVICE LAYER                 │
│  orkestrasi use case, transaksi DB           │
│  contoh: PostInvoiceService                  │
└──────────────────┬──────────────────────────┘
┌──────────────────▼──────────────────────────┐
│  DOMAIN LAYER  ◄── JANTUNG SISTEM            │
│  TaxEngine · PricingEngine · CostingEngine   │
│  RevenueRecognizer · JournalPoster           │
│  CustodyManager · InventoryValuator          │
└──────────────────┬──────────────────────────┘
┌──────────────────▼──────────────────────────┐
│  PERSISTENCE (Repository) → PostgreSQL       │
└──────────────────┬──────────────────────────┘
        ┌──────────┴──────────┬───────────────┐
        ▼                     ▼               ▼
  FILE STORAGE          QUEUE/WORKER      AUDIT LOG
  (S3/MinIO)            (report, depre)   (append-only)
```

**Aturan lapisan:**
1. Controller tidak boleh memanggil database langsung.
2. Business rule **hanya** ada di Domain Layer.
3. Setiap operasi yang menyentuh jurnal, stok, atau custody wajib dibungkus satu `DB::transaction`.
4. Domain Layer tidak boleh tahu tentang HTTP.

---

## 3. DOMAIN SERVICE INTI

| Service | Tanggung Jawab | Tidak Boleh |
|---|---|---|
| `DocumentNumberService` | Beri nomor dokumen saat POST, aman dari race condition (`SELECT ... FOR UPDATE`) | Memberi nomor final saat DRAFT |
| `PricingEngine` | Ambil harga dari price list versi aktif, hitung surcharge, minimum charge, diskon | Fallback diam-diam ke harga default |
| `TaxEngine` | Tentukan tax rule aktif, ambil rate dari `tax_rates` sesuai tanggal, hitung DPP/PPN/PPh, pembulatan | Menyimpan angka rate di kode |
| `CustodyManager` | Catat IN/OUT/MOVE barang customer, jaga saldo tidak negatif | Membuat jurnal apa pun |
| `InventoryValuator` | Moving average, stock movement, valuasi | Menyentuh barang customer |
| `RevenueRecognizer` | Buat revenue dari acceptance line, hitung COGS proporsional dari WIP | Mengakui revenue dari SJ |
| `JournalPoster` | Baca `accounting_event_mappings`, susun jurnal, validasi balance, cek periode | Hardcode nomor akun |
| `CostingEngine` | Akumulasi WIP, alokasi labor & overhead, hitung job cost | Mengubah harga jual |
| `InvoiceBuilder` | Gabungkan N SJ → 1 invoice, validasi billable qty | Menagih melebihi accepted qty |
| `PeriodGuard` | Tolak posting ke periode CLOSED/LOCKED | Dilewati oleh service mana pun |

---

## 4. KONTRAK API

### Konvensi
```text
Base URL   : /api/v1
Auth       : Authorization: Bearer <access_token>
Format     : JSON
Tanggal    : ISO-8601 dengan timezone (2026-09-20T10:00:00+07:00)
Uang       : string desimal ("1500000.00") agar presisi tidak hilang
Idempotency: header Idempotency-Key pada semua POST transaksi
```

### Pola Endpoint Standar
```text
GET    /api/v1/{resource}              list + filter + pagination
GET    /api/v1/{resource}/{id}         detail
POST   /api/v1/{resource}              create (DRAFT)
PUT    /api/v1/{resource}/{id}         update (hanya DRAFT)
POST   /api/v1/{resource}/{id}/post    POST → final, buat jurnal
POST   /api/v1/{resource}/{id}/cancel  cancel + alasan (butuh permission)
POST   /api/v1/{resource}/{id}/approve approve
GET    /api/v1/{resource}/{id}/print   PDF
```

### Contoh Endpoint Kritis
```text
POST /api/v1/goods-receipts/{id}/post
  → validasi qty vs PO, buat custody_ledger IN, TIDAK buat jurnal

POST /api/v1/acceptances/{id}/post
  → buat revenue_recognitions
  → jurnal: Dr Unbilled / Cr Pendapatan; Dr COGS / Cr WIP
  → buat customer_returns draft bila ada qty reject

GET  /api/v1/delivery-orders?invoice_status=UNINVOICED&customer_id=...
  → daftar SJ siap digabung jadi invoice

POST /api/v1/invoices
  body: { customer_id, delivery_order_ids: [...], invoice_date }
  → InvoiceBuilder gabungkan N SJ, TaxEngine hitung pajak

GET  /api/v1/reports/custody-balance?customer_id=&aging=
GET  /api/v1/reports/job-cost/{work_order_id}
GET  /api/v1/reports/wip-reconciliation
```

### Format Response
```json
{
  "data": { },
  "meta": { "page": 1, "per_page": 25, "total": 340 }
}
```

### Format Error
```json
{
  "error": {
    "code": "BILLABLE_QTY_EXCEEDED",
    "message": "Quantity tagihan melebihi quantity yang diterima customer.",
    "details": { "accepted": 95, "requested": 100 },
    "trace_id": "01JD..."
  }
}
```

### Kode Error Wajib
```text
VALIDATION_ERROR · UNAUTHORIZED · FORBIDDEN · NOT_FOUND
CONFLICT · PERIOD_LOCKED · DOCUMENT_ALREADY_POSTED
BILLABLE_QTY_EXCEEDED · CUSTODY_NEGATIVE · JOURNAL_UNBALANCED
PRICE_NOT_FOUND · TAX_RATE_NOT_FOUND · INSUFFICIENT_STOCK
DUPLICATE_DOCUMENT_NUMBER · IDEMPOTENCY_CONFLICT
```

---

## 5. STRUKTUR KODE (contoh Laravel)

```text
app/
├── Domain/
│   ├── Core/            (DocumentNumber, Audit, Permission)
│   ├── Customer/
│   ├── Inbound/         (GoodsReceipt, InboundQc, Custody)
│   ├── Production/      (WorkOrder, Operation, Consumption)
│   ├── Quality/
│   ├── Delivery/        (DeliveryOrder, Acceptance, Return)
│   ├── Revenue/
│   ├── Billing/         (Invoice, CreditNote, Payment)
│   ├── Purchasing/
│   ├── Inventory/
│   ├── Tax/
│   ├── Accounting/
│   └── Costing/
│       └── setiap domain berisi:
│           Entities/ · Services/ · Repositories/ · Events/ · Exceptions/
├── Application/         (use case orchestrator)
├── Http/
│   ├── Controllers/Api/V1/
│   ├── Requests/        (validasi input)
│   ├── Resources/       (format output)
│   └── Middleware/
├── Jobs/                (depresiasi, alokasi overhead, report)
└── Support/             (Money, Rounding, Terbilang)
```

---

## 6. BACKGROUND JOB

| Job | Jadwal | Fungsi |
|---|---|---|
| `RunDepreciation` | bulanan, awal bulan | Hitung & posting penyusutan |
| `AllocateOverhead` | mingguan/bulanan | Alokasi listrik & overhead ke WO |
| `AllocateMonthlyLabor` | bulanan | Alokasi gaji bulanan ke WO |
| `RefreshAgingBalances` | harian 01:00 | Perbarui AR, AP, unbilled, custody aging |
| `SendNotifications` | harian 07:00 | Invoice jatuh tempo, stok minimum, bukti potong |
| `CheckBatchExpiry` | harian | Peringatan cat mendekati kedaluwarsa |
| `GenerateHeavyReport` | on-demand | Laporan besar secara asynchronous |
| `DatabaseBackup` | harian 23:00 | Backup + kirim ke off-site |

---

## 7. STRATEGI TESTING

| Level | Cakupan | Target |
|---|---|---|
| Unit | Domain service (TaxEngine, PricingEngine, CostingEngine) | **≥ 90%** |
| Integration | Alur POST dokumen + jurnal + stok + custody | seluruh dokumen |
| Contract | Setiap endpoint API | 100% endpoint |
| E2E | 12 Acceptance Criteria di PRD | 100% |
| Regression | Jalan otomatis di CI setiap push | wajib hijau sebelum merge |

**Test wajib yang tidak boleh gagal:**
```text
✓ Jurnal selalu balance
✓ STB tidak membuat jurnal & tidak menyentuh stok
✓ Revenue nol sebelum acceptance
✓ Tagihan tidak melebihi accepted qty
✓ Pajak 3 kondisi sesuai tax master
✓ Moving average benar setelah beberapa pembelian & konsumsi
✓ Custody balance tidak negatif
✓ WIP nol setelah WO selesai
✓ Dokumen POSTED tidak bisa dihapus
✓ Posting ke periode LOCKED ditolak
✓ Nomor dokumen tidak duplikat pada 50 request bersamaan
```

---

## 8. ENVIRONMENT & DEPLOYMENT

```text
LOCAL → DEVELOPMENT → STAGING/UAT → PRODUCTION
```

| Aspek | Aturan |
|---|---|
| Migration | Bersistem versi, tidak ada perubahan manual di production |
| Config | Semua rahasia di environment variable / secret manager, tidak di repo |
| Data | Data production hanya boleh masuk staging setelah dianonimkan |
| Rilis | Tagged release + changelog + rollback plan |
| CI | Lint → unit test → integration test → build → deploy |
| Monitoring | Uptime, error rate, response time, ukuran antrian job, status backup |
| Logging | Terstruktur (JSON), `trace_id` per request, retensi 90 hari |

### Hosting
| Opsi | Cocok jika |
|---|---|
| **Cloud (rekomendasi)** | Ingin backup off-site otomatis dan tidak mau mengurus hardware |
| On-premise | Internet workshop tidak andal dan ada staf IT internal |
| Hybrid | Server lokal + replikasi backup ke cloud |

Jika on-premise: wajib UPS, backup off-site harian, dan akses jarak jauh melalui VPN, bukan port terbuka.

---

## 9. PERFORMA & SKALA

Estimasi beban: 10–20 user, ~50.000 transaksi/tahun. Ini **kecil**, sehingga arsitektur monolith modular sudah lebih dari cukup. Jangan memakai microservice; itu akan menambah biaya tanpa manfaat pada skala ini.

Yang tetap wajib:
- Pagination di semua daftar (default 25, maksimal 100)
- Index sesuai dokumen skema
- Laporan berat ke background job
- Range tanggal default maksimal 1 bulan pada laporan besar
- Cache untuk master data yang jarang berubah (COA, tax master, permission)
