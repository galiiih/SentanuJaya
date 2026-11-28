import { getLocalDateInputValue } from '../utils/date';
import { useState, useEffect, useRef } from 'react';
import { Plus, Edit, Trash2, Users, Layers, Package, Tag, Building2, BookOpen, Wrench, FileSpreadsheet, Upload, Download } from 'lucide-react';
import { apiError, type Customer, type CustomerItem } from '../services/api';
import { useAuth } from '../auth';
import { useLanguage } from '../i18n';
import axios from 'axios';
import {
  Alert,
  Button,
  Card,
  ConfirmationDialog,
  DataTable,
  FormField,
  Input,
  NumericInput,
  Select,
  Textarea,
  Modal,
  PageHeader,
  Toast,
} from './ui';

const masterApi = {
  companies: {
    icon: Building2,
    label: 'Perusahaan',
    list: () => axios.get('/api/v1/companies', { params: { per_page: 200 } }).then(r => r.data.data.data || r.data.data),
    create: (payload: any) => axios.post('/api/v1/companies', payload).then(r => r.data.data),
    update: (id: string, payload: any) => axios.patch(`/api/v1/companies/${id}`, payload).then(r => r.data.data),
    remove: (id: string) => axios.delete(`/api/v1/companies/${id}`).then(r => r.data.data),
  },
  branches: {
    icon: Building2,
    label: 'Cabang',
    list: () => axios.get('/api/v1/branches', { params: { per_page: 200 } }).then(r => r.data.data.data || r.data.data),
    create: (payload: any) => axios.post('/api/v1/branches', payload).then(r => r.data.data),
    update: (id: string, payload: any) => axios.patch('/api/v1/branches/' + id, payload).then(r => r.data.data),
    remove: (id: string) => axios.delete('/api/v1/branches/' + id).then(r => r.data.data),
  },
  customers: {
    icon: Building2,
    label: 'Customer',
    list: () => axios.get('/api/v1/customers', { params: { per_page: 200 } }).then(r => r.data.data.data || r.data.data),
    create: (payload: any) => axios.post('/api/v1/customers', payload).then(r => r.data.data),
    update: (id: string, payload: any) => axios.patch(`/api/v1/customers/${id}`, payload).then(r => r.data.data),
    remove: (id: string) => axios.delete(`/api/v1/customers/${id}`).then(r => r.data.data),
  },
  customer_contacts: {
    icon: Users,
    label: 'Customer Contact',
    list: () => axios.get('/api/v1/customer-contacts', { params: { per_page: 200 } }).then(r => r.data.data.data || r.data.data),
    create: (payload: any) => axios.post('/api/v1/customer-contacts', payload).then(r => r.data.data),
    update: (id: string, payload: any) => axios.patch(`/api/v1/customer-contacts/${id}`, payload).then(r => r.data.data),
    remove: (id: string) => axios.delete(`/api/v1/customer-contacts/${id}`).then(r => r.data.data),
  },
  customer_items: {
    icon: Wrench,
    label: 'Customer Item',
    list: () => axios.get('/api/v1/customer-items', { params: { per_page: 200 } }).then(r => r.data.data.data || r.data.data),
    create: (payload: any) => axios.post('/api/v1/customer-items', payload).then(r => r.data.data),
    update: (id: string, payload: any) => axios.patch(`/api/v1/customer-items/${id}`, payload).then(r => r.data.data),
    remove: (id: string) => axios.delete(`/api/v1/customer-items/${id}`).then(r => r.data.data),
  },
  price_lists: {
    icon: Tag,
    label: 'Price List',
    list: () => axios.get('/api/v1/price-lists', { params: { per_page: 200 } }).then(r => r.data.data.data || r.data.data),
    create: (payload: any) => axios.post('/api/v1/price-lists', payload).then(r => r.data.data),
    update: (id: string, payload: any) => axios.patch(`/api/v1/price-lists/${id}`, payload).then(r => r.data.data),
    remove: (id: string) => axios.delete(`/api/v1/price-lists/${id}`).then(r => r.data.data),
  },
  price_list_lines: {
    icon: FileSpreadsheet,
    label: 'Price List Line',
    list: () => axios.get('/api/v1/price-list-lines', { params: { per_page: 200 } }).then(r => r.data.data.data || r.data.data),
    create: (payload: any) => axios.post('/api/v1/price-list-lines', payload).then(r => r.data.data),
    update: (id: string, payload: any) => axios.patch(`/api/v1/price-list-lines/${id}`, payload).then(r => r.data.data),
    remove: (id: string) => axios.delete(`/api/v1/price-list-lines/${id}`).then(r => r.data.data),
  },
  uoms: {
    icon: Layers,
    label: 'Satuan (UOM)',
    list: () => axios.get('/api/v1/uoms', { params: { per_page: 200 } }).then(r => r.data.data.data || r.data.data),
    create: (payload: any) => axios.post('/api/v1/uoms', payload).then(r => r.data.data),
    update: (id: string, payload: any) => axios.patch(`/api/v1/uoms/${id}`, payload).then(r => r.data.data),
    remove: (id: string) => axios.delete(`/api/v1/uoms/${id}`).then(r => r.data.data),
  },
  materials: {
    icon: Package,
    label: 'Material / Cat',
    list: () => axios.get('/api/v1/materials', { params: { per_page: 200 } }).then(r => r.data.data.data || r.data.data),
    create: (payload: any) => axios.post('/api/v1/materials', payload).then(r => r.data.data),
    update: (id: string, payload: any) => axios.patch(`/api/v1/materials/${id}`, payload).then(r => r.data.data),
    remove: (id: string) => axios.delete(`/api/v1/materials/${id}`).then(r => r.data.data),
  },
  warehouses: {
    icon: Building2,
    label: 'Gudang',
    list: () => axios.get('/api/v1/warehouses', { params: { per_page: 200 } }).then(r => r.data.data.data || r.data.data),
    create: (payload: any) => axios.post('/api/v1/warehouses', payload).then(r => r.data.data),
    update: (id: string, payload: any) => axios.patch(`/api/v1/warehouses/${id}`, payload).then(r => r.data.data),
    remove: (id: string) => axios.delete(`/api/v1/warehouses/${id}`).then(r => r.data.data),
  },
  suppliers: {
    icon: BookOpen,
    label: 'Supplier',
    list: () => axios.get('/api/v1/suppliers', { params: { per_page: 200 } }).then(r => r.data.data.data || r.data.data),
    create: (payload: any) => axios.post('/api/v1/suppliers', payload).then(r => r.data.data),
    update: (id: string, payload: any) => axios.patch(`/api/v1/suppliers/${id}`, payload).then(r => r.data.data),
    remove: (id: string) => axios.delete(`/api/v1/suppliers/${id}`).then(r => r.data.data),
  }
};

type MasterKey = keyof typeof masterApi;

const getMasterLabel = (key: MasterKey, english: boolean): string => {
  if (!english) return masterApi[key].label;
  const labels: Record<MasterKey, string> = {
    companies: 'Company',
    branches: 'Branch',
    customers: 'Customers',
    customer_contacts: 'Customer Contacts',
    customer_items: 'Customer Items',
    price_lists: 'Price Lists',
    price_list_lines: 'Price List Lines',
    uoms: 'Units of Measure',
    materials: 'Materials',
    warehouses: 'Warehouses',
    suppliers: 'Suppliers',
  };
  return labels[key];
};

// Display quantities without meaningless trailing decimal zeros while preserving
// fractional stock thresholds (e.g. 1.000 -> 1 and 1.500 -> 1,5).
const formatStockQuantity = (value: unknown, locale = 'id-ID'): string => {
  if (value === null || value === undefined || value === '') return '-';
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return String(value);
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 3 }).format(numeric);
};

export function MasterDataPage() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const en = language === 'en';
  const tr = (id: string, english: string) => en ? english : id;
  const isAdminOrOwner = user?.role === 'ADMIN' || user?.role === 'OWNER';
  const [tab, setTab] = useState<MasterKey>('customers');
  const [data, setData] = useState<any[]>([]);
  const [, setLoading] = useState(true);
  // Ignore stale list responses when users switch tabs or save repeatedly.
  const loadRequestId = useRef(0);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // Dropdown options for relations
  const [companies, setCompanies] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerItems, setCustomerItems] = useState<CustomerItem[]>([]);
  const [priceLists, setPriceLists] = useState<any[]>([]);
  const [referencesLoading, setReferencesLoading] = useState(true);
  const [referencesError, setReferencesError] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [formData, setFormData] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkRows, setBulkRows] = useState<Record<string, string>[]>([]);
  const [bulkBusy, setBulkBusy] = useState(false);
  const bulkInputRef = useRef<HTMLInputElement>(null);

  const bulkFields: Record<MasterKey, string[]> = {
    companies: ['code','name','legal_name','npwp','is_pkp','pkp_date','address','phone','email'],
    branches: ['company_id','code','name','address','is_active'],
    customers: ['company_id','code','name','legal_name','npwp','tax_condition','address','phone','email'],
    customer_contacts: ['customer_id','name','title','phone','email'],
    customer_items: ['customer_id','code','name','vehicle_model','part_type'],
    price_lists: ['code','name','customer_id','effective_date','is_active'],
    price_list_lines: ['price_list_id','customer_item_id','unit_price'],
    uoms: ['code','name','category','decimal_places'],
    materials: ['code','name','category','unit','minimum_stock'],
    warehouses: ['branch_id','code','name','is_active'],
    suppliers: ['code','name','address','phone','email'],
  };

  const csvEscape = (value: unknown) => {
    const text = value == null || typeof value === 'object' ? '' : String(value);
    return /[\",\\r\\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
  };
  const makeCsv = (rows: unknown[][]) => '\uFEFF' + rows.map(row => row.map(csvEscape).join(',')).join('\r\n');
  const saveCsv = (filename: string, rows: unknown[][]) => {
    const url = URL.createObjectURL(new Blob([makeCsv(rows)], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a'); link.href = url; link.download = filename; link.click(); URL.revokeObjectURL(url);
  };
  const parseCsvText = (text: string): string[][] => {
    const output: string[][] = []; let row: string[] = []; let cell = ''; let quoted = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (quoted) { if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (ch === '"') quoted = false; else cell += ch; }
      else if (ch === '"' && cell.length === 0) quoted = true;
      else if (ch === ',') { row.push(cell); cell = ''; }
      else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cell); output.push(row); row = []; cell = ''; }
      else cell += ch;
    }
    if (cell.length || row.length) { row.push(cell); output.push(row); }
    return output.filter(r => r.some(v => v.trim() !== ''));
  };
  const handleBulkExport = async () => {
    try {
      const fields = bulkFields[tab];
      const endpoint = '/api/v1/' + ({ companies:'companies', branches:'branches', customers:'customers', customer_contacts:'customer-contacts', customer_items:'customer-items', price_lists:'price-lists', price_list_lines:'price-list-lines', uoms:'uoms', materials:'materials', warehouses:'warehouses', suppliers:'suppliers' } as Record<MasterKey,string>)[tab];
      const rows: any[] = []; let page = 1; let lastPage = 1;
      do {
        const response = await axios.get(endpoint, { params: { per_page: 200, page } });
        const payload = response.data?.data; const pageRows = Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : Array.isArray(response.data) ? response.data : [];
        rows.push(...pageRows);
        lastPage = Number(payload?.last_page ?? payload?.meta?.last_page ?? 1); page++;
      } while (page <= lastPage);
      saveCsv('sentanu-jaya-' + tab + '-export.csv', [fields, ...rows.map((item: any) => fields.map(field => item[field] ?? ''))]);
      setNotice(tr('Export ' + getMasterLabel(tab, en) + ' selesai.', getMasterLabel(tab, en) + ' export completed.'));
    } catch (err: any) { setError(apiError(err)); }
  };
  const handleBulkTemplate = () => saveCsv('sentanu-jaya-' + tab + '-template.csv', [bulkFields[tab]]);
  const handleBulkFile = async (file: File | null) => {
    setBulkFile(file); setBulkRows([]); if (!file) return;
    if (!file.name.toLowerCase().endsWith('.csv')) { setError(tr('Import saat ini menerima CSV UTF-8. Simpan file Excel sebagai CSV terlebih dahulu.', 'Import currently accepts UTF-8 CSV. Save the Excel file as CSV first.')); return; }
    try {
      const parsed = parseCsvText(await file.text());
      if (parsed.length < 2) throw new Error(tr('File harus memiliki header dan minimal satu baris data.', 'File must contain a header and at least one data row.'));
      const headers = parsed[0].map(h => h.trim().replace(/^\uFEFF/, '')); const required = bulkFields[tab];
      const missing = required.filter(field => !headers.includes(field));
      if (missing.length) throw new Error(tr('Kolom template tidak ditemukan: ', 'Missing template columns: ') + missing.join(', '));
      const mappedRows = parsed.slice(1).map(values => Object.fromEntries(headers.map((header, i) => [header, values[i] ?? '']))); setBulkRows(mappedRows); setError('');
    } catch (err: any) { setError(err?.message || tr('CSV tidak dapat dibaca.', 'Unable to read CSV.')); }
  };
  const handleBulkImport = async () => {
    if (!isAdminOrOwner || bulkRows.length === 0) return;
    setBulkBusy(true); let created = 0; const errors: string[] = [];
    try {
      for (let i = 0; i < bulkRows.length; i++) {
        const row = bulkRows[i]; const payload: Record<string, unknown> = {};
        for (const field of bulkFields[tab]) {
          const value = (row[field] ?? '').trim(); if (!value) continue;
          if (['is_active','is_pkp'].includes(field)) payload[field] = ['1','true','yes','ya','aktif'].includes(value.toLowerCase());
          else if (['tax_condition','decimal_places'].includes(field)) payload[field] = Number(value);
          else if (['unit_price','minimum_stock'].includes(field)) payload[field] = Number(value.replace(/,/g, ''));
          else payload[field] = value;
        }
        try { await masterApi[tab].create(payload); created++; } catch (err: any) { errors.push(tr('Baris ', 'Row ') + (i + 2) + ': ' + apiError(err)); }
      }
      setNotice(tr('Import selesai: ', 'Import completed: ') + created + tr(' berhasil, ', ' succeeded, ') + errors.length + tr(' gagal.', ' failed.'));
      setError(errors.slice(0, 10).join('\n')); setBulkRows([]); setBulkFile(null); if (bulkInputRef.current) bulkInputRef.current.value = '';
      await loadData(); if (tab === 'companies' || tab === 'branches') await loadReferences();
    } finally { setBulkBusy(false); }
  };

  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
  }>({ open: false, title: '', description: '', onConfirm: () => {} });

  const loadReferences = async () => {
    setReferencesLoading(true);
    setReferencesError('');
    const requests = [
      { label: 'Perusahaan', load: () => axios.get('/api/v1/companies', { params: { per_page: 100 } }), save: (value: any) => setCompanies(value) },
      { label: 'Cabang', load: () => axios.get('/api/v1/branches', { params: { per_page: 100 } }), save: (value: any) => setBranches(value) },
      { label: 'Customer', load: () => axios.get('/api/v1/customers', { params: { per_page: 200 } }), save: (value: any) => setCustomers(value) },
      { label: 'Customer Item', load: () => axios.get('/api/v1/customer-items', { params: { per_page: 200 } }), save: (value: any) => setCustomerItems(value) },
      { label: 'Price List', load: () => axios.get('/api/v1/price-lists', { params: { per_page: 200 } }), save: (value: any) => setPriceLists(value) },
    ] as const;
    try {
      // A temporary failure in one reference endpoint must not discard successful
      // responses from the other endpoints or leave every relationship empty.
      const results = await Promise.allSettled(requests.map(request => request.load()));
      const failures: string[] = [];
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          const payload = result.value.data;
          const rows = payload?.data?.data ?? payload?.data ?? payload ?? [];
          requests[index].save(Array.isArray(rows) ? rows : []);
        } else {
          failures.push(requests[index].label);
        }
      });
      if (failures.length) {
        setReferencesError(`${tr('Gagal memuat:', 'Failed to load:')} ${failures.join(', ')}. ${tr('Silakan coba lagi.', 'Please try again.')}`);
      }
    } finally {
      setReferencesLoading(false);
    }
  };

  const loadData = async () => {
    const requestId = ++loadRequestId.current;
    const requestedTab = tab;
    setLoading(true);
    setError('');
    try {
      const res = await masterApi[requestedTab].list();
      if (requestId === loadRequestId.current) {
        setData(Array.isArray(res) ? res : []);
      }
    } catch (err: any) {
      if (requestId === loadRequestId.current) {
        setError(apiError(err));
      }
    } finally {
      if (requestId === loadRequestId.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    loadReferences();
  }, []);

  useEffect(() => {
    // Clear the previous tab immediately so its rows cannot remain interactive
    // while the newly selected tab is still loading.
    setData([]);
    loadData();
  }, [tab]);

  const openCreate = () => {
    setEditingItem(null);
    const defaultCompanyId = companies[0]?.id || '';
    if (tab === 'companies') {
      setFormData({ code: '', name: '', address: '', phone: '', email: '' });
    } else if (tab === 'branches') {
      setFormData({ company_id: defaultCompanyId, code: '', name: '', address: '', is_active: true });
    } else if (tab === 'customers') {
      setFormData({ company_id: defaultCompanyId, code: '', name: '', legal_name: '', npwp: '', tax_condition: 3, address: '', phone: '', email: '' });
    } else if (tab === 'customer_contacts') {
      setFormData({ customer_id: customers[0]?.id || '', name: '', title: '', phone: '', email: '' });
    } else if (tab === 'customer_items') {
      setFormData({ customer_id: customers[0]?.id || '', code: '', name: '', vehicle_model: '', part_type: '' });
    } else if (tab === 'price_lists') {
      setFormData({ code: '', name: '', customer_id: customers[0]?.id || '', effective_date: getLocalDateInputValue(), is_active: true });
    } else if (tab === 'price_list_lines') {
      setFormData({ price_list_id: priceLists[0]?.id || '', customer_item_id: customerItems[0]?.id || '', unit_price: '' });
    } else if (tab === 'uoms') {
      setFormData({ code: '', name: '', category: 'GENERAL', decimal_places: 0 });
    } else if (tab === 'materials') {
      setFormData({ code: '', name: '', category: 'GENERAL', unit: 'LITER', minimum_stock: '', min_stock: '' });
    } else if (tab === 'warehouses') {
      setFormData({ branch_id: branches[0]?.id || '', code: '', name: '', is_active: true });
    } else if (tab === 'suppliers') {
      setFormData({ code: '', name: '', address: '', phone: '', email: '' });
    }
    setModalOpen(true);
  };

  const openEdit = (row: any) => {
    setEditingItem(row);
    setFormData({ ...row });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editingItem) {
        await masterApi[tab].update(editingItem.id, tab === 'price_list_lines' ? { ...formData, unit_price: Number(formData.unit_price || 0) } : tab === 'materials' ? { ...formData, minimum_stock: Number(formData.minimum_stock ?? formData.min_stock ?? 0) } : formData);
        setNotice(tr('Data master berhasil diperbarui.', 'Master data updated successfully.'));
      } else {
        await masterApi[tab].create(tab === 'price_list_lines' ? { ...formData, unit_price: Number(formData.unit_price || 0) } : tab === 'materials' ? { ...formData, minimum_stock: Number(formData.minimum_stock ?? formData.min_stock ?? 0) } : formData);
        setNotice(tr('Data master berhasil ditambahkan.', 'Master data created successfully.'));
      }
      setModalOpen(false);
      // Companies and branches are relationship options used by other master
      // forms. Refresh them after mutations so a company/branch created in this
      // session is immediately selectable without a full page reload.
      if (tab === 'companies' || tab === 'branches') {
        await loadReferences();
      }
      // Finish refreshing the table before the save flow settles so callers see
      // one stable, server-backed state rather than a late competing render.
      await loadData();
    } catch (err: any) {
      setError(apiError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (row: any) => {
    setConfirmState({
      open: true,
      title: tr('Hapus Data Master?', 'Delete Master Data?'),
      description: `${tr('Apakah Anda yakin ingin menghapus', 'Are you sure you want to delete')} ${row.name || row.code || tr('data ini', 'this record')}?`,
      onConfirm: async () => {
        try {
          await masterApi[tab].remove(row.id);
          setNotice(tr('Data master berhasil dihapus.', 'Master data deleted successfully.'));
          setConfirmState(s => ({ ...s, open: false }));
          if (tab === 'companies' || tab === 'branches') {
            await loadReferences();
          }
          await loadData();
        } catch (err: any) {
          setError(apiError(err));
          setConfirmState(s => ({ ...s, open: false }));
        }
      }
    });
  };

  const getColumnsForTab = () => {
    const isAdminOrOwner = user?.role === 'ADMIN' || user?.role === 'OWNER';
    const actionColumn = isAdminOrOwner ? [{
      id: 'actions',
      header: tr('Aksi', 'Actions'),
      cell: (row: any) => (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Button variant="ghost" onClick={() => openEdit(row)} title={tr('Edit', 'Edit')} aria-label={tr('Edit', 'Edit')}><Edit size={16} /></Button>
          <Button variant="ghost" onClick={() => handleDelete(row)} title={tr('Hapus', 'Delete')} aria-label={tr('Hapus', 'Delete')} style={{ color: 'var(--color-danger)' }}><Trash2 size={16} /></Button>
        </div>
      )
    }] : [];

    switch (tab) {
      case 'companies':
        return [
          { id: 'code', header: tr('Kode', 'Code'), cell: (row: any) => row.code || '-' },
          { id: 'name', header: tr('Nama Perusahaan', 'Company Name'), cell: (row: any) => row.name || '-' },
          { id: 'phone', header: tr('Telepon', 'Phone'), cell: (row: any) => row.phone || '-' },
          { id: 'email', header: 'Email', cell: (row: any) => row.email || '-' },
          ...actionColumn
        ];
      case 'branches':
        return [
          { id: 'company', header: tr('Perusahaan', 'Company'), cell: (row: any) => row.company?.name || companies.find(company => company.id === row.company_id)?.name || '-' },
          { id: 'code', header: tr('Kode Cabang', 'Branch Code'), cell: (row: any) => row.code || '-' },
          { id: 'name', header: tr('Nama Cabang', 'Branch Name'), cell: (row: any) => row.name || '-' },
          { id: 'address', header: tr('Alamat', 'Address'), cell: (row: any) => row.address || '-' },
          { id: 'is_active', header: tr('Status', 'Status'), cell: (row: any) => row.is_active ? tr('Aktif', 'Active') : tr('Nonaktif', 'Inactive') },
          ...actionColumn
        ];
      case 'customers':
        return [
          { id: 'code', header: tr('Kode Customer', 'Customer Code'), cell: (row: any) => row.code || '-' },
          { id: 'name', header: tr('Nama Customer', 'Customer Name'), cell: (row: any) => row.name || '-' },
          { id: 'phone', header: tr('Telepon', 'Phone'), cell: (row: any) => row.phone || '-' },
          { id: 'email', header: 'Email', cell: (row: any) => row.email || '-' },
          ...actionColumn
        ];
      case 'customer_contacts':
        return [
          { id: 'customer', header: 'Customer', cell: (row: any) => row.customer?.name || '-' },
          { id: 'name', header: tr('Nama Kontak', 'Contact Name'), cell: (row: any) => row.name || '-' },
          { id: 'title', header: tr('Jabatan', 'Position'), cell: (row: any) => row.title || '-' },
          { id: 'phone', header: tr('Telepon', 'Phone'), cell: (row: any) => row.phone || '-' },
          ...actionColumn
        ];
      case 'customer_items':
        return [
          { id: 'code', header: tr('Kode Item', 'Item Code'), cell: (row: any) => row.code || '-' },
          { id: 'name', header: tr('Nama Barang / Part', 'Item / Part Name'), cell: (row: any) => row.name || '-' },
          { id: 'vehicle', header: tr('Model Kendaraan', 'Vehicle Model'), cell: (row: any) => row.vehicle_model || '-' },
          { id: 'type', header: tr('Tipe Part', 'Part Type'), cell: (row: any) => row.part_type || '-' },
          ...actionColumn
        ];
      case 'price_lists':
        return [
          { id: 'code', header: tr('Kode Price List', 'Price List Code'), cell: (row: any) => row.code || '-' },
          { id: 'name', header: tr('Nama Price List', 'Price List Name'), cell: (row: any) => row.name || '-' },
          { id: 'customer', header: 'Customer', cell: (row: any) => row.customer?.name || tr('Umum', 'General') },
          { id: 'date', header: tr('Tanggal Efektif', 'Effective Date'), cell: (row: any) => row.effective_date || '-' },
          ...actionColumn
        ];
      case 'price_list_lines':
        return [
          { id: 'price_list', header: 'Price List', cell: (row: any) => row.price_list?.name || '-' },
          { id: 'item', header: 'Customer Item', cell: (row: any) => row.customer_item?.name || '-' },
          { id: 'price', header: tr('Harga Satuan (IDR)', 'Unit Price (IDR)'), cell: (row: any) => row.unit_price ? `Rp ${Number(row.unit_price).toLocaleString(en ? 'en-US' : 'id-ID')}` : '-' },
          ...actionColumn
        ];
      case 'uoms':
        return [
          { id: 'code', header: tr('Kode Satuan', 'Unit Code'), cell: (row: any) => row.code || '-' },
          { id: 'name', header: tr('Nama Satuan', 'Unit Name'), cell: (row: any) => row.name || '-' },
          ...actionColumn
        ];
      case 'materials':
        return [
          { id: 'code', header: tr('Kode SKU', 'SKU Code'), cell: (row: any) => row.code || '-' },
          { id: 'name', header: tr('Nama Material / Cat', 'Material / Paint Name'), cell: (row: any) => row.name || '-' },
          { id: 'unit', header: tr('Satuan', 'Unit'), cell: (row: any) => row.unit || '-' },
          { id: 'min_stock', header: tr('Minimum Stok', 'Minimum Stock'), cell: (row: any) => formatStockQuantity(row.minimum_stock ?? row.min_stock, en ? 'en-US' : 'id-ID') },
          ...actionColumn
        ];
      case 'warehouses':
        return [
          { id: 'code', header: tr('Kode Gudang', 'Warehouse Code'), cell: (row: any) => row.code || '-' },
          { id: 'name', header: tr('Nama Gudang', 'Warehouse Name'), cell: (row: any) => row.name || '-' },
          { id: 'branch', header: tr('Cabang', 'Branch'), cell: (row: any) => row.branch?.name || '-' },
          { id: 'is_active', header: tr('Status', 'Status'), cell: (row: any) => row.is_active ? tr('Aktif', 'Active') : tr('Nonaktif', 'Inactive') },
          ...actionColumn
        ];
      case 'suppliers':
        return [
          { id: 'code', header: tr('Kode Supplier', 'Supplier Code'), cell: (row: any) => row.code || '-' },
          { id: 'name', header: tr('Nama Supplier', 'Supplier Name'), cell: (row: any) => row.name || '-' },
          { id: 'phone', header: tr('Telepon', 'Phone'), cell: (row: any) => row.phone || '-' },
          { id: 'email', header: 'Email', cell: (row: any) => row.email || '-' },
          ...actionColumn
        ];
      default:
        return [];
    }
  };

  const needsReferenceOptions = ['branches', 'customer_contacts', 'customer_items', 'price_lists', 'price_list_lines', 'warehouses', 'customers'].includes(tab);

  return (
    <div className="space-y-6">
      <PageHeader
        title={tr('Master Data & Referensi', 'Master Data & References')}
        description={tr('Kelola referensi sistem, pelanggan, item barang, kontak, price list, satuan, material, dan supplier secara terpusat.', 'Manage system references, customers, customer items, contacts, price lists, units, materials, and suppliers in one place.')}
        action={
          isAdminOrOwner ? (
            <Button onClick={openCreate} disabled={(needsReferenceOptions && (referencesLoading || !!referencesError)) || (tab === 'branches' && companies.length === 0) || (tab === 'warehouses' && branches.length === 0)} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <Plus size={16} /> {tr('Tambah', 'Add')} {getMasterLabel(tab, en)}
            </Button>
          ) : undefined
        }
      />

      {isAdminOrOwner && <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <Button variant="ghost" onClick={() => bulkInputRef.current?.click()}><Upload size={16} /> {tr('Import', 'Import')} {getMasterLabel(tab, en)}</Button>
        <Button variant="ghost" onClick={handleBulkExport}><Download size={16} /> {tr('Export', 'Export')} {getMasterLabel(tab, en)}</Button>
        <Button variant="ghost" onClick={handleBulkTemplate}><FileSpreadsheet size={16} /> {tr('Template CSV', 'CSV Template')}</Button>
        <input ref={bulkInputRef} type="file" accept=".csv,text/csv" hidden onChange={e => void handleBulkFile(e.target.files?.[0] ?? null)} />
      </div>}
      {bulkFile && bulkRows.length > 0 && <Card title={tr('Preview Import — ', 'Import Preview — ') + getMasterLabel(tab, en)}>
        <p>{bulkFile.name} — {bulkRows.length} {tr('baris. Import akan menambahkan record baru; tidak mengubah data yang sudah ada.', 'rows. Import creates new records; it does not update existing data.')}</p>
        <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse' }}><thead><tr>{bulkFields[tab].map(field => <th key={field} style={{ textAlign: 'left', padding: '0.5rem' }}>{field}</th>)}</tr></thead>
          <tbody>{bulkRows.slice(0, 5).map((row, i) => <tr key={i}>{bulkFields[tab].map(field => <td key={field} style={{ padding: '0.5rem', borderTop: '1px solid var(--color-border)' }}>{row[field] || '-'}</td>)}</tr>)}</tbody></table></div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
          <Button variant="ghost" onClick={() => { setBulkFile(null); setBulkRows([]); if (bulkInputRef.current) bulkInputRef.current.value = ''; }}>{tr('Batal', 'Cancel')}</Button>
          <Button onClick={handleBulkImport} loading={bulkBusy}>{tr('Konfirmasi Import', 'Confirm Import')} ({bulkRows.length})</Button>
        </div>
      </Card>}
      {error && <Alert tone="danger">{error}</Alert>}
      {referencesError && <Alert tone="danger">{tr('Gagal memuat data referensi:', 'Failed to load reference data:')} {referencesError} <Button variant="ghost" onClick={loadReferences}>{tr('Coba lagi', 'Try again')}</Button></Alert>}
      {tab === 'branches' && !referencesLoading && companies.length === 0 && (
        <Alert tone="warning">{tr('Belum ada data perusahaan. Buat data Perusahaan terlebih dahulu sebelum menambahkan Cabang.', 'No company data exists. Create a Company before adding a Branch.')}</Alert>
      )}
      {tab === 'warehouses' && !referencesLoading && branches.length === 0 && (
        <Alert tone="warning">{tr('Belum ada data cabang. Urutannya: buat Perusahaan, tambahkan Cabang pada tab Cabang, lalu kembali ke tab Gudang untuk membuat gudang dan menghubungkannya ke cabang.', 'No branch data exists. First create a Company, add a Branch under the Branch tab, then return to Warehouses to create and assign a warehouse.')}</Alert>
      )}
      <Toast open={!!notice} message={notice} onClose={() => setNotice('')} tone="success" />

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem' }}>
        {(Object.keys(masterApi) as MasterKey[]).map((key) => {
          const Icon = masterApi[key].icon;
          const active = tab === key;
          return (
            <Button
              key={key}
              variant={active ? 'primary' : 'ghost'}
              onClick={() => setTab(key)}
              style={{ display: 'flex', gap: '0.375rem', alignItems: 'center' }}
            >
              <Icon size={16} /> {getMasterLabel(key, en)}
            </Button>
          );
        })}
      </div>

      <Card title={`${tr('Daftar', 'List of')} ${getMasterLabel(tab, en)}`}>
        <DataTable columns={getColumnsForTab()} rows={data} emptyTitle={tr('Belum ada data master', 'No master data yet')} emptyDescription={`${tr('Belum ada data pada tabel', 'No data in the')} ${getMasterLabel(tab, en)} ${tr('Klik tombol Tambah untuk membuat baru.', 'table yet. Select Add to create a new record.')}`} />
      </Card>

      {/* Clean Single-Column Vertical Stacked Form Modal (Matching Reference Design) */}
      <Modal open={modalOpen} title={editingItem ? `${tr('Edit', 'Edit')} ${getMasterLabel(tab, en)}` : `${tr('Tambah', 'Add')} ${getMasterLabel(tab, en)}`} onClose={() => setModalOpen(false)}>
        <form onSubmit={handleSave}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            {/* Companies */}
            {tab === 'companies' && (
              <>
                <FormField label={tr('Kode Perusahaan', 'Company Code')} required>
                  <Input value={formData.code || ''} onChange={e => setFormData({ ...formData, code: e.target.value })} placeholder="SJ" required />
                </FormField>
                <FormField label={tr('Nama Perusahaan', 'Company Name')} required>
                  <Input value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="PT Sentanu Jaya" required />
                </FormField>
                <FormField label={tr('Alamat', 'Address')}>
                  <Textarea value={formData.address || ''} onChange={e => setFormData({ ...formData, address: e.target.value })} placeholder={tr("Jl. Industri Utama No. 1", "No. 1, Main Industrial Street")} rows={3} />
                </FormField>
                <FormField label={tr('Telepon', 'Phone')}>
                  <Input value={formData.phone || ''} onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="021-5551234" />
                </FormField>
                <FormField label="Email">
                  <Input type="email" value={formData.email || ''} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="contact@sentanujaya.co.id" />
                </FormField>
              </>
            )}

            {/* Branches */}
            {tab === 'branches' && (
              <>
                <FormField label={tr('Perusahaan', 'Company')} required>
                  <Select value={formData.company_id || ''} onChange={e => setFormData({ ...formData, company_id: e.target.value })} required>
                    <option value="">{tr('-- Pilih Perusahaan --', '-- Select Company --')}</option>
                    {companies.map(company => <option key={company.id} value={company.id}>{company.code} — {company.name}</option>)}
                  </Select>
                </FormField>
                <FormField label={tr('Kode Cabang', 'Branch Code')} required>
                  <Input value={formData.code || ''} onChange={e => setFormData({ ...formData, code: e.target.value })} placeholder="BR-001" required />
                </FormField>
                <FormField label={tr('Nama Cabang', 'Branch Name')} required>
                  <Input value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder={tr('Cabang Utama', 'Main Branch')} required />
                </FormField>
                <FormField label={tr('Alamat', 'Address')}>
                  <Textarea value={formData.address || ''} onChange={e => setFormData({ ...formData, address: e.target.value })} placeholder={tr('Alamat cabang', 'Branch address')} rows={3} />
                </FormField>
                <FormField label={tr('Status Aktif', 'Active Status')}>
                  <Select value={formData.is_active !== false ? 'true' : 'false'} onChange={e => setFormData({ ...formData, is_active: e.target.value === 'true' })}>
                    <option value="true">{tr('Aktif', 'Active')}</option>
                    <option value="false">{tr('Nonaktif', 'Inactive')}</option>
                  </Select>
                </FormField>
              </>
            )}

            {/* Customer */}
            {tab === 'customers' && (
              <>
                <FormField label={tr('Kode Customer', 'Customer Code')} required hint={tr('Contoh: CUST-001', 'Example: CUST-001')}>
                  <Input value={formData.code || ''} onChange={e => setFormData({ ...formData, code: e.target.value })} placeholder="CUST-001" required />
                </FormField>
                <FormField label={tr('Nama Perusahaan / Customer', 'Company / Customer Name')} required>
                  <Input value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="PT Sentanu Maju" required />
                </FormField>
                <FormField label={tr('Nama Legal (Akta)', 'Legal Name (Deed)')}>
                  <Input value={formData.legal_name || ''} onChange={e => setFormData({ ...formData, legal_name: e.target.value })} placeholder="PT Sentanu Maju Sejahtera" />
                </FormField>
                <FormField label="NPWP">
                  <Input value={formData.npwp || ''} onChange={e => setFormData({ ...formData, npwp: e.target.value })} placeholder="01.234.567.8-901.000" />
                </FormField>
                <FormField label={tr('Kondisi / Status Pajak', 'Tax Condition / Status')} required>
                  <Select value={formData.tax_condition ?? 3} onChange={e => setFormData({ ...formData, tax_condition: Number(e.target.value) })} required>
                    <option value={1}>1. {tr('Tanpa PPN, Tanpa PPh (Non-PKP / Bebas)', 'No VAT, No Withholding Tax (Non-Taxable)')}</option>
                    <option value={2}>2. {tr('PPh 2.5% Tanpa PPN', '2.5% Withholding Tax, No VAT')}</option>
                    <option value={3}>3. {tr('PPN 11% + PPh 2% (Standar PKP)', '11% VAT + 2% Withholding Tax (Standard Taxable Entity)')}</option>
                  </Select>
                </FormField>
                <FormField label={tr('Nomor Telepon', 'Phone Number')}>
                  <Input value={formData.phone || ''} onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="021-5551234" />
                </FormField>
                <FormField label={tr('Email Perusahaan', 'Company Email')}>
                  <Input type="email" value={formData.email || ''} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="info@sentanumaju.co.id" />
                </FormField>
                <FormField label={tr('Alamat Lengkap', 'Full Address')}>
                  <Textarea value={formData.address || ''} onChange={e => setFormData({ ...formData, address: e.target.value })} placeholder={tr("Jl. Industri Raya No. 12, Jakarta", "No. 12, Industrial Avenue, Jakarta")} rows={3} />
                </FormField>
              </>
            )}

            {/* Customer Contact */}
            {tab === 'customer_contacts' && (
              <>
                <FormField label={tr('Pilih Customer', 'Select Customer')} required>
                  <Select value={formData.customer_id || ''} onChange={e => setFormData({ ...formData, customer_id: e.target.value })} required>
                    <option value="">{tr('-- Pilih Customer --', '-- Select Customer --')}</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
                  </Select>
                </FormField>
                <FormField label={tr('Nama Kontak', 'Contact Name')} required>
                  <Input value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder={tr("Bapak Budi", "Mr. Budi")} required />
                </FormField>
                <FormField label={tr('Jabatan / Title', 'Position / Title')}>
                  <Input value={formData.title || ''} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="Purchasing Manager" />
                </FormField>
                <FormField label={tr('Nomor Telepon / HP', 'Phone / Mobile Number')}>
                  <Input value={formData.phone || ''} onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="08123456789" />
                </FormField>
                <FormField label="Email">
                  <Input type="email" value={formData.email || ''} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="budi@customer.com" />
                </FormField>
              </>
            )}

            {/* Customer Item */}
            {tab === 'customer_items' && (
              <>
                <FormField label={tr('Pilih Customer', 'Select Customer')} required>
                  <Select value={formData.customer_id || ''} onChange={e => setFormData({ ...formData, customer_id: e.target.value })} required>
                    <option value="">{tr('-- Pilih Customer --', '-- Select Customer --')}</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
                  </Select>
                </FormField>
                <FormField label={tr('Kode Item', 'Item Code')} required>
                  <Input value={formData.code || ''} onChange={e => setFormData({ ...formData, code: e.target.value })} placeholder="ITEM-BODYKIT-01" required />
                </FormField>
                <FormField label={tr('Nama Barang / Part', 'Item / Part Name')} required>
                  <Input value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Front Bumper Pajero Sport" required />
                </FormField>
                <FormField label={tr('Model Kendaraan', 'Vehicle Model')}>
                  <Input value={formData.vehicle_model || ''} onChange={e => setFormData({ ...formData, vehicle_model: e.target.value })} placeholder="Mitsubishi Pajero Sport 2024" />
                </FormField>
                <FormField label={tr('Tipe Part', 'Part Type')}>
                  <Input value={formData.part_type || ''} onChange={e => setFormData({ ...formData, part_type: e.target.value })} placeholder="Bodykit / Accessories" />
                </FormField>
              </>
            )}

            {/* Price Lists */}
            {tab === 'price_lists' && (
              <>
                <FormField label={tr('Kode Price List', 'Price List Code')} required>
                  <Input value={formData.code || ''} onChange={e => setFormData({ ...formData, code: e.target.value })} placeholder="PL-2024-01" required />
                </FormField>
                <FormField label={tr('Nama Price List', 'Price List Name')} required>
                  <Input value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder={tr("Kontrak Harga 2024", "2024 Price Agreement")} required />
                </FormField>
                <FormField label={tr('Pilih Customer', 'Select Customer')} required>
                  <Select value={formData.customer_id || ''} onChange={e => setFormData({ ...formData, customer_id: e.target.value })} required>
                    <option value="">{tr('-- Pilih Customer --', '-- Select Customer --')}</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
                  </Select>
                </FormField>
                <FormField label={tr('Tanggal Efektif', 'Effective Date')}>
                  <Input type="date" value={formData.effective_date || ''} onChange={e => setFormData({ ...formData, effective_date: e.target.value })} />
                </FormField>
              </>
            )}

            {/* Price List Lines */}
            {tab === 'price_list_lines' && (
              <>
                <FormField label={tr('Pilih Price List', 'Select Price List')} required>
                  <Select value={formData.price_list_id || ''} onChange={e => setFormData({ ...formData, price_list_id: e.target.value })} required>
                    <option value="">{tr('-- Pilih Price List --', '-- Select Price List --')}</option>
                    {priceLists.map(pl => <option key={pl.id} value={pl.id}>{pl.code} — {pl.name}</option>)}
                  </Select>
                </FormField>
                <FormField label={tr('Pilih Customer Item', 'Select Customer Item')} required>
                  <Select value={formData.customer_item_id || ''} onChange={e => setFormData({ ...formData, customer_item_id: e.target.value })} required>
                    <option value="">{tr('-- Pilih Item Barang --', '-- Select Item --')}</option>
                    {customerItems.map(item => <option key={item.id} value={item.id}>{item.code} — {item.name}</option>)}
                  </Select>
                </FormField>
                <FormField label={tr('Harga Satuan (IDR)', 'Unit Price (IDR)')} required>
                  <NumericInput min={0} maximumFractionDigits={2} value={formData.unit_price ?? ''} onValueChange={rawValue => setFormData((current: any) => ({ ...current, unit_price: rawValue }))} placeholder="1500000" required />
                </FormField>
              </>
            )}

            {/* UOM */}
            {tab === 'uoms' && (
              <>
                <FormField label={tr('Kode Satuan', 'Unit Code')} required>
                  <Input value={formData.code || ''} onChange={e => setFormData({ ...formData, code: e.target.value })} placeholder="PCS" required />
                </FormField>
                <FormField label={tr('Nama Satuan', 'Unit Name')} required>
                  <Input value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder={tr("Pieces / Buah", "Pieces")} required />
                </FormField>
                <FormField label={tr('Kategori', 'Category')} required>
                  <Input value={formData.category || 'GENERAL'} onChange={e => setFormData({ ...formData, category: e.target.value })} placeholder="GENERAL / QUANTITY / WEIGHT" required />
                </FormField>
                <FormField label={tr('Desimal', 'Decimal Places')}>
                  <NumericInput min={0} max={6} maximumFractionDigits={0} value={formData.decimal_places ?? 0} onValueChange={raw => setFormData({ ...formData, decimal_places: raw })} placeholder="0" />
                </FormField>
              </>
            )}

            {/* Materials */}
            {tab === 'materials' && (
              <>
                <FormField label={tr('Kode SKU Material', 'Material SKU Code')} required>
                  <Input value={formData.code || ''} onChange={e => setFormData({ ...formData, code: e.target.value })} placeholder="CAT-PU-BLK" required />
                </FormField>
                <FormField label={tr('Nama Material / Cat', 'Material / Paint Name')} required>
                  <Input value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder={tr("Cat Polyurethane Hitam Glossy", "Glossy Black Polyurethane Paint")} required />
                </FormField>
                <FormField label={tr('Kategori', 'Category')} required>
                  <Input value={formData.category || 'GENERAL'} onChange={e => setFormData({ ...formData, category: e.target.value })} placeholder="GENERAL / RAW_MATERIAL / PAINT" required />
                </FormField>
                <FormField label={tr('Satuan (Unit)', 'Unit of Measure')} required>
                  <Input value={formData.unit || 'LITER'} onChange={e => setFormData({ ...formData, unit: e.target.value })} placeholder="LITER / CAN / PCS" required />
                </FormField>
                <FormField label={tr('Minimum Stok', 'Minimum Stock')}>
                  <NumericInput min={0} maximumFractionDigits={3} value={formData.minimum_stock ?? formData.min_stock ?? ''} onValueChange={raw => setFormData({ ...formData, minimum_stock: raw, min_stock: raw })} placeholder="5" />
                </FormField>
              </>
            )}

            {/* Warehouses */}
            {tab === 'warehouses' && (
              <>
                <FormField label={tr('Cabang', 'Branch')} required>
                  <Select value={formData.branch_id || ''} onChange={e => setFormData({ ...formData, branch_id: e.target.value })} required>
                    <option value="">{tr('-- Pilih Cabang --', '-- Select Branch --')}</option>
                    {branches.map(b => <option key={b.id} value={b.id}>{b.code} — {b.name}</option>)}
                  </Select>
                </FormField>
                <FormField label={tr('Kode Gudang', 'Warehouse Code')} required>
                  <Input value={formData.code || ''} onChange={e => setFormData({ ...formData, code: e.target.value })} placeholder="WH-001" required />
                </FormField>
                <FormField label={tr('Nama Gudang', 'Warehouse Name')} required>
                  <Input value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder={tr('Gudang Utama Sentanu Jaya', 'Sentanu Jaya Main Warehouse')} required />
                </FormField>
                <FormField label={tr('Status Aktif', 'Active Status')}>
                  <Select value={formData.is_active !== false ? 'true' : 'false'} onChange={e => setFormData({ ...formData, is_active: e.target.value === 'true' })}>
                    <option value="true">{tr('Aktif', 'Active')}</option>
                    <option value="false">{tr('Nonaktif', 'Inactive')}</option>
                  </Select>
                </FormField>
              </>
            )}

            {/* Suppliers */}
            {tab === 'suppliers' && (
              <>
                <FormField label={tr('Kode Supplier', 'Supplier Code')} required>
                  <Input value={formData.code || ''} onChange={e => setFormData({ ...formData, code: e.target.value })} placeholder="SUP-001" required />
                </FormField>
                <FormField label={tr('Nama Supplier', 'Supplier Name')} required>
                  <Input value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="PT Warna Abadi Kimia" required />
                </FormField>
                <FormField label={tr('Nomor Telepon', 'Phone Number')}>
                  <Input value={formData.phone || ''} onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="021-4448888" />
                </FormField>
                <FormField label="Email">
                  <Input type="email" value={formData.email || ''} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="sales@warnabadi.com" />
                </FormField>
                <FormField label={tr('Alamat Supplier', 'Supplier Address')}>
                  <Textarea value={formData.address || ''} onChange={e => setFormData({ ...formData, address: e.target.value })} placeholder={tr("Jl. Kimia Raya No. 5, Cikarang", "No. 5, Kimia Avenue, Cikarang")} rows={3} />
                </FormField>
              </>
            )}

          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.75rem', borderTop: '1px solid var(--color-border)', paddingTop: '1.25rem' }}>
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>{tr('Batal', 'Cancel')}</Button>
            <Button type="submit" loading={saving}>{tr('Simpan Data', 'Save Data')}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmationDialog
        open={confirmState.open}
        title={confirmState.title}
        description={confirmState.description}
        onConfirm={confirmState.onConfirm}
        onClose={() => setConfirmState(s => ({ ...s, open: false }))}
      />
    </div>
  );
}
