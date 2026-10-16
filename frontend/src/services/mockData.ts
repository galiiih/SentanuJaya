export interface Customer {
  id: string;
  code: string;
  name: string;
  tax_status: 'NON_PKP' | 'PKP' | 'WAPU';
  default_tax_condition: 1 | 2 | 3;
  payment_terms_days: number;
  credit_limit: number;
}

export interface CustodyItem {
  id: string;
  customer_name: string;
  item_code?: string;
  item_name: string;
  color_code: string;
  size: string;
  quantity: number;
  stage: string;
  location: string;
  received_date: string;
  item_value: number;
}

export interface Material {
  id: string;
  sku: string;
  name: string;
  category: string;
  quantity_on_hand: number;
  unit: string;
  minimum_stock: number;
  avg_cost: number;
}

export interface DeliveryOrder {
  id: string;
  sj_number: string;
  customer_name: string;
  item_name: string;
  color: string;
  qty: number;
  unit_price: number;
  qty_accepted: number;
  delivery_date: string;
  status: 'DELIVERED' | 'ACCEPTED';
  invoice_status: 'UNINVOICED' | 'INVOICED';
}

export interface SummaryStats {
  custody_count: number;
  low_stock_count: number;
  uninvoiced_sj_count: number;
  ar_outstanding: number;
}

export const mockCustomers: Customer[] = [
  {
    id: 'cust-1',
    code: 'CUST-001',
    name: 'PT Varia Baru',
    tax_status: 'PKP',
    default_tax_condition: 3,
    payment_terms_days: 30,
    credit_limit: 100000000
  },
  {
    id: 'cust-2',
    code: 'CUST-002',
    name: 'Prima Inovasindo Sukses',
    tax_status: 'PKP',
    default_tax_condition: 2,
    payment_terms_days: 14,
    credit_limit: 50000000
  }
];

export const mockCustodyItems: CustodyItem[] = [
  {
    id: '1',
    customer_name: 'PT Varia Baru',
    item_code: 'BUMPER-CIVIC',
    item_name: 'Bumper Depan Brio 2023',
    color_code: 'R-81 Rallye Red',
    size: 'Standard',
    quantity: 15,
    stage: 'PAINTING',
    location: 'Booth Cat 2',
    received_date: '2026-09-20',
    item_value: 1200000
  },
  {
    id: '2',
    customer_name: 'Prima Inovasindo',
    item_code: 'SIDE-CIVIC',
    item_name: 'Side Skirt Civic RS',
    color_code: 'NH-731P Crystal Black',
    size: 'Medium',
    quantity: 20,
    stage: 'QC_PASS',
    location: 'Gudang Ready Delivery',
    received_date: '2026-09-21',
    item_value: 850000
  }
];

export const mockMaterials: Material[] = [
  {
    id: 'm1',
    sku: 'MAT-CAT-001',
    name: 'Cat Clear Coat PU 2K',
    category: 'PERNIS',
    quantity_on_hand: 45,
    unit: 'Liter',
    minimum_stock: 10,
    avg_cost: 185000
  },
  {
    id: 'm2',
    sku: 'MAT-THN-002',
    name: 'Thinner High Gloss Slow Dry',
    category: 'THINNER',
    quantity_on_hand: 8,
    unit: 'Liter',
    minimum_stock: 12,
    avg_cost: 45000
  }
];

export const mockDeliveryOrders: DeliveryOrder[] = [
  {
    id: 'sj-1',
    sj_number: 'SJ-2026-001',
    customer_name: 'PT Varia Baru',
    item_name: 'Bumper Depan Brio 2023',
    color: 'R-81 Rallye Red',
    qty: 20,
    unit_price: 450000,
    qty_accepted: 20,
    delivery_date: '2026-09-22',
    status: 'ACCEPTED',
    invoice_status: 'UNINVOICED'
  },
  {
    id: 'sj-2',
    sj_number: 'SJ-2026-002',
    customer_name: 'PT Varia Baru',
    item_name: 'Spoiler Rear Wing Civic',
    color: 'NH-731P Crystal Black',
    qty: 15,
    unit_price: 893066.6667,
    qty_accepted: 15,
    delivery_date: '2026-09-23',
    status: 'ACCEPTED',
    invoice_status: 'UNINVOICED'
  }
];

export const mockStats: SummaryStats = {
  custody_count: 0,
  low_stock_count: 1,
  uninvoiced_sj_count: 2,
  ar_outstanding: 27718768
};
