from odoo import fields, models


class SjColor(models.Model):
    _name = "sj.color"
    _description = "Sentanu Jaya Color"
    _order = "name"

    name = fields.Char(required=True)
    code = fields.Char()
    active = fields.Boolean(default=True)
    note = fields.Text()
