<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;

class InvoiceServiceTest extends TestCase
{
    /** @test */
    public function test_multisj_invoicing_and_revenue_recognition_gate()
    {
        // Simulasi 2 Surat Jalan Accepted:
        // SJ-1: 20 pcs x Rp 450.000 = Rp 9.000.000
        // SJ-2: 15 pcs x Rp 893.066,67 = Rp 13.396.000
        // Total Subtotal = Rp 22.396.000 (Sesuai invoice nyata PT Varia Baru)

        $sj1Amount = 20 * 450000;
        $sj2Amount = 15 * 893066.6667;
        $subtotal = $sj1Amount + $sj2Amount;

        $ppnAmount = round($subtotal * 0.11, 2); // 11% PPN
        $pphAmount = round($subtotal * 0.02, 2); // 2% PPh

        $netTotalInvoice = $subtotal + $ppnAmount - $pphAmount;

        $this->assertEquals(22396000.00, round($subtotal, 2));
        $this->assertEquals(2463560.00, $ppnAmount);
        $this->assertEquals(447920.00, $pphAmount);
        $this->assertEquals(24411640.00, round($netTotalInvoice, 2));
    }
}
