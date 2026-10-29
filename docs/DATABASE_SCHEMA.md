# DATABASE SCHEMA — SENTANU ERP
## PostgreSQL 16 + Laravel Eloquent · MVP-first

## 1. Kontrak teknis

- PostgreSQL 16 menjadi sumber kebenaran transaksi.
- Laravel 11 memakai Eloquent dan Laravel Migrations.
- Tidak ada Prisma schema atau migration manual di production.
- Semua transaksi operasional menyimpan `company_id`, `branch_id`, `created_at`, `created_by`, `updated_at`, `updated_by`.
- Dokumen memiliki `status`, `posted_at`, `posted_by`, `cancelled_at`, `cancel_reason`.
- Uang: `NUMERIC(18,2)`. Harga satuan: `NUMERIC(18,4)`. Quantity: `NUMERIC(18,3)`. Rate: `NUMERIC(7,4)`.
- Posted transaction tidak dihapus. Koreksi memakai reversal, credit note, return, atau adjustment.
- Foreign key dan unique index dibuat dalam Laravel migrations.

## 2. Batas model bisnis

- `customer_items` adalah barang milik customer; tidak masuk inventory dan tidak memiliki nilai persediaan.
- `materials` adalah material milik Sentanu Jaya; hanya material yang masuk `stocks`.
- `custody_ledger` mencatat kuantitas barang customer, tanpa harga dan tanpa journal.
- `stock_movements` mencatat material perusahaan dan menjadi sumber perubahan saldo stok.
- Saldo agregat (`custody_balances`, `stocks`) diperbarui oleh application service dalam database transaction yang sama dengan ledger/movement. Tidak memakai trigger sekaligus service untuk operasi yang sama.

## 3. Tabel MVP-1

### Core & security

- `companies`: code, name, legal_name, npwp, is_pkp, address, phone, email, timezone, currency, system_start_date.
- `branches`: company_id, code, name, address, is_active.
- `users`: username, email, password, full_name, phone, is_active, failed_login_count, locked_until, mfa_enabled.
- `roles`: code, name, is_system.
- `permissions`: code, module, action.
- `user_roles`: user_id, role_id.
- `user_branches`: user_id, branch_id.
- `audit_logs`: actor_id, action, entity_type, entity_id, old_value JSONB, new_value JSONB, reason, ip_address, user_agent, created_at. Append-only.
- `document_sequences`: branch_id, document_type, prefix, current_number, padding, reset_rule.
- `attachments`: entity_type, entity_id, storage_disk, path, original_name, mime_type, size_bytes, checksum, uploaded_by.
- `settings`: company_id, key, value JSONB, data_type, is_editable.

### Master data

- `customers`: code, name, billing_address, shipping_address, npwp, tax_status, default_tax_rule_id nullable, payment_terms_days, credit_limit, phone, email, is_active.
- `customer_contacts`: customer_id, name, position, phone, email, is_primary.
- `customer_items`: customer_id, code, name, vehicle_model, part_type, uom_id, size nullable, item_value nullable NUMERIC(18,2) (harga barang customer untuk claim), is_active.
- `customer_item_colors`: customer_item_id, color_code, color_name, notes, is_active.
- `treatments`: code, name, is_active.
- `suppliers`: code, name, address, npwp, phone, email, payment_terms_days, is_active.
- `uoms`: code, name, category, decimal_places.
- `materials`: code, name, category, brand, purchase_uom_id, stock_uom_id, minimum_stock, reorder_level, is_batch_tracked, default_supplier_id, is_active.
- `price_lists`: customer_id, code, name, effective_date, expiry_date, approval_status, approved_by.
- `price_list_lines`: price_list_id, customer_item_id, color_code nullable, treatment_type nullable, size nullable, unit_price, minimum_charge, discount_percent, is_active.

### Customer custody

- `goods_receipts`: stb_number, customer_id, received_date, received_time, delivered_by_name, vehicle_plate, custody_location, status, notes.
- `goods_receipt_lines`: goods_receipt_id, customer_item_id, color_code, quantity_received, condition, damage_description, location, photo_required.
- `inbound_qcs`: goods_receipt_id, qc_date, inspector_id, result, notes, status.
- `inbound_qc_lines`: inbound_qc_id, goods_receipt_line_id, qty_checked, qty_pass, qty_reject, defect_notes.
- `custody_ledger`: customer_id, customer_item_id, reference_type, reference_id, movement_type, quantity_in, quantity_out, location, stage, movement_date, created_by, notes.
- `custody_balances`: customer_id, customer_item_id, location, stage, balance_quantity, last_movement_at. Unique by customer/item/location/stage.

### Material inventory

- `material_receipts`: receipt_number, supplier_id, receipt_date, warehouse, status, notes.
- `material_receipt_lines`: material_receipt_id, material_id, batch_number, expiry_date, quantity, uom_id, unit_cost.
- `material_usages`: usage_number, usage_date, reference_type, reference_id, status, notes.
- `material_usage_lines`: material_usage_id, material_id, batch_id nullable, quantity, uom_id, unit_cost_snapshot.
- `material_batches`: material_id, batch_number, received_date, expiry_date, quantity_received, quantity_remaining, unit_cost, status.
- `warehouses`: branch_id, code, name, is_active.
- `stocks`: warehouse_id, material_id, quantity_on_hand, average_unit_cost, total_value, last_movement_at. Unique warehouse/material.
- `stock_movements`: warehouse_id, material_id, batch_id nullable, movement_type, reference_type, reference_id, quantity_in, quantity_out, unit_cost, value_in, value_out, balance_qty_after, balance_value_after, movement_date, created_by.
- `stock_opnames`: warehouse_id, opname_number, opname_date, status, counted_by, approved_by.
- `stock_opname_lines`: stock_opname_id, material_id, batch_id nullable, system_qty, physical_qty, difference_qty, unit_cost, reason.

### Delivery, acceptance, billing

- `delivery_orders`: sj_number, customer_id, customer_po_number nullable, delivery_date, vehicle_plate, receiver_name, status, invoice_status, notes.
- `delivery_order_lines`: delivery_order_id, customer_item_id, color_code, quantity, unit_price_snapshot, qty_accepted, qty_rejected, qty_invoiced.
- `acceptances`: acceptance_number, delivery_order_id, acceptance_date, accepted_by_name, evidence_attachment_id, status, notes.
- `acceptance_lines`: acceptance_id, delivery_order_line_id, quantity_ok, quantity_rejected, reject_reason.
- `customer_returns`: return_number, customer_id, delivery_order_id, return_date, status, notes.
- `customer_return_lines`: customer_return_id, customer_item_id, quantity, condition, reject_reason.
- `invoices`: invoice_number, customer_id, invoice_date, due_date, tax_rule_id nullable, subtotal, discount_amount, dpp, ppn_amount, pph_amount, rounding_amount, total_amount, amount_paid, amount_due, status, posted_at.
- `invoice_lines`: invoice_id, delivery_order_line_id, description, quantity, unit_price_snapshot, discount, subtotal.
- `invoice_delivery_links`: invoice_id, delivery_order_id, amount_billed.
- `payments`: payment_number, customer_id, payment_date, method, amount, reference_no, status.
- `payment_allocations`: payment_id, invoice_id, allocated_amount.

### Tax configuration MVP-1

- `tax_codes`: code, name, tax_type, direction, base_type, rate_source, is_active.
- `tax_rates`: tax_code_id, rate, effective_date, expiry_date.
- `tax_rules`: code, name, customer_condition, is_active.
- `tax_rule_lines`: tax_rule_id, tax_code_id, sequence, mandatory.
- `withholding_certificates`: invoice_id, customer_id, tax_type, tax_base, tax_amount, certificate_number, received_date, status, attachment_id.

### Transport & claim MVP-1

- `transport_templates`: distance_range, tarif NUMERIC(18,2), effective_date, expiry_date nullable, created_by, approved_by, is_active.
- `transports`: transport_date, description, reference_type nullable (WO/PO/general), reference_id nullable, amount, transport_template_id nullable, created_by, approved_by.
- `customer_claims`: claim_number, customer_id, claim_date, description, item_id nullable, quantity nullable, item_value_per_unit nullable, claimed_amount, approved_amount nullable, status, resolution, approved_by nullable, attachment_id nullable, notes.
- `expense_categories`: code, name, is_active.

### Workers MVP-1

- `workers`: code, name, type (DAILY/MONTHLY), phone, address, join_date, branch_id, is_active.
- `worker_rates`: worker_id, customer_item_id nullable, rate_per_unit, effective_date, expiry_date nullable, approved_by.

### Opening data

- `opening_entries`: entity_type, entity_id, as_of_date, data JSONB, imported_by, notes. Digunakan untuk opening custody, stock, invoice outstanding, cash/bank.

## 4. Tabel MVP-2/MVP-3

Tabel berikut belum menjadi dependency MVP-1: `customer_pos`, `work_orders`, `work_order_lines`, `production_operations`, `material_consumptions` per WO, `production_qcs`, `rejects`, `reworks`, `daily_worker_outputs`, `labor_allocations`, `overhead_rules`, `supplier_invoices`, `supplier_invoice_lines`, `supplier_payments`, `accounts`, `journals`, `journal_lines`, `accounting_periods`, `accounting_event_mappings`, `wip_balances`, `job_costs`, `fixed_assets`, `depreciation_entries`, `report_jobs`, `scheduled_tasks`.

Tambahkan tabel ini melalui migration terpisah setelah MVP-1 dan setelah keputusan bisnis terkait disetujui. Jangan membuat 119 tabel aktif sebelum kebutuhan dan acceptance test tersedia.

## 5. Constraint wajib

```sql
CHECK (quantity_in >= 0 AND quantity_out >= 0);
CHECK (quantity_on_hand >= 0);
CHECK (balance_quantity >= 0);
CHECK (quantity_ok >= 0 AND quantity_rejected >= 0);
CHECK (rate >= 0 AND rate <= 1);
```

Domain service wajib memvalidasi:

- custody OUT tidak melebihi balance;
- material usage tidak melebihi stock;
- acceptance tidak melebihi quantity delivered;
- invoice quantity tidak melebihi quantity accepted;
- payment allocation tidak melebihi invoice outstanding;
- hanya satu request idempotency yang menghasilkan dokumen posted.

## 6. Index penting

```sql
UNIQUE (company_id, code) pada master code
UNIQUE (branch_id, document_type, document_number) pada dokumen
INDEX (customer_id, status, created_at)
INDEX (material_id, warehouse_id)
INDEX (reference_type, reference_id)
INDEX (movement_date)
INDEX (invoice_status, customer_id)
INDEX (created_at) pada audit_logs
```

## 7. Implementasi Laravel

Migration harus dibuat berurutan:

1. `companies`, `branches`, `users`, RBAC.
2. Master data.
3. Custody.
4. Material inventory.
5. Delivery and acceptance.
6. Billing and payment.
7. Tax configuration.
8. Audit, indexes, constraints, seed.

Seeder minimum: satu company, satu branch, Owner, Admin, UoM, sample tax code (rate configurable), status/reference constants. Jangan seed tarif pajak tanpa persetujuan pajak.
