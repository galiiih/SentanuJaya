#!/usr/bin/env python3
"""Smoke test run inside Odoo shell."""

# 1. Verify module states
print("\n=== Module States ===")
mod_names = ['sj_security', 'sj_tax', 'sj_workshop_master', 'sj_receiving', 'sj_production', 'sj_delivery', 'sj_claim']
mods = env['ir.module.module'].search([('name', 'in', mod_names)])
for m in mods:
    print(f"  {m.name}: {m.state}")
    assert m.state == 'installed', f"Module {m.name} not installed!"

# 2. Verify security groups
print("\n=== Security Groups ===")
groups = env['res.groups'].search([('category_id.name', '=', 'Sentanu Jaya')])
for g in groups:
    print(f"  {g.full_name}")
assert len(groups) == 4, f"Expected 4 groups, got {len(groups)}"

# 3. Verify reports
print("\n=== Reports ===")
reports = env['ir.actions.report'].search([('report_name', 'like', 'sj_')])
for r in reports:
    print(f"  {r.name} ({r.model}) -> {r.report_name}")
assert len(reports) >= 3, f"Expected at least 3 reports, got {len(reports)}"

# 4. Verify new fields
print("\n=== New Fields ===")
delivery_fields = env['sj.delivery']._fields
for fname in ['amount_total', 'currency_id']:
    assert fname in delivery_fields, f"Field {fname} missing"
    print(f"  sj.delivery.{fname}: OK")

line_fields = env['sj.delivery.line']._fields
for fname in ['service_id', 'price_unit', 'price_subtotal']:
    assert fname in line_fields, f"Field {fname} missing"
    print(f"  sj.delivery.line.{fname}: OK")

receiving_fields = env['sj.receiving']._fields
assert 'batch_count' in receiving_fields, "batch_count missing"
print(f"  sj.receiving.batch_count: OK")

batch_fields = env['sj.production.batch']._fields
assert 'delivery_count' in batch_fields, "delivery_count missing"
print(f"  sj.production.batch.delivery_count: OK")

print("\n=== ALL SMOKE TESTS PASSED ===")
