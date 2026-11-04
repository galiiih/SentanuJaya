import { useState, useEffect } from 'react';
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
  Modal,
  PageHeader,
  Select,
  StatusBadge,
  Textarea,
  Toast,
} from './ui';

export function MaterialsPage() {
  const [activeTab, setActiveTab] = useState<'stocks' | 'receipts' | 'cards' | 'adjust'>('stocks');

  // Data states
  const [materials, setMaterials] = useState<Material[]>([]);
  const [stocks, setStocks] = useState<any[]>([]);
  const [receipts, setReceipts] = useState<MaterialReceiptRecord[]>([]);
  const [movements, setMovements] = useState<StockMovementRecord[]>([]);
  const [warehouses, setWarehouseList] = useState<any[]>([]);
  const [suppliers, setSupplierList] = useState<any[]>([]);
  const [lowStocks, setLowStocks] = useState<any[]>([]);

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
    lines: [{ material_id: '', quantity_received: 1, unit_cost: 0, notes: '' }],
  });

  // Adjustment Form
  const [adjForm, setAdjForm] = useState({
    warehouse_id: '',
    material_id: '',
    type: 'IN' as 'IN' | 'OUT',
    quantity: 1,
    reason: '',
  });

  // Opname Form
  const [opnameForm, setOpnameForm] = useState({
    warehouse_id: '',
    material_id: '',
    physical_qty: 0,
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

      const rawMat = matRes.data?.data?.data || matRes.data?.data || [];
      const rawStock = stockRes.data?.data?.data || stockRes.data?.data || stockRes.data || [];
      const stocksList = Array.isArray(rawStock) ? rawStock : [];
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
      setReceipts(recRes.data || []);
      setMovements(movRes.data || []);
      setWarehouseList(whRes.data || []);
      setSupplierList(supRes.data || []);
      setLowStocks(lowRes || []);
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
      await materialReceiptApi.create(receiptForm);
      setNotice('Penerimaan material (Draft) berhasil dibuat.');
      setReceiptModalOpen(false);
      setReceiptForm({
        warehouse_id: '',
        supplier_id: '',
        receipt_date: new Date().toISOString().split('T')[0],
        notes: '',
        lines: [{ material_id: '', quantity_received: 1, unit_cost: 0, notes: '' }],
      });
      loadData();
    } catch (err) {
      setError(apiError(err));
    }
  };

  const handlePostReceipt = (id: string) => {
    setConfirmState({
      open: true,
      title: 'Post Penerimaan Material',
      description: 'Apakah Anda yakin ingin memposting penerimaan ini? Stok di gudang akan bertambah dan transaksi akan dikunci.',
      tone: 'primary',
      onConfirm: async () => {
        try {
          await materialReceiptApi.post(id);
          setNotice('Penerimaan material berhasil diposting dan stok telah diperbarui.');
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
      title: 'Batalkan Penerimaan Material',
      description: 'Batalkan draft penerimaan material ini?',
      tone: 'danger',
      onConfirm: async () => {
        try {
          await materialReceiptApi.cancel(id);
          setNotice('Penerimaan material dibatalkan.');
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
      await stockApi.adjust(adjForm);
      setNotice('Stock adjustment berhasil diproses.');
      setAdjForm({ warehouse_id: '', material_id: '', type: 'IN', quantity: 1, reason: '' });
      loadData();
    } catch (err) {
      setError(apiError(err));
    }
  };

  const handleStockOpname = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const currentStock = stocks.find((s: any) => s.warehouse_id === opnameForm.warehouse_id && s.material_id === opnameForm.material_id)?.quantity_on_hand ?? 0;
    const diff = opnameForm.physical_qty - Number(currentStock);
    if (diff === 0) {
      setError('Kuantitas fisik sama dengan stok sistem. Tidak ada adjustment yang diperlukan.');
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
      setNotice(`Stock opname berhasil direkonsiliasi (${type} ${quantity}).`);
      loadData();
    } catch (err) {
      setError(apiError(err));
    }
  };

  const materialColumns: DataTableColumn<Material>[] = [
    { id: 'sku', header: 'SKU', cell: (row) => row.sku, sortValue: (row) => row.sku },
    { id: 'name', header: 'Nama Material', cell: (row) => row.name, sortValue: (row) => row.name },
    { id: 'category', header: 'Kategori', cell: (row) => row.category, sortValue: (row) => row.category },
    { id: 'quantity_on_hand', header: 'Stok Aktual', cell: (row) => `${row.quantity_on_hand} ${row.unit}`, sortValue: (row) => row.quantity_on_hand },
    { id: 'minimum_stock', header: 'Minimum', cell: (row) => `${row.minimum_stock} ${row.unit}`, sortValue: (row) => row.minimum_stock },
    {
      id: 'status',
      header: 'Status',
      cell: (row) => (
        row.quantity_on_hand <= row.minimum_stock ? (
          <StatusBadge status="warning" label="Stok Rendah" />
        ) : (
          <StatusBadge status="success" label="Aman" />
        )
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Inventaris & Gudang Material" description="Kelola penerimaan material Sentanu Jaya, mutasi stok, adjustment, dan opname secara akurat." />
      
      <Toast open={Boolean(notice)} message={notice} onClose={() => setNotice('')} />
      {error && <Alert tone="danger">{error}</Alert>}

      {lowStocks.length > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          <Alert tone="warning">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertTriangle size={18} />
              <span>Terdapat {lowStocks.length} material dengan stok di bawah minimum! Harap lakukan penerimaan material.</span>
            </div>
          </Alert>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b pb-3 flex-wrap">
        <Button variant={activeTab === 'stocks' ? 'primary' : 'secondary'} onClick={() => setActiveTab('stocks')}>
          <Package className="w-4 h-4 mr-2" /> Daftar Stok Material
        </Button>
        <Button variant={activeTab === 'receipts' ? 'primary' : 'secondary'} onClick={() => setActiveTab('receipts')}>
          <FileText className="w-4 h-4 mr-2" /> Penerimaan Material
        </Button>
        <Button variant={activeTab === 'cards' ? 'primary' : 'secondary'} onClick={() => setActiveTab('cards')}>
          <ArrowLeftRight className="w-4 h-4 mr-2" /> Stock Card (Mutasi)
        </Button>
        <Button variant={activeTab === 'adjust' ? 'primary' : 'secondary'} onClick={() => setActiveTab('adjust')}>
          <CheckCircle2 className="w-4 h-4 mr-2" /> Stock Adjustment & Opname
        </Button>
      </div>

      {activeTab === 'stocks' && (
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontWeight: 600, fontSize: '1.1rem' }}>Saldo Stok Material Gudang</h3>
            <Button onClick={() => setReceiptModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" /> Penerimaan Material Baru
            </Button>
          </div>
          <DataTable columns={materialColumns} rows={materials} searchText={(m) => `${m.sku} ${m.name} ${m.category}`} emptyTitle="Belum ada material" emptyDescription="Data material gudang Sentanu Jaya." />
        </Card>
      )}

      {activeTab === 'receipts' && (
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontWeight: 600, fontSize: '1.1rem' }}>Daftar Penerimaan Material (Material Receipts)</h3>
            <Button onClick={() => setReceiptModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" /> Buat Penerimaan
            </Button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {receipts.length === 0 ? (
              <p style={{ color: 'var(--muted-foreground)', textAlign: 'center', padding: '1.5rem' }}>Belum ada transaksi penerimaan material.</p>
            ) : (
              receipts.map((rec) => (
                <div key={rec.id} style={{ padding: '1rem', border: '1px solid var(--border)', borderRadius: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--card)', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontWeight: 700 }}>{rec.receipt_number}</span>
                      <StatusBadge status={rec.status === 'POSTED' ? 'success' : rec.status === 'DRAFT' ? 'warning' : 'neutral'} label={rec.status} />
                    </div>
                    <p style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)', marginTop: '0.25rem' }}>
                      Gudang: {rec.warehouse?.name || '-'} | Supplier: {rec.supplier?.name || 'Umum'} | Tanggal: {rec.receipt_date}
                    </p>
                    {rec.notes && <p style={{ fontSize: '0.75rem', fontStyle: 'italic', marginTop: '0.25rem' }}>{rec.notes}</p>}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <Button variant="secondary" onClick={() => materialReceiptApi.get(rec.id).then(setReceiptDetail)}>
                      <Eye className="w-4 h-4 mr-1" /> Detail
                    </Button>
                    {rec.status === 'DRAFT' && (
                      <>
                        <Button variant="primary" onClick={() => handlePostReceipt(rec.id)}>Post</Button>
                        <Button variant="danger" onClick={() => handleCancelReceipt(rec.id)}>Batal</Button>
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
          <h3 className="font-semibold text-lg mb-4">Riwayat Mutasi Stok (Stock Card)</h3>
          <div className="space-y-2">
            {movements.length === 0 ? (
              <p className="text-muted-foreground text-center py-6">Belum ada mutasi stok tercatat.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="p-3">Tanggal</th>
                      <th className="p-3">Tipe</th>
                      <th className="p-3">Material</th>
                      <th className="p-3">Gudang</th>
                      <th className="p-3">Masuk</th>
                      <th className="p-3">Keluar</th>
                      <th className="p-3">Saldo Akhir</th>
                      <th className="p-3">Keterangan</th>
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
            <h3 className="font-semibold text-lg mb-4">Form Stock Adjustment (Koreksi Stok)</h3>
            <form onSubmit={handleStockAdjust} className="space-y-4">
              <FormField label="Gudang" required>
                <Select value={adjForm.warehouse_id} onChange={(e) => setAdjForm({ ...adjForm, warehouse_id: e.target.value })} required>
                  <option value="">Pilih Gudang...</option>
                  {warehouses.map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
                </Select>
              </FormField>
              <FormField label="Material" required>
                <Select value={adjForm.material_id} onChange={(e) => setAdjForm({ ...adjForm, material_id: e.target.value })} required>
                  <option value="">Pilih Material...</option>
                  {materials.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </Select>
              </FormField>
              <FormField label="Jenis Adjustment" required>
                <Select value={adjForm.type} onChange={(e) => setAdjForm({ ...adjForm, type: e.target.value as 'IN' | 'OUT' })} required>
                  <option value="IN">IN (Penambahan)</option>
                  <option value="OUT">OUT (Pengurangan)</option>
                </Select>
              </FormField>
              <FormField label="Kuantitas" required>
                <Input type="number" step="1" min="1" value={adjForm.quantity} onChange={(e) => setAdjForm({ ...adjForm, quantity: Number(e.target.value) })} required />
              </FormField>
              <FormField label="Alasan / Keterangan (Wajib)" required>
                <Textarea value={adjForm.reason} onChange={(e) => setAdjForm({ ...adjForm, reason: e.target.value })} placeholder="Alasan koreksi stok..." required />
              </FormField>
              <Button type="submit">Simpan Adjustment</Button>
            </form>
          </Card>

          <Card>
            <h3 className="font-semibold text-lg mb-4">Stock Opname & Rekonsiliasi Fisik</h3>
            <form onSubmit={handleStockOpname} className="space-y-4">
              <FormField label="Gudang" required>
                <Select value={opnameForm.warehouse_id} onChange={(e) => setOpnameForm({ ...opnameForm, warehouse_id: e.target.value })} required>
                  <option value="">Pilih Gudang...</option>
                  {warehouses.map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
                </Select>
              </FormField>
              <FormField label="Material" required>
                <Select value={opnameForm.material_id} onChange={(e) => setOpnameForm({ ...opnameForm, material_id: e.target.value })} required>
                  <option value="">Pilih Material...</option>
                  {materials.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </Select>
              </FormField>
              <FormField label="Jumlah Stok Fisik Hitung" required>
                <Input type="number" step="1" min="0" value={opnameForm.physical_qty} onChange={(e) => setOpnameForm({ ...opnameForm, physical_qty: Number(e.target.value) })} required />
              </FormField>
              <FormField label="Catatan / Alasan Opname">
                <Textarea value={opnameForm.reason} onChange={(e) => setOpnameForm({ ...opnameForm, reason: e.target.value })} />
              </FormField>
              <Button type="submit">Proses Stock Opname</Button>
            </form>
          </Card>
        </div>
      )}

      {/* Modal Create Receipt */}
      {receiptModalOpen && (
        <Modal open={receiptModalOpen} title="Buat Penerimaan Material Baru (Material Receipt)" onClose={() => setReceiptModalOpen(false)}>
          <form onSubmit={handleCreateReceipt} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <FormField label="Gudang" required>
                <Select value={receiptForm.warehouse_id} onChange={(e) => setReceiptForm({ ...receiptForm, warehouse_id: e.target.value })} required>
                  <option value="">Pilih Gudang...</option>
                  {warehouses.map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
                </Select>
              </FormField>
              <FormField label="Supplier">
                <Select value={receiptForm.supplier_id} onChange={(e) => setReceiptForm({ ...receiptForm, supplier_id: e.target.value })}>
                  <option value="">Pilih Supplier...</option>
                  {suppliers.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </Select>
              </FormField>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <FormField label="Tanggal Penerimaan" required>
                <Input type="date" value={receiptForm.receipt_date} onChange={(e) => setReceiptForm({ ...receiptForm, receipt_date: e.target.value })} required />
              </FormField>
              <FormField label="Catatan">
                <Input value={receiptForm.notes} onChange={(e) => setReceiptForm({ ...receiptForm, notes: e.target.value })} placeholder="Catatan penerimaan..." />
              </FormField>
            </div>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
              <h4 style={{ fontWeight: 600, marginBottom: '0.75rem' }}>Baris Material Diterima</h4>
              {receiptForm.lines.map((line, idx) => {
                const selectedMat = materials.find((m: any) => m.id === line.material_id);
                const unitLabel = selectedMat?.unit || 'Satuan';
                const subtotal = (Number(line.quantity_received) || 0) * (Number(line.unit_cost) || 0);

                return (
                  <div key={idx} style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border)', borderRadius: '0.5rem', padding: '1rem', marginBottom: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                      <FormField label="Nama Material" required>
                        <Select value={line.material_id} onChange={(e) => {
                          const newLines = [...receiptForm.lines];
                          newLines[idx].material_id = e.target.value;
                          setReceiptForm({ ...receiptForm, lines: newLines });
                        }} required>
                          <option value="">Pilih Material...</option>
                          {materials.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </Select>
                      </FormField>

                      <FormField label={`Kuantitas (${unitLabel})`} required>
                        <Input type="number" step="0.001" min="0.001" placeholder="Contoh: 10 atau 2,5" value={line.quantity_received === 0 ? '' : line.quantity_received} onChange={(e) => {
                          const newLines = [...receiptForm.lines];
                          newLines[idx].quantity_received = e.target.value === '' ? 0 : Number(e.target.value);
                          setReceiptForm({ ...receiptForm, lines: newLines });
                        }} required />
                      </FormField>

                      <FormField label="Harga Satuan (Rp)" required>
                        <Input type="number" step="100" min="0" placeholder="Contoh: 85000" value={line.unit_cost === 0 ? '' : line.unit_cost} onChange={(e) => {
                          const newLines = [...receiptForm.lines];
                          newLines[idx].unit_cost = e.target.value === '' ? 0 : Number(e.target.value);
                          setReceiptForm({ ...receiptForm, lines: newLines });
                        }} required />
                      </FormField>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: '200px' }}>
                        <FormField label="Catatan">
                          <Input placeholder="Catatan opsional per baris..." value={line.notes} onChange={(e) => {
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
                        }}>Hapus</Button>
                      </div>
                    </div>
                  </div>
                );
              })}
              <Button type="button" variant="secondary" onClick={() => setReceiptForm({ ...receiptForm, lines: [...receiptForm.lines, { material_id: '', quantity_received: 1, unit_cost: 0, notes: '' }] })}>
                + Tambah Baris Material
              </Button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '1rem' }}>
              <Button type="button" variant="secondary" onClick={() => setReceiptModalOpen(false)}>Batal</Button>
              <Button type="submit">Simpan Draft Penerimaan</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Receipt Detail */}
      {receiptDetail && (
        <Modal open={Boolean(receiptDetail)} title={`Detail Penerimaan: ${receiptDetail.receipt_number}`} onClose={() => setReceiptDetail(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', fontSize: '0.875rem' }}>
              <div><strong>Status:</strong> <StatusBadge status={receiptDetail.status === 'POSTED' ? 'success' : receiptDetail.status === 'DRAFT' ? 'warning' : 'neutral'} label={receiptDetail.status} /></div>
              <div><strong>Tanggal:</strong> {receiptDetail.receipt_date}</div>
              <div><strong>Gudang:</strong> {receiptDetail.warehouse?.name || '-'}</div>
              <div><strong>Supplier:</strong> {receiptDetail.supplier?.name || 'Umum'}</div>
            </div>
            {receiptDetail.notes && <p style={{ fontSize: '0.875rem' }}><strong>Catatan:</strong> {receiptDetail.notes}</p>}

            <div>
              <h4 style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Item Material</h4>
              <table style={{ width: '100%', fontSize: '0.875rem', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.03)' }}>
                    <th style={{ padding: '0.5rem' }}>Material</th>
                    <th style={{ padding: '0.5rem' }}>Jumlah</th>
                    <th style={{ padding: '0.5rem' }}>Harga Unit</th>
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
                  <Button variant="primary" onClick={() => handlePostReceipt(receiptDetail.id)}>Post Transaksi</Button>
                  <Button variant="danger" onClick={() => handleCancelReceipt(receiptDetail.id)}>Batalkan Draft</Button>
                </>
              )}
              <Button variant="secondary" onClick={() => setReceiptDetail(null)}>Tutup</Button>
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
