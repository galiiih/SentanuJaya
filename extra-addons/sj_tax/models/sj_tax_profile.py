from odoo import fields, models


class SjTaxProfile(models.Model):
    _name = "sj.tax.profile"
    _description = "Sentanu Jaya Tax Profile"
    _order = "sequence, code"

    sequence = fields.Integer(default=10)
    name = fields.Char(required=True)
    code = fields.Char(required=True)
    active = fields.Boolean(default=True)
    use_ppn = fields.Boolean(string="Use PPN")
    use_pph = fields.Boolean(string="Use PPh")
    ppn_tax_id = fields.Many2one(
        "account.tax",
        string="PPN Tax",
        domain=[("type_tax_use", "=", "sale")],
    )
    pph_tax_id = fields.Many2one(
        "account.tax",
        string="PPh Tax",
        domain=[("type_tax_use", "=", "sale")],
    )
    pph_rate = fields.Float(string="PPh Rate (%)")
    note = fields.Text()
