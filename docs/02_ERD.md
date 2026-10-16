# ENTITY RELATIONSHIP DIAGRAM (ERD)
## Sentanu ERP — V1

Diagram dipecah per domain agar terbaca. Notasi: `||--o{` = one-to-many, `||--||` = one-to-one.

---

## 0. PETA DOMAIN

```mermaid
flowchart LR
    A[CORE<br/>user, role, branch] --> B[MASTER DATA<br/>customer, material, worker]
    B --> C[SALES<br/>quotation, PO, price]
    C --> D[INBOUND<br/>STB, QC, CUSTODY]
    D --> E[PRODUCTION<br/>WO, operation, material]
    E --> F[QUALITY<br/>QC, reject, rework]
    F --> G[DELIVERY<br/>SJ, acceptance, return]
    G --> H[REVENUE]
    H --> I[BILLING<br/>invoice, AR, payment]
    I --> J[TAX]
    B --> K[PURCHASING<br/>PO, receipt, AP]
    K --> L[INVENTORY]
    L --> E
    E --> M[COSTING<br/>WIP, job cost]
    I --> N[ACCOUNTING<br/>journal, COA]
    J --> N
    L --> N
    M --> N
    N --> O[REPORTING]
```

---

## 1. CORE & SECURITY

```mermaid
erDiagram
    COMPANIES ||--o{ BRANCHES : has
    BRANCHES ||--o{ WAREHOUSES : has
    BRANCHES ||--o{ CUSTODY_LOCATIONS : has
    USERS ||--o{ USER_ROLES : has
    ROLES ||--o{ USER_ROLES : assigned
    ROLES ||--o{ ROLE_PERMISSIONS : grants
    PERMISSIONS ||--o{ ROLE_PERMISSIONS : in
    USERS ||--o{ USER_BRANCHES : access
    BRANCHES ||--o{ USER_BRANCHES : for
    USERS ||--o{ AUDIT_LOGS : performs
    USERS ||--o{ REFRESH_TOKENS : owns
    USERS ||--o{ NOTIFICATIONS : receives
    BRANCHES ||--o{ DOCUMENT_SEQUENCES : configures
    ATTACHMENTS }o--|| USERS : uploaded_by
```

**Catatan:** `ATTACHMENTS` bersifat polymorphic (`entity_type` + `entity_id`) agar dapat dipakai oleh semua dokumen.

---

## 2. MASTER DATA

```mermaid
erDiagram
    CUSTOMERS ||--o{ CUSTOMER_CONTACTS : has
    CUSTOMERS ||--o{ CUSTOMER_ITEMS : owns
    CUSTOMER_ITEMS ||--o{ COLOR_FORMULAS : has
    CUSTOMERS }o--|| PRICE_LISTS : default
    CUSTOMERS }o--|| TAX_RULES : default
    SUPPLIERS ||--o{ MATERIALS : supplies
    MATERIALS ||--o{ MATERIAL_BATCHES : tracked_by
    MATERIALS }o--|| UOMS : purchase_uom
    MATERIALS }o--|| UOMS : stock_uom
    UOMS ||--o{ UOM_CONVERSIONS : converts
    WORKERS ||--o{ WORKER_RATES : has
    PROCESS_TEMPLATES ||--o{ PROCESS_TEMPLATE_STAGES : contains
    CUSTOMER_ITEMS }o--|| PROCESS_TEMPLATES : default_process
    OVERHEAD_RULES }o--|| BRANCHES : for
    FIXED_ASSETS ||--o{ DEPRECIATION_ENTRIES : generates
```

---

## 3. SALES & PRICING

```mermaid
erDiagram
    PRICE_LISTS ||--o{ PRICE_LIST_VERSIONS : versioned
    PRICE_LIST_VERSIONS ||--o{ PRICE_LIST_LINES : contains
    CUSTOMERS ||--o{ QUOTATIONS : receives
    QUOTATIONS ||--o{ QUOTATION_LINES : contains
    QUOTATIONS ||--o| CUSTOMER_POS : converts_to
    CUSTOMERS ||--o{ CUSTOMER_POS : issues
    CUSTOMER_POS ||--o{ CUSTOMER_PO_LINES : contains
    CUSTOMER_PO_LINES }o--|| CUSTOMER_ITEMS : for
    PRICE_LIST_LINES }o--|| CUSTOMER_ITEMS : prices
```

**Aturan kunci:** `CUSTOMER_PO_LINES.unit_price` adalah **snapshot**, tidak pernah ikut berubah jika price list diperbarui.

---

## 4. INBOUND & CUSTODY (inti pembeda sistem ini)

```mermaid
erDiagram
    CUSTOMER_POS ||--o{ GOODS_RECEIPTS : fulfilled_by
    GOODS_RECEIPTS ||--o{ GOODS_RECEIPT_LINES : contains
    GOODS_RECEIPT_LINES }o--|| CUSTOMER_PO_LINES : references
    GOODS_RECEIPTS ||--o| INBOUND_QCS : inspected_by
    INBOUND_QCS ||--o{ INBOUND_QC_LINES : contains
    GOODS_RECEIPT_LINES ||--o{ CUSTODY_LEDGER : creates_IN
    CUSTODY_LEDGER }o--|| CUSTODY_LOCATIONS : stored_at
    CUSTODY_LEDGER }o--|| CUSTOMER_ITEMS : for
    GOODS_RECEIPT_LINES ||--o{ ATTACHMENTS : photos
```

**Aturan kunci:**
- `GOODS_RECEIPTS` (STB) **tidak** terhubung ke `STOCKS` maupun `JOURNALS`.
- `CUSTODY_LEDGER` hanya punya kolom kuantitas, **tidak ada kolom nilai/harga**.

---

## 5. PRODUCTION

```mermaid
erDiagram
    GOODS_RECEIPTS ||--o{ WORK_ORDERS : source
    CUSTOMER_POS ||--o{ WORK_ORDERS : for
    WORK_ORDERS ||--o{ WORK_ORDER_LINES : contains
    WORK_ORDERS ||--o{ PRODUCTION_OPERATIONS : has_stages
    PRODUCTION_OPERATIONS ||--o{ MATERIAL_CONSUMPTIONS : uses
    MATERIAL_CONSUMPTIONS }o--|| MATERIALS : of
    MATERIAL_CONSUMPTIONS }o--|| MATERIAL_BATCHES : from
    BATCH_CONSUMPTIONS ||--o{ BATCH_CONSUMPTION_ALLOCATIONS : splits_to
    BATCH_CONSUMPTION_ALLOCATIONS }o--|| WORK_ORDERS : charged_to
    WORK_ORDERS ||--o{ DAILY_WORKER_OUTPUTS : labor
    DAILY_WORKER_OUTPUTS }o--|| WORKERS : by
    WORK_ORDERS ||--o{ LABOR_ALLOCATIONS : monthly_salary
    WORK_ORDERS ||--o{ OVERHEAD_ALLOCATIONS : overhead
    WORK_ORDERS ||--o{ SUBCONTRACT_ORDERS : outsourced
    WORK_ORDERS ||--o{ CUSTODY_LEDGER : moves
```

---

## 6. QUALITY

```mermaid
erDiagram
    WORK_ORDERS ||--o{ PRODUCTION_QCS : inspected
    PRODUCTION_QCS ||--o{ PRODUCTION_QC_LINES : contains
    PRODUCTION_QCS ||--o{ REJECTS : produces
    REJECTS ||--o{ REWORKS : triggers
    REWORKS ||--o{ REWORK_COSTS : accumulates
    REJECTS }o--|| MATERIAL_BATCHES : possible_cause
    REWORKS }o--|| WORK_ORDERS : belongs_to
```

**Aturan kunci:** `REJECTS.cost_responsibility` (INTERNAL / CUSTOMER / SUPPLIER) menentukan apakah biaya rework jadi beban atau dapat ditagih.

---

## 7. DELIVERY, ACCEPTANCE & REVENUE

```mermaid
erDiagram
    WORK_ORDERS ||--o{ DELIVERY_ORDER_LINES : delivers
    CUSTOMER_POS ||--o{ DELIVERY_ORDERS : under
    DELIVERY_ORDERS ||--o{ DELIVERY_ORDER_LINES : contains
    DELIVERY_ORDERS ||--o| ACCEPTANCES : confirmed_by
    ACCEPTANCES ||--o{ ACCEPTANCE_LINES : contains
    ACCEPTANCE_LINES ||--o{ REVENUE_RECOGNITIONS : triggers
    ACCEPTANCE_LINES ||--o{ CUSTOMER_RETURNS : rejected_qty
    CUSTOMER_RETURNS ||--o{ CUSTOMER_RETURN_LINES : contains
    CUSTOMER_RETURN_LINES ||--o{ CUSTODY_LEDGER : creates_IN
    DELIVERY_ORDERS ||--o{ CUSTODY_LEDGER : creates_OUT
    REVENUE_RECOGNITIONS ||--o{ JOURNALS : posts
```

**Aturan kunci:**
- `DELIVERY_ORDERS.invoice_status` = UNINVOICED / PARTIALLY_INVOICED / INVOICED.
- `REVENUE_RECOGNITIONS` hanya lahir dari `ACCEPTANCE_LINES.quantity_ok`.

---

## 8. BILLING, AR & TAX

```mermaid
erDiagram
    CUSTOMERS ||--o{ INVOICES : billed
    INVOICES ||--o{ INVOICE_LINES : contains
    INVOICES ||--o{ INVOICE_DELIVERY_LINKS : combines
    INVOICE_DELIVERY_LINKS }o--|| DELIVERY_ORDERS : from
    INVOICES ||--o| TAX_INVOICES : faktur_pajak
    TAX_INVOICES }o--|| NSFP_REGISTERS : numbered_from
    INVOICES ||--o{ WITHHOLDING_CERTIFICATES : expects
    INVOICES ||--o{ PAYMENT_ALLOCATIONS : settled_by
    PAYMENTS ||--o{ PAYMENT_ALLOCATIONS : allocates
    PAYMENTS }o--|| BANK_ACCOUNTS : into
    INVOICES ||--o{ CREDIT_NOTES : corrected_by
    CREDIT_NOTES ||--o{ CREDIT_NOTE_LINES : contains
    CUSTOMERS ||--o{ DOWN_PAYMENTS : pays
    DOWN_PAYMENTS ||--o{ PAYMENT_ALLOCATIONS : applied
    TAX_CODES ||--o{ TAX_RATES : versioned
    TAX_RULES ||--o{ TAX_RULE_LINES : composed_of
    TAX_RULE_LINES }o--|| TAX_CODES : uses
    INVOICES }o--|| TAX_RULES : applies
```

**Aturan kunci:** relasi `INVOICE_DELIVERY_LINKS` adalah tabel jembatan yang mewujudkan aturan **N Surat Jalan → 1 Invoice**.

---

## 9. PURCHASING, AP & INVENTORY

```mermaid
erDiagram
    SUPPLIERS ||--o{ PURCHASE_ORDERS : receives
    PURCHASE_ORDERS ||--o{ PURCHASE_ORDER_LINES : contains
    PURCHASE_ORDERS ||--o{ PURCHASE_RECEIPTS : fulfilled_by
    PURCHASE_RECEIPTS ||--o{ PURCHASE_RECEIPT_LINES : contains
    PURCHASE_RECEIPT_LINES ||--o{ MATERIAL_BATCHES : creates
    PURCHASE_RECEIPT_LINES ||--o{ STOCK_MOVEMENTS : increases
    PURCHASE_RECEIPTS ||--o{ SUPPLIER_INVOICES : billed_by
    SUPPLIER_INVOICES ||--o{ SUPPLIER_INVOICE_LINES : contains
    SUPPLIER_INVOICES ||--o{ SUPPLIER_PAYMENT_ALLOCATIONS : settled
    SUPPLIER_PAYMENTS ||--o{ SUPPLIER_PAYMENT_ALLOCATIONS : allocates
    MATERIALS ||--o{ STOCKS : balance
    STOCKS ||--o{ STOCK_MOVEMENTS : history
    STOCK_OPNAMES ||--o{ STOCK_OPNAME_LINES : contains
    STOCK_OPNAME_LINES ||--o{ STOCK_MOVEMENTS : adjusts
    MATERIAL_CONSUMPTIONS ||--o{ STOCK_MOVEMENTS : decreases
```

---

## 10. ACCOUNTING & COSTING

```mermaid
erDiagram
    ACCOUNTS ||--o{ JOURNAL_LINES : posted_to
    JOURNALS ||--o{ JOURNAL_LINES : contains
    JOURNALS }o--|| ACCOUNTING_PERIODS : within
    JOURNALS }o--|| BRANCHES : for
    ACCOUNTING_EVENT_MAPPINGS }o--|| ACCOUNTS : debit_account
    ACCOUNTING_EVENT_MAPPINGS }o--|| ACCOUNTS : credit_account
    WORK_ORDERS ||--o{ WIP_BALANCES : accumulates
    WORK_ORDERS ||--o{ JOB_COSTS : summarized
    JOB_COSTS }o--|| WORK_ORDERS : for
    OPENING_BALANCES }o--|| ACCOUNTS : initializes
    FIXED_ASSETS ||--o{ JOURNALS : depreciates
```

**Aturan kunci:** `ACCOUNTING_EVENT_MAPPINGS` adalah tabel yang membuat matriks jurnal (Appendix A Master Prompt) menjadi **data, bukan kode**. Mengubah pemetaan akun tidak memerlukan deployment.

---

## 11. RELASI LINTAS DOMAIN YANG PALING KRITIS

| Relasi | Kardinalitas | Aturan |
|---|---|---|
| Customer PO → Surat Jalan | 1 : N | 1 SJ hanya boleh 1 PO |
| Surat Jalan → Invoice | N : 1 | Banyak SJ boleh 1 invoice, syarat customer sama |
| Acceptance → Revenue | 1 : 1 per line | Revenue hanya dari quantity_ok |
| WO → Custody Ledger | 1 : N | Setiap perpindahan stage tercatat |
| STB → Stock | **TIDAK ADA** | Dilarang keras |
| STB → Journal | **TIDAK ADA** | Dilarang keras |
| Material Consumption → Journal | 1 : 1 | Dr WIP / Cr Inventory |
| Acceptance → Journal | 1 : 2 | Revenue + WIP→COGS |
| Invoice → Journal | 1 : 1 | AR + PPh + Unbilled + PPN |

---

## 12. ATURAN PENAMAAN & KONVENSI

```text
Tabel          : snake_case, jamak (customers, invoices)
Primary key    : id (UUID v7 atau BIGINT identity)
Foreign key    : <singular>_id (customer_id)
Boolean        : is_* / has_* (is_active)
Timestamp      : created_at, updated_at, deleted_at, posted_at
Audit kolom    : created_by, updated_by, posted_by
Nomor dokumen  : <entity>_number, unique per company
Status         : kolom `status`, tipe enum/varchar dengan CHECK constraint
Uang           : NUMERIC(18,2) — JANGAN pakai FLOAT
Kuantitas      : NUMERIC(18,3)
Rate pajak     : NUMERIC(7,4)
```
