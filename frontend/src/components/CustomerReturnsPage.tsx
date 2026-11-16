import { useEffect, useMemo, useState } from 'react';
import { Plus, Send } from 'lucide-react';
import { useAuth, permissions } from '../auth';
import { apiError, customerReturnApi, deliveryOrderApi, type CustomerReturnRecord, type DeliveryOrderRecord } from '../services/api';
import { Alert, Button, Card, DataTable, type DataTableColumn, FormField, Input, Modal, PageHeader, Select, StatusBadge, Toast } from './ui';

export function CustomerReturnsPage() {
  const { hasPermission } = useAuth();
  const [orders, setOrders] = useState<DeliveryOrderRecord[]>([]);
  const [returns, setReturns] = useState<CustomerReturnRecord[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const selected = useMemo(() => orders.find((o) => o.id === selectedId), [orders, selectedId]);

  const load = async () => {
    setLoading(true); setError('');
    try {
      const [doResult, returnResult] = await Promise.all([deliveryOrderApi.list(), customerReturnApi.list()]);
      setOrders((doResult.data || []).filter((o: DeliveryOrderRecord) => ['DELIVERED', 'CLOSED'].includes(o.status)));
      setReturns(returnResult.data || []);
    } catch (e) { setError(apiError(e)); } finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const canCreate = hasPermission(permissions.returnCreate);
  const canPost = hasPermission(permissions.returnPost);
  const openCreate = () => { setSelectedId(''); setQuantities({}); setReasons({}); setDate(new Date().toISOString().slice(0, 10)); setError(''); setOpen(true); };
  const save = async () => {
    if (!selected) { setError('Pilih Surat Jalan terlebih dahulu.'); return; }
    const lines = selected.lines.filter((line) => Number(quantities[line.id] || 0) > 0).map((line) => ({ delivery_order_line_id: line.id, quantity: Number(quantities[line.id]), reason: reasons[line.id] || undefined }));
    if (!lines.length) { setError('Isi minimal satu kuantitas retur.'); return; }
    setLoading(true); setError('');
    try { await customerReturnApi.create({ delivery_order_id: selected.id, return_date: date, lines }); setNotice('Draft retur berhasil dibuat.'); setOpen(false); await load(); }
    catch (e) { setError(apiError(e)); } finally { setLoading(false); }
  };
  const post = async (id: string) => {
    if (!window.confirm('Posting retur akan menambah saldo custody dan tidak dapat dibatalkan. Lanjutkan?')) return;
    setLoading(true); setError('');
    try { await customerReturnApi.post(id); setNotice('Retur berhasil diposting dan saldo custody diperbarui.'); await load(); }
    catch (e) { setError(apiError(e)); } finally { setLoading(false); }
  };
  const columns: DataTableColumn<CustomerReturnRecord>[] = [
    { id: 'number', header: 'Nomor Retur', cell: (r) => <strong>{r.return_number}</strong>, sortValue: (r) => r.return_number },
    { id: 'sj', header: 'Surat Jalan', cell: (r) => r.delivery_order?.sj_number || '-' },
    { id: 'customer', header: 'Customer', cell: (r) => r.customer?.name || '-' },
    { id: 'date', header: 'Tanggal', cell: (r) => r.return_date },
    { id: 'status', header: 'Status', cell: (r) => <StatusBadge status={r.status} /> },
    { id: 'actions', header: 'Aksi', cell: (r) => r.status === 'DRAFT' && canPost ? <Button onClick={() => void post(r.id)} disabled={loading}><Send size={14} /> Posting</Button> : '-' },
  ];
  return <>
    <PageHeader title="Retur Barang Customer" description="Catat pengembalian barang setelah diterima customer. Posting mengembalikan barang ke custody tanpa mengubah invoice atau pembayaran." action={canCreate ? <Button onClick={openCreate} disabled={loading}><Plus size={16} /> Buat Retur</Button> : undefined} />
    <Toast open={Boolean(notice)} message={notice} tone="success" onClose={() => setNotice('')} />
    {error && <Alert tone="danger">{error}</Alert>}
    <Card><DataTable columns={columns} rows={returns} searchPlaceholder="Cari nomor retur, SJ, atau customer" searchText={(r) => `${r.return_number} ${r.delivery_order?.sj_number || ''} ${r.customer?.name || ''}`} emptyTitle="Belum ada retur" emptyDescription="Retur barang customer akan tampil di sini." /></Card>
    {open && <Modal open={open} title="Buat Draft Retur" onClose={() => setOpen(false)}>
      <div className="confirmation-dialog__body" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
        <FormField label="Surat Jalan" required><Select value={selectedId} onChange={(e) => { setSelectedId(e.target.value); setQuantities({}); setReasons({}); }}><option value="">Pilih Surat Jalan</option>{orders.map((o) => <option key={o.id} value={o.id}>{o.sj_number} — {o.customer?.name || o.customer_id}</option>)}</Select></FormField>
        <FormField label="Tanggal Retur" required><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></FormField>
        {selected && selected.lines.map((line) => <div key={line.id} className="form-section" style={{ marginTop: 12 }}>
          <strong>{line.customer_item?.name || line.customer_item_id}</strong><div className="form-grid">
            <FormField label={`Qty retur (dikirim: ${line.quantity})`}><Input type="number" min="0" step="0.001" value={quantities[line.id] || ''} onChange={(e) => setQuantities((v) => ({ ...v, [line.id]: e.target.value }))} /></FormField>
            <FormField label="Alasan"><Input value={reasons[line.id] || ''} onChange={(e) => setReasons((v) => ({ ...v, [line.id]: e.target.value }))} /></FormField>
          </div>
        </div>)}
        <p className="text-muted">Server memvalidasi jumlah berdasarkan penerimaan customer yang sudah diposting dan retur sebelumnya.</p>
        <div className="modal__actions"><Button variant="ghost" onClick={() => setOpen(false)}>Batal</Button><Button onClick={() => void save()} loading={loading}>Simpan Draft</Button></div>
      </div>
    </Modal>}
  </>;
}
