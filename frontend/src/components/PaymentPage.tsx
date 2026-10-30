import { useState, useEffect, useCallback } from 'react';
import { Plus, Eye } from 'lucide-react';
import { useAuth, permissions } from '../auth';
import { useLanguage } from '../i18n';
import {
  apiError,
  paymentApi,
  custodyApi,
  type PaymentRecord,
  type PaymentPayload,
  type PaymentAllocationPayload,
  type Customer,
  type CustomerOutstanding,
} from '../services/api';
import {
  Alert,
  Button,
  Card,
  DataTable,
  type DataTableColumn,
  FormField,
  Input,
  Modal,
  PageHeader,
  Select,
  StatusBadge,
  Toast,
} from './ui';

const METHODS = ['BANK_TRANSFER', 'CASH', 'GIRO', 'CHECK'] as const;

type AllocationRow = { invoice_id: string; invoice_number: string; amount_due: number; amount: string };

const fmt = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

export function PaymentPage() {
  const { hasPermission } = useAuth();
  const { t } = useLanguage();

  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toastMsg, setToastMsg] = useState('');
  const [toastTone, setToastTone] = useState<'success' | 'danger'>('success');

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [outstanding, setOutstanding] = useState<CustomerOutstanding | null>(null);
  const [loadingOutstanding, setLoadingOutstanding] = useState(false);
  const [allocations, setAllocations] = useState<AllocationRow[]>([]);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState<string>(METHODS[0]);
  const [referenceNo, setReferenceNo] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Detail
  const [detail, setDetail] = useState<PaymentRecord | null>(null);

  const loadPayments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await paymentApi.list({ per_page: 200 });
      setPayments(res.data);
      setError('');
    } catch (e) { setError(apiError(e)); }
    setLoading(false);
  }, []);

  useEffect(() => { loadPayments(); }, [loadPayments]);

  const loadOutstanding = async (cid: string) => {
    if (!cid) { setOutstanding(null); setAllocations([]); return; }
    setLoadingOutstanding(true);
    try {
      const os = await paymentApi.customerOutstanding(cid);
      setOutstanding(os);
      setAllocations(os.invoices.filter(inv => inv.amount_due > 0).map(inv => ({
        invoice_id: inv.id,
        invoice_number: inv.invoice_number,
        amount_due: inv.amount_due,
        amount: '',
      })));
    } catch (e) { setFormError(apiError(e)); }
    setLoadingOutstanding(false);
  };

  const openCreate = async () => {
    setShowCreate(true);
    setCustomerId('');
    setOutstanding(null);
    setAllocations([]);
    setPaymentDate(new Date().toISOString().slice(0, 10));
    setMethod(METHODS[0]);
    setReferenceNo('');
    setNotes('');
    setFormError('');
    if (!customers.length) {
      try { const c = await custodyApi.customers(); setCustomers(c.data); } catch {}
    }
  };

  const setAllocAmount = (idx: number, val: string) => {
    setAllocations(prev => prev.map((a, i) => i === idx ? { ...a, amount: val } : a));
  };

  const payFull = (idx: number) => {
    setAllocations(prev => prev.map((a, i) => i === idx ? { ...a, amount: String(a.amount_due) } : a));
  };

  const totalAllocated = allocations.reduce((s, a) => s + (parseFloat(a.amount) || 0), 0);

  const handleSubmit = async () => {
    setFormError('');
    if (!customerId) { setFormError(t.payment.validation.customerRequired); return; }
    if (!paymentDate) { setFormError(t.payment.validation.dateRequired); return; }
    if (!method) { setFormError(t.payment.validation.methodRequired); return; }

    const allocs: PaymentAllocationPayload[] = allocations
      .filter(a => parseFloat(a.amount) > 0)
      .map(a => ({ invoice_id: a.invoice_id, amount: parseFloat(a.amount) }));

    if (!allocs.length) { setFormError(t.payment.validation.noAllocations); return; }
    if (allocs.some(a => a.amount <= 0)) { setFormError(t.payment.validation.amountPositive); return; }

    const amount = allocs.reduce((s, a) => s + a.amount, 0);

    setSubmitting(true);
    try {
      const payload: PaymentPayload = {
        customer_id: customerId,
        payment_date: paymentDate,
        method,
        amount,
        reference_no: referenceNo || undefined,
        notes: notes || undefined,
        allocations: allocs,
      };
      await paymentApi.create(payload);
      setShowCreate(false);
      setToastTone('success');
      setToastMsg(t.payment.paymentSuccess);
      loadPayments();
    } catch (e) {
      setFormError(apiError(e));
    }
    setSubmitting(false);
  };

  const viewDetail = async (id: string) => {
    try {
      const p = await paymentApi.get(id);
      setDetail(p);
    } catch (e) {
      setToastTone('danger');
      setToastMsg(apiError(e));
    }
  };

  const columns: DataTableColumn<PaymentRecord>[] = [
    { id: 'payment_number', header: t.payment.paymentNumber, cell: (row) => row.payment_number, sortValue: (row) => row.payment_number },
    { id: 'customer', header: t.common.customer, cell: (row) => row.customer?.name ?? '-', sortValue: (row) => row.customer?.name ?? '' },
    { id: 'payment_date', header: t.payment.paymentDate, cell: (row) => row.payment_date, sortValue: (row) => row.payment_date },
    { id: 'method', header: t.payment.method, cell: (row) => row.method.replace('_', ' ') },
    { id: 'amount', header: t.payment.amount, cell: (row) => fmt(row.amount), sortValue: (row) => row.amount, align: 'right' },
    { id: 'reference_no', header: t.payment.referenceNo, cell: (row) => row.reference_no || '-' },
    { id: 'status', header: t.common.status, cell: (row) => <StatusBadge status={row.status} />, sortValue: (row) => row.status },
    {
      id: 'actions', header: '',
      cell: (row) => <Button variant="ghost" onClick={() => viewDetail(row.id)}><Eye size={16} /></Button>,
    },
  ];

  return (
    <>
      <PageHeader
        title={t.payment.title}
        description={t.payment.desc}
        action={
          hasPermission(permissions.paymentCreate)
            ? <Button onClick={openCreate} disabled={loading}><Plus size={16} /> {t.payment.newPayment}</Button>
            : undefined
        }
      />

      <Toast open={Boolean(toastMsg)} message={toastMsg} tone={toastTone} onClose={() => setToastMsg('')} />
      {error && <Alert tone="danger">{error}</Alert>}

      <Card data-puffy="payment-summary">
        <DataTable
          columns={columns}
          rows={payments}
          searchPlaceholder={t.common.search}
          searchText={(row) => `${row.payment_number} ${row.customer?.name || ''} ${row.method} ${row.reference_no || ''} ${row.status}`}
          emptyTitle={t.payment.emptyTitle}
          emptyDescription={t.payment.emptyDesc}
        />
      </Card>

      {/* Create Payment Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title={t.payment.newPayment}>
        <div className="confirmation-dialog__body" style={{ maxHeight: '80vh', overflowY: 'auto' }}>
          <div className="dashboard-grid">
            <FormField label={t.common.customer} required>
              <Select value={customerId} onChange={(e) => { const v = e.target.value; setCustomerId(v); loadOutstanding(v); }}>
                <option value="">-- {t.payment.validation.customerRequired} --</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.code} \u2014 {c.name}</option>)}
              </Select>
            </FormField>
            <FormField label={t.payment.paymentDate} required>
              <Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
            </FormField>
            <FormField label={t.payment.method} required>
              <Select value={method} onChange={(e) => setMethod(e.target.value)}>
                {METHODS.map(m => <option key={m} value={m}>{m.replace('_', ' ')}</option>)}
              </Select>
            </FormField>
            <FormField label={t.payment.referenceNo}>
              <Input value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} placeholder="TRF-001" />
            </FormField>
          </div>

          {loadingOutstanding && <p style={{ padding: '1rem 0', opacity: 0.6 }}>{t.common.loading}</p>}

          {outstanding && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', margin: '1rem 0' }}>
                <Card><div className="stat-label">{t.payment.totalBilled}</div><div className="stat-value">{fmt(outstanding.total_billed)}</div></Card>
                <Card><div className="stat-label">{t.payment.totalPaid}</div><div className="stat-value">{fmt(outstanding.total_paid)}</div></Card>
                <Card><div className="stat-label">{t.payment.totalOutstanding}</div><div className="stat-value" style={{ color: outstanding.total_outstanding > 0 ? 'var(--danger)' : 'var(--success)' }}>{fmt(outstanding.total_outstanding)}</div></Card>
              </div>

              {allocations.length > 0 ? (
                <div className="data-table__scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>{t.payment.invoiceNumber}</th>
                        <th className="align-right">{t.payment.totalAmount}</th>
                        <th className="align-right">{t.payment.amountDue}</th>
                        <th className="align-right">{t.payment.allocateAmount}</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {allocations.map((a, i) => (
                        <tr key={a.invoice_id}>
                          <td>{a.invoice_number}</td>
                          <td className="align-right">{fmt(outstanding.invoices.find(inv => inv.id === a.invoice_id)?.total_amount ?? 0)}</td>
                          <td className="align-right">{fmt(a.amount_due)}</td>
                          <td className="align-right">
                            <Input type="number" value={a.amount} onChange={(e) => setAllocAmount(i, e.target.value)}
                              min={0} max={a.amount_due} step={0.01} style={{ width: '140px', textAlign: 'right' }} />
                          </td>
                          <td><Button variant="ghost" onClick={() => payFull(i)}>{t.payment.payFull}</Button></td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={3} className="align-right" style={{ fontWeight: 'bold' }}>Total:</td>
                        <td className="align-right" style={{ fontWeight: 'bold' }}>{fmt(totalAllocated)}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <Alert tone="info">{t.payment.noInvoices}</Alert>
              )}
            </>
          )}

          <FormField label={t.common.notes}>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </FormField>

          {formError && <Alert tone="danger">{formError}</Alert>}

          <div className="confirmation-dialog__actions" style={{ marginTop: '1rem' }}>
            <Button variant="secondary" onClick={() => setShowCreate(false)}>{t.common.cancel}</Button>
            <Button onClick={handleSubmit} disabled={submitting || totalAllocated <= 0} loading={submitting}>
              {t.payment.newPayment}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Detail Modal */}
      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail?.payment_number ?? ''}>
        {detail && (
          <div className="confirmation-dialog__body">
            <div className="dashboard-grid">
              <FormField label={t.common.customer}><p>{detail.customer?.name ?? '-'}</p></FormField>
              <FormField label={t.payment.paymentDate}><p>{detail.payment_date}</p></FormField>
              <FormField label={t.payment.method}><p>{detail.method.replace('_', ' ')}</p></FormField>
              <FormField label={t.payment.amount}><p>{fmt(detail.amount)}</p></FormField>
              <FormField label={t.payment.referenceNo}><p>{detail.reference_no || '-'}</p></FormField>
              <FormField label={t.common.status}><StatusBadge status={detail.status} /></FormField>
            </div>
            {detail.allocations?.length > 0 && (
              <div className="data-table__scroll" style={{ marginTop: '1rem' }}>
                <table>
                  <thead><tr><th>{t.payment.invoiceNumber}</th><th className="align-right">{t.payment.allocateAmount}</th></tr></thead>
                  <tbody>
                    {detail.allocations.map(a => (
                      <tr key={a.id}>
                        <td>{a.invoice?.invoice_number ?? a.invoice_id}</td>
                        <td className="align-right">{fmt(a.allocated_amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
