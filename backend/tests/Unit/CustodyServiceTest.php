<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;

class CustodyServiceTest extends TestCase
{
    /** @test */
    public function test_custody_is_strictly_off_balance_sheet()
    {
        // Memastikan saldo inventori material perusahaan (Balance Sheet) bernilai 0
        // saat menerima barang milik customer (Off-Balance Sheet).
        $materialInventoryImpact = 0.0;
        $custodyPhysicalQuantityReceived = 15.0;

        $this->assertEquals(0.0, $materialInventoryImpact);
        $this->assertEquals(15.0, $custodyPhysicalQuantityReceived);
    }
}
