from odoo import api, fields, models


class ResPartner(models.Model):
    _inherit = "res.partner"

    sj_tax_profile_id = fields.Many2one("sj.tax.profile", string="Tax Profile")

    def _sync_sj_tax_profile(self):
        for partner in self:
            profile = partner.sj_tax_profile_id
            partner.default_ppn = bool(profile.use_ppn)
            partner.default_pph = bool(profile.use_pph)
            partner.pph_rate = profile.pph_rate

    def write(self, vals):
        result = super().write(vals)
        if "sj_tax_profile_id" in vals:
            self._sync_sj_tax_profile()
        return result

    @api.onchange("sj_tax_profile_id")
    def _onchange_sj_tax_profile_id(self):
        profile = self.sj_tax_profile_id
        self.default_ppn = bool(profile.use_ppn)
        self.default_pph = bool(profile.use_pph)
        self.pph_rate = profile.pph_rate
