# Implementation Progress — Sentanu Jaya ERP

Branch: `feat/sidebar-collapse-navigation-new`
Latest implementation commit: `3283a3a50d9f41c8413f01acd56d6405fb7caf47`
No new branch was created.

## Recent completed work

- Customer Acceptance E2E validates HTTP 200 and response states `SUBMITTED` / `POSTED`.
- English category descriptions and the master ERP user guide have been updated; category seeder namespace syntax was corrected.
- Responsive collapsible sidebar, NumericInput Price List regression coverage, warehouse dropdowns, invoice logo/A4 print checks, and earlier workflow improvements remain implemented; do not rework without a reproducible defect.
- `docs/API_PERMISSION_MATRIX.md` was corrected to match the centralized `User::hasPermission()` grants and controller-specific authorization behavior.
- Added automated regression tests to `UserManagementSecurityTest` to verify every centralized permission grant/denial for STAFF, ADMIN, and OWNER; developer-role bypass; and deny-by-default behavior for unknown roles.

## CI verification

For commit `b8c4bd5`, all three workflows passed:
- Sentanu Jaya CI: PASS — https://github.com/galiiih/SentanuJaya/actions/runs/45941398076
- PHP & PostgreSQL Tests: PASS — https://github.com/galiiih/SentanuJaya/actions/runs/45941398114
- Browser E2E: PASS — https://github.com/galiiih/SentanuJaya/actions/runs/45941398043

The permission regression test commit `3283a3a` was pushed after those checks. Its CI must finish successfully before this new test suite is considered verified.

## Permission review findings

- STAFF has delivery view/create but not submit/deliver/cancel; PO view/create/edit; acceptance view; return view; master view; and documentation view.
- ADMIN has operational submit/deliver, acceptance and return posting, invoice create/view, master management, reports, and documentation management/publishing.
- OWNER additionally has posted-delivery cancellation and invoice approval. Current code grants `documentation.publish` to ADMIN but not OWNER; this distinction is documented rather than silently changed.
- Existing API tests cover STAFF mutation denial across 17 master resources and user-management restrictions. The new tests lock down the full centralized role-permission matrix. Browser-level role navigation and endpoint-specific negative-path tests remain open.

## Documentation translation findings

- `ErpDocumentationCategorySeeder` updates categories only.
- The repository contains the `erp_documentation` table migration, but no dedicated article seeder/content source was found in the checked repository tree.
- Database-resident articles cannot safely be translated without their actual content. This task is blocked pending an export/source from the target database.
- Full UI language consistency remains open.

## Open issues / UAT

1. Master Data blank screen after save: unresolved. Existing CRUD tests cover selected entities and sequences only. Reproduce the affected entity and exact action sequence before root-cause changes.
2. Verify NumericInput behavior across remaining modules; retain the Price List fix unless a concrete regression is reproduced.
3. Translate database articles after receiving/exporting their actual content.
4. Complete English UI consistency review.
5. Run realistic end-to-end business UAT: Customer PO → customer-owned goods → production → QC (accepted/rejected quantities) → Surat Jalan → Invoice → Payment.
6. Expand role/permission tests to browser navigation and endpoint-specific business actions.
7. Verify actual business document templates and browser print output with business data and Owner review.
8. Complete production readiness: VPS/environment/secrets, storage, queues, logs, monitoring, backup/restore, opening data, training, and Owner sign-off.

## Business and production safeguards

- Revenue should reflect delivered and customer-accepted `qty_ok`; rejected quantity is excluded.
- One Surat Jalan per Invoice.
- Do not merge to `main` or deploy to production before UAT and Owner sign-off.
- Keep work on `feat/sidebar-collapse-navigation-new`; no duplicate branch.
