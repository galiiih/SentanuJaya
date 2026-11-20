import { useEffect, useMemo, useState } from 'react';
import { Plus, Send } from 'lucide-react';
import { useAuth, permissions } from '../auth';
import { useLanguage } from '../i18n';
import { apiError, customerReturnApi, deliveryOrderApi, type CustomerReturnRecord, type DeliveryOrderRecord } from '../services/api';
import { Alert, Button, Card, DataTable, type DataTableColumn, FormField, Input, NumericInput, Modal, PageHeader, Select, StatusBadge, Toast } from './ui';

export function CustomerReturnsPage() {
  const { hasPermission } = useAuth();
  const { language } = useLanguage();
  const en = language === 'en';
  const tr = (id: string, english: string) => en ? english : id;
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
    if (!selected) { setError(tr('Pilih Surat Jalan terlebih dahulu.', 'Select a Delivery Order first.')); return; }
    const overLimit = selected.lines.find((line) => Number(quantities[line.id] || 0) > Number(line.quantity));
    if (overLimit) {
      setError(tr(`Kuantitas retur tidak boleh melebihi jumlah yang dikirim (${overLimit.quantity}).`, `Return quantity cannot exceed the delivered quantity (${overLimit.quantity}).`));
      return;
    }
    const lines = selected.lines.filter((line) => Number(quantities[line.id] || 0) > 0).map((line) => ({ delivery_order_line_id: line.id, quantity: Number(quantities[line.id]), reason: reasons[line.id] || undefined }));
    if (!lines.length) { setError(tr('Isi minimal satu kuantitas retur.', 'Enter at least one return quantity.')); return; }
    setLoading(true); setError('');
    try { await customerReturnApi.create({ delivery_order_id: selected.id, return_date: date, lines }); setNotice(tr('Draft retur berhasil dibuat.', 'Return draft created successfully.')); setOpen(false); await load(); }
    catch (e) { setError(apiError(e)); } finally { setLoading(false); }
  };
  const post = async (id: string) => {
    if (!window.confirm(tr('Posting retur akan menambah saldo custody dan tidak dapat dibatalkan. Lanjutkan?', 'Posting this return will increase the custody balance and cannot be undone. Continue?'))) return;
    setLoading(true); setError('');
    try { await customerReturnApi.post(id); setNotice(tr('Retur berhasil diposting dan saldo custody diperbarui.', 'Return posted and custody balance updated successfully.')); await load(); }
    catch (e) { setError(apiError(e)); } finally { setLoading(false); }
  };
  const columns: DataTableColumn<CustomerReturnRecord>[] = [
    { id: 'number', header: tr('Nomor Retur', 'Return Number'), cell: (r) => <strong>{r.return_number}</strong>, sortValue: (r) => r.return_number },
    { id: 'sj', header: tr('Surat Jalan', 'Delivery Order'), cell: (r) => r.delivery_order?.sj_number || '-' },
    { id: 'customer', header: 'Customer', cell: (r) => r.customer?.name || '-' },
    { id: 'date', header: tr('Tanggal', 'Date'), cell: (r) => r.return_date },
    { id: 'status', header: 'Status', cell: (r) => <StatusBadge status={r.status} /> },
    { id: 'actions', header: tr('Aksi', 'Actions'), cell: (r) => r.status === 'DRAFT' && canPost ? <Button onClick={() => void post(r.id)} disabled={loading}><Send size={14} /> {tr('Posting', 'Post')}</Button> : '-' },
  ];
  return <>
    <PageHeader title={tr('Retur Barang Customer', 'Customer Returns')} description={tr('Catat pengembalian barang setelah diterima customer. Posting mengembalikan barang ke custody tanpa mengubah invoice atau pembayaran.', 'Record goods returned after customer delivery. Posting returns the goods to custody without changing invoices or payments.')} action={canCreate ? <Button onClick={openCreate} disabled={loading}><Plus size={16} /> {tr('Buat Retur', 'Create Return')}</Button> : undefined} />
    <Toast open={Boolean(notice)} message={notice} tone="success" onClose={() => setNotice('')} />
    {error && <Alert tone="danger">{error}</Alert>}
    <Card><DataTable columns={columns} rows={returns} searchPlaceholder={tr('Cari nomor retur, SJ, atau customer', 'Search return number, Delivery Order, or customer')} searchText={(r) => `${r.return_number} ${r.delivery_order?.sj_number || ''} ${r.customer?.name || ''}`} emptyTitle={tr('Belum ada retur', 'No returns yet')} emptyDescription={tr('Retur barang customer akan tampil di sini.', 'Customer returns will appear here.')} /></Card>
    {open && <Modal open={open} title={tr('Buat Draft Retur', 'Create Return Draft')} onClose={() => setOpen(false)}>
      <div className="confirmation-dialog__body" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
        <FormField label={tr('Surat Jalan', 'Delivery Order')} required><Select value={selectedId} onChange={(e) => { setSelectedId(e.target.value); setQuantities({}); setReasons({}); }}><option value="">{tr('Pilih Surat Jalan', 'Select Delivery Order')}</option>{orders.map((o) => <option key={o.id} value={o.id}>{o.sj_number} — {o.customer?.name || o.customer_id}</option>)}</Select></FormField>
        <FormField label={tr('Tanggal Retur', 'Return Date')} required><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></FormField>
        {selected && selected.lines.map((line) => <div key={line.id} className="form-section" style={{ marginTop: 12 }}>
          <strong>{line.customer_item?.name || line.customer_item_id}</strong><div className="form-grid">
            <FormField label={`${tr('Qty retur (dikirim:', 'Return Qty (delivered:')} ${line.quantity})`}><NumericInput min={0} max={line.quantity} maximumFractionDigits={3} value={quantities[line.id] || ''} onValueChange={(raw) => setQuantities((v) => ({ ...v, [line.id]: raw }))} /></FormField>
            <FormField label={tr('Alasan', 'Reason')}><Input value={reasons[line.id] || ''} onChange={(e) => setReasons((v) => ({ ...v, [line.id]: e.target.value }))} /></FormField>
          </div>
        </div>)}
        <p className="text-muted">{tr('Server memvalidasi jumlah berdasarkan penerimaan customer yang sudah diposting dan retur sebelumnya.', 'The server validates quantities against posted customer receipts and previous returns.')}</p>
        <div className="modal__actions"><Button variant="ghost" onClick={() => setOpen(false)}>{tr('Batal', 'Cancel')}</Button><Button onClick={() => void save()} loading={loading}>{tr('Simpan Draft', 'Save Draft')}</Button></div>
      </div>
    </Modal>}
  </>;
}
