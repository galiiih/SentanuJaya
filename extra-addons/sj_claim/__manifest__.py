{
    "name": "Sentanu Jaya Customer Claim",
    "version": "17.0.1.0.0",
    "category": "Sales/Sales",
    "summary": "Customer complaint, claim review, and claim rework tracking",
    "depends": ["mail", "sj_delivery", "sj_security"],
    "data": [
        "security/ir.model.access.csv",
        "data/ir_sequence_data.xml",
        "views/sj_customer_claim_views.xml",
        "views/sj_claim_rework_views.xml",
        "views/menu.xml",
        "report/sj_claim_report.xml",
    ],
    "installable": True,
    "application": False,
    "license": "LGPL-3",
}
