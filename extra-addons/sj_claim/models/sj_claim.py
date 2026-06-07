from odoo import api, fields, models
from odoo.exceptions import UserError, ValidationError


class SjCustomerClaim(models.Model):
    _name = "sj.customer.claim"
    _description = "Sentanu Jaya Customer Claim"
    _order = "date_claim desc, id desc"
    _inherit = ["mail.thread", "mail.activity.mixin"]

    name = fields.Char(default="New", copy=False, readonly=True, tracking=True)
    delivery_id = fields.Many2one("sj.delivery", string="Source SJ Keluar", required=True, tracking=True)
    partner_id = fields.Many2one(related="delivery_id.partner_id", store=True)
    date_claim = fields.Date(default=fields.Date.context_today, required=True)
    reason_id = fields.Many2one("sj.claim.reason", string="Claim Reason")
    state = fields.Selection(
        [
            ("draft", "Draft"),
            ("review", "Review"),
            ("invalid", "Invalid"),
            ("valid", "Valid"),
            ("returned", "Returned"),
            ("rework", "Rework"),
            ("done", "Done"),
            ("closed", "Closed"),
        ],
        default="draft",
        tracking=True,
        required=True,
    )
    line_ids = fields.One2many("sj.customer.claim.line", "claim_id", string="Claim Items")
    rework_ids = fields.One2many("sj.claim.rework", "claim_id")
    rework_count = fields.Integer(compute="_compute_rework_count")
    description = fields.Text()
    review_note = fields.Text()

    @api.depends("rework_ids")
    def _compute_rework_count(self):
        for record in self:
            record.rework_count = len(record.rework_ids)

    def action_view_reworks(self):
        self.ensure_one()
        return {
            "type": "ir.actions.act_window",
            "name": "Claim Reworks",
            "res_model": "sj.claim.rework",
            "view_mode": "tree,form",
            "domain": [("claim_id", "=", self.id)],
        }

    @api.model_create_multi
    def create(self, vals_list):
        for vals in vals_list:
            if vals.get("name", "New") == "New":
                vals["name"] = self.env["ir.sequence"].next_by_code("sj.customer.claim") or "New"
        return super().create(vals_list)

    def action_review(self):
        self.write({"state": "review"})

    def action_mark_invalid(self):
        self.write({"state": "invalid"})

    def action_mark_valid(self):
        for claim in self:
            if not claim.line_ids:
                raise UserError("Add at least one claim item before marking valid.")
        self.write({"state": "valid"})

    def action_customer_return(self):
        self.write({"state": "returned"})

    def action_create_rework(self):
        rework_model = self.env["sj.claim.rework"]
        for claim in self:
            if not claim.line_ids:
                raise UserError("Add claim items before creating rework.")
            rework_model.create({"claim_id": claim.id})
            claim.state = "rework"

    def action_done(self):
        self.write({"state": "done"})

    def action_close(self):
        self.write({"state": "closed"})


class SjCustomerClaimLine(models.Model):
    _name = "sj.customer.claim.line"
    _description = "Sentanu Jaya Customer Claim Line"
    _order = "claim_id, id"

    claim_id = fields.Many2one("sj.customer.claim", required=True, ondelete="cascade")
    delivery_line_id = fields.Many2one(
        "sj.delivery.line",
        required=True,
    )
    batch_id = fields.Many2one(related="delivery_line_id.batch_id", store=True)
    product_id = fields.Many2one(related="delivery_line_id.product_id", store=True)
    color_id = fields.Many2one(related="delivery_line_id.color_id", store=True)
    qty = fields.Float(required=True, default=1.0)
    uom_id = fields.Many2one(related="delivery_line_id.uom_id", store=True)
    defect_id = fields.Many2one(
        "sj.defect",
        domain=[("defect_type", "in", ["claim", "final", "other"])],
    )
    note = fields.Char()

    @api.constrains("qty", "delivery_line_id")
    def _check_claim_qty(self):
        for line in self:
            if line.qty <= 0:
                raise ValidationError("Claim quantity must be greater than zero.")
            if line.delivery_line_id and line.qty > line.delivery_line_id.qty:
                raise ValidationError("Claim quantity cannot exceed delivered quantity.")


class SjClaimRework(models.Model):
    _name = "sj.claim.rework"
    _description = "Sentanu Jaya Claim Rework"
    _order = "id desc"
    _inherit = ["mail.thread", "mail.activity.mixin"]

    name = fields.Char(default="New", copy=False, readonly=True, tracking=True)
    claim_id = fields.Many2one("sj.customer.claim", required=True, ondelete="cascade", tracking=True)
    partner_id = fields.Many2one(related="claim_id.partner_id", store=True)
    delivery_id = fields.Many2one(related="claim_id.delivery_id", string="Source SJ Keluar", store=True)
    work_order_ids = fields.Many2many(
        "sj.work.order",
        "sj_claim_rework_work_order_rel",
        "claim_rework_id",
        "work_order_id",
        string="Rework Work Orders",
    )
    redelivery_id = fields.Many2one("sj.delivery", string="Redelivery SJ")
    state = fields.Selection(
        [
            ("draft", "Draft"),
            ("in_progress", "In Progress"),
            ("done", "Done"),
            ("cancel", "Cancelled"),
        ],
        default="draft",
        tracking=True,
        required=True,
    )
    note = fields.Text()

    @api.model_create_multi
    def create(self, vals_list):
        for vals in vals_list:
            if vals.get("name", "New") == "New":
                vals["name"] = self.env["ir.sequence"].next_by_code("sj.claim.rework") or "New"
        return super().create(vals_list)

    def action_start(self):
        work_order_model = self.env["sj.work.order"]
        for rework in self:
            created_work_orders = self.env["sj.work.order"]
            existing_batches = set(rework.work_order_ids.mapped("batch_id").ids)
            for line in rework.claim_id.line_ids:
                if line.batch_id.id in existing_batches:
                    continue
                created_work_orders |= work_order_model.create(
                    {
                        "batch_id": line.batch_id.id,
                        "wo_type": "rework",
                        "operation_notes": line.note or rework.note,
                    }
                )
            if created_work_orders:
                rework.work_order_ids = [(4, wo.id) for wo in created_work_orders]
                created_work_orders.action_start()
            rework.state = "in_progress"

    def action_done(self):
        for rework in self:
            rework.work_order_ids.action_done()
            rework.state = "done"
            rework.claim_id.state = "done"

    def action_create_redelivery(self):
        delivery_model = self.env["sj.delivery"]
        for rework in self:
            if rework.redelivery_id:
                continue
            if not rework.claim_id.line_ids:
                raise UserError("Add claim items before creating redelivery.")
            line_commands = []
            for claim_line in rework.claim_id.line_ids:
                line_commands.append(
                    (
                        0,
                        0,
                        {
                            "batch_id": claim_line.batch_id.id,
                            "qty": claim_line.qty,
                            "note": claim_line.note,
                        },
                    )
                )
            rework.redelivery_id = delivery_model.create(
                {
                    "partner_id": rework.partner_id.id,
                    "delivery_type": "redelivery",
                    "origin": rework.claim_id.name,
                    "line_ids": line_commands,
                }
            )

    def action_cancel(self):
        self.write({"state": "cancel"})

    def action_view_redelivery(self):
        self.ensure_one()
        if self.redelivery_id:
            return {
                "type": "ir.actions.act_window",
                "res_model": "sj.delivery",
                "view_mode": "form",
                "res_id": self.redelivery_id.id,
            }
