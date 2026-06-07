from odoo import fields, models


class ResPartner(models.Model):
    _inherit = "res.partner"

    sj_invoice_template_id = fields.Many2one(
        "sj.invoice.template",
        string="Default Invoice Template",
        help="Default invoice template for this customer. Can be overridden per delivery.",
    )
