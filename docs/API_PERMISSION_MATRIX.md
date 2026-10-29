# API PERMISSION MATRIX — SENTANU JAYA ERP V1

## Overview
This document specifies the server-side role and permission matrix enforced across all private API endpoints for **ADMIN**, **OWNER**, and **STAFF** roles.

## Roles & Base Permissions
- **STAFF**: Operational entry (Delivery Orders, Customer POs, Acceptances, Customer/Master Data View). Cannot manage financial invoices, payments, reports, or master data mutations.
- **ADMIN**: Operational management, master data creation/modification, goods receipts, PO activation/cancellation, delivery execution, acceptance posting, and invoice posting.
- **OWNER**: Full executive permissions including canceling posted deliveries, approving invoices, viewing advanced reports, and managing master data.

## Permission Matrix Table

| Resource / Domain | Endpoint / Action | STAFF | ADMIN | OWNER |
| :--- | :--- | :--- | :--- | :--- |
| **Master Data** (UOM, Company, Branch, Customer, Material, Supplier, etc.) | `GET /api/v1/*` (View/List) | Allowed | Allowed | Allowed |
| **Master Data** | `POST/PUT/DELETE /api/v1/*` (Manage) | Forbidden (403) | Allowed | Allowed |
| **Customer PO** | `GET / Index / Show` | Allowed (`po.view`) | Allowed (`po.view`) | Allowed (`po.view`) |
| **Customer PO** | `POST Store / PATCH Update` | Allowed (`po.create` / `po.edit`) | Allowed (`po.create` / `po.edit`) | Allowed (`po.create` / `po.edit`) |
| **Customer PO** | `POST Activate` | Forbidden (403) | Allowed (`po.activate`) | Allowed (`po.activate`) |
| **Customer PO** | `POST Cancel / Close` | Forbidden (403) | Allowed (`po.cancel` / `po.close`) | Allowed (`po.cancel` / `po.close`) |
| **Delivery Orders** | `GET / Index / Show` | Allowed (`delivery.view`) | Allowed (`delivery.view`) | Allowed (`delivery.view`) |
| **Delivery Orders** | `POST Store / Submit / Deliver` | Allowed (`delivery.create` / `submit` / `deliver`) | Allowed | Allowed |
| **Delivery Orders** | `POST Cancel (Draft)` | Allowed (`delivery.cancel_draft`) | Allowed (`delivery.cancel_draft`) | Allowed (`delivery.cancel_draft`) |
| **Delivery Orders** | `POST Cancel (Posted)` | Forbidden (403) | Forbidden (403) | Allowed (`delivery.cancel_posted`) |
| **Acceptances** | `GET / Index / Show` | Allowed (`acceptance.view`) | Allowed (`acceptance.view`) | Allowed (`acceptance.view`) |
| **Acceptances** | `POST Store / Submit / Post` | Forbidden (403) | Allowed (`acceptance.create` / `post`) | Allowed (`acceptance.create` / `post`) |
| **Invoices** | `GET / Index / Show` | Forbidden (403) | Allowed (`invoice.view`) | Allowed (`invoice.view`) |
| **Invoices** | `POST Store / Post` | Forbidden (403) | Allowed (`invoice.create`) | Allowed (`invoice.create`) |
| **Payments** | `GET / Index / Show` | Forbidden (403) | Allowed (`invoice.view`) | Allowed (`invoice.view`) |
| **Payments** | `POST Store` | Forbidden (403) | Allowed (`invoice.create`) | Allowed (`invoice.create`) |
| **Reports** | `GET /reports/*` | Forbidden (403) | Allowed (`report.view` / Role check) | Allowed (`report.view` / Role check) |
| **Dashboard** | `GET /dashboard/summary` | Allowed (Summary view) | Allowed | Allowed |

---
## Unauthenticated Access (`401`)
Any request to private endpoints without a valid session or authentication token receives `401 Unauthorized`.
