# API Permission Matrix — Sentanu Jaya ERP V1

## Scope and enforcement

This document records the centralized permission grants defined by `App\\Models\\User::hasPermission()`. Controllers that use these permission keys enforce them with HTTP 403 responses. Some endpoints also apply additional role or state checks; the permission key alone does not bypass those checks.

Unauthenticated requests to private API routes are rejected by authentication middleware. Users with `must_change_password=true` must change their temporary password before accessing the protected API group.

## Role permission matrix

| Permission | STAFF | ADMIN | OWNER |
|---|:---:|:---:|:---:|
| `delivery.view` | ✓ | ✓ | ✓ |
| `delivery.create` | ✓ | ✓ | ✓ |
| `delivery.submit` | — | ✓ | ✓ |
| `delivery.deliver` | — | ✓ | ✓ |
| `delivery.cancel_draft` | — | ✓ | ✓ |
| `delivery.cancel_posted` | — | — | ✓ |
| `acceptance.view` | ✓ | ✓ | ✓ |
| `acceptance.create` | — | ✓ | ✓ |
| `acceptance.submit` | — | ✓ | ✓ |
| `acceptance.post` | — | ✓ | ✓ |
| `return.view` | ✓ | ✓ | ✓ |
| `return.create` | — | ✓ | ✓ |
| `return.post` | — | ✓ | ✓ |
| `invoice.view` | — | ✓ | ✓ |
| `invoice.create` | — | ✓ | ✓ |
| `invoice.approve` | — | — | ✓ |
| `po.view` | ✓ | ✓ | ✓ |
| `po.create` | ✓ | ✓ | ✓ |
| `po.edit` | ✓ | ✓ | ✓ |
| `po.activate` | — | ✓ | ✓ |
| `po.cancel` | — | ✓ | ✓ |
| `po.close` | — | ✓ | ✓ |
| `master.view` | ✓ | ✓ | ✓ |
| `master.manage` | — | ✓ | ✓ |
| `report.view` | — | ✓ | ✓ |
| `documentation.view` | ✓ | ✓ | ✓ |
| `documentation.manage` | — | ✓ | ✓ |
| `documentation.publish` | — | ✓ | — |

`DEV` and `DEV ADMIN` are internal development roles and currently bypass the centralized permission list.

## Important endpoint-specific behavior

- Master Data mutation is blocked for STAFF; the feature test suite exercises POST, PUT, PATCH, and DELETE across the 17 master resources.
- User-account creation is OWNER-only. ADMIN cannot create accounts, assign OWNER, modify OWNER accounts, or deactivate OWNER accounts.
- OWNER is the only business role with `delivery.cancel_posted` and `invoice.approve`.
- The payment endpoints currently reuse `invoice.view` and `invoice.create`; there are no separate `payment.*` permission keys in the centralized matrix.
- Documentation publishing is currently granted to ADMIN but not OWNER, while both ADMIN and OWNER have `documentation.manage`. The controller separately checks `documentation.publish`; retain this distinction unless the business owner explicitly changes the policy.
- Dashboard summary is available to authenticated users after the mandatory-password-change middleware passes.

## Related automated coverage

- `backend/tests/Feature/Api/V1/MasterDataApiTest.php`
- `backend/tests/Feature/Api/V1/UserManagementSecurityTest.php`

The tests are API-level checks. Browser-level role navigation and denied-action coverage should remain part of UAT and E2E expansion.
