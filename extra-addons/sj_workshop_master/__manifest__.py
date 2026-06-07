{
    "name": "Sentanu Jaya Workshop Master",
    "version": "17.0.1.0.0",
    "category": "Manufacturing",
    "summary": "Master data for Sentanu Jaya workshop operations",
    "depends": ["contacts", "product", "sj_tax", "sj_security"],
    "data": [
        "security/ir.model.access.csv",
        "views/sj_color_views.xml",
        "views/sj_service_views.xml",
        "views/sj_defect_views.xml",
        "views/sj_claim_reason_views.xml",
        "views/sj_customer_pricelist_views.xml",
        "views/menu.xml",
    ],
    "installable": True,
    "application": True,
    "license": "LGPL-3",
}
