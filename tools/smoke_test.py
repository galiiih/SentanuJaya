#!/usr/bin/env python3
"""Smoke test for Sentanu Jaya modules after update."""
import xmlrpc.client

url = "http://localhost:8069"
db = "SentanuJaya"
username = "admin"
password = "admin"

common = xmlrpc.client.ServerProxy(f"{url}/xmlrpc/2/common")
uid = common.authenticate(db, username, password, {})
if not uid:
    print("ERROR: Authentication failed")
    exit(1)
print(f"Authenticated as uid={uid}")

models = xmlrpc.client.ServerProxy(f"{url}/xmlrpc/2/object")

def execute(model, method, *args, **kwargs):
    return models.execute_kw(db, uid, password, model, method, list(args), kwargs)

# 1. Verify module states
print("\n=== Module States ===")
mod_names = ['sj_security', 'sj_tax', 'sj_workshop_master', 'sj_receiving', 'sj_production', 'sj_delivery', 'sj_claim']
mods = execute('ir.module.module', 'search_read', [('name', 'in', mod_names)], fields=['name', 'state'])
for m in mods:
    print(f"  {m['name']}: {m['state']}")
    assert m['state'] == 'installed', f"Module {m['name']} not installed!"

# 2. Verify security groups
print("\n=== Security Groups ===")
groups = execute('res.groups', 'search_read', [('category_id.name', '=', 'Sentanu Jaya')], fields=['name', 'full_name'])
for g in groups:
    print(f"  {g['full_name']}")
assert len(groups) == 4, f"Expected 4 groups, got {len(groups)}"

# 3. Verify reports
print("\n=== Reports ===")
reports = execute('ir.actions.report', 'search_read', [('report_name', 'like', 'sj_')], fields=['name', 'report_name', 'model'])
for r in reports:
    print(f"  {r['name']} ({r['model']}) -> {r['report_name']}")
assert len(reports) >= 3, f"Expected at least 3 reports, got {len(reports)}"

# 4. Verify new fields on delivery
print("\n=== Delivery Model Fields ===")
fields_info = execute('sj.delivery', 'fields_get', [], attributes=['string', 'type'])
for fname in ['amount_total', 'currency_id']:
    assert fname in fields_info, f"Field {fname} missing from sj.delivery"
    print(f"  {fname}: {fields_info[fname]['string']} ({fields_info[fname]['type']})")

# 5. Verify new fields on delivery line
fields_info = execute('sj.delivery.line', 'fields_get', [], attributes=['string', 'type'])
for fname in ['service_id', 'price_unit', 'price_subtotal']:
    assert fname in fields_info, f"Field {fname} missing from sj.delivery.line"
    print(f"  {fname}: {fields_info[fname]['string']} ({fields_info[fname]['type']})")

# 6. Verify batch_count on sj.receiving
fields_info = execute('sj.receiving', 'fields_get', [], attributes=['string', 'type'])
assert 'batch_count' in fields_info, "batch_count missing from sj.receiving"
print(f"\n  sj.receiving.batch_count: {fields_info['batch_count']['string']}")

# 7. Verify delivery_count on sj.production.batch
fields_info = execute('sj.production.batch', 'fields_get', [], attributes=['string', 'type'])
assert 'delivery_count' in fields_info, "delivery_count missing from sj.production.batch"
print(f"  sj.production.batch.delivery_count: {fields_info['delivery_count']['string']}")

print("\n=== ALL SMOKE TESTS PASSED ===")
