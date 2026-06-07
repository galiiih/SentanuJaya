from odoo import api, fields, models


class SjCustomerPricelist(models.Model):
    _name = "sj.customer.pricelist"
    _description = "Sentanu Jaya Customer Pricelist"
    _order = "partner_id, product_id, color_id, service_id"

    partner_id = fields.Many2one("res.partner", required=True, string="Customer")
    product_id = fields.Many2one("product.product", required=True, string="Item")
    color_id = fields.Many2one("sj.color")
    service_id = fields.Many2one("sj.service")
    currency_id = fields.Many2one(
        "res.currency",
        default=lambda self: self.env.company.currency_id,
        required=True,
    )
    price_total = fields.Monetary(string="Selling Price", required=True)
    price_service = fields.Monetary(
        string="Service Price",
        compute="_compute_price_split",
        store=True,
    )
    price_material = fields.Monetary(
        string="Material Price",
        compute="_compute_price_split",
        store=True,
    )
    active = fields.Boolean(default=True)
    note = fields.Text()

    @api.depends("price_total")
    def _compute_price_split(self):
        for record in self:
            record.price_service = record.price_total * 0.10
            record.price_material = record.price_total * 0.90
