<?php

return [
    'messages' => [
        'listed' => 'Daftar penerimaan berhasil diambil.',
        'created' => 'Penerimaan berhasil dibuat.',
        'retrieved' => 'Penerimaan berhasil diambil.',
        'submitted' => 'Penerimaan berhasil diajukan.',
        'posted' => 'Penerimaan berhasil diposting. Pendapatan dicatat untuk kuantitas diterima.',
        'cancelled' => 'Penerimaan berhasil dibatalkan.',
    ],
    'errors' => [
        'forbidden' => 'Anda tidak memiliki izin untuk aksi ini.',
        'delivery_not_delivered' => 'Penerimaan hanya bisa dibuat untuk pesanan yang sudah dikirim.',
        'submit_only_draft' => 'Hanya penerimaan draft yang dapat diajukan.',
        'post_only_submitted' => 'Hanya penerimaan yang sudah diajukan yang dapat diposting.',
        'cancel_only_draft' => 'Hanya penerimaan draft yang dapat dibatalkan.',
        'over_accept' => 'Melebihi kuantitas: dikirim :delivered, sudah diterima/ditolak :cumulative, penerimaan ini :new.',
        'zero_quantity' => 'Setiap baris harus memiliki kuantitas diterima atau ditolak.',
        'line_not_in_delivery' => 'Baris penerimaan bukan milik surat jalan ini.',
    ],
    'ledger_note_reject' => 'Penerimaan :number — barang reject dikembalikan ke custody.',
];
