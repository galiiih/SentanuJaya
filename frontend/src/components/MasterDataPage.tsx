import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Users, Layers, Package, Tag, Building2, BookOpen, Wrench, FileSpreadsheet } from 'lucide-react';
import { apiError, type Customer, type CustomerItem } from '../services/api';
import axios from 'axios';
import {
  Alert,
  Button,
  Card,
  ConfirmationDialog,
  DataTable,
  type DataTableColumn,
  FormField,
  Input,
  Select,
  Textarea,
  Modal,
  PageHeader,
  Toast,
} from './ui';

const masterApi = {
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

export function MasterDataPage() {
  const [tab, setTab] = useState<MasterKey>('customers');
  const [data, setData] = useState<any[]>([]);
  const [, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // Dropdown options for relations
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerItems, setCustomerItems] = useState<CustomerItem[]>([]);
  const [priceLists, setPriceLists] = useState<any[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [formData, setFormData] = useState<any>({});
  const [saving, setSaving] = useState(false);

  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
  }>({ open: false, title: '', description: '', onConfirm: () => {} });

  const loadReferences = async () => {
    try {
      const [custRes, itemRes, plRes] = await Promise.all([
        axios.get('/api/v1/customers', { params: { per_page: 200 } }).catch(() => ({ data: { data: [] } })),
        axios.get('/api/v1/customer-items', { params: { per_page: 200 } }).catch(() => ({ data: { data: [] } })),
        axios.get('/api/v1/price-lists', { params: { per_page: 200 } }).catch(() => ({ data: { data: [] } })),
      ]);
      setCustomers(custRes.data.data.data || custRes.data.data || []);
      setCustomerItems(itemRes.data.data.data || itemRes.data.data || []);
      setPriceLists(plRes.data.data.data || plRes.data.data || []);
    } catch {
      // ignore reference errors
    }
  };

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await masterApi[tab].list();
      setData(Array.isArray(res) ? res : []);
    } catch (err: any) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReferences();
  }, []);

  useEffect(() => {
    loadData();
  }, [tab]);

  const openCreate = () => {
    setEditingItem(null);
    if (tab === 'customers') {
      setFormData({ code: '', name: '', legal_name: '', npwp: '', is_pkp: true, address: '', phone: '', email: '' });
    } else if (tab === 'customer_contacts') {
      setFormData({ customer_id: customers[0]?.id || '', name: '', title: '', phone: '', email: '' });
    } else if (tab === 'customer_items') {
      setFormData({ customer_id: customers[0]?.id || '', code: '', name: '', vehicle_model: '', part_type: '' });
    } else if (tab === 'price_lists') {
      setFormData({ code: '', name: '', customer_id: customers[0]?.id || '', effective_date: new Date().toISOString().split('T')[0], is_active: true });
    } else if (tab === 'price_list_lines') {
      setFormData({ price_list_id: priceLists[0]?.id || '', customer_item_id: customerItems[0]?.id || '', unit_price: 0 });
    } else if (tab === 'uoms') {
      setFormData({ code: '', name: '' });
    } else if (tab === 'materials') {
      setFormData({ code: '', name: '', unit: 'PCS', min_stock: 0 });
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
        await masterApi[tab].update(editingItem.id, formData);
        setNotice('Data master berhasil diperbarui.');
      } else {
        await masterApi[tab].create(formData);
        setNotice('Data master berhasil ditambahkan.');
      }
      setModalOpen(false);
      loadData();
    } catch (err: any) {
      setError(apiError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (row: any) => {
    setConfirmState({
      open: true,
      title: 'Hapus Data Master?',
      description: `Apakah Anda yakin ingin menghapus ${row.name || row.code || 'data ini'}?`,
      onConfirm: async () => {
        try {
          await masterApi[tab].remove(row.id);
          setNotice('Data master berhasil dihapus.');
          setConfirmState(s => ({ ...s, open: false }));
          loadData();
        } catch (err: any) {
          setError(apiError(err));
          setConfirmState(s => ({ ...s, open: false }));
        }
      }
    });
  };

  const columns: DataTableColumn<any>[] = [
    { id: 'code', header: 'Kode / Ref', cell: (row) => row.code || row.name || row.title || '-' },
    { id: 'name', header: 'Nama / Deskripsi', cell: (row) => row.name || row.legal_name || row.customer?.name || row.price_list?.name || '-' },
    { id: 'info', header: 'Kontak / Atribut', cell: (row) => row.phone || row.unit || row.email || row.vehicle_model || row.part_type || (row.unit_price ? `Rp ${Number(row.unit_price).toLocaleString('id-ID')}` : '-') },
    {
      id: 'actions',
      header: 'Aksi',
      cell: (row) => (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Button variant="ghost" onClick={() => openEdit(row)} title="Edit"><Edit size={16} /></Button>
          <Button variant="ghost" onClick={() => handleDelete(row)} title="Hapus" style={{ color: 'var(--color-danger)' }}><Trash2 size={16} /></Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Master Data & Referensi"
        description="Kelola referensi sistem, pelanggan, item barang, kontak, price list, satuan, material, dan supplier secara terpusat."
        action={
          <Button onClick={openCreate} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <Plus size={16} /> Tambah {masterApi[tab].label}
          </Button>
        }
      />

      {error && <Alert tone="danger">{error}</Alert>}
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
              <Icon size={16} /> {masterApi[key].label}
            </Button>
          );
        })}
      </div>

      <Card title={`Daftar ${masterApi[tab].label}`}>
        <DataTable columns={columns} rows={data} emptyTitle="Belum ada data master" emptyDescription={`Belum ada data pada tabel ${masterApi[tab].label}. Klik tombol Tambah untuk membuat baru.`} />
      </Card>

      {/* Clean Single-Column Vertical Stacked Form Modal (Matching Reference Design) */}
      <Modal open={modalOpen} title={editingItem ? `Edit ${masterApi[tab].label}` : `Tambah ${masterApi[tab].label}`} onClose={() => setModalOpen(false)}>
        <form onSubmit={handleSave}>
          <div style={{ maxHeight: '72vh', overflowY: 'auto', padding: '0.25rem 0.75rem 1rem 0.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            {/* Customer */}
            {tab === 'customers' && (
              <>
                <FormField label="Kode Customer" required hint="Contoh: CUST-001">
                  <Input value={formData.code || ''} onChange={e => setFormData({ ...formData, code: e.target.value })} placeholder="CUST-001" required />
                </FormField>
                <FormField label="Nama Perusahaan / Customer" required>
                  <Input value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="PT Sentanu Maju" required />
                </FormField>
                <FormField label="Nama Legal (Akta)">
                  <Input value={formData.legal_name || ''} onChange={e => setFormData({ ...formData, legal_name: e.target.value })} placeholder="PT Sentanu Maju Sejahtera" />
                </FormField>
                <FormField label="NPWP">
                  <Input value={formData.npwp || ''} onChange={e => setFormData({ ...formData, npwp: e.target.value })} placeholder="01.234.567.8-901.000" />
                </FormField>
                <FormField label="Nomor Telepon">
                  <Input value={formData.phone || ''} onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="021-5551234" />
                </FormField>
                <FormField label="Email Perusahaan">
                  <Input type="email" value={formData.email || ''} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="info@sentanumaju.co.id" />
                </FormField>
                <FormField label="Alamat Lengkap">
                  <Textarea value={formData.address || ''} onChange={e => setFormData({ ...formData, address: e.target.value })} placeholder="Jl. Industri Raya No. 12, Jakarta" rows={3} />
                </FormField>
              </>
            )}

            {/* Customer Contact */}
            {tab === 'customer_contacts' && (
              <>
                <FormField label="Pilih Customer" required>
                  <Select value={formData.customer_id || ''} onChange={e => setFormData({ ...formData, customer_id: e.target.value })} required>
                    <option value="">-- Pilih Customer --</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
                  </Select>
                </FormField>
                <FormField label="Nama Kontak" required>
                  <Input value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Bapak Budi" required />
                </FormField>
                <FormField label="Jabatan / Title">
                  <Input value={formData.title || ''} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="Purchasing Manager" />
                </FormField>
                <FormField label="Nomor Telepon / HP">
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
                <FormField label="Pilih Customer" required>
                  <Select value={formData.customer_id || ''} onChange={e => setFormData({ ...formData, customer_id: e.target.value })} required>
                    <option value="">-- Pilih Customer --</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
                  </Select>
                </FormField>
                <FormField label="Kode Item" required>
                  <Input value={formData.code || ''} onChange={e => setFormData({ ...formData, code: e.target.value })} placeholder="ITEM-BODYKIT-01" required />
                </FormField>
                <FormField label="Nama Barang / Part" required>
                  <Input value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Front Bumper Pajero Sport" required />
                </FormField>
                <FormField label="Model Kendaraan">
                  <Input value={formData.vehicle_model || ''} onChange={e => setFormData({ ...formData, vehicle_model: e.target.value })} placeholder="Mitsubishi Pajero Sport 2024" />
                </FormField>
                <FormField label="Tipe Part">
                  <Input value={formData.part_type || ''} onChange={e => setFormData({ ...formData, part_type: e.target.value })} placeholder="Bodykit / Accessories" />
                </FormField>
              </>
            )}

            {/* Price Lists */}
            {tab === 'price_lists' && (
              <>
                <FormField label="Kode Price List" required>
                  <Input value={formData.code || ''} onChange={e => setFormData({ ...formData, code: e.target.value })} placeholder="PL-2024-01" required />
                </FormField>
                <FormField label="Nama Price List" required>
                  <Input value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Kontrak Harga 2024" required />
                </FormField>
                <FormField label="Pilih Customer (Opsional)">
                  <Select value={formData.customer_id || ''} onChange={e => setFormData({ ...formData, customer_id: e.target.value || null })}>
                    <option value="">-- Umum / Semua Customer --</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
                  </Select>
                </FormField>
                <FormField label="Tanggal Efektif">
                  <Input type="date" value={formData.effective_date || ''} onChange={e => setFormData({ ...formData, effective_date: e.target.value })} />
                </FormField>
              </>
            )}

            {/* Price List Lines */}
            {tab === 'price_list_lines' && (
              <>
                <FormField label="Pilih Price List" required>
                  <Select value={formData.price_list_id || ''} onChange={e => setFormData({ ...formData, price_list_id: e.target.value })} required>
                    <option value="">-- Pilih Price List --</option>
                    {priceLists.map(pl => <option key={pl.id} value={pl.id}>{pl.code} — {pl.name}</option>)}
                  </Select>
                </FormField>
                <FormField label="Pilih Customer Item" required>
                  <Select value={formData.customer_item_id || ''} onChange={e => setFormData({ ...formData, customer_item_id: e.target.value })} required>
                    <option value="">-- Pilih Item Barang --</option>
                    {customerItems.map(item => <option key={item.id} value={item.id}>{item.code} — {item.name}</option>)}
                  </Select>
                </FormField>
                <FormField label="Harga Satuan (IDR)" required>
                  <Input type="number" value={formData.unit_price || 0} onChange={e => setFormData({ ...formData, unit_price: Number(e.target.value) })} placeholder="1500000" required />
                </FormField>
              </>
            )}

            {/* UOM */}
            {tab === 'uoms' && (
              <>
                <FormField label="Kode Satuan" required>
                  <Input value={formData.code || ''} onChange={e => setFormData({ ...formData, code: e.target.value })} placeholder="PCS" required />
                </FormField>
                <FormField label="Nama Satuan" required>
                  <Input value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Pieces / Buah" required />
                </FormField>
              </>
            )}

            {/* Materials */}
            {tab === 'materials' && (
              <>
                <FormField label="Kode SKU Material" required>
                  <Input value={formData.code || ''} onChange={e => setFormData({ ...formData, code: e.target.value })} placeholder="CAT-PU-BLK" required />
                </FormField>
                <FormField label="Nama Material / Cat" required>
                  <Input value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Cat Polyurethane Hitam Glossy" required />
                </FormField>
                <FormField label="Satuan (Unit)">
                  <Input value={formData.unit || 'LITER'} onChange={e => setFormData({ ...formData, unit: e.target.value })} placeholder="LITER / CAN / PCS" />
                </FormField>
                <FormField label="Minimum Stok">
                  <Input type="number" value={formData.min_stock || 0} onChange={e => setFormData({ ...formData, min_stock: Number(e.target.value) })} placeholder="5" />
                </FormField>
              </>
            )}

            {/* Suppliers */}
            {tab === 'suppliers' && (
              <>
                <FormField label="Kode Supplier" required>
                  <Input value={formData.code || ''} onChange={e => setFormData({ ...formData, code: e.target.value })} placeholder="SUP-001" required />
                </FormField>
                <FormField label="Nama Supplier" required>
                  <Input value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="PT Warna Abadi Kimia" required />
                </FormField>
                <FormField label="Nomor Telepon">
                  <Input value={formData.phone || ''} onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="021-4448888" />
                </FormField>
                <FormField label="Email">
                  <Input type="email" value={formData.email || ''} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="sales@warnabadi.com" />
                </FormField>
                <FormField label="Alamat Supplier">
                  <Textarea value={formData.address || ''} onChange={e => setFormData({ ...formData, address: e.target.value })} placeholder="Jl. Kimia Raya No. 5, Cikarang" rows={3} />
                </FormField>
              </>
            )}

          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.75rem', borderTop: '1px solid var(--color-border)', paddingTop: '1.25rem' }}>
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>Batal</Button>
            <Button type="submit" loading={saving}>Simpan Data</Button>
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
