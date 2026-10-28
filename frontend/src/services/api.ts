import axios, { AxiosError } from 'axios';

export type ApiList<T> = { data: T[]; current_page: number; last_page: number; total: number };
export type ApiResponse<T> = { success: boolean; data: T; message: string };
export type ApiUser = { id: string; name: string; email: string; role: string };
export type Company = { id: string; code: string; name: string };
export type Branch = { id: string; company_id: string; code: string; name: string };
export type Customer = { id: string; code: string; name: string };
export type CustomerItem = { id: string; customer_id: string; code: string; name: string; vehicle_model?: string; part_type?: string };
export type CustodyLocation = { id: string; branch_id: string; code: string; name: string };
export type GoodsReceiptLine = { id: string; customer_item_id: string; color_code?: string; quantity_received: string | number; condition: Condition; damage_description?: string; custody_location_id: string; photo_path?: string; customer_item?: CustomerItem; custody_location?: CustodyLocation };
export type GoodsReceipt = { id: string; stb_number: string; company_id: string; branch_id: string; customer_id: string; received_date: string; received_time?: string; delivered_by_name?: string; vehicle_plate?: string; notes?: string; status: GoodsReceiptStatus; created_at: string; customer?: Customer; lines: GoodsReceiptLine[] };
export type CustodyBalance = { id: string; customer_id?: string; customer_item_id?: string; custody_location_id?: string; balance_quantity: string | number; stage: string; last_movement_at?: string; customer?: Customer; customer_item?: CustomerItem; custody_location?: CustodyLocation };
export type CustodyLedger = { id: string; movement_type: string; quantity_in: string | number; quantity_out: string | number; stage: string; movement_date: string; customer_item_id?: string; customer?: Customer; customer_item?: CustomerItem; custody_location?: CustodyLocation };
export type GoodsReceiptStatus = 'DRAFT' | 'SUBMITTED' | 'POSTED' | 'CANCELLED';
export type Condition = 'GOOD' | 'DENT' | 'CRACK' | 'OLD_PAINT' | 'OTHER';
export type DraftLine = Omit<GoodsReceiptLine, 'id' | 'customer_item'>;
export type DraftPayload = { company_id: string; branch_id: string; customer_id: string; received_date: string; received_time?: string; delivered_by_name?: string; vehicle_plate?: string; notes?: string; lines: DraftLine[] };
export interface Material { id: string; sku: string; name: string; category: string; quantity_on_hand: number; unit: string; minimum_stock: number; avg_cost: number; }

const api = axios.create({ baseURL: '/api/v1', withCredentials: true, headers: { Accept: 'application/json' } });

export function apiError(error: unknown): string {
  if (!(error instanceof AxiosError)) return 'Terjadi kesalahan jaringan.';
  const data = error.response?.data as { message?: string; errors?: Record<string, string[]> } | undefined;
  return data?.errors ? Object.values(data.errors).flat().join(' ') : data?.message ?? 'Terjadi kesalahan server.';
}

const list = <T>(path: string, params?: Record<string, string | number>) => api.get<ApiResponse<ApiList<T>>>(path, { params }).then((response) => response.data.data);
const data = <T>(path: string, body?: unknown) => api.post<ApiResponse<T>>(path, body).then((response) => response.data.data);

export const authApi = {
  login: (email: string, password: string) => data<ApiUser>('/auth/login', { email, password }),
  me: () => api.get<ApiResponse<ApiUser>>('/auth/me').then((response) => response.data.data),
  logout: () => data<[]>(`/auth/logout`),
};

export const goodsReceiptApi = {
  list: () => list<GoodsReceipt>('/goods-receipts', { per_page: 100 }),
  get: (id: string) => api.get<ApiResponse<GoodsReceipt>>(`/goods-receipts/${id}`).then((response) => response.data.data),
  create: (payload: DraftPayload) => data<GoodsReceipt>('/goods-receipts', payload),
  update: (id: string, payload: Partial<DraftPayload>) => api.patch<ApiResponse<GoodsReceipt>>(`/goods-receipts/${id}`, payload).then((response) => response.data.data),
  submit: (id: string) => data<GoodsReceipt>(`/goods-receipts/${id}/submit`),
  post: (id: string) => data<GoodsReceipt>(`/goods-receipts/${id}/post`),
  cancel: (id: string) => data<GoodsReceipt>(`/goods-receipts/${id}/cancel`),
};

export const customerPoApi = {
  list: (params?: Record<string, string | number>) => list<CustomerPo>('/customer-pos', params),
  get: (id: string) => api.get<ApiResponse<CustomerPoDetail>>(`/customer-pos/${id}`).then((response) => response.data.data),
  create: (payload: CustomerPoPayload) => data<CustomerPo>('/customer-pos', payload),
  update: (id: string, payload: Partial<CustomerPoPayload>) => api.patch<ApiResponse<CustomerPoDetail>>(`/customer-pos/${id}`, payload).then((response) => response.data.data),
  activate: (id: string) => data<CustomerPo>(`/customer-pos/${id}/activate`),
  cancel: (id: string) => data<CustomerPo>(`/customer-pos/${id}/cancel`),
  close: (id: string) => data<CustomerPo>(`/customer-pos/${id}/close`),
};

export const deliveryOrderApi = {
  list: (params?: Record<string, string | number>) => list<DeliveryOrderRecord>('/delivery-orders', params),
  get: (id: string) => api.get<ApiResponse<DeliveryOrderRecord>>(`/delivery-orders/${id}`).then((response) => response.data.data),
  create: (payload: DeliveryOrderPayload) => data<DeliveryOrderRecord>('/delivery-orders', payload),
  submit: (id: string) => data<DeliveryOrderRecord>(`/delivery-orders/${id}/submit`),
  deliver: (id: string) => data<DeliveryOrderRecord>(`/delivery-orders/${id}/deliver`),
  cancel: (id: string) => data<DeliveryOrderRecord>(`/delivery-orders/${id}/cancel`),
};

export type DeliveryOrderPayload = {
  company_id: string;
  branch_id: string;
  customer_id: string;
  customer_po_id: string;
  customer_po_number?: string;
  delivery_date: string;
  shipping_address?: string;
  driver_name?: string;
  vehicle_plate?: string;
  notes?: string;
  lines: DeliveryOrderLinePayload[];
};

export type DeliveryOrderLinePayload = {
  customer_item_id: string;
  customer_po_line_id?: string;
  color_code?: string;
  quantity: number;
  unit_price?: number;
  custody_location_id?: string;
  notes?: string;
};

export type DeliveryOrderLineRecord = {
  id: string;
  delivery_order_id: string;
  customer_item_id: string;
  customer_po_line_id?: string;
  color_code?: string;
  quantity: number;
  unit_price: number;
  unit_price_snapshot?: number;
  qty_accepted?: number;
  qty_rejected?: number;
  qty_invoiced?: number;
  notes?: string;
  customer_item?: CustomerItem;
  customer_po_line?: CustomerPoLine;
};

export type DeliveryOrderRecord = {
  id: string;
  sj_number: string;
  company_id: string;
  branch_id: string;
  customer_id: string;
  customer_po_id: string;
  customer_po_number?: string;
  delivery_date: string;
  shipping_address?: string;
  driver_name?: string;
  vehicle_plate?: string;
  notes?: string;
  status: 'DRAFT' | 'SUBMITTED' | 'DELIVERED' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';
  invoice_status?: 'UNINVOICED' | 'INVOICED';
  created_at: string;
  customer?: Customer;
  customer_po?: CustomerPo;
  lines: DeliveryOrderLineRecord[];
};

export type CustomerPoStatus = 'DRAFT' | 'OPEN' | 'CLOSED' | 'CANCELLED';

export type CustomerPoLine = {
  id: string;
  customer_item_id: string;
  customer_item?: CustomerItem;
  color_code?: string;
  quantity: number;
  unit_price?: number;
  fulfilled_quantity?: number;
  remaining_quantity?: number;
  notes?: string;
};

export type CustomerPo = {
  id: string;
  company_id: string;
  customer_id: string;
  po_number: string;
  po_date: string;
  expected_delivery_date?: string;
  status: CustomerPoStatus;
  notes?: string;
  created_at: string;
  created_by?: { id: string; name: string };
  customer?: Customer;
  lines: CustomerPoLine[];
  delivery_orders_count?: number;
};

export type CustomerPoDetail = CustomerPo & {
  remaining_quantity?: number;
  invoiceable_quantity?: number;
};

export type CustomerPoPayload = {
  company_id: string;
  customer_id: string;
  po_number: string;
  po_date: string;
  expected_delivery_date?: string;
  notes?: string;
  lines: CustomerPoLinePayload[];
};

export type CustomerPoLinePayload = {
  customer_item_id: string;
  color_code?: string;
  quantity: number;
  unit_price?: number;
  notes?: string;
};

export type CustomerPoResponse = {
  success: boolean;
  data: CustomerPo;
  message: string;
};

export type CustomerPoListResponse = {
  success: boolean;
  data: CustomerPo[];
  current_page: number;
  last_page: number;
  total: number;
};

export const custodyApi = {
  companies: () => list<Company>('/companies', { per_page: 100 }),
  branches: () => list<Branch>('/branches', { per_page: 100 }),
  customers: () => list<Customer>('/customers', { per_page: 100 }),
  customerItems: () => list<CustomerItem>('/customer-items', { per_page: 100 }),
  locations: () => list<CustodyLocation>('/custody-locations', { per_page: 100 }),
  balances: () => list<CustodyBalance>('/custody-balances', { per_page: 100 }),
  ledger: () => list<CustodyLedger>('/custody-ledger', { per_page: 100 }),
};

export type AcceptanceStatus = 'DRAFT' | 'SUBMITTED' | 'POSTED' | 'CANCELLED';

export type AcceptanceLineRecord = {
  id: string;
  acceptance_id: string;
  delivery_order_line_id: string;
  quantity_ok: number;
  quantity_rejected: number;
  reject_reason?: string;
  notes?: string;
  delivery_order_line?: DeliveryOrderLineRecord;
};

export type AcceptanceRecord = {
  id: string;
  acceptance_number: string;
  delivery_order_id: string;
  customer_id: string;
  acceptance_date: string;
  status: AcceptanceStatus;
  notes?: string;
  created_at: string;
  delivery_order?: DeliveryOrderRecord;
  customer?: Customer;
  lines: AcceptanceLineRecord[];
};

export type AcceptanceLinePayload = {
  delivery_order_line_id: string;
  quantity_ok: number;
  quantity_rejected: number;
  reject_reason?: string;
  notes?: string;
};

export type AcceptancePayload = {
  delivery_order_id: string;
  acceptance_date: string;
  notes?: string;
  lines: AcceptanceLinePayload[];
};

export const acceptanceApi = {
  list: (params?: Record<string, string | number>) => list<AcceptanceRecord>('/acceptances', params),
  get: (id: string) => api.get<ApiResponse<AcceptanceRecord>>(`/acceptances/${id}`).then((res) => res.data.data),
  create: (payload: AcceptancePayload) => data<AcceptanceRecord>('/acceptances', payload),
  submit: (id: string) => data<AcceptanceRecord>(`/acceptances/${id}/submit`),
  post: (id: string) => data<AcceptanceRecord>(`/acceptances/${id}/post`),
  cancel: (id: string) => data<AcceptanceRecord>(`/acceptances/${id}/cancel`),
};

/* ── Invoice & Payment ── */

export type InvoiceStatus = 'DRAFT' | 'POSTED' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'CANCELLED';

export type InvoiceRecord = {
  id: string;
  invoice_number: string;
  customer_id: string;
  invoice_date: string;
  due_date: string;
  status: InvoiceStatus;
  dpp: number;
  ppn_amount: number;
  pph_amount: number;
  total_amount: number;
  amount_paid: number;
  amount_due: number;
  notes?: string;
  customer?: Customer;
};

export type PaymentAllocationRecord = {
  id: string;
  payment_id: string;
  invoice_id: string;
  allocated_amount: number;
  invoice?: InvoiceRecord;
};

export type PaymentRecord = {
  id: string;
  payment_number: string;
  customer_id: string;
  payment_date: string;
  method: string;
  amount: number;
  reference_no?: string;
  status: string;
  notes?: string;
  customer?: Customer;
  allocations: PaymentAllocationRecord[];
};

export type CustomerOutstanding = {
  customer: { id: string; name: string; code: string };
  total_billed: number;
  total_paid: number;
  total_outstanding: number;
  invoices: {
    id: string;
    invoice_number: string;
    invoice_date: string;
    total_amount: number;
    amount_paid: number;
    amount_due: number;
    status: InvoiceStatus;
  }[];
};

export type PaymentAllocationPayload = { invoice_id: string; amount: number };

export type PaymentPayload = {
  customer_id: string;
  payment_date: string;
  method: string;
  amount: number;
  reference_no?: string;
  notes?: string;
  allocations: PaymentAllocationPayload[];
};

export type InvoiceCreatePayload = {
  customer_id: string;
  delivery_order_ids: string[];
  invoice_date: string;
  tax_condition: 1 | 2 | 3;
};

export type InvoiceLineRecord = {
  id: string;
  invoice_id: string;
  delivery_order_line_id: string;
  description: string;
  quantity: number;
  unit_price_snapshot: number;
  subtotal: number;
  delivery_order_line?: DeliveryOrderLineRecord & { customer_item?: CustomerItem };
};

export type InvoiceDeliveryLinkRecord = {
  id: string;
  invoice_id: string;
  delivery_order_id: string;
  amount_billed: number;
  delivery_order?: DeliveryOrderRecord;
};

export type InvoiceDetailRecord = InvoiceRecord & {
  lines?: InvoiceLineRecord[];
  delivery_links?: InvoiceDeliveryLinkRecord[];
  allocations?: PaymentAllocationRecord[];
};

export const invoiceApi = {
  list: (params?: Record<string, string | number>) => list<InvoiceRecord>('/invoices', params),
  get: (id: string) => api.get<ApiResponse<InvoiceDetailRecord>>(`/invoices/${id}`).then((r) => r.data.data),
  create: (payload: InvoiceCreatePayload) => data<InvoiceRecord>('/invoices', payload),
  post: (id: string) => data<InvoiceRecord>(`/invoices/${id}/post`),
  cancel: (id: string) => data<InvoiceRecord>(`/invoices/${id}/cancel`),
  eligibleDeliveryOrders: (customerId: string) => api.get<ApiResponse<DeliveryOrderRecord[]>>('/invoices/eligible-delivery-orders', { params: { customer_id: customerId } }).then((response) => response.data.data),
};

export const dashboardApi = {
  summary: (params?: Record<string, string | number>) => api.get<ApiResponse<any>>('/dashboard/summary', { params }).then((r) => r.data.data),
};

export const reportApi = {
  financial: (params?: Record<string, string | number>) => api.get<ApiResponse<any>>('/reports/financial', { params }).then((r) => r.data.data),
  receivables: (params?: Record<string, string | number>) => api.get<ApiResponse<any>>('/reports/receivables', { params }).then((r) => r.data.data),
  operational: (params?: Record<string, string | number>) => api.get<ApiResponse<any>>('/reports/operational', { params }).then((r) => r.data.data),
  custody: (params?: Record<string, string | number>) => api.get<ApiResponse<any>>('/reports/custody', { params }).then((r) => r.data.data),
};

export const paymentApi = {
  list: (params?: Record<string, string | number>) => list<PaymentRecord>('/payments', params),
  get: (id: string) => api.get<ApiResponse<PaymentRecord>>(`/payments/${id}`).then((r) => r.data.data),
  create: (payload: PaymentPayload) => data<PaymentRecord>('/payments', payload),
  customerOutstanding: (customerId: string) =>
    api.get<ApiResponse<CustomerOutstanding>>(`/customers/${customerId}/outstanding`).then((r) => r.data.data),
};

export type DocumentTemplateVersionRecord = {
  id: number;
  document_template_id: number;
  version: number;
  name: string;
  content?: string;
  css?: string;
  gjs_project?: string;
  created_at: string;
};

export type DocumentTemplateRecord = {
  id: number;
  name: string;
  document_type: 'invoice' | 'surat_jalan';
  format: 'html' | 'docx' | 'xlsx';
  content?: string;
  css?: string;
  gjs_project?: string;
  file_path?: string;
  version: number;
  is_active: boolean;
  status: 'draft' | 'active';
  versions?: DocumentTemplateVersionRecord[];
  created_at: string;
  updated_at: string;
};

export const documentTemplateApi = {
  list: (params?: Record<string, string | number>) => list<DocumentTemplateRecord>('/document-templates', params),
  get: (id: number) => api.get<ApiResponse<DocumentTemplateRecord>>(`/document-templates/${id}`).then((r) => r.data.data),
  create: (payload: any) => api.post<ApiResponse<DocumentTemplateRecord>>('/document-templates', payload, payload instanceof FormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : {}).then((r) => r.data.data),
  update: (id: number, payload: { name?: string; content?: string; css?: string; gjs_project?: string; status?: string }) => api.put<ApiResponse<DocumentTemplateRecord>>(`/document-templates/{id}`.replace('{id}', String(id)), payload).then((r) => r.data.data),
  activate: (id: number) => data<DocumentTemplateRecord>(`/document-templates/${id}/activate`),
  delete: (id: number) => api.delete<ApiResponse<any>>(`/document-templates/${id}`).then((r) => r.data),
  versions: (id: number) => api.get<ApiResponse<DocumentTemplateVersionRecord[]>>(`/document-templates/${id}/versions`).then((r) => r.data.data),
  restore: (id: number, version: number) => api.post<ApiResponse<DocumentTemplateRecord>>(`/document-templates/${id}/restore/${version}`).then((r) => r.data.data),
};
