# Phase 2 — Master Data Foundation Audit

**Tanggal:** 2026-09-28  
**Status:** IN PROGRESS — schema/model foundation only  
**Gate:** Phase 3 belum dimulai.

## Scope

Phase 2 mulai setelah Phase 1 PASS. Fokus saat ini hanya audit arsitektur existing dan fondasi master data. Tidak ada Customer PO, Custody transaction, Production, Invoice, Payment, atau business transaction baru.

## Phase 1 baseline

- Authentication, RBAC, permission guard, routing, `/403`, `/404`, logout, refresh, back/forward, responsive, keyboard, console QA: PASS.
- `npm run build`: PASS.
- `npx oxlint src`: PASS.
- DEV role selector tidak masuk production bundle.
- Existing invoice/tax/custody/API/database/mock behavior dipertahankan.

## Audit existing backend

| Area | Existing state | Decision |
|---|---|---|
| Core | `companies`, `branches`, `users`, `audit_logs` di migration `2026_09_24_000001_create_core_tables.php` | Keep |
| Existing master | `tax_codes`, `tax_rates`, `tax_rules`, `customers`, `customer_items`, `suppliers`, `materials`, `price_lists`, `price_list_lines` di migration `2026_09_24_000003_create_master_data_tables.php` | Keep; no duplicate tables |
| Customer relations | `Customer`, `CustomerItem` models; customer contacts belum ada | Add contacts table/model |
| Customer-owned goods | `customer_items` terpisah dari `materials`; custody tables existing | Preserve separation |
| Transaction dependencies | delivery/invoicing migration existing | No Phase 2 transaction changes |
| Runtime tooling | PHP, Composer, PostgreSQL tidak tersedia di PATH | Migration execution and Laravel tests blocked in current environment |
| Frontend mock data | `frontend/src/services/mockData.ts` contains existing UI fixtures | Unchanged |

## Mapping keputusan

| Entity | Existing table/model | Phase 2 action |
|---|---|---|
| Customer | `customers` / `Customer` | Keep |
| Customer Contact | None | Create `customer_contacts` / `CustomerContact` |
| Customer Item | `customer_items` / `CustomerItem` | Keep; add optional UOM FK |
| Color | None | Create `colors` / `Color` |
| Treatment | None | Create `treatments` / `Treatment` |
| Material | `materials` / `Material` | Keep; add optional purchase/stock UOM FKs |
| Supplier | `suppliers` / `Supplier` | Keep |
| Worker | None | Create `workers` / `Worker` |
| Price List | `price_lists`, `price_list_lines` / models added | Keep; combination dimensions preserved |
| Tax Profile | `tax_rules`, `tax_codes`, `tax_rates` | Keep existing tax foundation; no new tax rule |
| Expense Category | None | Create `expense_categories` / `ExpenseCategory` |
| Payment Method | None | Create `payment_methods` / `PaymentMethod` |
| Transport Template | None | Create `transport_templates` / `TransportTemplate` |
| UOM | None | Create `uoms` / `Uom` |
| Production Status | None | Create `production_statuses` / `ProductionStatus` |
| Branch | `branches` | Keep; Worker optionally references branch |

## Changes made

- Added migration `2026_09_28_000005_create_additional_master_data_tables.php`:
  - `uoms`
  - `customer_contacts`
  - `colors`
  - `treatments`
  - `workers`
  - `expense_categories`
  - `payment_methods`
  - `transport_templates`
  - `production_statuses`
- Added migration `2026_09_28_000006_add_uom_relations_to_master_data.php`:
  - optional `customer_items.uom_id`
  - optional `materials.purchase_uom_id`
  - optional `materials.stock_uom_id`
- Added Eloquent models and relationships for new master entities.
- Added `Customer.contacts`, `Customer.priceLists`, `CustomerItem.uom`, `Material.purchaseUom`, `Material.stockUom`.
- Added `Company` and `Branch` models required by existing relationships.

## Safety

- No `DROP TABLE`, `DROP COLUMN`, `TRUNCATE`, or destructive alteration.
- Existing tables and business services untouched.
- Customer-owned goods remain in `customer_items`/custody domain.
- Company inventory remains in `materials`/stock domain.
- Tax and invoice calculation untouched.
- No API or CRUD UI added yet; no fake backend endpoint claimed.

## Verification

Executed:

```text
graphify query "Phase 1 authentication RBAC OWNER blank render dashboard routing permissions"
```

Result: existing auth/App routing and permission graph inspected.

Environment probes:

```text
php -v             BLOCKED — php not found
composer --version BLOCKED — composer not found
psql --version     BLOCKED — psql not found
node -v            PASS — v22.22.3
npm -v             PASS — 10.9.8
```

`graphify update .`: completed; existing unrelated warning remains at `backend/app/Services/SecurityAuditLogger.php` line 60.

Laravel migration execution, PHP syntax check, database migration, backend tests, and API tests remain unverified until PHP/Composer/PostgreSQL environment exists.

## Next bounded step

Install/provide PHP 8.3, Composer, and PostgreSQL 16 runtime, then run migration/schema validation. After schema verification, add backend validation/API and permission middleware for master data. Do not start transaction modules.
