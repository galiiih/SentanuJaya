<?php

return [
    'messages' => [
        'listed' => 'Goods Receipt list loaded.',
        'created' => 'Goods Receipt draft created.',
        'retrieved' => 'Goods Receipt loaded.',
        'updated' => 'Goods Receipt draft updated.',
        'deleted' => 'Goods Receipt draft deleted.',
        'submitted' => 'Goods Receipt submitted.',
        'posted' => 'Goods Receipt posted to custody ledger.',
        'cancelled' => 'Goods Receipt draft cancelled.',
        'custody_locations_listed' => 'Custody locations loaded.',
        'custody_balances_listed' => 'Custody balances loaded.',
        'custody_ledger_listed' => 'Custody ledger loaded.',
    ],
    'errors' => [
        'forbidden' => 'Only ADMIN or OWNER may perform this action.',
        'submit_only_draft' => 'Only a DRAFT Goods Receipt may be submitted.',
        'post_only_submitted' => 'Only a SUBMITTED Goods Receipt may be posted.',
        'cancel_only_draft' => 'Only a DRAFT Goods Receipt may be cancelled.',
        'update_only_draft' => 'Only a DRAFT Goods Receipt may be updated.',
        'delete_only_draft' => 'Only a DRAFT Goods Receipt may be deleted.',
        'customer_item_mismatch' => 'Customer item must belong to Goods Receipt customer.',
        'negative_balance' => 'Customer goods physical balance may not be negative.',
    ],
    'ledger_note' => 'Physical customer goods receipt through STB :number.',
];
