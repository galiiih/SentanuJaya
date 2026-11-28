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

## Additional backlog — Master Data Bulk Import / Export

- [ ] Provide **Import** and **Export** actions independently on each Master Data table/page, not one shared import/export action for the whole Master Data module.
- [ ] Separate import/export flows for Customers, Items/Services, Price Lists, Materials, Warehouses, Branches, Units, Item Categories, Material Categories, Customer Contacts, and every other table actually exposed in Master Data.
- [ ] Each table's import must use its own downloadable Excel template/schema and accept that table's supported Excel format; validate required fields, data types, unique codes, references, and duplicates before committing rows.
- [ ] Import UX: select file → validate → show preview and row-level errors → user confirms → import; avoid silently skipping invalid rows. Use transactional behavior or clearly report rows accepted/rejected.
- [ ] Export action must export the current table's data with stable column headers and suitable Excel formatting; honor active search/filter where applicable, and distinguish exporting filtered results from all records.
- [ ] Include only safe, editable business fields in exports; omit internal IDs, secrets, audit fields, and computed/system-only fields unless specifically required for a reliable relationship import.
- [ ] Provide a per-table template download and an export of existing records. Keep import and export independent so users can use either action.
- [ ] Confirm final column mappings and relationships against current backend schemas and API contracts before implementation; do not assume the earlier workbook is a production-ready import schema.
- [ ] Add automated tests for each table's import/export endpoint and UI actions, including permissions, invalid rows, duplicate codes, empty data, filtered exports, and regression coverage for existing CRUD.
- [ ] Complete role permission checks and UAT before enabling bulk import/export for business users.

Template file prepared in the conversation: `SentanuJaya_MasterData_Import_Template.xlsx`. It is a preparation template only; it does not directly import data into the ERP. Column mapping must be confirmed against the live schema before implementing the importer.

## Progress update — Master Data Import / Export (2026-11-28)

Initial per-table CSV controls have been added to `frontend/src/components/MasterDataPage.tsx` on the existing branch:

- Import, Export, and CSV Template actions follow the selected Master Data table (Company, Branch, Customer, Customer Contact, Customer Item, Price List, Price List Line, UOM, Material, Warehouse, Supplier).
- Import checks that the expected table-specific headers are present and previews up to five rows before confirmation.
- Import uses each existing table's create API, reports successful and failed rows, and refreshes the table after processing. It does not overwrite existing records.
- Export requests data page-by-page and exports the configured business fields, including relation keys needed to re-import linked rows.
- Import/Export controls are shown to ADMIN/OWNER only, consistent with existing master-management permissions.

Important limitations; do not mark this feature production-ready yet:

- Current import/export format is **CSV UTF-8**, not native XLSX. CSV can be opened/saved in Excel; native XLSX parsing/writing is still required if the user expects direct .xlsx upload/download.
- Import currently commits row-by-row through existing create endpoints, not as one atomic transaction. The UI reports partial success/failure; it must not claim all-or-nothing behavior.
- The preview is not a full backend validation phase; validation occurs as each create request is submitted. A true preflight validation endpoint with row-level errors is still desirable.
- Export follows API pagination, but current page has no filter-aware export option. Add this if table search/filter controls are introduced.
- Frontend build/typecheck, UI tests, API tests, and actual browser UAT have not been run for these commits. Verify these before enabling the feature for business users.
- The earlier workbook `SentanuJaya_MasterData_Import_Template.xlsx` is a separate preparation artifact and is not directly accepted by this CSV-only implementation. Keep its column mapping aligned with the backend API before native Excel support is added.

Implementation follow-up: CSV import state is cleared when switching Master Data tabs, preventing a pending file from being applied to the wrong resource. Latest UI change commit: `0294b490c8af0dd20763d4519d09ad896fbe3308`. The branch has no CI status attached to these direct commits yet; frontend build and browser tests remain unverified.


## Progress update — Master Data schema alignment and CSV preflight (2026-11-28)

Status: IN_PROGRESS — the CSV workflow has stronger schema alignment and client-side preflight, but native XLSX and server-side atomic import are still outstanding.

- Reviewed the actual Laravel store() validation rules for Company, Branch, Customer, Customer Contact, Customer Item, Price List, Price List Line, UOM, Material, Warehouse, and Supplier.
- Corrected per-table import/export columns to match accepted API fields. This fixes mismatches such as Customer company_name (not legal_name), Contact position (not title), and includes previously omitted business fields such as Customer billing/shipping addresses, item UOM/value, Price List expiry, Price List Line pricing details, and Material stock/UOM settings.
- Excluded company_id from Price List, Material, and Supplier import templates because their current API controllers assign the single-tenant company automatically.
- Added preflight checks for exact/duplicate/unknown headers, malformed CSV quoting, required fields, booleans, numeric/integer ranges, UUID syntax, dates, email, duplicate codes within the file, warehouse branch+code duplicates, and Price List expiry before effective date.
- Import confirmation is disabled when preflight detects errors. Server validation remains authoritative; API failures can still cause partial success because records are currently created one-by-one.
- Warehouse duplicate detection follows the backend scoped uniqueness rule (branch_id + code), not global code uniqueness.

Commits:
- 07ea707679d2e6e4ed762871db6631bbd0a045e4 — align table fields and add CSV row validation.
- 044a70a7d08cb292a7218395098cb04fbcc0a32d — respect warehouse scoped code uniqueness.

Not yet verified:
- Frontend TypeScript/build and lint.
- Automated tests and browser UAT.
- Existing database duplicate/reference checks during preflight.
- Native .xlsx import/export. No XLSX library currently exists in frontend/package-lock.json, and backend Composer dependencies do not include PhpSpreadsheet. Do not disguise CSV/XML as XLSX; add a maintained XLSX implementation with its lockfile and tests before advertising native Excel support.
- Atomic/batch import with server-side validation remains outstanding.

Next actions:
1. Add a maintained XLSX reader/writer and generate actual .xlsx template/export files; keep CSV compatibility if useful.
2. Add server-side preflight/batch validation and transactional import or explicitly retain and communicate partial-import semantics.
3. Add automated coverage for all 11 resources, including required fields, relations, duplicate constraints, invalid data, permissions, empty exports, and pagination.
4. Run frontend build/lint, backend tests, and browser UAT; record actual results before marking this feature DONE.


## Progress update — Master Data validation and payment concurrency regression (2026-11-28)

Status: IN_PROGRESS — schema-aligned CSV import and client-side preflight are implemented; native XLSX, server-side atomic import, and complete Master Data UAT remain open.

Master Data changes:
- Corrected import/export field mappings against all 11 Laravel master-data store() controllers.
- Added CSV preflight for header correctness, malformed quoting, required values, booleans, numeric/integer ranges, UUIDs, dates, email, in-file duplicates, warehouse branch+code uniqueness, and Price List date order.
- Invalid rows now block the import confirmation action.
- Added Playwright E2E coverage for invalid Customer CSV preflight in frontend/e2e/master-crud.spec.ts.
- The importer still creates records sequentially through existing APIs. Server-side validation can still reject individual rows after earlier rows were created; it is not atomic.

Payment concurrency regression found by CI:
- PostgreSQL test exposed a race: two concurrent requests with the same idempotency key could both pass the initial lookup; the second request then failed the duplicate reference check after waiting for the customer lock.
- PaymentService now rechecks the idempotency key after acquiring the customer row lock and before duplicate-reference validation. Matching retries return the original payment; mismatched payloads still return an idempotency validation error.

Latest commits:
- 07ea707679d2e6e4ed762871db6631bbd0a045e4 — Master Data schema mapping and CSV validation.
- 044a70a7d08cb292a7218395098cb04fbcc0a32d — warehouse scoped duplicate check.
- 10951047e65148673e7ed6ffaf4225eb165d2100 — Master Data preflight E2E test.
- 04327f6acc159dba4f8869e74b4ca5214e197fcf — CSV fixture line-ending correction.
- 6985eed807d050eb3799cf5f81bb6326fba0b126 — Payment idempotency concurrency fix.

Verification for commit 6985eed807d050eb3799cf5f81bb6326fba0b126:
- Sentanu Jaya CI: PASS (frontend TypeScript/production build, lint, backend PHPUnit).
- PHP & PostgreSQL Tests: PASS — 181 tests, 1,250 assertions. The previously failing PostgresPaymentConcurrencyTest now passes.
- Browser E2E: print-document tests PASS; login-intro and full browser suite were still running when this progress note was prepared. The new Master Data preflight E2E test has not yet been confirmed by a completed full-suite run.

Remaining work:
1. Add a maintained XLSX reader/writer and update package.json plus package-lock.json. Current frontend has no XLSX dependency; backend Composer has no PhpSpreadsheet. Keep CSV support and do not fake an XLSX file extension.
2. Add server-side preflight/batch validation and transactional import, or explicitly preserve and communicate partial-import behavior.
3. Add coverage across all 11 Master Data resources, including permissions, reference integrity, database duplicates, invalid rows, empty exports, and pagination.
4. Complete browser E2E/UAT for Master Data Import/Export and record final CI results.
5. Mark this feature DONE only after native Excel, tests, and business UAT are verified.


## Progress update — Native XLSX Master Data import/export (2026-11-28)

Status: IN_PROGRESS — native XLSX files are now generated and accepted by the Master Data workflow. Full Excel interoperability, atomic server-side import, and business UAT remain open.

Implemented:
- Added frontend/src/utils/xlsx.ts: dependency-free Office Open XML workbook writer and XLSX reader. Writer creates a valid ZIP-based .xlsx workbook with inline strings; reader handles ZIP Store and Deflate entries, workbook relationships, first worksheet, shared strings, inline strings, booleans, and numeric values.
- Master Data Export and Template now download actual .xlsx files for the selected one of 11 tables. Import accepts .xlsx and retains CSV UTF-8 compatibility.
- Excel date serials in known date columns are converted to YYYY-MM-DD before the existing preflight validation and API payload mapping.
- XLSX safety limits: 25 MB input file, 200 archive entries, and 60 MB total uncompressed content; archive paths are checked before reading.
- Added Playwright coverage that downloads the Customer XLSX template, checks the ZIP signature/workbook parts and header content, then re-imports the template to verify the reader can parse it.
- No package.json/package-lock.json changes were needed because the XLSX implementation uses browser APIs and a small in-repository ZIP/OpenXML implementation. No fake .xlsx extension is used.

Latest commits:
- 0bd0ce31169fc5eb8e6c298ee29041d822b9bda5 — XLSX reader/writer utility.
- 06b1a16e4ea24c132c154c19a0389d73c712742f — connect XLSX import/export to Master Data.
- accca6c7d59dfbbbdc6d4e3be47ec140cf614854 — fix typed Blob buffer for TypeScript 6.
- 81ac689cb522c28f4b853bda6b0b918b60b119a2 — add XLSX template/import E2E coverage.
- 9884d6916e7845d0806c0e8798cebfd5954a770d — correct XLSX E2E test flow.
- a6abdb81749bdc04a5021ae5f785609c2b6b5579 — remove stray E2E assertions.
- 53f380764a144e5c1a4f59ce9652dcb820a140e8 — clean sheet-name sanitization lint warning.

Verification for 53f380764a144e5c1a4f59ce9652dcb820a140e8:
- Sentanu Jaya CI: PASS — TypeScript and production build; oxlint.
- Backend PHPUnit: PASS.
- PHP & PostgreSQL tests: PHPUnit step PASS.
- Browser E2E: Surat Jalan and Invoice print browser tests PASS. Login intro browser tests were still running when this progress note was written; the full browser E2E suite had not started yet. The new Master Data XLSX E2E test therefore is not yet confirmed by a completed run.
- The previous lint failure on commit 9884d691 was caused by leftover assertions after the new E2E test block. The stray lines were removed and the latest CI build/lint passed.

Known limitations / remaining work:
1. The XLSX reader currently reads the first worksheet only. Multi-sheet workbooks are not imported.
2. The E2E test verifies generated XLSX ZIP structure and self-read of the exported template. Real Microsoft Excel/LibreOffice round-trip and a compressed third-party workbook still need explicit coverage/UAT.
3. Client-side preflight checks file structure and basic values but does not query existing database references or duplicate records.
4. Import still creates records sequentially through existing endpoints. Failures can leave earlier rows committed; atomic batch import is not implemented.
5. Add server-side preflight/batch validation and transactional import, plus coverage for all 11 tables, permissions, reference integrity, existing database duplicates, invalid rows, empty exports, and pagination.
6. Complete the currently running browser workflow and perform business UAT before marking this feature DONE.


## Progress update — Atomic Master Data batch import (2026-11-28)

Status: IN_PROGRESS — server-side transactional import and frontend batch integration are implemented; CI verification and full Master Data interoperability/UAT remain open.

Implemented:
- Added `POST /api/v1/master-data/import/{resource}` for the 11 supported import resources: companies, branches, customers, customer_contacts, customer_items, price_lists, price_list_lines, uoms, materials, warehouses, and suppliers.
- The endpoint enforces `master.manage`, rejects unsupported resources, validates a non-empty batch of at most 500 rows, and runs the complete batch in one database transaction.
- Each row is delegated to its existing resource controller `store()`, preserving existing Laravel validation, permission checks, default-company behavior, and model creation rules rather than maintaining a second copy of business validation.
- A validation or database constraint failure identifies the spreadsheet row (header is row 1), returns a structured 422 response, and throws out of the transaction so all earlier rows are rolled back. Successful imports return the resource, created count, and IDs.
- Updated Master Data frontend import to submit one batch request. Success clears the preview and reloads data; failure keeps the preview available and displays the failing row and validation detail.
- Added backend feature tests for successful multi-row import, rollback when a later row is invalid, STAFF permission denial, unsupported resource, and the 500-row limit.

Files changed:
- `backend/app/Http/Controllers/Api/V1/MasterDataImportController.php`
- `backend/routes/api.php`
- `backend/tests/Feature/Api/V1/MasterDataImportApiTest.php`
- `frontend/src/components/MasterDataPage.tsx`

Relevant commits:
- `f93e63a4ded8e5c4b63ef019a74a1ba5c901ea6e` — initial atomic import controller.
- `d544522c8ca79ecbe721b8c3c0224bfdbed70286` — backend batch import tests.
- `8efa91fc3013b02ed25693d2996e9130d666b20a` — register batch import route.
- `0d3461739bd2b626e3416f6f7a34bb4701523744` — connect frontend to batch endpoint.
- `e9fba2b860b7da2cd86ccffacf242567f8535c7f`, `8491bba0fce3ab6eeb37f509591f47221963956d`, `4fcffd13d47b11ddbeb98c862373c096f20da7c2`, `6955f040df43986ac30739abea8afb48b51cb769` — correct PHP namespace escaping, route syntax, and frontend error formatting.

Verification:
- GitHub Actions runs for HEAD `6955f040df43986ac30739abea8afb48b51cb769`:
  - Sentanu Jaya CI: queued/pending at the time of this update.
  - PHP & PostgreSQL Tests: in progress; PHPUnit result not yet available.
  - Browser E2E: in progress; full browser result not yet available.
- The earlier browser workflow run `46112614853` was cancelled before the full browser suite completed. Print tests and login intro passed before cancellation, but this does not verify the new import workflow.
- Do not mark this feature DONE until the new backend tests and all relevant CI checks pass.

Remaining work:
1. Confirm CI for the atomic batch endpoint, including PostgreSQL rollback and permission tests; fix any failures before continuing.
2. Add or extend E2E coverage for successful multi-row import and rollback/error feedback in the UI.
3. Verify XLSX interoperability with a real Excel/LibreOffice-produced workbook, including compressed third-party XLSX input.
4. Expand backend and UI coverage for all 11 resources, especially foreign-key references, database-level duplicates, warehouse branch-scoped uniqueness, empty exports, and pagination.
5. Perform Master Data UAT and record the outcome before marking Import/Export DONE.
