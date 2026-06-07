from odoo import fields, models


class SjClaimReason(models.Model):
    _name = "sj.claim.reason"
    _description = "Sentanu Jaya Claim Reason"
    _order = "name"

    name = fields.Char(required=True)
    code = fields.Char()
    active = fields.Boolean(default=True)
    note = fields.Text()
