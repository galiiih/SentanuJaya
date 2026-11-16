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
        'must_change_password',
    ];

    protected $hidden = ['password', 'remember_token'];

    protected function casts(): array
    {
        return [
            'password' => 'hashed',
            'is_active' => 'boolean',
            'must_change_password' => 'boolean',
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
     * OWNER: all ADMIN + cancel posted, override, approve invoice
     */
    private const PERMISSIONS = [
        'STAFF' => [
            'delivery.view', 'delivery.create',
            'acceptance.view', 'return.view',
            'po.view', 'po.create', 'po.edit',
            'master.view',
        ],
        'ADMIN' => [
            'delivery.view', 'delivery.create', 'delivery.submit', 'delivery.deliver', 'delivery.cancel_draft',
            'acceptance.view', 'acceptance.create', 'acceptance.submit', 'acceptance.post',
            'return.view', 'return.create', 'return.post',
            'invoice.view', 'invoice.create',
            'po.view', 'po.create', 'po.edit', 'po.activate', 'po.cancel', 'po.close',
            'master.view', 'master.manage',
            'report.view',
        ],
        'OWNER' => [
            'delivery.view', 'delivery.create', 'delivery.submit', 'delivery.deliver',
            'delivery.cancel_draft', 'delivery.cancel_posted',
            'acceptance.view', 'acceptance.create', 'acceptance.submit', 'acceptance.post',
            'return.view', 'return.create', 'return.post',
            'invoice.view', 'invoice.create', 'invoice.approve',
            'report.view',
            'po.view', 'po.create', 'po.edit', 'po.activate', 'po.cancel', 'po.close',
            'master.view', 'master.manage',
        ],
    ];

    public function hasPermission(string $permission): bool
    {
        return in_array($permission, self::PERMISSIONS[$this->role] ?? [], true);
    }
}
