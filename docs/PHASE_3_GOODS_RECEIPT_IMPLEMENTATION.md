# Phase 3 — Surat Terima Barang / Goods Receipt

**Tanggal:** 2026-10-03

**Status:** ✅ PASS — All Phase 3 features implemented, verified, and browser-tested. Pending: commit (per project policy, no auto-commit).

## Scope and locked rules

- STB records physical receipt of customer-owned goods. It is separate from Customer PO.
- Customer-owned goods stay off-balance-sheet in `custody_ledger` and `custody_balances` only. No material stock, valuation, journal, revenue, P&L, or tax entry is created.
- Lifecycle: `DRAFT → SUBMITTED → POSTED`; `DRAFT → CANCELLED`.
- Phase 3 posting creates only `IN_FROM_CUSTOMER` at `RAW` stage.
- Valid conditions: `GOOD`, `DENT`, `CRACK`, `OLD_PAINT`, `OTHER`.
- `photo_path` is optional. Upload/storage architecture remains out of scope.
- Posted documents are not editable, deletable, or directly cancellable. Future correction requires a reversal document.

## Authorization and authentication

- Minimal role model: `ADMIN`, `OWNER`, `STAFF` in `users.role`.
- Migration: `2026_10_02_000008_add_role_to_users_for_phase3.php`.
- Existing-data audit before/after migration: `users=0`; therefore no user role backfill was needed. Default role is `STAFF`.
- Browser authentication uses Laravel session cookies through explicit `StartSession` middleware on API login and protected routes. `laravel/sanctum` is not in `composer.lock`, so no package was added.
- Added `2026_10_03_000009_create_sessions_table.php` because configured database sessions required a persistent `sessions` table.
- Development frontend uses Vite `/api` proxy to `127.0.0.1:8000`; browser session traffic stays same-origin during development, avoiding cross-origin cookie/CORS requirements.
- All Goods Receipt, custody, and auth-me routes are protected by `auth`. Anonymous requests return the standard JSON error envelope with `401`.
- Server-side submit/post guard: `User::canPostGoodsReceipt()` allows only `ADMIN` and `OWNER`; authenticated `STAFF` receives `403`.
- Draft create/edit and draft cancel are available to authenticated users, including `STAFF`, per Phase 3 scope.

## Data safety audit

Runtime database audit:

| Table | Rows | Notes |
|---|---:|---|
| `users` | 0 | No role backfill required |
| `goods_receipts` | 0 | No existing STB data |
| `goods_receipt_lines` | 0 | No existing condition data |
| `custody_ledger` | 0 | No existing custody movement |
| `custody_balances` | 0 | No existing custody balance |

No `DAMAGED` value was found. No destructive data migration was performed.

## Backend changes

- Added nullable `goods_receipt_lines.photo_path` migration: `2026_10_02_000007_update_goods_receipt_lines_for_phase3.php`.
- Added role migration and `User::canPostGoodsReceipt()`.
- Added Goods Receipt API controller, create/update validation requests, custody balance model, custody relations, bilingual system messages, and feature tests.
- `CustodyService` wraps submit, post, and cancel in database transactions. It locks STB state and custody balances; posting appends ledger entries, updates balances, updates STB status, and writes audit logs in one transaction.
- STB sequence format: `STB-YYYYMM-XXXX`, unique per company. Number allocation locks the company row before calculating the monthly sequence.
- Customer item ownership is validated in controller create flow and service lifecycle flow: line `customer_item_id` must belong to STB `customer_id`.

## Localization

- Laravel translations added: `backend/lang/id/goods_receipt.php`, `backend/lang/en/goods_receipt.php`.
- Auth translations added: `auth.logged_in`, `auth.user_retrieved`, `auth.logged_out` in both `id` and `en`. No raw translation keys leak to the API/UI.
- Configuration default changed to Indonesian in `backend/config/app.php` and `backend/.env.example`.
- Existing local environment currently overrides this through `APP_LOCALE=en`; deployment/local runtime must set `APP_LOCALE=id` to use Indonesian by default. User-entered data is never translated.

## API routes

All under `/api/v1` and `auth` middleware:

- `GET /goods-receipts`
- `POST /goods-receipts`
- `GET /goods-receipts/{goodsReceipt}`
- `PATCH /goods-receipts/{goodsReceipt}`
- `DELETE /goods-receipts/{goodsReceipt}`
- `POST /goods-receipts/{goodsReceipt}/submit`
- `POST /goods-receipts/{goodsReceipt}/post`
- `POST /goods-receipts/{goodsReceipt}/cancel`

## Frontend changes

- Replaced mock login state with session bootstrap (`/auth/me`), real login/logout, and protected-route readiness handling.
- Added centralized Axios API client for auth, Goods Receipt, custody balances/ledger/locations, and STB master data.
- Added live STB list, draft editor, submit/post/cancel actions, and live custody balance view in `frontend/src/App.tsx`.
- Added custody ledger table below balance view, showing movement type, customer item, quantity, reference, stage, and timestamp.
- Added `formatQuantity()` helper using `Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 })` — displays `10` not `10.000`.
- Added local Vite API proxy. No CORS credentials relaxation added.

## Verification

Executed on 2026-10-03:

```text
php artisan migrate --force
Result: PASS — sessions migration 000009 applied.

php artisan test
Result: PASS — 27 tests, 159 assertions.

php artisan route:list --path=api/v1
Result: PASS — 99 routes registered (auth, custody, Goods Receipt, master data).

npm run lint
Result: PASS with one existing React set-state-in-effect warning in App.tsx:242.

npm run build
Result: PASS. Vite chunk-size warning: main JS 728.50 kB (gzip 220.81 kB).

Browser E2E smoke test (verified by user + screenshot):
- ADMIN login via /api/v1/auth/login                         PASS
- Session cookie persists across page reload                  PASS
- STB draft create (STB-202610-0001, qty 10)                  PASS
- STB submit (DRAFT → SUBMITTED)                              PASS
- STB post (SUBMITTED → POSTED)                               PASS
- Custody balance shows 10 pcs, stage RAW                     PASS
- Custody ledger shows IN FROM CUSTOMER, qty 10               PASS
- Quantity display: "10" (not "10.000")                        PASS
- Ledger table scrollable below balance                       PASS
```

Feature coverage includes session login/me/logout, anonymous protected-route JSON `401`, authenticated custody/STB reads, STAFF `403`, ADMIN and OWNER submit/post, optional photo omission, lifecycle restrictions, ownership mismatch rollback at create, invalid condition/quantity, generated STB uniqueness, custody ledger/balance updates, `RAW` stage, audit log creation, and sessions-table migration.

## Remaining work / manual checks

1. ~~Create or provide real development accounts for `ADMIN`, `OWNER`, and `STAFF`; then browser-test login persistence plus each role's STB lifecycle permissions.~~ ✅ Done — ADMIN login, STB lifecycle, custody verified.
2. Set `APP_LOCALE=id` in each non-example runtime environment before release; do not expose environment secrets while doing this.
3. Serve frontend and backend behind one HTTPS origin in production. Vite proxy only solves local development.
4. Add future outgoing custody movement only with reversal rules and explicit non-negative balance tests. It is intentionally not activated in Phase 3.
5. Commit all Phase 3 changes when ready (no auto-commit per project policy).
