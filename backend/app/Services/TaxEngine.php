<?php

namespace App\Services;

use InvalidArgumentException;

/**
 * TaxEngine - Kalkulasi Pajak Berdasarkan 3 Kondisi Resmi Sentanu Jaya
 * 
 * Kondisi 1: Tanpa PPN, Tanpa PPh (Customer non-PKP / bebas pajak)
 * Kondisi 2: PPh 2.5% tanpa PPN (Customer potong PPh 2.5%, tanpa PPN)
 * Kondisi 3: PPN (misal 11%) + PPh 2% (Customer PKP standar)
 */
class TaxEngine
{
    /**
     * Hitung rincian pajak berdasarkan DPP (Dasar Pengenaan Pajak / Subtotal Net) dan kondisi pajak
     *
     * @param float $dpp Dasar pengenaan pajak (selling price accepted)
     * @param int $conditionNo Nomor kondisi (1, 2, atau 3)
     * @param float $ppnRate Tarif PPN aktif (default 0.11 untuk 11%)
     * @param float $pph2Rate Tarif PPh Kondisi 3 (default 0.02 untuk 2%)
     * @param float $pph25Rate Tarif PPh Kondisi 2 (default 0.025 untuk 2.5%)
     * @return array
     */
    public function calculate(
        float $dpp,
        int $conditionNo,
        float $ppnRate = 0.11,
        float $pph2Rate = 0.02,
        float $pph25Rate = 0.025
    ): array {
        if ($dpp < 0) {
            throw new InvalidArgumentException("DPP tidak boleh negatif.");
        }

        $ppnAmount = 0.0;
        $pphAmount = 0.0;
        $pphRate = 0.0;

        switch ($conditionNo) {
            case 1:
                // Kondisi 1: Tanpa PPN, Tanpa PPh
                $ppnAmount = 0.0;
                $pphAmount = 0.0;
                $pphRate = 0.0;
                break;

            case 2:
                // Kondisi 2: PPh 2.5% Tanpa PPN
                $ppnAmount = 0.0;
                $pphRate = $pph25Rate;
                $pphAmount = round($dpp * $pphRate, 2);
                break;

            case 3:
                // Kondisi 3: PPN + PPh 2%
                $ppnAmount = round($dpp * $ppnRate, 2);
                $pphRate = $pph2Rate;
                $pphAmount = round($dpp * $pphRate, 2);
                break;

            default:
                throw new InvalidArgumentException("Kondisi pajak tidak valid: {$conditionNo}");
        }

        // Total Net Invoice = Subtotal + PPN - PPh Dipotong Customer
        $totalNetInvoice = round($dpp + $ppnAmount - $pphAmount, 2);

        return [
            'dpp' => $dpp,
            'condition_no' => $conditionNo,
            'ppn_rate' => $ppnRate,
            'ppn_amount' => $ppnAmount,
            'pph_rate' => $pphRate,
            'pph_amount' => $pphAmount,
            'total_net_invoice' => $totalNetInvoice,
        ];
    }
}
