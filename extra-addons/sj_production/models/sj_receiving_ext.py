from odoo import api, fields, models


class SjReceiving(models.Model):
    _inherit = "sj.receiving"

    batch_count = fields.Integer(compute="_compute_batch_count")

    def _compute_batch_count(self):
        for record in self:
            record.batch_count = self.env["sj.production.batch"].search_count(
                [("receiving_id", "=", record.id)]
            )

    def action_view_production_batches(self):
        self.ensure_one()
        return {
            "type": "ir.actions.act_window",
            "name": "Production Batches",
            "res_model": "sj.production.batch",
            "view_mode": "tree,form",
            "domain": [("receiving_id", "=", self.id)],
            "context": {"default_receiving_id": self.id},
        }
