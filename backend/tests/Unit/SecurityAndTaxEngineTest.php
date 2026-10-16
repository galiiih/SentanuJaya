<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;
use App\Services\TaxEngine;
use App\Services\SecurityAuditLogger;
use Exception;

class SecurityAndTaxEngineTest extends TestCase
{
    private TaxEngine $taxEngine;
    private SecurityAuditLogger $securityLogger;

    protected function setUp(): void
    {
        parent::setUp();
        $this->taxEngine = new TaxEngine();
        $this->securityLogger = new SecurityAuditLogger();
    }

    /** @test */
    public function test_kalkulasi_pajak_kondisi_3_ppn11_pph2()
    {
        $dpp = 22396000.00; // Contoh transaksi Varia Baru
        $result = $this->taxEngine->calculate($dpp, 3, 0.11, 0.02);

        $this->assertEquals(22396000.00, $result['dpp']);
        $this->assertEquals(2463560.00, $result['ppn_amount']);
        $this->assertEquals(447920.00, $result['pph_amount']); // 2% dari 22.396.000 = 447.920
        $this->assertEquals(24411640.00, $result['total_net_invoice']);
    }

    /** @test */
    public function test_segregation_of_duties_menolak_creator_sama_dengan_approver()
    {
        $this->expectException(Exception::class);
        $this->expectExceptionMessage("Security Violation (SoD)");

        $userId = "usr-123456";
        $this->securityLogger->enforceSegregationOfDuties($userId, $userId, "Invoice Approval");
    }

    /** @test */
    public function test_masking_harga_beli_sensitif_untuk_non_owner()
    {
        $data = [
            'item_name' => 'Cat Clear Coat',
            'stock_qty' => 50,
            'avg_cost' => 185000,
            'margin' => 0.35
        ];

        $masked = $this->securityLogger->maskSensitiveFields($data, false);

        $this->assertArrayNotHasKey('avg_cost', $masked);
        $this->assertArrayNotHasKey('margin', $masked);
        $this->assertTrue($masked['financial_data_restricted']);
    }
}
