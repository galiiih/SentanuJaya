from odoo import api, fields, models
from odoo.exceptions import ValidationError


class SjProductionBatch(models.Model):
    _name = "sj.production.batch"
    _description = "Sentanu Jaya Production Batch"
    _order = "id desc"
    _inherit = ["mail.thread", "mail.activity.mixin"]

    name = fields.Char(default="New", copy=False, readonly=True, tracking=True)
    receiving_line_id = fields.Many2one(
        "sj.receiving.line",
        string="SJ Masuk Line",
        required=True,
        tracking=True,
    )
    receiving_id = fields.Many2one(related="receiving_line_id.receiving_id", store=True)
    partner_id = fields.Many2one(related="receiving_line_id.partner_id", store=True)
    product_id = fields.Many2one(related="receiving_line_id.product_id", store=True)
    color_id = fields.Many2one(related="receiving_line_id.color_id", store=True)
    qty = fields.Float(required=True, default=1.0, tracking=True)
    uom_id = fields.Many2one(related="receiving_line_id.uom_id", store=True)
    state = fields.Selection(
        [
            ("draft", "Draft"),
            ("raw", "Raw Preparation"),
            ("paint", "Painting"),
            ("polish", "Polish / Finishing"),
            ("qc_pass", "QC Passed"),
            ("qc_fail", "QC Failed"),
            ("done", "Done"),
            ("cancel", "Cancelled"),
        ],
        default="draft",
        tracking=True,
        required=True,
    )
    work_order_ids = fields.One2many("sj.work.order", "batch_id")
    final_qc_ids = fields.One2many("sj.final.qc", "batch_id")
    internal_rework_ids = fields.One2many("sj.internal.rework", "batch_id")
    wo_count = fields.Integer(compute="_compute_wo_count")
    note = fields.Text()

    @api.depends("work_order_ids")
    def _compute_wo_count(self):
        for record in self:
            record.wo_count = len(record.work_order_ids)

    def action_view_work_orders(self):
        self.ensure_one()
        return {
            "type": "ir.actions.act_window",
            "name": "Work Orders",
            "res_model": "sj.work.order",
            "view_mode": "tree,form",
            "domain": [("batch_id", "=", self.id)],
        }

    def action_mark_done(self):
        self.write({"state": "done"})

    @api.model_create_multi
    def create(self, vals_list):
        for vals in vals_list:
            if vals.get("name", "New") == "New":
                vals["name"] = self.env["ir.sequence"].next_by_code("sj.production.batch") or "New"
        return super().create(vals_list)

    @api.constrains("qty", "receiving_line_id")
    def _check_batch_qty(self):
        for batch in self:
            if batch.qty <= 0:
                raise ValidationError("Batch quantity must be greater than zero.")
            domain = [("receiving_line_id", "=", batch.receiving_line_id.id)]
            batches = self.search(domain)
            total_qty = sum(batches.mapped("qty"))
            if total_qty > batch.receiving_line_id.qty:
                raise ValidationError("Total batch quantity cannot exceed SJ Masuk line quantity.")

    def action_create_default_work_orders(self):
        work_order_model = self.env["sj.work.order"]
        for batch in self:
            existing_types = set(batch.work_order_ids.mapped("wo_type"))
            for wo_type in ("raw", "paint", "polish"):
                if wo_type not in existing_types:
                    work_order_model.create({"batch_id": batch.id, "wo_type": wo_type})

    def action_cancel(self):
        self.write({"state": "cancel"})


class SjWorkOrder(models.Model):
    _name = "sj.work.order"
    _description = "Sentanu Jaya Work Order"
    _order = "id desc"
    _inherit = ["mail.thread", "mail.activity.mixin"]

    name = fields.Char(default="New", copy=False, readonly=True, tracking=True)
    batch_id = fields.Many2one("sj.production.batch", required=True, ondelete="cascade")
    receiving_id = fields.Many2one(related="batch_id.receiving_id", store=True)
    partner_id = fields.Many2one(related="batch_id.partner_id", store=True)
    product_id = fields.Many2one(related="batch_id.product_id", store=True)
    color_id = fields.Many2one(related="batch_id.color_id", store=True)
    qty = fields.Float(related="batch_id.qty", store=True)
    uom_id = fields.Many2one(related="batch_id.uom_id", store=True)
    wo_type = fields.Selection(
        [
            ("raw", "WO Raw"),
            ("paint", "WO Paint"),
            ("polish", "WO Polish"),
            ("rework", "WO Rework"),
        ],
        required=True,
        tracking=True,
    )
    pic_id = fields.Many2one("hr.employee", string="PIC", tracking=True)
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
    start_date = fields.Datetime()
    finish_date = fields.Datetime()
    material_ids = fields.One2many("sj.material.consumption", "work_order_id")
    operation_notes = fields.Text()

    @api.model_create_multi
    def create(self, vals_list):
        for vals in vals_list:
            if vals.get("name", "New") == "New":
                vals["name"] = self.env["ir.sequence"].next_by_code("sj.work.order") or "New"
        return super().create(vals_list)

    def action_start(self):
        for wo in self:
            vals = {"state": "in_progress"}
            if not wo.start_date:
                vals["start_date"] = fields.Datetime.now()
            wo.write(vals)
            state_map = {"raw": "raw", "paint": "paint", "polish": "polish", "rework": "paint"}
            wo.batch_id.state = state_map.get(wo.wo_type, wo.batch_id.state)

    def action_done(self):
        for wo in self:
            vals = {"state": "done"}
            if not wo.finish_date:
                vals["finish_date"] = fields.Datetime.now()
            wo.write(vals)

    def action_cancel(self):
        self.write({"state": "cancel"})


class SjMaterialConsumption(models.Model):
    _name = "sj.material.consumption"
    _description = "Sentanu Jaya Material Consumption"
    _order = "date desc, id desc"

    work_order_id = fields.Many2one("sj.work.order", required=True, ondelete="cascade")
    date = fields.Date(default=fields.Date.context_today, required=True)
    product_id = fields.Many2one("product.product", string="Material", required=True)
    qty = fields.Float(required=True, default=1.0)
    uom_id = fields.Many2one(
        "uom.uom",
        default=lambda self: self.env.ref("uom.product_uom_unit", raise_if_not_found=False),
    )
    note = fields.Char()

    @api.constrains("qty")
    def _check_qty_positive(self):
        for line in self:
            if line.qty <= 0:
                raise ValidationError("Material quantity must be greater than zero.")


class SjFinalQc(models.Model):
    _name = "sj.final.qc"
    _description = "Sentanu Jaya Final QC"
    _order = "date desc, id desc"

    batch_id = fields.Many2one("sj.production.batch", required=True, ondelete="cascade")
    date = fields.Date(default=fields.Date.context_today, required=True)
    checked_by_id = fields.Many2one("hr.employee", string="Checked By")
    result = fields.Selection(
        [
            ("pass", "Pass"),
            ("fail", "Fail"),
        ],
        required=True,
        default="pass",
    )
    defect_id = fields.Many2one(
        "sj.defect",
        domain=[("defect_type", "in", ["final", "internal", "other"])],
    )
    note = fields.Text()

    def action_apply_result(self):
        for qc in self:
            qc.batch_id.state = "qc_pass" if qc.result == "pass" else "qc_fail"


class SjInternalRework(models.Model):
    _name = "sj.internal.rework"
    _description = "Sentanu Jaya Internal Rework"
    _order = "id desc"
    _inherit = ["mail.thread", "mail.activity.mixin"]

    name = fields.Char(default="New", copy=False, readonly=True, tracking=True)
    batch_id = fields.Many2one("sj.production.batch", required=True, tracking=True)
    source_qc_id = fields.Many2one("sj.final.qc", string="Source Final QC")
    target_wo_type = fields.Selection(
        [
            ("paint", "WO Paint"),
            ("polish", "WO Polish"),
        ],
        default="paint",
        required=True,
    )
    reason_id = fields.Many2one(
        "sj.defect",
        domain=[("defect_type", "in", ["internal", "final", "other"])],
    )
    work_order_id = fields.Many2one("sj.work.order", readonly=True)
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
                vals["name"] = self.env["ir.sequence"].next_by_code("sj.internal.rework") or "New"
        return super().create(vals_list)

    def action_start(self):
        for rework in self:
            if not rework.work_order_id:
                rework.work_order_id = self.env["sj.work.order"].create(
                    {
                        "batch_id": rework.batch_id.id,
                        "wo_type": rework.target_wo_type,
                        "operation_notes": rework.note,
                    }
                )
            rework.write({"state": "in_progress"})
            rework.work_order_id.action_start()

    def action_done(self):
        for rework in self:
            rework.write({"state": "done"})
            if rework.work_order_id:
                rework.work_order_id.action_done()

    def action_cancel(self):
        self.write({"state": "cancel"})
