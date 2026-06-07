from odoo import api, fields, models


class SjProductionBatch(models.Model):
    _inherit = "sj.production.batch"

    delivery_count = fields.Integer(compute="_compute_delivery_count")

    def _compute_delivery_count(self):
        for record in self:
            record.delivery_count = self.env["sj.delivery.line"].search_count(
                [("batch_id", "=", record.id)]
            )

    def action_view_deliveries(self):
        self.ensure_one()
        delivery_lines = self.env["sj.delivery.line"].search([("batch_id", "=", self.id)])
        delivery_ids = delivery_lines.mapped("delivery_id").ids
        return {
            "type": "ir.actions.act_window",
            "name": "Deliveries",
            "res_model": "sj.delivery",
            "view_mode": "tree,form",
            "domain": [("id", "in", delivery_ids)],
        }
