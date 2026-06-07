from odoo import fields, models


class SjService(models.Model):
    _name = "sj.service"
    _description = "Sentanu Jaya Service"
    _order = "sequence, name"

    sequence = fields.Integer(default=10)
    name = fields.Char(required=True)
    code = fields.Char()
    service_type = fields.Selection(
        [
            ("raw", "Raw Preparation"),
            ("paint", "Painting"),
            ("polish", "Polish / Finishing"),
            ("rework", "Rework"),
            ("other", "Other"),
        ],
        default="paint",
        required=True,
    )
    product_id = fields.Many2one("product.product", string="Related Product")
    active = fields.Boolean(default=True)
    note = fields.Text()
