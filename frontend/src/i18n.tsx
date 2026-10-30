import { createContext, useContext, useState, type ReactNode } from 'react';

export type Language = 'id' | 'en';

type Translations = {
  // Navigation & Shell
  nav: {
  operations: string;
  inventory: string;
  finance: string;
  dashboard: string;
  custody: string;
  customerPo: string;
  delivery: string;
  materials: string;
  invoicing: string;
  payments: string;
  reports: string;
  templates: string;
  master: string;
  users: string;
  logout: string;
  isolatedCustody: string;
  offBalanceSheet: string;
  };
  // Page Titles & Copy
  pages: {
    dashboardTitle: string;
    dashboardDesc: string;
    custodyTitle: string;
    custodyDesc: string;
    poTitle: string;
    poDesc: string;
    deliveryTitle: string;
    deliveryDesc: string;
    materialsTitle: string;
    materialsDesc: string;
    invoicingTitle: string;
    invoicingDesc: string;
    paymentsTitle: string;
    paymentsDesc: string;
    reportsTitle: string;
    reportsDesc: string;
    templatesTitle: string;
    templatesDesc: string;
    masterTitle: string;
    masterDesc: string;
    usersTitle: string;
    usersDesc: string;
  };
  // Common Buttons & Labels
  common: {
    search: string;
    filter: string;
    allStatus: string;
    actions: string;
    cancel: string;
    confirm: string;
    save: string;
    saveDraft: string;
    close: string;
    edit: string;
    delete: string;
    view: string;
    details: string;
    loading: string;
    saving: string;
    reload: string;
    previous: string;
    next: string;
    page: string;
    of: string;
    items: string;
    notes: string;
    status: string;
    date: string;
    company: string;
    branch: string;
    customer: string;
    total: string;
    quantity: string;
    unitPrice: string;
    colorCode: string;
    item: string;
    yes: string;
    no: string;
    selectCompany: string;
    selectBranch: string;
    selectCustomer: string;
    selectItem: string;
    selectPo: string;
  };
  // Customer PO Specifics
  po: {
    title: string;
    newPo: string;
    editPo: string;
    poDetails: string;
    poNumber: string;
    poDate: string;
    expectedDelivery: string;
    lineItems: string;
    addLine: string;
    removeLine: string;
    orderedQty: string;
    fulfilledQty: string;
    remainingQty: string;
    statusDraft: string;
    statusOpen: string;
    statusClosed: string;
    statusCancelled: string;
    activate: string;
    cancelPo: string;
    closePo: string;
    confirmActivateTitle: string;
    confirmActivateDesc: string;
    confirmCancelTitle: string;
    confirmCancelDesc: string;
    confirmCloseTitle: string;
    confirmCloseDesc: string;
    emptyTitle: string;
    emptyDesc: string;
    createSuccess: string;
    updateSuccess: string;
    activateSuccess: string;
    cancelSuccess: string;
    closeSuccess: string;
    deleteForbidden: string;
    cannotEditImmutable: string;
    deliveryOrdersCount: string;
    validation: {
      companyRequired: string;
      customerRequired: string;
      poNumberRequired: string;
      poDateRequired: string;
      linesRequired: string;
      itemRequired: string;
      quantityPositive: string;
      quantityExceedsRemaining: string;
      itemCustomerMismatch: string;
    };
  };
  // Delivery Order / Surat Jalan
  delivery: {
    title: string;
    newSj: string;
    sjNumber: string;
    deliveryDate: string;
    shippingAddress: string;
    driverName: string;
    vehiclePlate: string;
    customerPo: string;
    customerPoLine: string;
    selectPoFirst: string;
    poRemainingQty: string;
    deliveryQty: string;
    qtyExceedsError: string;
    deliverySuccess: string;
    emptyTitle: string;
    emptyDesc: string;
    acceptanceTitle: string;
    newAcceptance: string;
    acceptanceNumber: string;
    acceptanceDate: string;
    qtyOk: string;
    qtyRejected: string;
    rejectReason: string;
    recordAcceptance: string;
    submitAcceptance: string;
    postAcceptance: string;
    overAcceptanceError: string;
  };
  invoice: {
    title: string;
    desc: string;
    createDraft: string;
    invoiceNumber: string;
    invoiceDate: string;
    dueDate: string;
    selectCustomer: string;
    selectDeliveryOrders: string;
    taxCondition: string;
    taxConditionHint: string;
    taxCond1: string;
    taxCond2: string;
    taxCond3: string;
    dpp: string;
    ppn: string;
    pph: string;
    totalNet: string;
    sjSelected: string;
    confirmCreateTitle: string;
    confirmCreateDesc: string;
    confirmPostTitle: string;
    confirmPostDesc: string;
    confirmCancelTitle: string;
    confirmCancelDesc: string;
    createSuccess: string;
    postSuccess: string;
    cancelSuccess: string;
    emptyTitle: string;
    emptyDesc: string;
    noEligibleSj: string;
    subtotal: string;
    amountPaid: string;
    amountDue: string;
    postedBy: string;
    postedAt: string;
    lines: string;
    linkedSj: string;
  };
  payment: {
    title: string;
    desc: string;
    newPayment: string;
    paymentNumber: string;
    paymentDate: string;
    method: string;
    amount: string;
    referenceNo: string;
    selectInvoice: string;
    allocateAmount: string;
    outstanding: string;
    totalBilled: string;
    totalPaid: string;
    totalOutstanding: string;
    payFull: string;
    invoiceNumber: string;
    invoiceDate: string;
    totalAmount: string;
    amountDue: string;
    noInvoices: string;
    paymentSuccess: string;
    emptyTitle: string;
    emptyDesc: string;
    validation: {
      amountRequired: string;
      amountPositive: string;
      dateRequired: string;
      methodRequired: string;
      customerRequired: string;
      noAllocations: string;
      allocExceedsAmount: string;
    };
  };
};

const idTranslations: Translations = {
  nav: {
    operations: 'OPERASIONAL',
    inventory: 'INVENTARIS',
    finance: 'KEUANGAN',
    dashboard: 'Dashboard',
    custody: 'Custody Barang',
    customerPo: 'Customer PO',
    delivery: 'Surat Jalan & Acceptance',
    materials: 'Gudang Material',
    invoicing: 'Invoicing & Pajak',
    payments: 'Pembayaran',
    reports: 'Laporan',
    templates: 'Template Dokumen',
    master: 'Master Data',
    users: 'Manajemen Pengguna',
    logout: 'Keluar',
    isolatedCustody: 'Custody terisolasi',
    offBalanceSheet: 'Off-balance sheet active',
  },
  pages: {
    dashboardTitle: 'Dashboard',
    dashboardDesc: 'Monitoring operasional workshop hari ini.',
    custodyTitle: 'Custody Barang',
    custodyDesc: 'Pencatatan fisik dan lokasi barang customer di workshop.',
    poTitle: 'Customer Purchase Order',
    poDesc: 'Kelola Purchase Order (PO) resmi dari customer dan alokasi pesanan.',
    deliveryTitle: 'Surat Jalan & Acceptance',
    deliveryDesc: 'Pengiriman dan bukti penerimaan dari customer.',
    materialsTitle: 'Gudang Material',
    materialsDesc: 'Pantau persediaan bahan baku dan minimum stock.',
    invoicingTitle: 'Invoicing & Pajak',
    invoicingDesc: 'Gabungkan surat jalan accepted ke draft invoice.',
    paymentsTitle: 'Pembayaran',
    paymentsDesc: 'Kelola riwayat pembayaran dan pelunasan invoice.',
    reportsTitle: 'Laporan & Analitik',
    reportsDesc: 'Laporan keuangan, operasional, dan rekapitulasi workshop.',
    templatesTitle: 'Template Dokumen',
    templatesDesc: 'Kelola template dokumen cetak dan surat jalan.',
    masterTitle: 'Master Data',
    masterDesc: 'Kelola data referensi perusahaan, cabang, dan master item.',
    usersTitle: 'Manajemen Pengguna',
    usersDesc: 'Kelola akun pengguna, peran, dan hak akses sistem.',
  },
  common: {
    search: 'Cari data...',
    filter: 'Filter',
    allStatus: 'Semua Status',
    actions: 'Tindakan',
    cancel: 'Batal',
    confirm: 'Konfirmasi',
    save: 'Simpan',
    saveDraft: 'Simpan Draft',
    close: 'Tutup',
    edit: 'Edit',
    delete: 'Hapus',
    view: 'Lihat',
    details: 'Detail',
    loading: 'Memuat data...',
    saving: 'Menyimpan...',
    reload: 'Muat ulang',
    previous: 'Sebelumnya',
    next: 'Berikutnya',
    page: 'Halaman',
    of: 'dari',
    items: 'data',
    notes: 'Catatan',
    status: 'Status',
    date: 'Tanggal',
    company: 'Perusahaan',
    branch: 'Cabang',
    customer: 'Customer',
    total: 'Total',
    quantity: 'Kuantitas',
    unitPrice: 'Harga Satuan',
    colorCode: 'Kode Warna',
    item: 'Barang',
    yes: 'Ya',
    no: 'Tidak',
    selectCompany: 'Pilih perusahaan',
    selectBranch: 'Pilih cabang',
    selectCustomer: 'Pilih customer',
    selectItem: 'Pilih barang customer',
    selectPo: 'Pilih Customer PO',
  },
  po: {
    title: 'Customer Purchase Order',
    newPo: 'Buat Customer PO',
    editPo: 'Edit Customer PO Draft',
    poDetails: 'Detail Customer PO',
    poNumber: 'Nomor PO',
    poDate: 'Tanggal PO',
    expectedDelivery: 'Target Pengiriman',
    lineItems: 'Baris Pesanan (Lines)',
    addLine: 'Tambah Line Item',
    removeLine: 'Hapus Line',
    orderedQty: 'Dipesan',
    fulfilledQty: 'Terkirim',
    remainingQty: 'Sisa PO',
    statusDraft: 'Draft',
    statusOpen: 'Aktif (Open)',
    statusClosed: 'Selesai (Closed)',
    statusCancelled: 'Batal (Cancelled)',
    activate: 'Aktifkan PO',
    cancelPo: 'Batalkan PO',
    closePo: 'Tutup PO',
    confirmActivateTitle: 'Aktifkan Customer PO?',
    confirmActivateDesc: 'PO yang diaktifkan akan dapat digunakan untuk pembuatan Surat Jalan.',
    confirmCancelTitle: 'Batalkan Customer PO?',
    confirmCancelDesc: 'PO yang dibatalkan tidak dapat digunakan kembali. Surat Jalan aktif mencegah pembatalan.',
    confirmCloseTitle: 'Tutup Customer PO?',
    confirmCloseDesc: 'Tutup PO secara permanen dari pemenuhan baru.',
    emptyTitle: 'Belum ada Customer PO',
    emptyDesc: 'Customer PO yang dibuat akan muncul di tabel ini.',
    createSuccess: 'Customer PO draft berhasil dibuat.',
    updateSuccess: 'Customer PO draft berhasil diperbarui.',
    activateSuccess: 'Customer PO berhasil diaktifkan.',
    cancelSuccess: 'Customer PO berhasil dibatalkan.',
    closeSuccess: 'Customer PO berhasil ditutup.',
    deleteForbidden: 'Penghapusan permanen PO tidak diizinkan. Gunakan pembatalan.',
    cannotEditImmutable: 'PO dengan status CLOSED atau CANCELLED tidak dapat diubah.',
    deliveryOrdersCount: 'Surat Jalan Terkait',
    validation: {
      companyRequired: 'Perusahaan wajib dipilih.',
      customerRequired: 'Customer wajib dipilih.',
      poNumberRequired: 'Nomor PO wajib diisi.',
      poDateRequired: 'Tanggal PO wajib diisi.',
      linesRequired: 'Minimal harus ada 1 baris pesanan.',
      itemRequired: 'Barang customer wajib dipilih.',
      quantityPositive: 'Kuantitas harus lebih besar dari 0.',
      quantityExceedsRemaining: 'Kuantitas melebihi sisa kuantitas PO.',
      itemCustomerMismatch: 'Barang tidak sesuai dengan customer terpilih.',
    },
  },
  delivery: {
    title: 'Surat Jalan',
    newSj: 'Buat Surat Jalan',
    sjNumber: 'No. Surat Jalan',
    deliveryDate: 'Tanggal Pengiriman',
    shippingAddress: 'Alamat Pengiriman',
    driverName: 'Nama Driver',
    vehiclePlate: 'Plat Kendaraan',
    customerPo: 'Customer PO',
    customerPoLine: 'Baris Customer PO',
    selectPoFirst: 'Pilih Customer PO terlebih dahulu',
    poRemainingQty: 'Sisa PO Line',
    deliveryQty: 'Kuantitas Kirim',
    qtyExceedsError: 'Kuantitas pengiriman melebihi sisa kuantitas PO line.',
    deliverySuccess: 'Surat Jalan berhasil dibuat.',
    emptyTitle: 'Belum ada surat jalan',
    emptyDesc: 'Surat jalan yang dibuat akan muncul di sini.',
    acceptanceTitle: 'Penerimaan Customer',
    newAcceptance: 'Catat Penerimaan',
    acceptanceNumber: 'No. Penerimaan',
    acceptanceDate: 'Tanggal Penerimaan',
    qtyOk: 'Qty Diterima (OK)',
    qtyRejected: 'Qty Ditolak (Reject)',
    rejectReason: 'Alasan Penolakan',
    recordAcceptance: 'Buat Penerimaan Customer',
    submitAcceptance: 'Ajukan Penerimaan',
    postAcceptance: 'Posting Penerimaan',
    overAcceptanceError: 'Jumlah kuantitas diterima dan ditolak melebihi kuantitas pengiriman.',
  },
  invoice: {
    title: 'Invoicing & Pajak',
    desc: 'Buat invoice dari Surat Jalan yang sudah di-accept, kelola lifecycle draft/post/cancel.',
    createDraft: 'Buat Draft Invoice',
    invoiceNumber: 'No. Invoice',
    invoiceDate: 'Tanggal Invoice',
    dueDate: 'Jatuh Tempo',
    selectCustomer: 'Pilih customer',
    selectDeliveryOrders: 'Pilih Surat Jalan eligible',
    taxCondition: 'Kondisi Pajak',
    taxConditionHint: 'Perhitungan pajak dilakukan oleh backend.',
    taxCond1: 'Kondisi 1 — Tanpa PPN & PPh',
    taxCond2: 'Kondisi 2 — PPh 2,5%',
    taxCond3: 'Kondisi 3 — PPN 11% + PPh 2%',
    dpp: 'DPP / Subtotal',
    ppn: 'PPN',
    pph: 'PPh',
    totalNet: 'Total Net Tagihan',
    sjSelected: 'SJ dipilih',
    confirmCreateTitle: 'Buat draft invoice?',
    confirmCreateDesc: 'Invoice draft akan dibuat dari Surat Jalan yang dipilih.',
    confirmPostTitle: 'Posting invoice?',
    confirmPostDesc: 'Invoice yang sudah diposting tidak dapat diedit atau dihapus.',
    confirmCancelTitle: 'Batalkan invoice?',
    confirmCancelDesc: 'Invoice yang dibatalkan akan melepas kuantitas SJ yang sudah ditagih.',
    createSuccess: 'Invoice draft berhasil dibuat.',
    postSuccess: 'Invoice berhasil diposting.',
    cancelSuccess: 'Invoice berhasil dibatalkan.',
    emptyTitle: 'Belum ada invoice',
    emptyDesc: 'Invoice yang dibuat akan muncul di sini.',
    noEligibleSj: 'Belum ada Surat Jalan eligible untuk customer ini.',
    subtotal: 'Subtotal',
    amountPaid: 'Sudah Dibayar',
    amountDue: 'Sisa Tagihan',
    postedBy: 'Diposting oleh',
    postedAt: 'Diposting pada',
    lines: 'Detail Baris',
    linkedSj: 'Surat Jalan Terkait',
  },
  payment: {
    title: 'Pembayaran',
    desc: 'Kelola pembayaran invoice dan outstanding customer.',
    newPayment: 'Buat Pembayaran',
    paymentNumber: 'No. Pembayaran',
    paymentDate: 'Tanggal Bayar',
    method: 'Metode',
    amount: 'Jumlah',
    referenceNo: 'No. Referensi',
    selectInvoice: 'Pilih Invoice',
    allocateAmount: 'Alokasi',
    outstanding: 'Outstanding',
    totalBilled: 'Total Tagihan',
    totalPaid: 'Total Dibayar',
    totalOutstanding: 'Total Outstanding',
    payFull: 'Lunasi',
    invoiceNumber: 'No. Invoice',
    invoiceDate: 'Tgl Invoice',
    totalAmount: 'Total Invoice',
    amountDue: 'Sisa Tagihan',
    noInvoices: 'Belum ada invoice untuk customer ini.',
    paymentSuccess: 'Pembayaran berhasil dicatat.',
    emptyTitle: 'Belum ada pembayaran',
    emptyDesc: 'Pembayaran yang dicatat akan muncul di sini.',
    validation: {
      amountRequired: 'Jumlah wajib diisi.',
      amountPositive: 'Jumlah harus lebih dari 0.',
      dateRequired: 'Tanggal bayar wajib diisi.',
      methodRequired: 'Metode wajib diisi.',
      customerRequired: 'Customer wajib dipilih.',
      noAllocations: 'Minimal satu alokasi ke invoice.',
      allocExceedsAmount: 'Total alokasi harus sama dengan jumlah pembayaran.',
    },
  },
};

const enTranslations: Translations = {
  nav: {
    operations: 'OPERATIONS',
    inventory: 'INVENTORY',
    finance: 'FINANCE',
    dashboard: 'Dashboard',
    custody: 'Goods Custody',
    customerPo: 'Customer PO',
    delivery: 'Delivery Order & Acceptance',
    materials: 'Material Warehouse',
    invoicing: 'Invoicing & Tax',
    payments: 'Payments',
    reports: 'Reports',
    templates: 'Document Templates',
    master: 'Master Data',
    users: 'User Management',
    logout: 'Logout',
    isolatedCustody: 'Isolated Custody',
    offBalanceSheet: 'Off-balance sheet active',
  },
  pages: {
    dashboardTitle: 'Dashboard',
    dashboardDesc: 'Workshop operational monitoring today.',
    custodyTitle: 'Goods Custody',
    custodyDesc: 'Physical recording and customer goods location in workshop.',
    poTitle: 'Customer Purchase Order',
    poDesc: 'Manage customer POs and order fulfillment tracking.',
    deliveryTitle: 'Delivery Order & Acceptance',
    deliveryDesc: 'Deliveries and customer proof of acceptance.',
    materialsTitle: 'Material Warehouse',
    materialsDesc: 'Monitor raw material stock and minimum reorder levels.',
    invoicingTitle: 'Invoicing & Tax',
    invoicingDesc: 'Combine accepted delivery orders into draft invoices.',
    paymentsTitle: 'Payments',
    paymentsDesc: 'Manage payment records and invoice settlements.',
    reportsTitle: 'Reports & Analytics',
    reportsDesc: 'Financial, operational, and workshop summary reports.',
    templatesTitle: 'Document Templates',
    templatesDesc: 'Manage printable document templates and delivery slips.',
    masterTitle: 'Master Data',
    masterDesc: 'Manage company, branch, and item reference data.',
    usersTitle: 'User Management',
    usersDesc: 'Manage user accounts, roles, and system permissions.',
  },
  common: {
    search: 'Search data...',
    filter: 'Filter',
    allStatus: 'All Statuses',
    actions: 'Actions',
    cancel: 'Cancel',
    confirm: 'Confirm',
    save: 'Save',
    saveDraft: 'Save Draft',
    close: 'Close',
    edit: 'Edit',
    delete: 'Delete',
    view: 'View',
    details: 'Details',
    loading: 'Loading data...',
    saving: 'Saving...',
    reload: 'Reload',
    previous: 'Previous',
    next: 'Next',
    page: 'Page',
    of: 'of',
    items: 'items',
    notes: 'Notes',
    status: 'Status',
    date: 'Date',
    company: 'Company',
    branch: 'Branch',
    customer: 'Customer',
    total: 'Total',
    quantity: 'Quantity',
    unitPrice: 'Unit Price',
    colorCode: 'Color Code',
    item: 'Item',
    yes: 'Yes',
    no: 'No',
    selectCompany: 'Select company',
    selectBranch: 'Select branch',
    selectCustomer: 'Select customer',
    selectItem: 'Select customer item',
    selectPo: 'Select Customer PO',
  },
  po: {
    title: 'Customer Purchase Order',
    newPo: 'Create Customer PO',
    editPo: 'Edit Customer PO Draft',
    poDetails: 'Customer PO Details',
    poNumber: 'PO Number',
    poDate: 'PO Date',
    expectedDelivery: 'Expected Delivery',
    lineItems: 'Line Items',
    addLine: 'Add Line Item',
    removeLine: 'Remove Line',
    orderedQty: 'Ordered',
    fulfilledQty: 'Fulfilled',
    remainingQty: 'Remaining PO',
    statusDraft: 'Draft',
    statusOpen: 'Active (Open)',
    statusClosed: 'Closed',
    statusCancelled: 'Cancelled',
    activate: 'Activate PO',
    cancelPo: 'Cancel PO',
    closePo: 'Close PO',
    confirmActivateTitle: 'Activate Customer PO?',
    confirmActivateDesc: 'Activated PO can be selected for Delivery Order creation.',
    confirmCancelTitle: 'Cancel Customer PO?',
    confirmCancelDesc: 'Cancelled PO cannot be reused. Active Delivery Orders prevent cancellation.',
    confirmCloseTitle: 'Close Customer PO?',
    confirmCloseDesc: 'Permanently close PO from new fulfillment.',
    emptyTitle: 'No Customer POs found',
    emptyDesc: 'Created Customer POs will appear in this table.',
    createSuccess: 'Customer PO draft created successfully.',
    updateSuccess: 'Customer PO draft updated successfully.',
    activateSuccess: 'Customer PO activated successfully.',
    cancelSuccess: 'Customer PO cancelled successfully.',
    closeSuccess: 'Customer PO closed successfully.',
    deleteForbidden: 'Permanent deletion of PO is strictly forbidden. Use cancellation.',
    cannotEditImmutable: 'CLOSED or CANCELLED POs cannot be modified.',
    deliveryOrdersCount: 'Related Delivery Orders',
    validation: {
      companyRequired: 'Company selection is required.',
      customerRequired: 'Customer selection is required.',
      poNumberRequired: 'PO number is required.',
      poDateRequired: 'PO date is required.',
      linesRequired: 'At least 1 line item is required.',
      itemRequired: 'Customer item is required.',
      quantityPositive: 'Quantity must be greater than 0.',
      quantityExceedsRemaining: 'Quantity exceeds remaining PO line quantity.',
      itemCustomerMismatch: 'Item does not belong to the selected customer.',
    },
  },
  delivery: {
    title: 'Delivery Order',
    newSj: 'Create Delivery Order',
    sjNumber: 'DO Number',
    deliveryDate: 'Delivery Date',
    shippingAddress: 'Shipping Address',
    driverName: 'Driver Name',
    vehiclePlate: 'Vehicle Plate',
    customerPo: 'Customer PO',
    customerPoLine: 'Customer PO Line',
    selectPoFirst: 'Select Customer PO first',
    poRemainingQty: 'PO Line Remaining',
    deliveryQty: 'Delivery Quantity',
    qtyExceedsError: 'Delivery quantity exceeds remaining PO line quantity.',
    deliverySuccess: 'Delivery Order created successfully.',
    emptyTitle: 'No Delivery Orders found',
    emptyDesc: 'Created Delivery Orders will appear here.',
    acceptanceTitle: 'Customer Acceptance',
    newAcceptance: 'Record Acceptance',
    acceptanceNumber: 'Acceptance No.',
    acceptanceDate: 'Acceptance Date',
    qtyOk: 'Qty Accepted (OK)',
    qtyRejected: 'Qty Rejected',
    rejectReason: 'Rejection Reason',
    recordAcceptance: 'Create Customer Acceptance',
    submitAcceptance: 'Submit Acceptance',
    postAcceptance: 'Post Acceptance',
    overAcceptanceError: 'Total accepted and rejected quantity exceeds delivery quantity.',
  },
  invoice: {
    title: 'Invoicing & Tax',
    desc: 'Create invoices from accepted delivery orders, manage draft/post/cancel lifecycle.',
    createDraft: 'Create Draft Invoice',
    invoiceNumber: 'Invoice No.',
    invoiceDate: 'Invoice Date',
    dueDate: 'Due Date',
    selectCustomer: 'Select customer',
    selectDeliveryOrders: 'Select eligible delivery orders',
    taxCondition: 'Tax Condition',
    taxConditionHint: 'Tax calculation is handled by the backend.',
    taxCond1: 'Condition 1 — No VAT & WHT',
    taxCond2: 'Condition 2 — WHT 2.5%',
    taxCond3: 'Condition 3 — VAT 11% + WHT 2%',
    dpp: 'DPP / Subtotal',
    ppn: 'VAT',
    pph: 'WHT',
    totalNet: 'Total Net Invoice',
    sjSelected: 'DO selected',
    confirmCreateTitle: 'Create draft invoice?',
    confirmCreateDesc: 'A draft invoice will be created from the selected delivery orders.',
    confirmPostTitle: 'Post invoice?',
    confirmPostDesc: 'Posted invoices cannot be edited or deleted.',
    confirmCancelTitle: 'Cancel invoice?',
    confirmCancelDesc: 'Cancelling releases invoiced quantities back to delivery orders.',
    createSuccess: 'Draft invoice created successfully.',
    postSuccess: 'Invoice posted successfully.',
    cancelSuccess: 'Invoice cancelled successfully.',
    emptyTitle: 'No invoices yet',
    emptyDesc: 'Created invoices will appear here.',
    noEligibleSj: 'No eligible delivery orders found for this customer.',
    subtotal: 'Subtotal',
    amountPaid: 'Amount Paid',
    amountDue: 'Amount Due',
    postedBy: 'Posted by',
    postedAt: 'Posted at',
    lines: 'Line Items',
    linkedSj: 'Linked Delivery Orders',
  },
  payment: {
    title: 'Payments',
    desc: 'Manage invoice payments and customer outstanding.',
    newPayment: 'Create Payment',
    paymentNumber: 'Payment No.',
    paymentDate: 'Payment Date',
    method: 'Method',
    amount: 'Amount',
    referenceNo: 'Reference No.',
    selectInvoice: 'Select Invoice',
    allocateAmount: 'Allocation',
    outstanding: 'Outstanding',
    totalBilled: 'Total Billed',
    totalPaid: 'Total Paid',
    totalOutstanding: 'Total Outstanding',
    payFull: 'Pay Full',
    invoiceNumber: 'Invoice No.',
    invoiceDate: 'Invoice Date',
    totalAmount: 'Invoice Total',
    amountDue: 'Amount Due',
    noInvoices: 'No invoices found for this customer.',
    paymentSuccess: 'Payment recorded successfully.',
    emptyTitle: 'No payments yet',
    emptyDesc: 'Recorded payments will appear here.',
    validation: {
      amountRequired: 'Amount is required.',
      amountPositive: 'Amount must be greater than 0.',
      dateRequired: 'Payment date is required.',
      methodRequired: 'Method is required.',
      customerRequired: 'Customer is required.',
      noAllocations: 'At least one invoice allocation is required.',
      allocExceedsAmount: 'Total allocation must equal the payment amount.',
    },
  },
};

type LanguageContextValue = {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    return (localStorage.getItem('sj_locale') as Language) || 'id';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('sj_locale', lang);
  };

  const t = language === 'en' ? enTranslations : idTranslations;

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}
