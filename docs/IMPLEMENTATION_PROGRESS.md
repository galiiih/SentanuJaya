# Implementation Progress — Sentanu Jaya ERP

Branch: `feat/sidebar-collapse-navigation-new`
Latest code/documentation commit: `c604cbe733b88dc79aa33648b8b7f141f1797a75`
Parent verification commit: `ec61b10cbcd3911796ad25c1cffdcbca18dbd1a6`
No new branch was created.

## Recent completed work

- Customer Acceptance E2E validates HTTP 200 and response states `SUBMITTED` / `POSTED`, rather than only waiting for requests.
- English category descriptions updated in `ErpDocumentationCategorySeeder`.
- PHP namespace syntax in the category seeder corrected.
- Master ERP user guide translated to English.
- Responsive collapsible sidebar, NumericInput Price List regression coverage, warehouse dropdowns, invoice logo/A4 print checks, and earlier workflow improvements remain recorded as implemented; do not rework without a reproducible defect.
- API permission matrix corrected to match the centralized grants in `App\\Models\\User::hasPermission()` and controller-specific authorization behavior. This also records the current ADMIN-only `documentation.publish` grant explicitly.

## CI verification

For parent commit `ec61b10`:
- Sentanu Jaya CI: PASS — https://github.com/galiiih/SentanuJaya/actions/runs/45941087144
- PHP & PostgreSQL Tests: PASS — https://github.com/galiiih/SentanuJaya/actions/runs/45941087221
- Browser E2E: RUNNING at last check — https://github.com/galiiih/SentanuJaya/actions/runs/45941087138
- In the Browser E2E job, frontend TypeScript/production build and Surat Jalan/Invoice print browser tests had completed successfully; the overall job was still running through login intro and the remaining E2E suite.

The documentation-only permission-matrix commit `c604cbe` was pushed after the above verification. Its own CI must be checked before treating it as verified.

## Permission review findings

- The previous `docs/API_PERMISSION_MATRIX.md` overstated some STAFF actions. The matrix now reflects the actual centralized permission grants.
- STAFF currently has delivery view/create but not submit/deliver/cancel; PO view/create/edit; acceptance view; return view; master view; and documentation view.
- ADMIN has operational submit/deliver, acceptance and return posting, invoice create/view, master management, reports, and documentation management/publishing.
- OWNER additionally has posted-delivery cancellation and invoice approval. Current code grants `documentation.publish` to ADMIN but not OWNER; this distinction is now documented rather than silently changed.
- Existing tests cover STAFF mutation denial across 17 master resources and important user-management restrictions. Full browser-level role navigation and all endpoint negative paths remain open.

## Documentation translation findings

- `ErpDocumentationCategorySeeder` updates categories only.
- The repository contains the `erp_documentation` table migration, but no dedicated article seeder/content source was found in the checked repository tree.
- Database-resident articles cannot safely be translated without their actual content. This task is blocked pending an export/source from the target database.
- English category descriptions and the master user guide are updated; full UI language consistency remains open.

## Open issues / UAT

1. Master Data blank screen after save: unresolved. Existing Customer Master E2E and other master CRUD scenarios cover only their tested entities/sequences. They do not establish that every entity/save path is fixed. Reproduce the affected entity and exact action sequence before root-cause changes.
2. Verify NumericInput behavior across remaining modules; retain existing Price List fix unless a concrete regression is reproduced.
3. Translate database articles after receiving/exporting their actual content.
4. Complete English UI consistency review.
5. Run realistic end-to-end business UAT: Customer PO → customer-owned goods → production → QC (accepted/rejected quantities) → Surat Jalan → Invoice → Payment.
6. Complete role/permission negative-path tests for ADMIN, OWNER, STAFF, including browser navigation and endpoint-specific actions.
7. Verify actual business document templates and browser print output with business data and Owner review.
8. Complete production readiness: VPS/environment/secrets, storage, queues, logs, monitoring, backup/restore, opening data, training, and Owner sign-off.

## Business and production safeguards

- Revenue should reflect delivered and customer-accepted `qty_ok`; rejected quantity is excluded.
- One Surat Jalan per Invoice.
- Do not merge to `main` or deploy to production before UAT and Owner sign-off.
- Keep work on `feat/sidebar-collapse-navigation-new`; no duplicate branch.
