from odoo import models, fields

class ResPartner(models.Model):
    _inherit = 'res.partner'

    npwp = fields.Char(string='NPWP')
    default_ppn = fields.Boolean(string='Default PPN', default=False)
    default_pph = fields.Boolean(string='Default PPh', default=False)
    pph_rate = fields.Float(string='PPh Rate (%)')