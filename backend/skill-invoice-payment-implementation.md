---
name: "Invoice & Payment Module Implementation"
description: "Guidelines for adding, auditing, and fixing invoice/payment workflows in the Sentanu Jaya Web App"
status: "active"
---

# Invoice & Payment Module Implementation

Use this skill when adding, auditing, or fixing the invoice-to-payment financial flow (Invoice, InvoiceLine, InvoiceDeliveryLink, Payment, PaymentAllocation, InvoiceService, PaymentService, InvoiceController, PaymentController, routes).

## Standing rules

- **Backend-first, API-only gate**: all authorization lives on the backend/API (permission + role checks). The frontend never substitutes for authorization — hide buttons, but always enforce on the request.
- **Never create money out of thin air**: invoiceable quantity = accepted-OK quantity that has not yet been invoiced. Reject quantity is excluded. Delivery alone = 0 invoiceable.
- **One invoice, one customer**; Surat Jalan cardinality follows the agreed-in-code convention (multiple SJ per invoice if that is what the code/docs mandate).
- **All financial changes inside a single DB transaction**: create payment + allocations + update invoices, or fail together.
- **Idempotency / anti-duplication**: a payment request must never double-charge an invoice. Check `allocated_amount` against current `amount_due` before writing, and prefer `DB::transaction` + `first()` with `lockForUpdate()` where concurrent request risk exists.
- **No business-rule change without evidence**: if the existing code, test, or spec disagrees, mark the item `BLOCKED BY REQUIREMENT` and explain consequences instead of silently picking an option.

## Procedure

1. **Audit the actual code, not the report.** Check: model schema, migration, service, controller, routes, permission checks, existing tests. Confirm the table exists and fields match before assuming.
2. **Implement in this order**: model → migration → service → controller → routes → resource → permission check in routes middleware → tests.
3. **Service layer owns the money math.** Controller validates input, service does the calculation and writes the transaction.
4. **Permissions**: define/verify permission keys used by `hasPermission()` (e.g. `financial.view`, `financial.create`). Guard every controller method with `abort_unless(...)`; do not rely on UI only.
5. **Tests first** (or alongside): use `RefreshDatabase` or a fresh SQLite in a test database file.

## Tests to run

```bash
php artisan test --filter=InvoiceServiceTest
php artisan test --filter=PaymentService
php artisan test
npx tsc --noEmit
npm run build
```

Report which PHPUnit tests ran, which scenario each covers, and the numeric results.

## Pitfalls

- **Migration schema drift**: an older migration can still define the invoice/payments schema. If the model references a missing column, check which migration created it.
- **Sum aggregation**: for accumulated quantities use `->sum('quantity_ok')`, not a relationship property.
- **Reject quantity exclusion**: verify `quantity_rejected` never feeds into invoiceable total.
- **Over-acceptance check**: cumulative `OK + REJECT <= delivered` must include existing POSTED acceptances.