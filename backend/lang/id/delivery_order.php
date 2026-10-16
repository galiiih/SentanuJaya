<?php

return [
    'messages' => [
        'listed' => 'Daftar surat jalan berhasil diambil.',
        'created' => 'Surat jalan berhasil dibuat.',
        'retrieved' => 'Surat jalan berhasil diambil.',
        'updated' => 'Surat jalan berhasil diperbarui.',
        'deleted' => 'Surat jalan berhasil dihapus.',
        'submitted' => 'Surat jalan berhasil diajukan.',
        'delivered' => 'Surat jalan berhasil dikirim. Custody dialihkan ke customer.',
        'cancelled' => 'Surat jalan berhasil dibatalkan.',
    ],
    'errors' => [
        'forbidden' => 'Anda tidak memiliki izin untuk aksi ini.',
        'update_only_draft' => 'Hanya surat jalan draft yang dapat diperbarui.',
        'delete_only_draft' => 'Hanya surat jalan draft yang dapat dihapus.',
        'submit_only_draft' => 'Hanya surat jalan draft yang dapat diajukan.',
        'deliver_only_submitted' => 'Hanya surat jalan yang sudah diajukan yang dapat dikirim.',
        'cannot_cancel' => 'Surat jalan tidak dapat dibatalkan pada status ini.',
        'customer_item_mismatch' => 'Item customer tidak sesuai dengan customer ini.',
        'insufficient_custody' => 'Saldo custody tidak cukup untuk :item. Tersedia: :available, Diminta: :requested.',
    ],
    'ledger_note' => 'Pengiriman :number — keluar ke customer.',
];
