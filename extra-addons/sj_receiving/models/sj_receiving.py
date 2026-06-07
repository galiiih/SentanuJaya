from odoo import api, fields, models
from odoo.exceptions import UserError, ValidationError


class SjReceiving(models.Model):
    _name = "sj.receiving"
    _description = "Sentanu Jaya Incoming Delivery Note"
    _order = "date_received desc, id desc"
    _inherit = ["mail.thread", "mail.activity.mixin"]

    name = fields.Char(default="New", copy=False, readonly=True, tracking=True)
    customer_sj_number = fields.Char(string="Customer SJ Number", tracking=True)
    partner_id = fields.Many2one(
        "res.partner",
        string="Customer",
        required=True,
        tracking=True,
    )
    date_received = fields.Date(default=fields.Date.context_today, required=True)
    line_ids = fields.One2many("sj.receiving.line", "receiving_id", string="Items")
    state = fields.Selection(
        [
            ("draft", "Draft"),
            ("received", "Received"),
            ("qc_pass", "QC Passed"),
            ("qc_reject", "QC Rejected"),
            ("returned", "Returned"),
            ("cancel", "Cancelled"),
        ],
        default="draft",
        tracking=True,
        required=True,
    )
    note = fields.Text()
    line_count = fields.Integer(compute="_compute_line_count")

    @api.depends("line_ids")
    def _compute_line_count(self):
        for record in self:
            record.line_count = len(record.line_ids)

    @api.model_create_multi
    def create(self, vals_list):
        for vals in vals_list:
            if vals.get("name", "New") == "New":
                vals["name"] = self.env["ir.sequence"].next_by_code("sj.receiving") or "New"
        return super().create(vals_list)

    def action_receive(self):
        self.write({"state": "received"})

    def action_qc_pass(self):
        for record in self:
            if not record.line_ids:
                raise UserError("Add at least one item before passing QC.")
            record.line_ids.write({"qc_state": "pass"})
        self.write({"state": "qc_pass"})

    def action_qc_reject(self):
        for record in self:
            if not record.line_ids:
                raise UserError("Add at least one item before rejecting QC.")
        self.write({"state": "qc_reject"})

    def action_return(self):
        self.write({"state": "returned"})

    def action_cancel(self):
        self.write({"state": "cancel"})

    def action_reset_to_draft(self):
        self.write({"state": "draft"})


class SjReceivingLine(models.Model):
    _name = "sj.receiving.line"
    _description = "Sentanu Jaya Incoming Delivery Note Line"
    _order = "receiving_id, id"

    receiving_id = fields.Many2one(
        "sj.receiving",
        required=True,
        ondelete="cascade",
    )
    partner_id = fields.Many2one(related="receiving_id.partner_id", store=True)
    product_id = fields.Many2one("product.product", string="Item", required=True)
    item_description = fields.Char()
    color_id = fields.Many2one("sj.color")
    qty = fields.Float(required=True, default=1.0)
    uom_id = fields.Many2one(
        "uom.uom",
        string="UoM",
        default=lambda self: self.env.ref("uom.product_uom_unit", raise_if_not_found=False),
    )
    qc_state = fields.Selection(
        [
            ("pending", "Pending"),
            ("pass", "Pass"),
            ("reject", "Reject"),
        ],
        default="pending",
        required=True,
    )
    reject_reason_id = fields.Many2one(
        "sj.defect",
        domain=[("defect_type", "in", ["incoming", "other"])],
    )
    qc_note = fields.Text()
    @api.constrains("qty")
    def _check_qty_positive(self):
        for line in self:
            if line.qty <= 0:
                raise ValidationError("Quantity must be greater than zero.")
