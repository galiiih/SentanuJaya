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
