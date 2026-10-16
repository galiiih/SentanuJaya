# Sentanu Jaya ERP Design System

## Visual contract

Mockup reference is primary. Do not use dark default-template UI.

- Product: operational ERP for automotive finishing workshop.
- Theme: light enterprise SaaS.
- Shell: navy sidebar, white top header, soft gray application canvas.
- Accent: practical blue for actions and active navigation.
- Density: data-rich, readable, restrained decoration.
- Alignment: left aligned. No centered dashboard content.

## Tokens

| Token | Value | Use |
|---|---|---|
| Canvas | `#F8FAFC` | Main page background |
| Surface | `#FFFFFF` | Cards, tables, header |
| Sidebar | `#0F172A` | Primary navigation |
| Sidebar active | `#2563EB` | Active navigation item |
| Border | `#E2E8F0` | Card and table borders |
| Text | `#0F172A` | Headings and primary values |
| Muted | `#64748B` | Labels and supporting text |
| Blue | `#2563EB` | Primary action, links |
| Green | `#16A34A` | Accepted, paid, healthy |
| Amber | `#D97706` | Warning, low stock |
| Red | `#DC2626` | Critical, rejected |

## Geometry

- Sidebar: 248px desktop; collapses below 1024px.
- Header: 64px.
- Content max width: 1440px.
- Page padding: 32px desktop, 20px tablet, 16px mobile.
- Card radius: 10px.
- Control radius: 8px.
- Border: 1px solid token Border.
- Shadow: subtle `0 1px 2px rgb(15 23 42 / 0.04)` only.
- Grid gap: 16px.

## Typography

- UI font: system sans stack.
- Page title: 24px / 32px, 700.
- Section title: 16px / 24px, 600.
- Body: 14px / 20px, 400.
- Label: 12px / 16px, 600, uppercase only for KPI labels.
- KPI value: 24px / 32px, 700.
- Table: 13px / 20px.

## Shared components

Every business page must use the same `AppShell`, `PageHeader`, `StatCard`, `StatusBadge`, `DataTable`, and `Button` styles. Business modules may add content, never replace shell geometry or tokens.

## Interaction rules

- Primary action: blue filled button, one per page.
- Secondary action: white button with border.
- Destructive action: red text/button and confirmation.
- Status uses text plus badge, never color alone.
- Focus ring visible for keyboard users.
- Minimum interactive target: 40px desktop, 44px touch.
- Tables scroll horizontally on small screens; never shrink critical values into overlap.
- Empty, loading, and error states must use shared surface styles.

## Responsive contract

- 1440px: full sidebar + 4 KPI columns.
- 1024px: full sidebar + 2 KPI columns.
- 768px: collapsible sidebar + 2 KPI columns.
- 375px: compact header, 1 KPI column, horizontally scrollable tables.
