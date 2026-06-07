from odoo import fields, models


class SjInvoiceTemplate(models.Model):
    _name = "sj.invoice.template"
    _description = "Sentanu Jaya Invoice Template"
    _order = "sequence, name"

    name = fields.Char(required=True, string="Template Name")
    code = fields.Char(required=True, string="Code", help="Unique code used to identify the QWeb template")
    sequence = fields.Integer(default=10)
    active = fields.Boolean(default=True)
    description = fields.Text(
        string="Description",
        help="Description of when this template should be used",
    )
    qweb_template = fields.Char(
        string="QWeb Template ID",
        required=True,
        help="Full XML ID of the QWeb template, e.g. sj_delivery.report_invoice_ppn_pph",
    )
    sample_image = fields.Binary(string="Sample Image", attachment=True)
    note = fields.Text()
