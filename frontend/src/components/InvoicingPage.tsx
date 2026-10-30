import { useState, useEffect, useCallback } from 'react';
import { Plus, Eye, Send, XCircle } from 'lucide-react';
import { useAuth, permissions } from '../auth';
import { useLanguage } from '../i18n';
import {
  apiError,
  invoiceApi,
  custodyApi,
  type InvoiceRecord,
  type InvoiceDetailRecord,
  type InvoiceCreatePayload,
  type Customer,
  type DeliveryOrderRecord,
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
  ConfirmationDialog,
} from './ui';

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

export function InvoicingPage() {
  const { hasPermission } = useAuth();
  const { t } = useLanguage();

  /* ── Invoice List ── */
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toastMsg, setToastMsg] = useState('');
  const [toastTone, setToastTone] = useState<'success' | 'danger' | 'info'>('success');

  const loadInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await invoiceApi.list({ per_page: 200 });
      setInvoices(res.data);
      setError('');
    } catch (e) { setError(apiError(e)); }
    setLoading(false);
  }, []);

  useEffect(() => { loadInvoices(); }, [loadInvoices]);

  /* ── Create Form ── */
  const [showCreate, setShowCreate] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [eligibleDos, setEligibleDos] = useState<DeliveryOrderRecord[]>([]);
  const [selectedDoIds, setSelectedDoIds] = useState<string[]>([]);
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [taxCondition, setTaxCondition] = useState<1 | 2 | 3>(3);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loadingDos, setLoadingDos] = useState(false);

  /* ── Detail ── */
  const [detail, setDetail] = useState<InvoiceDetailRecord | null>(null);

  /* ── Post/Cancel confirm ── */
  const [postTarget, setPostTarget] = useState<InvoiceRecord | null>(null);
  const [cancelTarget, setCancelTarget] = useState<InvoiceRecord | null>(null);

  const loadEligibleDos = async (cid: string) => {
    if (!cid) { setEligibleDos([]); setSelectedDoIds([]); return; }
    setLoadingDos(true);
    try {
      // Use backend endpoint that computes actual invoiceable qty per line
      const res = await invoiceApi.eligibleDeliveryOrders(cid);
      setEligibleDos(res);
      setSelectedDoIds([]);
    } catch (e) { setFormError(apiError(e)); }
    setLoadingDos(false);
  };

  const openCreate = async () => {
    setShowCreate(true);
    setCustomerId('');
    setEligibleDos([]);
    setSelectedDoIds([]);
    setInvoiceDate(new Date().toISOString().slice(0, 10));
    setTaxCondition(3);
    setFormError('');
    if (!customers.length) {
      try { const c = await custodyApi.customers(); setCustomers(c.data); } catch {}
    }
  };

  const toggleDo = (id: string) =>
    setSelectedDoIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleCreate = async () => {
    setConfirmOpen(false);
    setFormError('');
    if (!customerId) { setFormError(t.invoice.selectCustomer); return; }
    if (!selectedDoIds.length) { setFormError(t.invoice.selectDeliveryOrders); return; }
    if (!invoiceDate) { setFormError(t.invoice.invoiceDate + ' wajib diisi.'); return; }

    setSubmitting(true);
    try {
      const payload: InvoiceCreatePayload = {
        customer_id: customerId,
        delivery_order_ids: selectedDoIds,
        invoice_date: invoiceDate,
        tax_condition: taxCondition,
      };
      await invoiceApi.create(payload);
      setShowCreate(false);
      setToastTone('success');
      setToastMsg(t.invoice.createSuccess);
      loadInvoices();
    } catch (e) {
      setFormError(apiError(e));
    }
    setSubmitting(false);
  };

  const handlePost = async () => {
    if (!postTarget) return;
    try {
      await invoiceApi.post(postTarget.id);
      setToastTone('success');
      setToastMsg(t.invoice.postSuccess);
      loadInvoices();
    } catch (e) {
      setToastTone('danger');
      setToastMsg(apiError(e));
    }
    setPostTarget(null);
  };

  const handleCancel = async () => {
    if (!cancelTarget) return;
    try {
      await invoiceApi.cancel(cancelTarget.id);
      setToastTone('success');
      setToastMsg(t.invoice.cancelSuccess);
      loadInvoices();
    } catch (e) {
      setToastTone('danger');
      setToastMsg(apiError(e));
    }
    setCancelTarget(null);
  };

  const viewDetail = async (id: string) => {
    try {
      const inv = await invoiceApi.get(id);
      setDetail(inv);
    } catch (e) {
      setToastTone('danger');
      setToastMsg(apiError(e));
    }
  };

  const canCreate = hasPermission(permissions.invoiceCreate);
  const isDraft = (inv: InvoiceRecord) => inv.status === 'DRAFT';

  const columns: DataTableColumn<InvoiceRecord>[] = [
    { id: 'invoice_number', header: t.invoice.invoiceNumber, cell: (r) => r.invoice_number, sortValue: (r) => r.invoice_number },
    { id: 'customer', header: t.common.customer, cell: (r) => r.customer?.name ?? '-', sortValue: (r) => r.customer?.name ?? '' },
    { id: 'invoice_date', header: t.invoice.invoiceDate, cell: (r) => r.invoice_date, sortValue: (r) => r.invoice_date },
    { id: 'total', header: t.invoice.totalNet, cell: (r) => fmt(r.total_amount), sortValue: (r) => r.total_amount, align: 'right' },
    { id: 'amount_due', header: t.invoice.amountDue, cell: (r) => fmt(r.amount_due), sortValue: (r) => r.amount_due, align: 'right' },
    { id: 'status', header: t.common.status, cell: (r) => <StatusBadge status={r.status} />, sortValue: (r) => r.status },
    {
      id: 'actions', header: '',
      cell: (r) => (
        <span style={{ display: 'flex', gap: '0.25rem' }}>
          <Button variant="ghost" onClick={() => viewDetail(r.id)}><Eye size={16} /></Button>
          {canCreate && isDraft(r) && (
            <>
              <Button variant="ghost" onClick={() => setPostTarget(r)}><Send size={16} /></Button>
              <Button variant="ghost" onClick={() => setCancelTarget(r)}><XCircle size={16} /></Button>
            </>
          )}
        </span>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title={t.invoice.title}
        description={t.invoice.desc}
        action={
          canCreate
            ? <Button onClick={openCreate} disabled={loading}><Plus size={16} /> {t.invoice.createDraft}</Button>
            : undefined
        }
      />

      <Toast open={Boolean(toastMsg)} message={toastMsg} tone={toastTone === 'info' ? 'info' : toastTone} onClose={() => setToastMsg('')} />
      {error && <Alert tone="danger">{error}</Alert>}

      <Card data-puffy="invoice-summary">
        <DataTable
          columns={columns}
          rows={invoices}
          searchPlaceholder={t.common.search}
          searchText={(r) => `${r.invoice_number} ${r.customer?.name || ''} ${r.status}`}
          emptyTitle={t.invoice.emptyTitle}
          emptyDescription={t.invoice.emptyDesc}
        />
      </Card>

      {/* Create Invoice Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title={t.invoice.createDraft}>
        <div className="confirmation-dialog__body" style={{ maxHeight: '80vh', overflowY: 'auto' }}>
          <div className="dashboard-grid">
            <FormField label={t.common.customer} required>
              <Select
                value={customerId}
                onChange={(e) => { const v = e.target.value; setCustomerId(v); loadEligibleDos(v); }}
              >
                <option value="">-- {t.invoice.selectCustomer} --</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
              </Select>
            </FormField>
            <FormField label={t.invoice.invoiceDate} required>
              <Input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
            </FormField>
          </div>

          <FormField label={t.invoice.taxCondition} hint={t.invoice.taxConditionHint}>
            <Select
              value={taxCondition}
              onChange={(e) => setTaxCondition(Number(e.target.value) as 1 | 2 | 3)}
            >
              <option value={1}>{t.invoice.taxCond1}</option>
              <option value={2}>{t.invoice.taxCond2}</option>
              <option value={3}>{t.invoice.taxCond3}</option>
            </Select>
          </FormField>

          {loadingDos && <p style={{ padding: '1rem 0', opacity: 0.6 }}>{t.common.loading}</p>}

          {customerId && !loadingDos && (
            eligibleDos.length > 0 ? (
              <Card title={t.invoice.selectDeliveryOrders}>
                <div className="selection-list">
                  {eligibleDos.map(d => (
                    <label
                      className={`selection-row${selectedDoIds.includes(d.id) ? ' selection-row--selected' : ''}`}
                      key={d.id}
                    >
                      <input
                        type="checkbox"
                        checked={selectedDoIds.includes(d.id)}
                        onChange={() => toggleDo(d.id)}
                      />
                      <div>
                        <strong>{d.sj_number}</strong>
                        <span>
                          {d.customer?.name} · {d.delivery_date}
                          {d.lines?.length ? ` · ${d.lines.length} item` : ''}
                        </span>
                      </div>
                      <strong>
                        {d.lines?.length
                          ? fmt(d.lines.reduce((sum, line: any) => {
                              const qtyOk = (line.acceptance_lines || line.acceptanceLines || []).reduce((acc: number, al: any) => {
                                return acc + ((al.acceptance?.status === 'POSTED') ? Number(al.quantity_ok || 0) : 0);
                              }, 0);
                              const qtyInvoiced = Number(line.qty_invoiced || 0);
                              const invoiceable = Math.max(0, qtyOk - qtyInvoiced);
                              const unitPrice = Number(line.unit_price_snapshot || line.unit_price || 0);
                              return sum + (invoiceable * unitPrice);
                            }, 0))
                          : '-'}
                      </strong>
                    </label>
                  ))}
                </div>
              </Card>
            ) : (
              <Alert tone="info">{t.invoice.noEligibleSj}</Alert>
            )
          )}

          {formError && <Alert tone="danger">{formError}</Alert>}

          <div className="confirmation-dialog__actions" style={{ marginTop: '1rem' }}>
            <Button variant="secondary" onClick={() => setShowCreate(false)}>{t.common.cancel}</Button>
            <Button
              onClick={() => setConfirmOpen(true)}
              disabled={submitting || !selectedDoIds.length}
              loading={submitting}
            >
              {t.invoice.createDraft}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmationDialog
        open={confirmOpen}
        title={t.invoice.confirmCreateTitle}
        description={t.invoice.confirmCreateDesc}
        confirmLabel={t.common.confirm}
        tone="primary"
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleCreate}
      />

      {/* Post Confirm */}
      <ConfirmationDialog
        open={!!postTarget}
        title={t.invoice.confirmPostTitle}
        description={`${t.invoice.confirmPostDesc} (${postTarget?.invoice_number})`}
        confirmLabel="Post"
        tone="primary"
        onClose={() => setPostTarget(null)}
        onConfirm={handlePost}
      />

      {/* Cancel Confirm */}
      <ConfirmationDialog
        open={!!cancelTarget}
        title={t.invoice.confirmCancelTitle}
        description={`${t.invoice.confirmCancelDesc} (${cancelTarget?.invoice_number})`}
        confirmLabel={t.common.confirm}
        tone="danger"
        onClose={() => setCancelTarget(null)}
        onConfirm={handleCancel}
      />

      {/* Detail Modal */}
      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail?.invoice_number ?? ''}>
        {detail && (
          <div className="confirmation-dialog__body">
            <div className="dashboard-grid">
              <FormField label={t.common.customer}><p>{detail.customer?.name ?? '-'}</p></FormField>
              <FormField label={t.invoice.invoiceDate}><p>{detail.invoice_date}</p></FormField>
              <FormField label={t.invoice.dueDate}><p>{detail.due_date}</p></FormField>
              <FormField label={t.common.status}><StatusBadge status={detail.status} /></FormField>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(8rem, 1fr))', gap: '0.75rem', margin: '1rem 0' }}>
              <Card><div className="stat-label">{t.invoice.dpp}</div><div className="stat-value">{fmt(detail.dpp)}</div></Card>
              <Card><div className="stat-label">{t.invoice.ppn}</div><div className="stat-value">{fmt(detail.ppn_amount)}</div></Card>
              <Card><div className="stat-label">{t.invoice.pph}</div><div className="stat-value">{fmt(detail.pph_amount)}</div></Card>
              <Card><div className="stat-label">{t.invoice.totalNet}</div><div className="stat-value">{fmt(detail.total_amount)}</div></Card>
              <Card><div className="stat-label">{t.invoice.amountPaid}</div><div className="stat-value">{fmt(detail.amount_paid)}</div></Card>
              <Card><div className="stat-label">{t.invoice.amountDue}</div><div className="stat-value" style={{ color: detail.amount_due > 0 ? 'var(--danger)' : 'var(--success)' }}>{fmt(detail.amount_due)}</div></Card>
            </div>

            {/* Line items */}
            {detail.lines && detail.lines.length > 0 && (
              <>
                <h4 style={{ margin: '1rem 0 0.5rem', fontSize: '0.8rem', fontWeight: 700 }}>{t.invoice.lines}</h4>
                <div className="data-table__scroll">
                  <table>
                    <thead><tr><th>{t.common.item}</th><th className="align-right">{t.common.quantity}</th><th className="align-right">{t.common.unitPrice}</th><th className="align-right">{t.invoice.subtotal}</th></tr></thead>
                    <tbody>
                      {detail.lines.map(l => (
                        <tr key={l.id}>
                          <td>{l.description}</td>
                          <td className="align-right">{l.quantity}</td>
                          <td className="align-right">{fmt(l.unit_price_snapshot)}</td>
                          <td className="align-right">{fmt(l.subtotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* Linked DOs */}
            {detail.delivery_links && detail.delivery_links.length > 0 && (
              <>
                <h4 style={{ margin: '1rem 0 0.5rem', fontSize: '0.8rem', fontWeight: 700 }}>{t.invoice.linkedSj}</h4>
                <div className="data-table__scroll">
                  <table>
                    <thead><tr><th>SJ</th><th className="align-right">{t.invoice.subtotal}</th></tr></thead>
                    <tbody>
                      {detail.delivery_links.map(l => (
                        <tr key={l.id}>
                          <td>{l.delivery_order?.sj_number ?? l.delivery_order_id}</td>
                          <td className="align-right">{fmt(l.amount_billed)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* Allocations (payments) */}
            {detail.allocations && detail.allocations.length > 0 && (
              <>
                <h4 style={{ margin: '1rem 0 0.5rem', fontSize: '0.8rem', fontWeight: 700 }}>Payments</h4>
                <div className="data-table__scroll">
                  <table>
                    <thead><tr><th>Payment</th><th className="align-right">{t.payment?.amount ?? 'Amount'}</th></tr></thead>
                    <tbody>
                      {detail.allocations.map(a => (
                        <tr key={a.id}>
                          <td>{a.invoice?.invoice_number ?? a.payment_id}</td>
                          <td className="align-right">{fmt(a.allocated_amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
