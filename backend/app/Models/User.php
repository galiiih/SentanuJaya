<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, HasUuids, Notifiable;

    protected $fillable = [
        'username',
        'email',
        'password',
        'full_name',
        'phone',
        'role',
        'is_active',
    ];

    protected $hidden = ['password', 'remember_token'];

    protected function casts(): array
    {
        return [
            'password' => 'hashed',
            'is_active' => 'boolean',
        ];
    }

    public function canPostGoodsReceipt(): bool
    {
        return in_array($this->role, ['ADMIN', 'OWNER'], true);
    }

    /**
     * Phase 4 permission matrix.
     * STAFF: create draft SJ, view SJ/acceptance
     * ADMIN: create/submit/deliver SJ, record acceptance, create invoice
     * OWNER: all ADMIN + cancel posted, override, approve invoice, view reports
     */
    private const PERMISSIONS = [
        'STAFF' => [
            'delivery.view', 'delivery.create',
            'acceptance.view',
            'po.view', 'po.create', 'po.edit',
        ],
        'ADMIN' => [
            'delivery.view', 'delivery.create', 'delivery.submit', 'delivery.deliver', 'delivery.cancel_draft',
            'acceptance.view', 'acceptance.create', 'acceptance.submit', 'acceptance.post',
            'invoice.view', 'invoice.create',
            'po.view', 'po.create', 'po.edit', 'po.activate', 'po.cancel', 'po.close',
        ],
        'OWNER' => [
            'delivery.view', 'delivery.create', 'delivery.submit', 'delivery.deliver',
            'delivery.cancel_draft', 'delivery.cancel_posted',
            'acceptance.view', 'acceptance.create', 'acceptance.submit', 'acceptance.post',
            'invoice.view', 'invoice.create', 'invoice.approve',
            'report.view',
            'po.view', 'po.create', 'po.edit', 'po.activate', 'po.cancel', 'po.close',
        ],
    ];

    public function hasPermission(string $permission): bool
    {
        return in_array($permission, self::PERMISSIONS[$this->role] ?? [], true);
    }
}
