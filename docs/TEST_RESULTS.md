# Test Results & Readiness Report — Sentanu Jaya ERP

Date: November 11, 2026  
Verified branch: `feat/sidebar-collapse-navigation-new`  
Verified commit: `b2f0e1bd5143cb5d173f87e09f1e79571d7112ca`

## 1. Latest CI — PHP & PostgreSQL 16

- **Workflow:** [PHP & PostgreSQL Tests](https://github.com/galiiih/SentanuJaya/actions/runs/43007965905)
- **Result:** SUCCESS
- **PHPUnit:** 153 tests passed
- **Assertions:** 1,037
- **Database:** PostgreSQL 16.15
- **Job:** all workflow steps completed successfully.

## 2. Latest CI — Browser E2E

- **Workflow:** [Browser E2E](https://github.com/galiiih/SentanuJaya/actions/runs/43007966011)
- **Result:** SUCCESS
- **Full Browser E2E:** 53 passed, 0 failed (13.0 minutes)
- **Dedicated Login Intro suite:** 11 passed
- **Invoice & Payment integration subset:** 24 passed, 113 assertions
- **Frontend TypeScript verification:** PASS
- **Vite production build:** PASS
- **Playwright report artifact:** uploaded successfully.

Dedicated print suite: 2 tests passed; Surat Jalan and Invoice PDFs were each verified as one-page A4 documents. The latest full run covers login intro completion (including Escape dismissal), application smoke/navigation, Master Data CRUD workflows, Knowledge Management navigation, and invoice/payment integration checks. A passing automated suite is not a substitute for manual business UAT.

## 3. Previous local test snapshots (historical)

The earlier SQLite/local test counts below are retained only as historical records and must not be confused with the latest PostgreSQL CI result:

- November 3 local snapshot: 134 tests, 132 passed, 2 skipped, 856 assertions.
- Earlier report snapshots contained 140 tests / 138 passed / 2 skipped / 921 assertions.

For current automated verification, use the latest CI evidence in sections 1 and 2.

## 4. Warnings and limitations

- PostgreSQL logs include expected duplicate-key/unique-constraint messages from negative-path and concurrency tests; the PHPUnit process still completed with exit success.
- GitHub Actions emitted Node.js 20 deprecation warnings for some action versions; these are maintenance warnings, not test failures.
- Frontend lint strictness has not been established as clean by the latest workflows. Do not infer lint success from the successful TypeScript/build steps.
- This report does not establish visual correctness on every device, browser, or color theme.

## 5. Production readiness

**Not production-ready yet.** The following operational/business gates remain open:

- Complete role-by-role authorization and negative-path review for sensitive actions.
- Run realistic end-to-end business UAT: customer-owned goods, production stages, QC, partial acceptance/rejection, delivery, invoice eligibility, PPN/PPh, and payment allocation.
- Verify actual Surat Jalan and Invoice templates in browser print/PDF output against approved company documents.
- Complete responsive, light/dark, and accessibility visual UAT.
- Verify production environment variables/secrets, queue, storage permissions, logging, monitoring, and error handling.
- Perform and document backup/restore drill and opening-data preparation.
- Complete user training and obtain Owner sign-off.

No production data or credentials were changed. No merge to `main` and no production deployment were performed.
