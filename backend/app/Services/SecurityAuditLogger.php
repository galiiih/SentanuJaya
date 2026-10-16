<?php

namespace App\Services;

use Exception;
use Illuminate\Support\Facades\DB;

/**
 * SecurityAuditLogger & Segregation of Duties Engine
 * 
 * Mengamankan transaksi ERP sesuai spesifikasi `docs/05_SECURITY.md`:
 * 1. Immutable Audit Log (Append-only)
 * 2. Segregation of Duties (Pemisahan Tugas: Creator != Approver)
 * 3. Field-Level Masking & RBAC Enforcement
 */
class SecurityAuditLogger
{
    /**
     * Catat aktivitas sensitif ke tabel audit_logs (Append-Only)
     */
    public function log(
        ?string $actorId,
        string $action,
        string $entityType,
        string $entityId,
        ?array $oldValue = null,
        ?array $newValue = null,
        ?string $reason = null,
        ?string $ipAddress = null
    ): void {
        DB::table('audit_logs')->insert([
            'id' => (string) \Illuminate\Support\Str::uuid(),
            'actor_id' => $actorId,
            'action' => $action,
            'entity_type' => $entityType,
            'entity_id' => $entityId,
            'old_value' => $oldValue ? json_encode($oldValue) : null,
            'new_value' => $newValue ? json_encode($newValue) : null,
            'reason' => $reason,
            'ip_address' => $ipAddress,
            'user_agent' => request()->userAgent() ?? 'System',
            'created_at' => now(),
        ]);
    }

    /**
     * Segregation of Duties (SoD) Check:
     * Menolak jika user yang menyetujui/posting transaksi adalah user yang sama dengan pembuat.
     */
    public function enforceSegregationOfDuties(string $creatorId, string $approverId, string $contextName): void
    {
        if ($creatorId === $approverId) {
            throw new Exception("Security Violation (SoD): User pembuat transaksi ({$creatorId}) tidak boleh menyetujui/posting transaksi yang sama pada {$contextName}.");
        }
    }

    /**
     * Masking data finansial/pajak jika user tidak memiliki permission khusus
     */
    public function maskSensitiveFields(array $data, bool $canViewAllowed): array
    {
        if (!$canViewAllowed) {
            unset($data['avg_cost']);
            unset($data['unit_cost']);
            unset($data['margin']);
            $data['financial_data_restricted'] = true;
        }

        return $data;
    }
}
