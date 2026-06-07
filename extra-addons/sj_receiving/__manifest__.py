{
    "name": "Sentanu Jaya Receiving",
    "version": "17.0.1.0.0",
    "category": "Warehouse",
    "summary": "Incoming customer delivery notes and incoming QC",
    "depends": ["mail", "sj_workshop_master", "sj_security"],
    "data": [
        "security/ir.model.access.csv",
        "data/ir_sequence_data.xml",
        "views/sj_receiving_views.xml",
        "views/menu.xml",
        "report/sj_receiving_report.xml",
    ],
    "installable": True,
    "application": False,
    "license": "LGPL-3",
}
