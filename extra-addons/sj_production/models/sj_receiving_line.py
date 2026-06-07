from odoo import fields, models


class SjReceivingLine(models.Model):
    _inherit = "sj.receiving.line"

    production_batch_ids = fields.One2many(
        "sj.production.batch",
        "receiving_line_id",
        string="Production Batches",
    )
