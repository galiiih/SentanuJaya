import { permissions, type Permission } from "../../auth";

/**
 * Rute yang boleh dituju Puffy, lengkap dengan izin yang dibutuhkan.
 * Disamakan dengan <Route> di App.tsx dan Sidebar. Rute di luar daftar ini diabaikan.
 */
export const ROUTES: Record<string, Permission> = {
  "/dashboard": permissions.dashboardView,
  "/custody": permissions.custodyView,
  "/customer-po": permissions.poView,
  "/delivery": permissions.deliveryView,
  "/materials": permissions.materialView,
  "/invoicing": permissions.invoiceView,
  "/reports": permissions.invoiceView,
  "/master": permissions.dashboardView,
  "/payments": permissions.paymentView,
};

/**
 * Kunci elemen yang boleh ditunjuk Puffy, memakai class yang SUDAH ada di halaman
 * (tanpa perlu mengubah halaman). Tambahkan atribut data-puffy="nama" bila perlu target khusus.
 */
export const TARGETS: Record<string, string> = {
  kpi: ".app-content .kpi-grid",
  table: ".app-content .data-table",
  chart: ".app-content .chart-container",
  summary: ".app-content .invoice-summary",
  header: ".app-content .page-header",
  card: ".app-content .card",
  "material-stock-summary": "[data-puffy=\"material-stock-summary\"]",
  "customer-po-summary": "[data-puffy=\"customer-po-summary\"]",
  "delivery-summary": "[data-puffy=\"delivery-summary\"]",
  "invoice-summary": "[data-puffy=\"invoice-summary\"]",
  "payment-summary": "[data-puffy=\"payment-summary\"]",
};

/** "table" -> elemen pertama, "table:1" -> elemen kedua, atau [data-puffy="nama"]. */
export function resolveTarget(key: string): HTMLElement | null {
  const [name, index] = key.split(":");
  const selector = TARGETS[name] ?? `[data-puffy="${CSS.escape(name)}"]`;
  const list = document.querySelectorAll<HTMLElement>(selector);
  return list[Number(index ?? 0)] ?? null;
}

export const PUFFY_BASE_URL = "/api/v1/puffy";
export const PUFFY_MOCK = import.meta.env.VITE_PUFFY_MOCK === "true";
