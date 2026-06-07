{
    'name': 'Custom Contact Fields',
    'version': '1.0',
    'category': 'Contacts',
    'summary': 'Menambahkan field NPWP dan PPN/PPh pada Contacts',
    'depends': ['base', 'contacts'],
    'data': [
        'views/res_partner_views.xml',
    ],
    'installable': True,
    'application': False,
    'license': 'LGPL-3',
}
