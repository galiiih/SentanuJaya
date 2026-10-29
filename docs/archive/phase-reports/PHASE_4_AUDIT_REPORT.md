# PHASE 4 — SURAT JALAN & CUSTOMER ACCEPTANCE
## AUDIT & IMPLEMENTATION IMPACT REPORT
### 2026-10-04

---

## 1. CURRENT ARCHITECTURE SUMMARY

### Database (PostgreSQL 16)
**39 tables** total. Phase 4 target tables already exist (dormant, 0 rows):
- `delivery_orders` — 15 columns
- `delivery_order_lines` — 11 columns
- `acceptances` — 10 columns
- `acceptance_lines` — 7 columns
- `invoices` — 20 columns
- `invoice_lines` — 7 columns
- `invoice_delivery_links` — 5 columns
- `payments` — 11 columns
- `payment_allocations` — 5 columns

**Phase 3 live data** (must remain intact):
- `goods_receipts`: 1 row (STB-202610-0001, POSTED)
- `custody_ledger`: 1 row (IN_FROM_CUSTOMER)
- `custody_balances`: 1 row (balance 10 pcs, stage RAW)

**No `customer_pos` table exists.**

### Backend (Laravel 13, PHP 8.3)
| Asset | Status |
|---|---|
| Models | 23 models. NO model for DeliveryOrder, Acceptance, Invoice, Payment. |
| Controllers | 21 controllers. NO DeliveryOrderController, AcceptanceController, InvoiceController. |
| Services | CustodyService ✅, InvoiceService (dormant) ✅, TaxEngine ✅, SecurityAuditLogger ✅ |
| Requests | StoreGoodsReceiptRequest, UpdateGoodsReceiptRequest only |
| Policies | **None** (no Policies directory) |
| Middleware | No custom middleware directory |
| Routes | 99 routes (api.php). NO delivery/acceptance/invoice routes. |
| Tests | 7 test files, 27 tests, 159 assertions. No delivery/acceptance tests. |
| Lang | en/id for `auth` and `goods_receipt` only |

### Frontend (React/Vite/TypeScript)
| File | Status |
|---|---|
| `App.tsx` | Dashboard, CustodyPage (live API), MaterialsPage (mock), DeliveryPage (mock), InvoicingPage (mock) |
| `auth.tsx` | Roles: ADMIN/OWNER/STAFF. 5 permissions (dashboard/custody/material/delivery/invoice .view). NOT granular per action. |
| `api.ts` | Live: goodsReceiptApi, custodyApi, authApi. NO delivery/acceptance API calls. |
| `mockData.ts` | Mock DeliveryOrder/Material data powering DeliveryPage and InvoicingPage. |
| `components/ui.tsx` | Reusable: Card, DataTable, Button, Select, Input, FormField, KpiCard, StatusBadge, Alert, ConfirmationDialog, Toast, PageHeader, Breadcrumb |

---

## 2. WHAT IS REUSABLE

| Component | Reusability |
|---|---|
| `CustodyService` | ✅ Pattern for locking, ledger write, balance update. Extend with `OUT_TO_CUSTOMER` and `RETURN_REJECTED` methods. |
| `SecurityAuditLogger` | ✅ Append-only audit. Use as-is. |
| `TaxEngine` | ✅ Tax calculation. Use as-is for invoice. |
| `InvoiceService` | ⚠️ Dormant. Supports N SJ → 1 Invoice. Needs review — see blocker below. |
| `BaseApiController` | ✅ JSON envelope pattern. |
| `auth.tsx` | ⚠️ Need to extend permissions from 5 view-only to ~14 action-level permissions. |
| `ui.tsx` components | ✅ Full reuse for delivery/acceptance UI. |
| Dormant migration 000004 | ⚠️ Tables exist but need schema changes (see below). |

---

## 3. WHAT IS MISSING

### 3.1 Schema Changes Required (Migration)

| Table | Change | Reason |
|---|---|---|
| `delivery_orders` | Change `status` default `DELIVERED` → `DRAFT` | Draft-first lifecycle |
| `delivery_orders` | Add enum values: `READY`, `ACCEPTANCE_PENDING`, `PARTIALLY_ACCEPTED`, `ACCEPTED`, `INVOICED`, `CANCELLED` | Full lifecycle |
| `delivery_orders` | Add `customer_po_id UUID FK nullable` | Customer PO proper FK (see decision needed) |
| `acceptances` | Change `status` default `POSTED` → `DRAFT` | Draft-first lifecycle |
| `acceptances` | Add `SUBMITTED` status support | Match lifecycle DRAFT→SUBMITTED→POSTED |
| `acceptances` | Rename `evidence_attachment_id` → `evidence_reference` (text) | Per spec: minimal reference only |
| **NEW TABLE** | `customer_pos` | Customer PO entity (prerequisite per spec §2.4) |
| **NEW TABLE** | `customer_po_lines` | Line-level PO items |

### 3.2 New Backend Code

| Asset | Count |
|---|---|
| Models | 7 new: DeliveryOrder, DeliveryOrderLine, Acceptance, AcceptanceLine, Invoice, InvoiceLine, CustomerPo |
| Controllers | 3 new: DeliveryOrderController, AcceptanceController, InvoiceController |
| Services | Extend CustodyService (+2 methods), review InvoiceService |
| FormRequests | 4+ new: Store/UpdateDeliveryOrder, Store/UpdateAcceptance |
| Lang | en/id `delivery_order.php`, `acceptance.php`, `invoice.php` |
| Routes | ~15 new endpoints |
| Tests | 7+ new test classes covering SJ, acceptance, custody OUT, reject, revenue, authorization, i18n |

### 3.3 New Frontend Code

| Component | Description |
|---|---|
| DeliveryPage rewrite | Replace mock with live API: list, create draft, edit, ready, deliver, cancel |
| AcceptancePage | New: list, create draft, submit, post. Partial acceptance support. |
| InvoicingPage rewrite | Replace mock with live API: connect to InvoiceService |
| Permission extension | 14 action-level permissions in auth.tsx |
| API client extension | deliveryApi, acceptanceApi in api.ts |
| i18n infrastructure | Centralized label system (or continue per-component pattern) |

---

## 4. SCHEMA CONFLICTS / ISSUES

### 4.1 `delivery_orders.status` default = `DELIVERED` ⚠️
Current migration sets default to `DELIVERED`. Must change to `DRAFT` for draft-first lifecycle.
**Risk**: Zero existing rows → safe to ALTER.

### 4.2 `acceptances.status` default = `POSTED` ⚠️
Current migration sets default to `POSTED`. Must change to `DRAFT`.
**Risk**: Zero existing rows → safe to ALTER.

### 4.3 `customer_po_number TEXT` on `delivery_orders` ⚠️
Spec §2.4 explicitly says: **do not use text field as final architecture** if Customer PO entity is needed.
Customer PO entity does NOT exist yet.
**Decision**: Must create `customer_pos` table + `customer_po_id FK` on delivery_orders. Keep `customer_po_number` as legacy/display.

### 4.4 `delivery_order_lines.quantity` decimal(18,3)
Spec says no 3-decimal format. Display-side fix exists (`formatQuantity`). Schema uses decimal(18,3) for precision — OK, display formatter handles it.

### 4.5 `goods_receipt_lines.condition` includes `DAMAGED`
Current migration default comment says `GOOD, DAMAGED`. Phase 3 updated conditions to `GOOD, DENT, CRACK, OLD_PAINT, OTHER`. `DAMAGED` deprecated but **NOT removed from DB enum**. Migration 000007 updated this.
**Action**: Do NOT drop `DAMAGED`. It may exist in data. Leave as-is.

---

## 5. BLOCKER: INVOICE CARDINALITY

### Conflict Detected:
- **Migration 000004 comment**: `N Surat Jalan → 1 Invoice` (line 68)
- **InvoiceService code**: Supports N SJ → 1 Invoice (loops `$dOrders`, creates `invoice_delivery_links`)
- **`invoice_delivery_links` table**: Designed for N:N mapping

### Previous discussion (from design gate):
> "Invoice cardinality: 1 SJ → 1 Invoice, or N SJ → 1 Invoice?"

### Current evidence:
Both schema and InvoiceService support **N SJ → 1 Invoice**.

### Recommendation:
**Keep N SJ → 1 Invoice** — this is what the codebase implements and is the more flexible model. If business wants 1:1, it's a subset (just pick 1 SJ per invoice).

### ⚡ DECISION NEEDED:
Confirm: **N Surat Jalan → 1 Invoice** is the locked cardinality?

---

## 6. IMPLEMENTATION PLAN

### STEP 1: Customer PO Entity (Prerequisite)
- Migration: `customer_pos`, `customer_po_lines`
- Model: CustomerPo, CustomerPoLine
- Basic CRUD API
- Minimal — just enough for SJ to FK reference

### STEP 2: Schema Alteration Migration
- ALTER `delivery_orders.status` default → `DRAFT`
- ALTER `acceptances.status` default → `DRAFT`
- ADD `delivery_orders.customer_po_id` FK nullable
- ADD `acceptances.evidence_reference` TEXT (rename from evidence_attachment_id or add new)
- ADD status values support

### STEP 3: Backend Domain Models
- DeliveryOrder, DeliveryOrderLine, Acceptance, AcceptanceLine, Invoice, InvoiceLine
- Relationships, casts, fillable

### STEP 4: Extend CustodyService
- `createOutToCustomer()` — OUT_TO_CUSTOMER ledger + balance decrease
- `createReturnRejected()` — RETURN_REJECTED ledger + balance increase (customer-owned, separate from material inventory)

### STEP 5: DeliveryOrderService
- Lifecycle: DRAFT → READY → DELIVERED → ACCEPTANCE_PENDING → PARTIALLY_ACCEPTED → ACCEPTED → INVOICED
- Cancel: DRAFT/READY → CANCELLED
- Deliver action: validate custody balance, lock rows, create OUT_TO_CUSTOMER, update status atomically
- Immutable after DELIVERED

### STEP 6: AcceptanceService
- Lifecycle: DRAFT → SUBMITTED → POSTED
- Cancel: DRAFT → CANCELLED
- Cumulative validation: SUM(ok) + SUM(reject) <= delivered_quantity
- Post action: update SJ line qty_accepted/qty_rejected aggregates, update SJ status
- RETURN_REJECTED custody movement on post
- Immutable after POSTED

### STEP 7: Permission System
- Simple permission matrix check on User model (role-based, no DB table needed)
- `User::can('delivery.create')` style
- Backend enforcement in controller/middleware

### STEP 8: API Routes & Controllers
- DeliveryOrderController: CRUD + ready/deliver/cancel
- AcceptanceController: CRUD + submit/post/cancel
- InvoiceController: use existing InvoiceService

### STEP 9: Frontend
- Replace DeliveryPage mock with live API
- New AcceptancePage component
- Replace InvoicingPage mock with live API
- Extend permissions in auth.tsx
- Add API client methods

### STEP 10: i18n
- Lang files: en/id for delivery_order, acceptance, invoice

### STEP 11: Tests
- ~50+ test cases covering all spec requirements

### STEP 12: Verification
- Full test suite pass
- Frontend build pass
- Browser smoke test
- Regression check (Phase 1-3)

---

## 7. REMAINING DECISIONS NEEDED BEFORE CODE

| # | Decision | Options | Recommendation |
|---|---|---|---|
| 1 | Invoice cardinality | N SJ → 1 Invoice vs 1 SJ → 1 Invoice | Keep N:1 (matches existing code) |

**All other Phase 4 design gate decisions are now LOCKED by the prompt.** No further business decisions needed.

---

## 8. RISK ANALYSIS

| Risk | Severity | Mitigation |
|---|---|---|
| Customer PO as prerequisite adds scope | Medium | Minimal CRUD, no complex PO management |
| InvoiceService needs qty_invoiced tracking | Medium | Straightforward — update `delivery_order_lines.qty_invoiced` in InvoiceService |
| Permission system doesn't exist | Low | Simple role-check methods on User model, no heavy RBAC framework |
| Rejected goods custody movement | Medium | New movement type `RETURN_REJECTED` with `stage` back to custody. Keep separate from material inventory. |
| Concurrent acceptance racing | High | Row locking on `delivery_order_lines` for cumulative qty check |
| Frontend complexity (12 screens) | Medium | Incremental — reuse existing component library |
