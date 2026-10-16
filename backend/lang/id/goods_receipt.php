<?php

return [
    'messages' => [
        'listed' => 'Daftar Surat Terima Barang berhasil dimuat.',
        'created' => 'Surat Terima Barang draft berhasil dibuat.',
        'retrieved' => 'Surat Terima Barang berhasil dimuat.',
        'updated' => 'Surat Terima Barang draft berhasil diperbarui.',
        'deleted' => 'Surat Terima Barang draft berhasil dihapus.',
        'submitted' => 'Surat Terima Barang berhasil diajukan.',
        'posted' => 'Surat Terima Barang berhasil diposting ke custody ledger.',
        'cancelled' => 'Surat Terima Barang draft berhasil dibatalkan.',
        'custody_locations_listed' => 'Daftar lokasi custody berhasil dimuat.',
        'custody_balances_listed' => 'Daftar saldo custody berhasil dimuat.',
        'custody_ledger_listed' => 'Daftar ledger custody berhasil dimuat.',
    ],
    'errors' => [
        'forbidden' => 'Hanya ADMIN atau OWNER yang dapat melakukan aksi ini.',
        'submit_only_draft' => 'Hanya Surat Terima Barang berstatus DRAFT yang dapat diajukan.',
        'post_only_submitted' => 'Hanya Surat Terima Barang berstatus SUBMITTED yang dapat diposting.',
        'cancel_only_draft' => 'Hanya Surat Terima Barang berstatus DRAFT yang dapat dibatalkan.',
        'update_only_draft' => 'Hanya Surat Terima Barang berstatus DRAFT yang dapat diperbarui.',
        'delete_only_draft' => 'Hanya Surat Terima Barang berstatus DRAFT yang dapat dihapus.',
        'customer_item_mismatch' => 'Customer item harus dimiliki oleh customer pada Surat Terima Barang.',
        'negative_balance' => 'Saldo fisik barang customer tidak boleh negatif.',
    ],
    'ledger_note' => 'Penerimaan fisik barang customer melalui STB :number.',
];
