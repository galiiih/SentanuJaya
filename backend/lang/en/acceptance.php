<?php

return [
    'messages' => [
        'listed' => 'Acceptances retrieved.',
        'created' => 'Acceptance created.',
        'retrieved' => 'Acceptance retrieved.',
        'submitted' => 'Acceptance submitted.',
        'posted' => 'Acceptance posted. Revenue recorded for accepted quantities.',
        'cancelled' => 'Acceptance cancelled.',
    ],
    'errors' => [
        'forbidden' => 'You do not have permission for this action.',
        'delivery_not_delivered' => 'Acceptance can only be created for delivered orders.',
        'submit_only_draft' => 'Only draft acceptances can be submitted.',
        'post_only_submitted' => 'Only submitted acceptances can be posted.',
        'cancel_only_draft' => 'Only draft acceptances can be cancelled.',
        'over_accept' => 'Over-acceptance: delivered :delivered, already accepted/rejected :cumulative, this acceptance :new.',
        'zero_quantity' => 'Each line must have at least some accepted or rejected quantity.',
        'line_not_in_delivery' => 'Acceptance line does not belong to this delivery order.',
    ],
    'ledger_note_reject' => 'Acceptance :number — rejected goods returned to custody.',
];
