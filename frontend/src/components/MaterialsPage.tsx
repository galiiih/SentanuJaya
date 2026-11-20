import { useState, useEffect } from 'react';
import { useLanguage } from '../i18n';
import axios from 'axios';
import { Plus, Eye, CheckCircle2, FileText, ArrowLeftRight, Package, AlertTriangle } from 'lucide-react';
import {
  apiError,
  materialReceiptApi,
  stockApi,
  warehouseApi,
  supplierApi,
  type Material,
  type MaterialReceiptRecord,
  type StockMovementRecord,
} from '../services/api';
import {
  Alert,
  Button,
  Card,
  ConfirmationDialog,
  DataTable,
  type DataTableColumn,
  FormField,
  Input,
  NumericInput,
  Modal,
  PageHeader,
  Select,
  StatusBadge,
  Textarea,
  Toast,
} from './ui';

export function MaterialsPage() {
  const { language } = useLanguage();
  const en = language === 'en';
  const tr = (id: string, english: string) => en ? english : id;
  const [activeTab, setActiveTab] = useState<'stocks' | 'receipts' | 'cards' | 'adjust'>('stocks');

  // Data states
  const [materials, setMaterials] = useState<Material[]>([]);
  const [stocks, setStocks] = useState<any[]>([]);
  const [receipts, setReceipts] = useState<MaterialReceiptRecord[]>([]);
  const [movements, setMovements] = useState<StockMovementRecord[]>([]);
  const [warehouses, setWarehouseList] = useState<any[]>([]);
  const [suppliers, setSupplierList] = useState<any[]>([]);
  const [lowStocks, setLowStocks] = useState<any[]>([]);
  const activeWarehouses = warehouses.filter((warehouse: any) => warehouse.is_active !== false);

  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // Receipt Modal
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [receiptDetail, setReceiptDetail] = useState<MaterialReceiptRecord | null>(null);
  const [receiptForm, setReceiptForm] = useState({
    warehouse_id: '',
    supplier_id: '',
    receipt_date: new Date().toISOString().split('T')[0],
    notes: '',
    lines: [{ material_id: '', quantity_received: '', unit_cost: '', notes: '' }],
  });

  // Adjustment Form
  const [adjForm, setAdjForm] = useState({
    warehouse_id: '',
    material_id: '',
    type: 'IN' as 'IN' | 'OUT',
    quantity: '',
    reason: '',
  });

  // Opname Form
  const [opnameForm, setOpnameForm] = useState({
    warehouse_id: '',
    material_id: '',
    physical_qty: '',
    reason: 'Stock Opname physical count reconciliation',
  });

  // Confirmation
  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    title: string;
    description: string;
    tone: 'primary' | 'danger';
    onConfirm: () => void;
  }>({
    open: false,
    title: '',
    description: '',
    tone: 'primary',
    onConfirm: () => {},
  });

  const loadData = async () => {
    setError('');
    try {
      const [matRes, stockRes, recRes, movRes, whRes, supRes, lowRes] = await Promise.all([
        axios.get('/api/v1/materials', { params: { per_page: 200 } }).catch(() => ({ data: { data: [] } })),
        stockApi.list({ per_page: 200 }).catch(() => ({ data: [] })),
        materialReceiptApi.list({ per_page: 100 }).catch(() => ({ data: [] })),
        stockApi.movements({ per_page: 100 }).catch(() => ({ data: [] })),
        warehouseApi.list().catch(() => ({ data: [] })),
        supplierApi.list().catch(() => ({ data: [] })),
        stockApi.lowStock().catch(() => []),
      ]);

      const asRows = (value: any): any[] => {
        if (Array.isArray(value)) return value;
        if (Array.isArray(value?.data)) return value.data;
        return [];
      };
      const rawMat = asRows(matRes.data?.data?.data ?? matRes.data?.data);
      const stocksList = asRows(stockRes);
      setStocks(stocksList);

      const stockMap = new Map<string, number>();
      stocksList.forEach((s: any) => {
        const matId = s.material_id;
        const qty = Number(s.quantity_on_hand ?? s.quantity ?? 0);
        if (matId) {
          stockMap.set(matId, (stockMap.get(matId) || 0) + qty);
        }
      });

      setMaterials(rawMat.map((m: any) => ({
        id: m.id,
        sku: m.code || m.sku || '-',
        name: m.name || '-',
        category: m.category || 'GENERAL',
        quantity_on_hand: stockMap.get(m.id) ?? m.quantity_on_hand ?? m.total_stock ?? m.stock ?? 0,
        unit: m.unit || m.stock_uom?.name || 'PCS',
        minimum_stock: m.minimum_stock ?? m.min_stock ?? 0,
        avg_cost: m.avg_cost ?? 0,
      })));
      // list() returns a paginated object { data: [...] }, not a raw array.
      // Normalize every list before storing it; otherwise .map() on warehouse
      // selectors receives an object and the inventory screen can crash.
      setReceipts(asRows(recRes));
      setMovements(asRows(movRes));
      setWarehouseList(asRows(whRes));
      setSupplierList(asRows(supRes));
      setLowStocks(asRows(lowRes));
    } catch (err) {
      setError(apiError(err));
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await materialReceiptApi.create({
        ...receiptForm,
        lines: receiptForm.lines.map((line) => ({
          ...line,
          quantity_received: Number(line.quantity_received),
          unit_cost: Number(line.unit_cost || 0),
        })),
      });
      setNotice(tr('Penerimaan material (Draft) berhasil dibuat.', 'Material receipt draft created successfully.'));
      setReceiptModalOpen(false);
      setReceiptForm({
        warehouse_id: '',
        supplier_id: '',
        receipt_date: new Date().toISOString().split('T')[0],
        notes: '',
        lines: [{ material_id: '', quantity_received: '', unit_cost: '', notes: '' }],
      });
      loadData();
    } catch (err) {
      setError(apiError(err));
    }
  };

  const handlePostReceipt = (id: string) => {
    setConfirmState({
      open: true,
      title: 'Post {tr('Penerimaan Material', 'Material Receipts')}',
      description: 'Apakah Anda yakin ingin memposting penerimaan ini? Stok di gudang akan bertambah dan transaksi akan dikunci.',
      tone: 'primary',
      onConfirm: async () => {
        try {
          await materialReceiptApi.post(id);
          setNotice(tr('Penerimaan material berhasil diposting dan stok telah diperbarui.', 'Material receipt posted and stock updated successfully.'));
          setReceiptDetail(null);
          loadData();
        } catch (err) {
          setError(apiError(err));
        }
      },
    });
  };

  const handleCancelReceipt = (id: string) => {
    setConfirmState({
      open: true,
      title: tr('Batalkan Penerimaan Material', 'Cancel Material Receipt'),
      description: tr('Batalkan draft penerimaan material ini?', 'Cancel this material receipt draft?'),
      tone: 'danger',
      onConfirm: async () => {
        try {
          await materialReceiptApi.cancel(id);
          setNotice(tr('Penerimaan material dibatalkan.', 'Material receipt cancelled.'));
          setReceiptDetail(null);
          loadData();
        } catch (err) {
          setError(apiError(err));
        }
      },
    });
  };

  const handleStockAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await stockApi.adjust({ ...adjForm, quantity: Number(adjForm.quantity) });
      setNotice('Stock adjustment berhasil diproses.');
      setAdjForm({ warehouse_id: '', material_id: '', type: 'IN', quantity: '', reason: '' });
      loadData();
    } catch (err) {
      setError(apiError(err));
    }
  };

  const handleStockOpname = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const currentStock = stocks.find((s: any) => s.warehouse_id === opnameForm.warehouse_id && s.material_id === opnameForm.material_id)?.quantity_on_hand ?? 0;
    const physicalQty = Number(opnameForm.physical_qty);
    if (!Number.isFinite(physicalQty) || physicalQty < 0) {
      setError('Jumlah stok fisik harus berupa angka nol atau lebih.');
      return;
    }
    const diff = physicalQty - Number(currentStock);
    if (diff === 0) {
      setError(tr('Kuantitas fisik sama dengan stok sistem. Tidak ada adjustment yang diperlukan.', 'The counted quantity matches system stock. No adjustment is required.'));
      return;
    }
    const type = diff > 0 ? 'IN' : 'OUT';
    const quantity = Math.abs(diff);

    try {
      await stockApi.adjust({
        warehouse_id: opnameForm.warehouse_id,
        material_id: opnameForm.material_id,
        type,
        quantity,
        reason: `${opnameForm.reason} (System: ${currentStock}, Physical: ${opnameForm.physical_qty})`,
      });
      setNotice(`${tr('Stock opname berhasil direkonsiliasi', 'Stock count reconciled')} (${type} ${quantity}).`);
      loadData();
    } catch (err) {
      setError(apiError(err));
    }
  };

  const materialColumns: DataTableColumn<Material>[] = [
    { id: 'sku', header: 'SKU', cell: (row) => row.sku, sortValue: (row) => row.sku },
    { id: 'name', header: tr('Nama Material', 'Material Name'), cell: (row) => row.name, sortValue: (row) => row.name },
    { id: 'category', header: tr('Kategori', 'Category'), cell: (row) => row.category, sortValue: (row) => row.category },
    { id: 'quantity_on_hand', header: tr('Stok Aktual', 'Current Stock'), cell: (row) => `${row.quantity_on_hand} ${row.unit}`, sortValue: (row) => row.quantity_on_hand },
    { id: 'minimum_stock', header: tr('Minimum', 'Minimum'), cell: (row) => `${row.minimum_stock} ${row.unit}`, sortValue: (row) => row.minimum_stock },
    {
      id: 'status',
      header: 'Status',
      cell: (row) => (
        row.quantity_on_hand <= row.minimum_stock ? (
          <StatusBadge status="warning" label={tr('Stok Rendah', 'Low Stock')} />
        ) : (
          <StatusBadge status="success" label={tr('Aman', 'Healthy')} />
        )
      ),
    },
  ];

  return (
    <>
      <PageHeader title={tr('Inventaris & Gudang Material', 'Material Inventory & Warehouse')} description={tr('Kelola penerimaan material Sentanu Jaya, mutasi stok, adjustment, dan opname secara akurat.', 'Manage Sentanu Jaya material receipts, stock movements, adjustments, and physical stock counts accurately.')} />
      
      <Toast open={Boolean(notice)} message={notice} onClose={() => setNotice('')} />
      {error && <Alert tone="danger">{error}</Alert>}
      {warehouses.length === 0 && (
        <Alert tone="warning">
          {tr('Belum ada gudang yang terdaftar. Buat terlebih dahulu melalui Master Data → Cabang, kemudian Master Data → Gudang dengan memilih cabang tersebut.', 'No warehouses are registered. First create a Branch under Master Data, then create a Warehouse and assign it to that branch.')} Setelah gudang aktif dibuat, pilihan gudang akan muncul di formulir penerimaan dan penyesuaian stok.
        </Alert>
      )}
      {warehouses.length > 0 && activeWarehouses.length === 0 && (
        <Alert tone="warning">{tr('Semua gudang saat ini nonaktif. Aktifkan salah satu gudang melalui Master Data → Gudang agar transaksi stok dapat dilakukan.', 'All warehouses are currently inactive. Activate a warehouse under Master Data → Warehouses to enable stock transactions.')}</Alert>
      )}

      {lowStocks.length > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          <Alert tone="warning">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertTriangle size={18} />
              <span>{tr(`Terdapat ${lowStocks.length} material dengan stok di bawah minimum! Harap lakukan penerimaan material.`, `${lowStocks.length} materials are below minimum stock. Please arrange a material receipt.`)}</span>
            </div>
          </Alert>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b pb-3 flex-wrap">
        <Button variant={activeTab === 'stocks' ? 'primary' : 'secondary'} onClick={() => setActiveTab('stocks')}>
          <Package className="w-4 h-4 mr-2" /> {tr('Daftar Stok Material', 'Material Stock List')}
        </Button>
        <Button variant={activeTab === 'receipts' ? 'primary' : 'secondary'} onClick={() => setActiveTab('receipts')}>
          <FileText className="w-4 h-4 mr-2" /> {tr('Penerimaan Material', 'Material Receipts')}
        </Button>
        <Button variant={activeTab === 'cards' ? 'primary' : 'secondary'} onClick={() => setActiveTab('cards')}>
          <ArrowLeftRight className="w-4 h-4 mr-2" /> Stock Card (Mutasi)
        </Button>
        <Button variant={activeTab === 'adjust' ? 'primary' : 'secondary'} onClick={() => setActiveTab('adjust')}>
          <CheckCircle2 className="w-4 h-4 mr-2" /> Stock Adjustment & Stock Count
        </Button>
      </div>

      {activeTab === 'stocks' && (
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontWeight: 600, fontSize: '1.1rem' }}>{tr('Saldo Stok Material Gudang', 'Warehouse Material Stock Balance')}</h3>
            <Button onClick={() => setReceiptModalOpen(true)} disabled={activeWarehouses.length === 0}>
              <Plus className="w-4 h-4 mr-2" /> {tr('Penerimaan Material Baru', 'New Material Receipt')}
            </Button>
          </div>
          <DataTable columns={materialColumns} rows={materials} searchText={(m) => `${m.sku} ${m.name} ${m.category}`} emptyTitle={tr('Belum ada material', 'No materials yet')} emptyDescription={tr('Data material gudang Sentanu Jaya.', 'Sentanu Jaya warehouse material data.')} />
        </Card>
      )}

      {activeTab === 'receipts' && (
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontWeight: 600, fontSize: '1.1rem' }}>{tr('Daftar Penerimaan Material (Material Receipts)', 'Material Receipts')}</h3>
            <Button onClick={() => setReceiptModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" /> {tr('Buat Penerimaan', 'Create Receipt')}
            </Button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {receipts.length === 0 ? (
              <p style={{ color: 'var(--muted-foreground)', textAlign: 'center', padding: '1.5rem' }}>{tr('Belum ada transaksi penerimaan material.', 'No material receipt transactions yet.')}</p>
            ) : (
              receipts.map((rec) => (
                <div key={rec.id} style={{ padding: '1rem', border: '1px solid var(--border)', borderRadius: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--card)', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontWeight: 700 }}>{rec.receipt_number}</span>
                      <StatusBadge status={rec.status === 'POSTED' ? 'success' : rec.status === 'DRAFT' ? 'warning' : 'neutral'} label={rec.status} />
                    </div>
                    <p style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)', marginTop: '0.25rem' }}>
                      {tr('Gudang:', 'Warehouse:')} {rec.warehouse?.name || '-'} | {tr('Supplier:', 'Supplier:')} {rec.supplier?.name || (en ? 'General' : 'Umum')} | {tr('Tanggal:', 'Date:')} {rec.receipt_date}
                    </p>
                    {rec.notes && <p style={{ fontSize: '0.75rem', fontStyle: 'italic', marginTop: '0.25rem' }}>{rec.notes}</p>}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <Button variant="secondary" onClick={() => materialReceiptApi.get(rec.id).then(setReceiptDetail)}>
                      <Eye className="w-4 h-4 mr-1" /> {tr('Detail', 'Details')}
                    </Button>
                    {rec.status === 'DRAFT' && (
                      <>
                        <Button variant="primary" onClick={() => handlePostReceipt(rec.id)}>Post</Button>
                        <Button variant="danger" onClick={() => handleCancelReceipt(rec.id)}>{tr('Batal', 'Cancel')}</Button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      )}

      {activeTab === 'cards' && (
        <Card>
          <h3 className="font-semibold text-lg mb-4">{tr('Riwayat Mutasi Stok (Stock Card)', 'Stock Movement History (Stock Card)')}</h3>
          <div className="space-y-2">
            {movements.length === 0 ? (
              <p className="text-muted-foreground text-center py-6">{tr('Belum ada mutasi stok tercatat.', 'No stock movements recorded yet.')}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="p-3">{tr('Tanggal', 'Date')}</th>
                      <th className="p-3">{tr('Tipe', 'Type')}</th>
                      <th className="p-3">{tr('Material', 'Material')}</th>
                      <th className="p-3">{tr('Gudang', 'Warehouse')}</th>
                      <th className="p-3">{tr('Masuk', 'In')}</th>
                      <th className="p-3">{tr('Keluar', 'Out')}</th>
                      <th className="p-3">{tr('Saldo Akhir', 'Ending Balance')}</th>
                      <th className="p-3">{tr('Keterangan', 'Description')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movements.map((m) => (
                      <tr key={m.id} className="border-b hover:bg-muted/30">
                        <td className="p-3">{m.movement_date}</td>
                        <td style={{ padding: '0.75rem' }}><StatusBadge status={m.quantity_in > 0 ? 'success' : 'warning'} label={m.movement_type} /></td>
                        <td className="p-3 font-medium">{m.material?.name || m.material_id}</td>
                        <td className="p-3">{m.warehouse?.name || '-'}</td>
                        <td className="p-3 text-success font-semibold">{m.quantity_in > 0 ? `+${Number(m.quantity_in).toLocaleString('en-US', { maximumFractionDigits: 3 })}` : '-'}</td>
                        <td className="p-3 text-danger font-semibold">{m.quantity_out > 0 ? `-${Number(m.quantity_out).toLocaleString('en-US', { maximumFractionDigits: 3 })}` : '-'}</td>
                        <td className="p-3 font-bold">{Number(m.balance_qty_after || 0).toLocaleString('en-US', { maximumFractionDigits: 3 })} {m.material?.unit}</td>
                        <td className="p-3 text-muted-foreground text-xs">{m.notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Card>
      )}

      {activeTab === 'adjust' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <h3 className="font-semibold text-lg mb-4">{tr('Form Stock Adjustment (Koreksi Stok)', 'Stock Adjustment Form')}</h3>
            <form onSubmit={handleStockAdjust} className="space-y-4">
              <FormField label={tr('Gudang', 'Warehouse')} required>
                <Select value={adjForm.warehouse_id} onChange={(e) => setAdjForm({ ...adjForm, warehouse_id: e.target.value })} required>
                  <option value="">{tr('Pilih Gudang...', 'Select warehouse...')}</option>
                  {activeWarehouses.map((w: any) => <option key={w.id} value={w.id}>{w.code} — {w.name}{w.branch?.name ? ` (${w.branch.name})` : ''}</option>)}
                </Select>
              </FormField>
              <FormField label={tr('Material', 'Material')} required>
                <Select value={adjForm.material_id} onChange={(e) => setAdjForm({ ...adjForm, material_id: e.target.value })} required>
                  <option value="">{tr('Pilih Material...', 'Select material...')}</option>
                  {materials.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </Select>
              </FormField>
              <FormField label={tr('Jenis Adjustment', 'Adjustment Type')} required>
                <Select value={adjForm.type} onChange={(e) => setAdjForm({ ...adjForm, type: e.target.value as 'IN' | 'OUT' })} required>
                  <option value="IN">IN (Increase)</option>
                  <option value="OUT">OUT (Decrease)</option>
                </Select>
              </FormField>
              <FormField label={tr('Kuantitas', 'Quantity')} required>
                <NumericInput min={1} value={adjForm.quantity} maximumFractionDigits={0} placeholder="Contoh: 10" onValueChange={(raw) => setAdjForm({ ...adjForm, quantity: raw })} required />
              </FormField>
              <FormField label={tr('Alasan / Keterangan (Wajib)', 'Reason / Description (Required)')} required>
                <Textarea value={adjForm.reason} onChange={(e) => setAdjForm({ ...adjForm, reason: e.target.value })} placeholder={tr('Alasan koreksi stok...', 'Reason for stock adjustment...')} required />
              </FormField>
              <Button type="submit" disabled={activeWarehouses.length === 0}>{tr('Simpan Adjustment', 'Save Adjustment')}</Button>
            </form>
          </Card>

          <Card>
            <h3 className="font-semibold text-lg mb-4">{tr('Stock Opname & Rekonsiliasi Fisik', 'Physical Stock Count & Reconciliation')}</h3>
            <form onSubmit={handleStockOpname} className="space-y-4">
              <FormField label={tr('Gudang', 'Warehouse')} required>
                <Select value={opnameForm.warehouse_id} onChange={(e) => setOpnameForm({ ...opnameForm, warehouse_id: e.target.value })} required>
                  <option value="">{tr('Pilih Gudang...', 'Select warehouse...')}</option>
                  {warehouses.map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
                </Select>
              </FormField>
              <FormField label={tr('Material', 'Material')} required>
                <Select value={opnameForm.material_id} onChange={(e) => setOpnameForm({ ...opnameForm, material_id: e.target.value })} required>
                  <option value="">{tr('Pilih Material...', 'Select material...')}</option>
                  {materials.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </Select>
              </FormField>
              <FormField label={tr('Jumlah Stok Fisik Hitung', 'Counted Physical Stock')} required>
                <NumericInput min={0} value={opnameForm.physical_qty} maximumFractionDigits={0} placeholder={tr('Contoh: 0', 'e.g. 0')} onValueChange={(raw) => setOpnameForm({ ...opnameForm, physical_qty: raw })} required />
              </FormField>
              <FormField label={tr('Catatan / Alasan Opname', 'Stock Count Notes / Reason')}>
                <Textarea value={opnameForm.reason} onChange={(e) => setOpnameForm({ ...opnameForm, reason: e.target.value })} />
              </FormField>
              <Button type="submit">{tr('Proses Stock Opname', 'Process Stock Count')}</Button>
            </form>
          </Card>
        </div>
      )}

      {/* Modal Create Receipt */}
      {receiptModalOpen && (
        <Modal open={receiptModalOpen} title={tr('Buat Penerimaan Material Baru (Material Receipt)', 'Create New Material Receipt')} onClose={() => setReceiptModalOpen(false)}>
          <form onSubmit={handleCreateReceipt} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <FormField label={tr('Gudang', 'Warehouse')} required>
                <Select value={receiptForm.warehouse_id} onChange={(e) => setReceiptForm({ ...receiptForm, warehouse_id: e.target.value })} required>
                  <option value="">{tr('Pilih Gudang...', 'Select warehouse...')}</option>
                  {warehouses.map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
                </Select>
              </FormField>
              <FormField label={tr('Supplier', 'Supplier')}>
                <Select value={receiptForm.supplier_id} onChange={(e) => setReceiptForm({ ...receiptForm, supplier_id: e.target.value })}>
                  <option value="">{tr('Pilih Supplier...', 'Select supplier...')}</option>
                  {suppliers.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </Select>
              </FormField>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <FormField label={tr('Tanggal Penerimaan', 'Receipt Date')} required>
                <Input type="date" value={receiptForm.receipt_date} onChange={(e) => setReceiptForm({ ...receiptForm, receipt_date: e.target.value })} required />
              </FormField>
              <FormField label={tr('Catatan', 'Notes')}>
                <Input value={receiptForm.notes} onChange={(e) => setReceiptForm({ ...receiptForm, notes: e.target.value })} placeholder={tr('Catatan penerimaan...', 'Receipt notes...')} />
              </FormField>
            </div>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
              <h4 style={{ fontWeight: 600, marginBottom: '0.75rem' }}>{tr('Baris Material Diterima', 'Received Material Lines')}</h4>
              {receiptForm.lines.map((line, idx) => {
                const selectedMat = materials.find((m: any) => m.id === line.material_id);
                const unitLabel = selectedMat?.unit || tr('Satuan', 'Unit');
                const subtotal = (Number(line.quantity_received) || 0) * (Number(line.unit_cost) || 0);

                return (
                  <div key={idx} style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border)', borderRadius: '0.5rem', padding: '1rem', marginBottom: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                      <FormField label={tr('Nama Material', 'Material Name')} required>
                        <Select value={line.material_id} onChange={(e) => {
                          const newLines = [...receiptForm.lines];
                          newLines[idx].material_id = e.target.value;
                          setReceiptForm({ ...receiptForm, lines: newLines });
                        }} required>
                          <option value="">{tr('Pilih Material...', 'Select material...')}</option>
                          {materials.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </Select>
                      </FormField>

                      <FormField label={`${tr('Kuantitas', 'Quantity')} (${unitLabel})`} required>
                        <NumericInput min={0.001} maximumFractionDigits={3} placeholder="Contoh: 10 atau 2,5" value={line.quantity_received} onValueChange={(raw) => {
                          const newLines = [...receiptForm.lines];
                          newLines[idx].quantity_received = raw;
                          setReceiptForm({ ...receiptForm, lines: newLines });
                        }} required />
                      </FormField>

                      <FormField label="Harga Satuan (Rp)" required>
                        <NumericInput min={0} maximumFractionDigits={2} placeholder={tr('Contoh: 85000', 'e.g. 85000')} value={line.unit_cost} onValueChange={(raw) => {
                          const newLines = [...receiptForm.lines];
                          newLines[idx].unit_cost = raw;
                          setReceiptForm({ ...receiptForm, lines: newLines });
                        }} required />
                      </FormField>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: '200px' }}>
                        <FormField label="Catatan">
                          <Input placeholder={tr('Catatan opsional per baris...', 'Optional line notes...')} value={line.notes} onChange={(e) => {
                            const newLines = [...receiptForm.lines];
                            newLines[idx].notes = e.target.value;
                            setReceiptForm({ ...receiptForm, lines: newLines });
                          }} />
                        </FormField>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: 'auto' }}>
                        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-success, #22c55e)' }}>
                          Subtotal: Rp {subtotal.toLocaleString('id-ID')}
                        </div>
                        <Button type="button" variant="danger" onClick={() => {
                          const newLines = receiptForm.lines.filter((_, i) => i !== idx);
                          setReceiptForm({ ...receiptForm, lines: newLines });
                        }}>{tr('Hapus', 'Remove')}</Button>
                      </div>
                    </div>
                  </div>
                );
              })}
              <Button type="button" variant="secondary" onClick={() => setReceiptForm({ ...receiptForm, lines: [...receiptForm.lines, { material_id: '', quantity_received: '', unit_cost: '', notes: '' }] })}>
                + {tr('Tambah Baris Material', 'Add Material Line')}
              </Button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '1rem' }}>
              <Button type="button" variant="secondary" onClick={() => setReceiptModalOpen(false)}>{tr('Batal', 'Cancel')}</Button>
              <Button type="submit" disabled={activeWarehouses.length === 0}>{tr('Simpan Draft Penerimaan', 'Save Receipt Draft')}</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Receipt Detail */}
      {receiptDetail && (
        <Modal open={Boolean(receiptDetail)} title={`${tr('Detail Penerimaan:', 'Receipt Details:')} ${receiptDetail.receipt_number}`} onClose={() => setReceiptDetail(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', fontSize: '0.875rem' }}>
              <div><strong>{tr('Status:', 'Status:')}</strong> <StatusBadge status={receiptDetail.status === 'POSTED' ? 'success' : receiptDetail.status === 'DRAFT' ? 'warning' : 'neutral'} label={receiptDetail.status} /></div>
              <div><strong>{tr('Tanggal:', 'Date:')}</strong> {receiptDetail.receipt_date}</div>
              <div><strong>{tr('Gudang:', 'Warehouse:')}</strong> {receiptDetail.warehouse?.name || '-'}</div>
              <div><strong>{tr('Supplier:', 'Supplier:')}</strong> {receiptDetail.supplier?.name || 'Umum'}</div>
            </div>
            {receiptDetail.notes && <p style={{ fontSize: '0.875rem' }}><strong>{tr('Catatan:', 'Notes:')}</strong> {receiptDetail.notes}</p>}

            <div>
              <h4 style={{ fontWeight: 600, marginBottom: '0.5rem' }}>{tr('Item Material', 'Material Items')}</h4>
              <table style={{ width: '100%', fontSize: '0.875rem', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.03)' }}>
                    <th style={{ padding: '0.5rem' }}>{tr('Material', 'Material')}</th>
                    <th style={{ padding: '0.5rem' }}>{tr('Jumlah', 'Quantity')}</th>
                    <th style={{ padding: '0.5rem' }}>{tr('Harga Unit', 'Unit Price')}</th>
                    <th style={{ padding: '0.5rem' }}>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {receiptDetail.lines?.map((l, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '0.5rem' }}>{l.material?.name || l.material_id}</td>
                      <td style={{ padding: '0.5rem' }}>{l.quantity ?? l.quantity_received}</td>
                      <td style={{ padding: '0.5rem' }}>Rp {Number(l.unit_cost).toLocaleString()}</td>
                      <td style={{ padding: '0.5rem', fontWeight: 600 }}>Rp {Number(l.subtotal ?? ((Number(l.quantity ?? l.quantity_received) || 0) * Number(l.unit_cost))).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '1rem' }}>
              {receiptDetail.status === 'DRAFT' && (
                <>
                  <Button variant="primary" onClick={() => handlePostReceipt(receiptDetail.id)}>{tr('Post Transaksi', 'Post Receipt')}</Button>
                  <Button variant="danger" onClick={() => handleCancelReceipt(receiptDetail.id)}>{tr('Batalkan Draft', 'Cancel Draft')}</Button>
                </>
              )}
              <Button variant="secondary" onClick={() => setReceiptDetail(null)}>{tr('Tutup', 'Close')}</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        open={confirmState.open}
        title={confirmState.title}
        description={confirmState.description}
        tone={confirmState.tone}
        onConfirm={() => {
          confirmState.onConfirm();
          setConfirmState({ open: false, title: '', description: '', tone: 'primary', onConfirm: () => {} });
        }}
        onClose={() => setConfirmState({ open: false, title: '', description: '', tone: 'primary', onConfirm: () => {} })}
      />
    </>
  );
}
