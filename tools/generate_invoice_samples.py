# Generate sample invoice PDFs for all template scenarios
# Run inside odoo shell. Creates dummy data, renders PDFs, then rolls back.
import base64
import os

OUT_DIR = "/mnt/extra-addons/_invoice_samples"
os.makedirs(OUT_DIR, exist_ok=True)

def get_or_create_tax(name, amount, tax_use="sale"):
    tax = env["account.tax"].search([("name", "=", name)], limit=1)
    if not tax:
        tax = env["account.tax"].create({
            "name": name,
            "amount": amount,
            "amount_type": "percent",
            "type_tax_use": tax_use,
        })
    return tax

ppn_tax = get_or_create_tax("PPN 11% (sample)", 11.0)
pph_tax = get_or_create_tax("PPh 23 (sample)", -2.0)

# Tax profiles
def get_profile(code, **vals):
    p = env["sj.tax.profile"].search([("code", "=", code)], limit=1)
    if not p:
        p = env["sj.tax.profile"].create({"name": vals.get("name", code), "code": code, **vals})
    else:
        p.write(vals)
    return p

prof_both = get_profile("SAMPLE_BOTH", name="Sample PPN+PPh", use_ppn=True, use_pph=True,
                        ppn_tax_id=ppn_tax.id, pph_tax_id=pph_tax.id, pph_rate=2.0)
prof_ppn = get_profile("SAMPLE_PPN", name="Sample PPN", use_ppn=True, use_pph=False,
                       ppn_tax_id=ppn_tax.id, pph_rate=0.0)
prof_pph = get_profile("SAMPLE_PPH", name="Sample PPh", use_ppn=False, use_pph=True,
                       pph_tax_id=pph_tax.id, pph_rate=2.0)
prof_non = get_profile("SAMPLE_NON", name="Sample Non Tax", use_ppn=False, use_pph=False)

# Product
product = env["product.product"].search([("name", "=", "Sample Roof Garnish")], limit=1)
if not product:
    product = env["product.product"].create({"name": "Sample Roof Garnish", "list_price": 150000})

color = env["sj.color"].search([], limit=1) or env["sj.color"].create({"name": "White"})

def build_delivery(profile, label):
    # Customer
    partner = env["res.partner"].create({
        "name": f"Sample Customer {label}",
        "city": "Jakarta",
        "sj_tax_profile_id": profile.id,
    })
    # Receiving + line + batch chain
    receiving = env["sj.receiving"].create({"partner_id": partner.id})
    rline = env["sj.receiving.line"].create({
        "receiving_id": receiving.id, "product_id": product.id,
        "color_id": color.id, "qty": 20,
    })
    batch = env["sj.production.batch"].create({
        "receiving_line_id": rline.id, "qty": 20,
    })
    delivery = env["sj.delivery"].create({
        "partner_id": partner.id,
        "line_ids": [(0, 0, {
            "batch_id": batch.id, "qty": 20, "price_unit": 187500,
            "note": "",
        })],
    })
    return delivery

report = env.ref("sj_delivery.action_report_sj_invoice")

scenarios = [
    (prof_both, "PPN_PPH"),
    (prof_ppn, "PPN_ONLY"),
    (prof_pph, "PPH_ONLY"),
    (prof_non, "NON_TAX"),
]

for profile, label in scenarios:
    delivery = build_delivery(profile, label)
    delivery._compute_amount_total()
    print(f"\n[{label}] {delivery.name} | total={delivery.amount_total:,.0f} "
          f"ppn={delivery.amount_ppn:,.0f} pph={delivery.amount_pph:,.0f} "
          f"grand={delivery.amount_grand_total:,.0f} | template={delivery._get_invoice_template().name}")
    pdf_content, _ = report._render_qweb_pdf("sj_delivery.report_sj_invoice_document", [delivery.id])
    path = os.path.join(OUT_DIR, f"invoice_{label}.pdf")
    with open(path, "wb") as f:
        f.write(pdf_content)
    print(f"  -> saved {path}")

# Also kwitansi sample
kw_report = env.ref("sj_delivery.action_report_sj_kwitansi")
delivery = build_delivery(prof_non, "KWITANSI")
delivery._compute_amount_total()
pdf_content, _ = kw_report._render_qweb_pdf("sj_delivery.report_sj_kwitansi_document", [delivery.id])
with open(os.path.join(OUT_DIR, "kwitansi.pdf"), "wb") as f:
    f.write(pdf_content)
print(f"\n  -> saved kwitansi.pdf")

print("\n=== PDF samples generated. Rolling back dummy data. ===")
env.cr.rollback()
