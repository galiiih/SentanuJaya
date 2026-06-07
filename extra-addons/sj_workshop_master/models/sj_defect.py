from odoo import fields, models


class SjDefect(models.Model):
    _name = "sj.defect"
    _description = "Sentanu Jaya Defect"
    _order = "name"

    name = fields.Char(required=True)
    code = fields.Char()
    defect_type = fields.Selection(
        [
            ("incoming", "Incoming QC"),
            ("final", "Final QC"),
            ("claim", "Customer Claim"),
            ("internal", "Internal Rework"),
            ("other", "Other"),
        ],
        default="final",
        required=True,
    )
    active = fields.Boolean(default=True)
    note = fields.Text()
