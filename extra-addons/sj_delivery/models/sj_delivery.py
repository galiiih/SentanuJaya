from odoo import api, fields, models
from odoo.exceptions import UserError, ValidationError


class SjDelivery(models.Model):
    _name = "sj.delivery"
    _description = "Sentanu Jaya Outgoing Delivery Note"
    _order = "date_delivery desc, id desc"
    _inherit = ["mail.thread", "mail.activity.mixin"]

    name = fields.Char(default="New", copy=False, readonly=True, tracking=True)
    partner_id = fields.Many2one("res.partner", string="Customer", required=True, tracking=True)
    date_delivery = fields.Date(default=fields.Date.context_today, required=True)
    delivery_type = fields.Selection(
        [
            ("normal", "Normal Delivery"),
            ("redelivery", "Redelivery"),
        ],
        default="normal",
        required=True,
        tracking=True,
    )
    origin = fields.Char()
    line_ids = fields.One2many("sj.delivery.line", "delivery_id", string="Items")
    invoice_id = fields.Many2one(
        "account.move",
        domain=[("move_type", "=", "out_invoice")],
        string="Invoice",
        copy=False,
    )
    invoice_template_id = fields.Many2one(
        "sj.invoice.template",
        string="Invoice Template",
        help="Invoice print template. If empty, auto-selects based on tax profile.",
    )
    currency_id = fields.Many2one(
        "res.currency",
        default=lambda self: self.env.company.currency_id,
    )
    amount_total = fields.Monetary(
        string="Total Amount",
        compute="_compute_amount_total",
        store=True,
        currency_field="currency_id",
    )
    amount_untaxed = fields.Monetary(
        string="Untaxed Amount",
        compute="_compute_amount_total",
        store=True,
        currency_field="currency_id",
    )
    amount_ppn = fields.Monetary(
        string="PPN",
        compute="_compute_amount_total",
        store=True,
        currency_field="currency_id",
    )
    amount_pph = fields.Monetary(
        string="PPh",
        compute="_compute_amount_total",
        store=True,
        currency_field="currency_id",
    )
    amount_grand_total = fields.Monetary(
        string="Grand Total",
        compute="_compute_amount_total",
        store=True,
        currency_field="currency_id",
    )
    state = fields.Selection(
        [
            ("draft", "Draft"),
            ("ready", "Ready"),
            ("delivered", "Delivered"),
            ("invoiced", "Invoiced"),
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

    @api.depends("line_ids.price_subtotal", "partner_id.sj_tax_profile_id")
    def _compute_amount_total(self):
        for record in self:
            subtotal = sum(record.line_ids.mapped("price_subtotal"))
            total_service = sum(record.line_ids.mapped("total_service"))
            record.amount_total = subtotal
            record.amount_untaxed = subtotal

            # Calculate PPN and PPh based on tax profile
            tax_profile = record.partner_id.sj_tax_profile_id
            ppn = 0.0
            pph = 0.0
            if tax_profile:
                if tax_profile.use_ppn:
                    # PPN 11% dari Dasar Pengenaan Pajak (total harga jual)
                    ppn = subtotal * 0.11
                if tax_profile.use_pph:
                    # PPh 23 dari total jasa saja
                    pph_rate = tax_profile.pph_rate / 100.0 if tax_profile.pph_rate else 0.02
                    pph = total_service * pph_rate
            record.amount_ppn = ppn
            record.amount_pph = pph
            # Grand total = subtotal + PPN - PPh (PPh dipotong)
            record.amount_grand_total = subtotal + ppn - pph

    @api.model_create_multi
    def create(self, vals_list):
        for vals in vals_list:
            if vals.get("name", "New") == "New":
                sequence_code = "sj.redelivery" if vals.get("delivery_type") == "redelivery" else "sj.delivery"
                vals["name"] = self.env["ir.sequence"].next_by_code(sequence_code) or "New"
        return super().create(vals_list)

    def action_ready(self):
        for delivery in self:
            if not delivery.line_ids:
                raise UserError("Add at least one item before marking ready.")
        self.write({"state": "ready"})

    def action_delivered(self):
        self.write({"state": "delivered"})

    def action_create_invoice(self):
        """Create invoice automatically from SJ Keluar."""
        for delivery in self:
            if delivery.invoice_id:
                raise UserError("Invoice already exists for this delivery.")
            if not delivery.line_ids:
                raise UserError("Cannot create invoice without items.")

            invoice_lines = []
            for line in delivery.line_ids:
                invoice_lines.append(
                    (0, 0, {
                        "product_id": line.product_id.id if line.product_id else False,
                        "name": line.product_id.name if line.product_id else (line.note or "Service"),
                        "quantity": line.qty,
                        "price_unit": line.price_unit,
                    })
                )

            # Get tax profile from partner
            partner = delivery.partner_id
            tax_profile = partner.sj_tax_profile_id

            invoice_vals = {
                "move_type": "out_invoice",
                "partner_id": delivery.partner_id.id,
                "invoice_date": delivery.date_delivery,
                "invoice_origin": delivery.name,
                "invoice_line_ids": invoice_lines,
            }

            invoice = self.env["account.move"].create(invoice_vals)

            # Apply taxes from tax profile if available
            if tax_profile:
                tax_ids = []
                if tax_profile.use_ppn and tax_profile.ppn_tax_id:
                    tax_ids.append(tax_profile.ppn_tax_id.id)
                if tax_profile.use_pph and tax_profile.pph_tax_id:
                    tax_ids.append(tax_profile.pph_tax_id.id)
                if tax_ids:
                    invoice.invoice_line_ids.write({"tax_ids": [(6, 0, tax_ids)]})

            delivery.write({
                "invoice_id": invoice.id,
                "state": "invoiced",
            })

        return True

    def action_view_invoice(self):
        self.ensure_one()
        if self.invoice_id:
            return {
                "type": "ir.actions.act_window",
                "res_model": "account.move",
                "view_mode": "form",
                "res_id": self.invoice_id.id,
            }

    def action_invoiced(self):
        self.write({"state": "invoiced"})

    def action_cancel(self):
        self.write({"state": "cancel"})

    def action_reset_to_draft(self):
        self.write({"state": "draft"})

    def _get_invoice_template(self):
        """Determine the invoice template to use.
        Priority: delivery.invoice_template_id > partner.sj_invoice_template_id > auto-detect from tax profile.
        """
        self.ensure_one()
        template = self.invoice_template_id or self.partner_id.sj_invoice_template_id
        if template:
            return template

        # Auto-detect based on tax profile
        tax_profile = self.partner_id.sj_tax_profile_id
        code = "NON_TAX"
        if tax_profile:
            if tax_profile.use_ppn and tax_profile.use_pph:
                code = "PPN_PPH"
            elif tax_profile.use_ppn:
                code = "PPN_ONLY"
            elif tax_profile.use_pph:
                code = "PPH_ONLY"
        return self.env["sj.invoice.template"].search([("code", "=", code)], limit=1)

    def _sj_logo_b64(self):
        """Return the Sentanu Jaya logo as base64 string for embedding in reports."""
        import base64
        from odoo.modules.module import get_module_resource
        path = get_module_resource("sj_delivery", "static", "src", "img", "logo_sentanu.png")
        if path:
            try:
                with open(path, "rb") as f:
                    return base64.b64encode(f.read()).decode("ascii")
            except OSError:
                return ""
        return ""

    def _sj_amount_to_words(self):
        """Convert amount_grand_total to Indonesian words."""
        self.ensure_one()
        amount = int(round(self.amount_grand_total))
        if amount == 0:
            return "Nol Rupiah"

        units = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan']
        teens = ['Sepuluh', 'Sebelas', 'Dua Belas', 'Tiga Belas', 'Empat Belas',
                 'Lima Belas', 'Enam Belas', 'Tujuh Belas', 'Delapan Belas', 'Sembilan Belas']
        tens = ['', '', 'Dua Puluh', 'Tiga Puluh', 'Empat Puluh', 'Lima Puluh',
                'Enam Puluh', 'Tujuh Puluh', 'Delapan Puluh', 'Sembilan Puluh']

        def _convert_hundreds(n):
            result = ''
            if n >= 100:
                if n // 100 == 1:
                    result += 'Seratus '
                else:
                    result += units[n // 100] + ' Ratus '
                n %= 100
            if n >= 20:
                result += tens[n // 10] + ' '
                n %= 10
            if 10 <= n <= 19:
                result += teens[n - 10] + ' '
                n = 0
            if n > 0:
                result += units[n] + ' '
            return result.strip()

        def _convert(n):
            if n == 0:
                return ''
            parts = []
            scales = [
                (1_000_000_000_000, 'Triliun'),
                (1_000_000_000, 'Miliar'),
                (1_000_000, 'Juta'),
                (1_000, 'Ribu'),
                (1, ''),
            ]
            for scale, name in scales:
                if n >= scale:
                    count = n // scale
                    n %= scale
                    if scale == 1000 and count == 1:
                        parts.append('Seribu')
                    elif name:
                        parts.append(_convert_hundreds(count) + ' ' + name)
                    else:
                        parts.append(_convert_hundreds(count))
            return ' '.join(parts)

        return _convert(amount) + ' Rupiah'


class SjDeliveryLine(models.Model):
    _name = "sj.delivery.line"
    _description = "Sentanu Jaya Outgoing Delivery Note Line"
    _order = "delivery_id, id"

    delivery_id = fields.Many2one("sj.delivery", required=True, ondelete="cascade")
    partner_id = fields.Many2one(related="delivery_id.partner_id", store=True)
    batch_id = fields.Many2one("sj.production.batch", required=True)
    receiving_id = fields.Many2one(related="batch_id.receiving_id", store=True)
    product_id = fields.Many2one(related="batch_id.product_id", store=True)
    color_id = fields.Many2one(related="batch_id.color_id", store=True)
    service_id = fields.Many2one("sj.service", string="Service")
    qty = fields.Float(required=True, default=1.0)
    uom_id = fields.Many2one(related="batch_id.uom_id", store=True)
    currency_id = fields.Many2one(
        "res.currency",
        default=lambda self: self.env.company.currency_id,
    )
    price_unit = fields.Monetary(string="Unit Price", currency_field="currency_id")
    price_material_unit = fields.Monetary(
        string="Biaya Bahan",
        compute="_compute_price_split",
        store=True,
        currency_field="currency_id",
    )
    price_service_unit = fields.Monetary(
        string="Biaya Jasa",
        compute="_compute_price_split",
        store=True,
        currency_field="currency_id",
    )
    total_material = fields.Monetary(
        string="Total Bahan",
        compute="_compute_price_split",
        store=True,
        currency_field="currency_id",
    )
    total_service = fields.Monetary(
        string="Total Jasa",
        compute="_compute_price_split",
        store=True,
        currency_field="currency_id",
    )
    price_subtotal = fields.Monetary(
        string="Total Bahan + Jasa",
        compute="_compute_price_split",
        store=True,
        currency_field="currency_id",
    )
    note = fields.Char()

    @api.depends("qty", "price_unit")
    def _compute_price_split(self):
        for line in self:
            line.price_material_unit = line.price_unit * 0.90
            line.price_service_unit = line.price_unit * 0.10
            line.total_material = line.qty * line.price_material_unit
            line.total_service = line.qty * line.price_service_unit
            line.price_subtotal = line.total_material + line.total_service

    @api.onchange("batch_id")
    def _onchange_batch_id(self):
        if self.batch_id and not self.qty:
            self.qty = self.batch_id.qty

    @api.onchange("batch_id", "service_id")
    def _onchange_price_lookup(self):
        """Auto-fill price from customer pricelist."""
        if self.batch_id and self.delivery_id.partner_id:
            domain = [
                ("partner_id", "=", self.delivery_id.partner_id.id),
                ("product_id", "=", self.batch_id.product_id.id),
                ("color_id", "=", self.batch_id.color_id.id),
            ]
            if self.service_id:
                domain.append(("service_id", "=", self.service_id.id))
            pricelist = self.env["sj.customer.pricelist"].search(domain, limit=1)
            if pricelist:
                self.price_unit = pricelist.price_total

    @api.constrains("qty", "batch_id")
    def _check_delivery_qty(self):
        for line in self:
            if line.qty <= 0:
                raise ValidationError("Delivery quantity must be greater than zero.")
            if line.qty > line.batch_id.qty:
                raise ValidationError("Delivery quantity cannot exceed production batch quantity.")
            if line.delivery_id.delivery_type == "redelivery":
                continue
            domain = [
                ("batch_id", "=", line.batch_id.id),
                ("delivery_id.delivery_type", "=", "normal"),
            ]
            normal_delivered_qty = sum(self.search(domain).mapped("qty"))
            if normal_delivered_qty > line.batch_id.qty:
                raise ValidationError("Total delivered quantity cannot exceed production batch quantity.")
