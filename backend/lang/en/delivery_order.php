<?php

return [
    'messages' => [
        'listed' => 'Delivery orders retrieved.',
        'created' => 'Delivery order created.',
        'retrieved' => 'Delivery order retrieved.',
        'updated' => 'Delivery order updated.',
        'deleted' => 'Delivery order deleted.',
        'submitted' => 'Delivery order submitted.',
        'delivered' => 'Delivery order delivered. Custody transferred to customer.',
        'cancelled' => 'Delivery order cancelled.',
    ],
    'errors' => [
        'forbidden' => 'You do not have permission for this action.',
        'update_only_draft' => 'Only draft delivery orders can be updated.',
        'delete_only_draft' => 'Only draft delivery orders can be deleted.',
        'submit_only_draft' => 'Only draft delivery orders can be submitted.',
        'deliver_only_submitted' => 'Only submitted delivery orders can be delivered.',
        'cannot_cancel' => 'This delivery order cannot be cancelled in its current status.',
        'customer_item_mismatch' => 'Customer item does not belong to this customer.',
        'insufficient_custody' => 'Insufficient custody balance for :item. Available: :available, Requested: :requested.',
    ],
    'ledger_note' => 'Delivery :number — out to customer.',
];
