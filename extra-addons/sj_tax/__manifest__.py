{
    "name": "Sentanu Jaya Tax Profile",
    "version": "17.0.1.0.0",
    "category": "Accounting",
    "summary": "Tax profile for Sentanu Jaya customers",
    "depends": ["account", "contacts", "custom_contact_fields", "sj_security"],
    "data": [
        "security/ir.model.access.csv",
        "data/sj_tax_profile_data.xml",
        "views/sj_tax_profile_views.xml",
        "views/res_partner_views.xml",
        "views/menu.xml",
    ],
    "installable": True,
    "application": False,
    "license": "LGPL-3",
}
