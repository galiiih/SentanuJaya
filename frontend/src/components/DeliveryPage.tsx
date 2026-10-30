import { useState, useEffect } from 'react';
import { Plus, Eye, Send, FileCheck } from 'lucide-react';
import { useAuth, permissions } from '../auth';
import { useLanguage } from '../i18n';
import {
  apiError,
  customerPoApi,
  deliveryOrderApi,
  custodyApi,
  acceptanceApi,
  type CustomerPo,
  type CustomerPoDetail,
  type DeliveryOrderRecord,
  type DeliveryOrderPayload,
  type AcceptanceRecord,
  type Company,
  type Branch,
  type Customer,
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
  Textarea,
  Toast,
} from './ui';

type DeliveryLineForm = {
  customer_item_id: string;
  customer_po_line_id: string;
  color_code: string;
  quantity: string | number;
  po_remaining: number;
  item_name: string;
};

type DeliveryDraftForm = {
  company_id: string;
  branch_id: string;
  customer_id: string;
  customer_po_id: string;
  delivery_date: string;
  shipping_address: string;
  driver_name: string;
  vehicle_plate: string;
  notes: string;
  lines: DeliveryLineForm[];
};

export function DeliveryPage() {
  const { hasPermission } = useAuth();
  const { t } = useLanguage();

  const [deliveryOrders, setDeliveryOrders] = useState<DeliveryOrderRecord[]>([]);
  const [activePos, setActivePos] = useState<CustomerPo[]>([]);
  const [selectedPoDetail, setSelectedPoDetail] = useState<CustomerPoDetail | null>(null);

  const [companies, setCompanies] = useState<Company[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [modalOpen, setModalOpen] = useState(false);
  const [detailRecord, setDetailRecord] = useState<DeliveryOrderRecord | null>(null);

  // Customer Acceptance states
  const [doAcceptances, setDoAcceptances] = useState<AcceptanceRecord[]>([]);
  const [acceptanceModalOpen, setAcceptanceModalOpen] = useState(false);
  const [acceptanceDate, setAcceptanceDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [acceptanceNotes, setAcceptanceNotes] = useState<string>('');
  const [acceptanceLines, setAcceptanceLines] = useState<
    {
      delivery_order_line_id: string;
      item_name: string;
      delivered_quantity: number;
      quantity_ok: string | number;
      quantity_rejected: string | number;
      reject_reason: string;
    }[]
  >([]);

  const canCreate = hasPermission(permissions.deliveryCreate);
  const canAcceptCreate = hasPermission(permissions.acceptanceCreate);
  const canAcceptSubmit = hasPermission(permissions.acceptanceSubmit);
  const canAcceptPost = hasPermission(permissions.acceptancePost);

  const loadAcceptances = async (doId: string) => {
    try {
      const res = await acceptanceApi.list({ delivery_order_id: doId });
      setDoAcceptances(res.data || []);
    } catch {
      setDoAcceptances([]);
    }
  };

  const emptyDraft: DeliveryDraftForm = {
    company_id: '',
    branch_id: '',
    customer_id: '',
    customer_po_id: '',
    delivery_date: new Date().toISOString().slice(0, 10),
    shipping_address: '',
    driver_name: '',
    vehicle_plate: '',
    notes: '',
    lines: [],
  };

  const [draft, setDraft] = useState<DeliveryDraftForm>(emptyDraft);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [doRes, poRes, compRes, branchRes, custRes] = await Promise.all([
        deliveryOrderApi.list(),
        customerPoApi.list({ status: 'OPEN' }),
        custodyApi.companies(),
        custodyApi.branches(),
        custodyApi.customers(),
      ]);

      setDeliveryOrders(doRes.data || []);
      setActivePos(poRes.data || []);
      setCompanies(compRes.data || []);
      setBranches(branchRes.data || []);
      setCustomers(custRes.data || []);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const openCreateModal = () => {
    const firstComp = companies[0]?.id || '';
    const firstBranch = branches[0]?.id || '';
    setDraft({
      ...emptyDraft,
      company_id: firstComp,
      branch_id: firstBranch,
    });
    setSelectedPoDetail(null);
    setFieldErrors({});
    setError('');
    setModalOpen(true);
  };

  const handleCustomerChange = (customerId: string) => {
    setDraft((prev) => ({
      ...prev,
      customer_id: customerId,
      customer_po_id: '',
      lines: [],
    }));
    setSelectedPoDetail(null);
  };

  const handlePoChange = async (poId: string) => {
    setDraft((prev) => ({
      ...prev,
      customer_po_id: poId,
      lines: [],
    }));

    if (!poId) {
      setSelectedPoDetail(null);
      return;
    }

    setLoading(true);
    try {
      const detail = await customerPoApi.get(poId);
      setSelectedPoDetail(detail);

      // Auto-populate lines with remaining quantities
      const initialLines: DeliveryLineForm[] = detail.lines.map((line) => {
        const fulfilled = line.fulfilled_quantity || 0;
        const remaining =
          line.remaining_quantity !== undefined
            ? line.remaining_quantity
            : Math.max(0, line.quantity - fulfilled);

        return {
          customer_item_id: line.customer_item_id,
          customer_po_line_id: line.id,
          color_code: line.color_code || '',
          quantity: remaining > 0 ? String(remaining) : '0',
          po_remaining: remaining,
          item_name: line.customer_item?.name || line.customer_item_id,
        };
      });

      setDraft((prev) => ({
        ...prev,
        lines: initialLines,
      }));
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  };

  const updateLineQty = (idx: number, qtyStr: string) => {
    setDraft((prev) => {
      const newLines = [...prev.lines];
      newLines[idx] = { ...newLines[idx], quantity: qtyStr };
      return { ...prev, lines: newLines };
    });
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!draft.company_id) errors.company_id = t.po.validation.companyRequired;
    if (!draft.branch_id) errors.branch_id = t.common.selectBranch;
    if (!draft.customer_id) errors.customer_id = t.po.validation.customerRequired;
    if (!draft.customer_po_id) errors.customer_po_id = t.delivery.selectPoFirst;

    const activeLines = draft.lines.filter((l) => Number(l.quantity) > 0);
    if (activeLines.length === 0) {
      errors.lines = t.po.validation.linesRequired;
    } else {
      draft.lines.forEach((line, idx) => {
        const qty = Number(line.quantity);
        if (qty > line.po_remaining) {
          errors[`lines.${idx}.quantity`] = `${t.delivery.qtyExceedsError} (Sisa: ${line.po_remaining})`;
        }
      });
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveSj = async () => {
    if (!validate()) return;

    setSaving(true);
    setError('');

    const linesToSubmit = draft.lines
      .filter((l) => Number(l.quantity) > 0)
      .map((l) => ({
        customer_item_id: l.customer_item_id,
        customer_po_line_id: l.customer_po_line_id,
        color_code: l.color_code || undefined,
        quantity: Number(l.quantity),
      }));

    const selectedPo = activePos.find((p) => p.id === draft.customer_po_id);

    const payload: DeliveryOrderPayload = {
      company_id: draft.company_id,
      branch_id: draft.branch_id,
      customer_id: draft.customer_id,
      customer_po_id: draft.customer_po_id,
      customer_po_number: selectedPo?.po_number,
      delivery_date: draft.delivery_date,
      shipping_address: draft.shipping_address || undefined,
      driver_name: draft.driver_name || undefined,
      vehicle_plate: draft.vehicle_plate || undefined,
      notes: draft.notes || undefined,
      lines: linesToSubmit,
    };

    try {
      await deliveryOrderApi.create(payload);
      setNotice(t.delivery.deliverySuccess);
      setModalOpen(false);
      await loadData();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (detailRecord) {
      void loadAcceptances(detailRecord.id);
    }
  }, [detailRecord]);

  const openAcceptanceModal = () => {
    if (!detailRecord) return;
    const lines = detailRecord.lines.map((l) => ({
      delivery_order_line_id: l.id,
      item_name: l.customer_item?.name || l.customer_item_id,
      delivered_quantity: l.quantity,
      quantity_ok: l.quantity,
      quantity_rejected: 0,
      reject_reason: '',
    }));
    setAcceptanceLines(lines);
    setAcceptanceDate(new Date().toISOString().slice(0, 10));
    setAcceptanceNotes('');
    setFieldErrors({});
    setError('');
    setAcceptanceModalOpen(true);
  };

  const handleSaveAcceptance = async () => {
    if (!detailRecord) return;
    setSaving(true);
    setError('');

    for (let idx = 0; idx < acceptanceLines.length; idx++) {
      const line = acceptanceLines[idx];
      const ok = Number(line.quantity_ok) || 0;
      const rej = Number(line.quantity_rejected) || 0;
      if (ok + rej > line.delivered_quantity) {
        setError(`${t.delivery.overAcceptanceError} (${line.item_name}: ${ok + rej} > ${line.delivered_quantity})`);
        setSaving(false);
        return;
      }
    }

    try {
      await acceptanceApi.create({
        delivery_order_id: detailRecord.id,
        acceptance_date: acceptanceDate,
        notes: acceptanceNotes || undefined,
        lines: acceptanceLines.map((l) => ({
          delivery_order_line_id: l.delivery_order_line_id,
          quantity_ok: Number(l.quantity_ok) || 0,
          quantity_rejected: Number(l.quantity_rejected) || 0,
          reject_reason: l.reject_reason || undefined,
        })),
      });
      setNotice('Penerimaan customer berhasil dibuat.');
      setAcceptanceModalOpen(false);
      await loadAcceptances(detailRecord.id);
      await loadData();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitAcceptance = async (accId: string) => {
    if (!detailRecord) return;
    setSaving(true);
    setError('');
    try {
      await acceptanceApi.submit(accId);
      setNotice(t.delivery.submitAcceptance + ' OK');
      await loadAcceptances(detailRecord.id);
      await loadData();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSaving(false);
    }
  };

  const handlePostAcceptance = async (accId: string) => {
    if (!detailRecord) return;
    setSaving(true);
    setError('');
    try {
      await acceptanceApi.post(accId);
      setNotice(t.delivery.postAcceptance + ' OK');
      await loadAcceptances(detailRecord.id);
      await loadData();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSaving(false);
    }
  };

  const customerPosFiltered = activePos.filter(
    (po) => po.customer_id === draft.customer_id
  );

  const columns: DataTableColumn<DeliveryOrderRecord>[] = [
    {
      id: 'sj_number',
      header: t.delivery.sjNumber,
      cell: (row) => (
        <button
          className="button button--ghost"
          style={{ padding: 0, fontWeight: 'bold', fontFamily: 'monospace' }}
          onClick={() => setDetailRecord(row)}
        >
          {row.sj_number}
        </button>
      ),
      sortValue: (row) => row.sj_number,
    },
    {
      id: 'customer',
      header: t.common.customer,
      cell: (row) => row.customer?.name || row.customer_id,
      sortValue: (row) => row.customer?.name || '',
    },
    {
      id: 'po_number',
      header: t.delivery.customerPo,
      cell: (row) => row.customer_po?.po_number || row.customer_po_number || '-',
    },
    {
      id: 'delivery_date',
      header: t.delivery.deliveryDate,
      cell: (row) => row.delivery_date,
      sortValue: (row) => row.delivery_date,
    },
    {
      id: 'status',
      header: t.common.status,
      cell: (row) => <StatusBadge status={row.status} />,
      sortValue: (row) => row.status,
    },
    {
      id: 'actions',
      header: t.common.actions,
      cell: (row) => (
        <Button variant="ghost" onClick={() => setDetailRecord(row)} title={t.common.details}>
          <Eye size={15} />
        </Button>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title={t.pages.deliveryTitle}
        description={t.pages.deliveryDesc}
        action={
          canCreate ? (
            <Button onClick={openCreateModal} disabled={loading}>
              <Plus size={16} /> {t.delivery.newSj}
            </Button>
          ) : undefined
        }
      />

      <Toast open={Boolean(notice)} message={notice} tone="success" onClose={() => setNotice('')} />
      {error && <Alert tone="danger">{error}</Alert>}

      <Card data-puffy="delivery-summary">
        <DataTable
          columns={columns}
          rows={deliveryOrders}
          searchPlaceholder={t.common.search}
          searchText={(row) =>
            `${row.sj_number} ${row.customer?.name || ''} ${row.customer_po_number || ''} ${row.status}`
          }
          emptyTitle={t.delivery.emptyTitle}
          emptyDescription={t.delivery.emptyDesc}
        />
      </Card>

      {/* Create Delivery Order Modal */}
      {modalOpen && (
        <Modal open={modalOpen} title={t.delivery.newSj} onClose={() => setModalOpen(false)}>
          <div className="confirmation-dialog__body" style={{ maxHeight: '80vh', overflowY: 'auto' }}>
            {fieldErrors.lines && <Alert tone="danger">{fieldErrors.lines}</Alert>}

            <div className="dashboard-grid">
              <FormField label={t.common.company} required error={fieldErrors.company_id}>
                <Select
                  value={draft.company_id}
                  onChange={(e) => setDraft((prev) => ({ ...prev, company_id: e.target.value }))}
                >
                  <option value="">{t.common.selectCompany}</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </FormField>

              <FormField label={t.common.branch} required error={fieldErrors.branch_id}>
                <Select
                  value={draft.branch_id}
                  onChange={(e) => setDraft((prev) => ({ ...prev, branch_id: e.target.value }))}
                >
                  <option value="">{t.common.selectBranch}</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </Select>
              </FormField>

              <FormField label={t.common.customer} required error={fieldErrors.customer_id}>
                <Select
                  value={draft.customer_id}
                  onChange={(e) => handleCustomerChange(e.target.value)}
                >
                  <option value="">{t.common.selectCustomer}</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} — {c.name}
                    </option>
                  ))}
                </Select>
              </FormField>

              <FormField label={t.delivery.customerPo} required error={fieldErrors.customer_po_id}>
                <Select
                  value={draft.customer_po_id}
                  onChange={(e) => void handlePoChange(e.target.value)}
                  disabled={!draft.customer_id}
                >
                  <option value="">{t.common.selectPo}</option>
                  {customerPosFiltered.map((po) => (
                    <option key={po.id} value={po.id}>
                      {po.po_number} ({po.po_date})
                    </option>
                  ))}
                </Select>
              </FormField>
            </div>

            <div className="dashboard-grid">
              <FormField label={t.delivery.deliveryDate} required>
                <Input
                  type="date"
                  value={draft.delivery_date}
                  onChange={(e) => setDraft((prev) => ({ ...prev, delivery_date: e.target.value }))}
                />
              </FormField>
              <FormField label={t.delivery.driverName}>
                <Input
                  value={draft.driver_name}
                  onChange={(e) => setDraft((prev) => ({ ...prev, driver_name: e.target.value }))}
                />
              </FormField>
              <FormField label={t.delivery.vehiclePlate}>
                <Input
                  value={draft.vehicle_plate}
                  onChange={(e) => setDraft((prev) => ({ ...prev, vehicle_plate: e.target.value }))}
                />
              </FormField>
            </div>

            <FormField label={t.delivery.shippingAddress}>
              <Textarea
                value={draft.shipping_address}
                onChange={(e) => setDraft((prev) => ({ ...prev, shipping_address: e.target.value }))}
                rows={2}
              />
            </FormField>

            {selectedPoDetail && (
              <div style={{ marginTop: '1.5rem', marginBottom: '1rem' }}>
                <h3 style={{ marginBottom: '0.5rem' }}>{t.po.lineItems} (Fulfillment)</h3>
                <div className="data-table__scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>{t.common.item}</th>
                        <th>{t.common.colorCode}</th>
                        <th className="align-right">{t.delivery.poRemainingQty}</th>
                        <th className="align-right" style={{ width: '150px' }}>
                          {t.delivery.deliveryQty}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {draft.lines.map((line, idx) => (
                        <tr key={idx}>
                          <td>
                            <strong>{line.item_name}</strong>
                          </td>
                          <td>{line.color_code || '-'}</td>
                          <td className="align-right font-mono">{line.po_remaining} pcs</td>
                          <td>
                            <Input
                              type="number"
                              min="0"
                              max={line.po_remaining}
                              value={line.quantity}
                              onChange={(e) => updateLineQty(idx, e.target.value)}
                              disabled={line.po_remaining <= 0}
                            />
                            {fieldErrors[`lines.${idx}.quantity`] && (
                              <span
                                style={{
                                  fontSize: '0.75rem',
                                  color: 'var(--color-danger, red)',
                                  display: 'block',
                                }}
                              >
                                {fieldErrors[`lines.${idx}.quantity`]}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="confirmation-dialog__actions" style={{ marginTop: '1.5rem' }}>
              <Button variant="secondary" onClick={() => setModalOpen(false)}>
                {t.common.cancel}
              </Button>
              <Button onClick={() => void handleSaveSj()} loading={saving}>
                {t.common.save}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Detail Modal */}
      {detailRecord && (
        <Modal open={Boolean(detailRecord)} title={`Surat Jalan — ${detailRecord.sj_number}`} onClose={() => setDetailRecord(null)}>
          <div className="confirmation-dialog__body" style={{ maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <span className="card__meta">{t.common.customer}</span>
                <p><strong>{detailRecord.customer?.name}</strong></p>
              </div>
              <div>
                <span className="card__meta">{t.delivery.customerPo}</span>
                <p>{detailRecord.customer_po?.po_number || detailRecord.customer_po_number || '-'}</p>
              </div>
              <div>
                <span className="card__meta">{t.delivery.deliveryDate}</span>
                <p>{detailRecord.delivery_date}</p>
              </div>
              <div>
                <span className="card__meta">{t.common.status}</span>
                <p><StatusBadge status={detailRecord.status} /></p>
              </div>
            </div>

            {/* Line items table */}
            <div style={{ marginTop: '1rem', marginBottom: '1.5rem' }}>
              <h4 style={{ marginBottom: '0.5rem' }}>Baris Pengiriman (Delivered Lines)</h4>
              <div className="data-table__scroll">
                <table>
                  <thead>
                    <tr>
                      <th>{t.common.item}</th>
                      <th className="align-right">{t.common.quantity}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailRecord.lines.map((l) => (
                      <tr key={l.id}>
                        <td>{l.customer_item?.name || l.customer_item_id}</td>
                        <td className="align-right font-mono">{l.quantity} pcs</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Acceptance Section */}
            <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h4 style={{ margin: 0 }}>{t.delivery.acceptanceTitle}</h4>
                {detailRecord.status === 'DELIVERED' && canAcceptCreate && (
                  <Button onClick={openAcceptanceModal}>
                    <Plus size={14} /> {t.delivery.newAcceptance}
                  </Button>
                )}
              </div>

              {doAcceptances.length === 0 ? (
                <p style={{ fontSize: '0.875rem', color: 'var(--color-muted)' }}>Belum ada penerimaan customer untuk surat jalan ini.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {doAcceptances.map((acc) => (
                    <div
                      key={acc.id}
                      style={{
                        padding: '0.75rem 1rem',
                        border: '1px solid var(--color-border)',
                        borderRadius: '6px',
                        background: 'var(--color-card-bg)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <strong>{acc.acceptance_number}</strong>
                          <span style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginLeft: '0.5rem' }}>({acc.acceptance_date})</span>
                        </div>
                        <StatusBadge status={acc.status} />
                      </div>

                      <div style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
                        {acc.lines.map((al) => (
                          <div key={al.id} style={{ display: 'flex', gap: '1rem' }}>
                            <span>OK: <strong>{al.quantity_ok} pcs</strong></span>
                            <span>Reject: <strong style={{ color: al.quantity_rejected > 0 ? 'var(--color-danger, red)' : 'inherit' }}>{al.quantity_rejected} pcs</strong></span>
                            {al.reject_reason && <span style={{ fontStyle: 'italic', color: 'var(--color-muted)' }}>({al.reject_reason})</span>}
                          </div>
                        ))}
                      </div>

                      {/* Acceptance Action Buttons */}
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                        {acc.status === 'DRAFT' && canAcceptSubmit && (
                          <Button variant="secondary" onClick={() => void handleSubmitAcceptance(acc.id)} loading={saving}>
                            <Send size={14} /> {t.delivery.submitAcceptance}
                          </Button>
                        )}
                        {acc.status === 'SUBMITTED' && canAcceptPost && (
                          <Button onClick={() => void handlePostAcceptance(acc.id)} loading={saving}>
                            <FileCheck size={14} /> {t.delivery.postAcceptance}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="confirmation-dialog__actions" style={{ marginTop: '1.5rem' }}>
              <Button variant="ghost" onClick={() => setDetailRecord(null)}>
                {t.common.close}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Acceptance Creation Modal */}
      {acceptanceModalOpen && (
        <Modal open={acceptanceModalOpen} title={t.delivery.recordAcceptance} onClose={() => setAcceptanceModalOpen(false)}>
          <div className="confirmation-dialog__body" style={{ maxHeight: '80vh', overflowY: 'auto' }}>
            <FormField label={t.delivery.acceptanceDate} required>
              <Input
                type="date"
                value={acceptanceDate}
                onChange={(e) => setAcceptanceDate(e.target.value)}
              />
            </FormField>

            <FormField label={t.common.notes}>
              <Input
                value={acceptanceNotes}
                onChange={(e) => setAcceptanceNotes(e.target.value)}
                placeholder="Catatan penerimaan..."
              />
            </FormField>

            <div style={{ marginTop: '1rem' }}>
              <h4 style={{ marginBottom: '0.5rem' }}>Baris Penerimaan</h4>
              <div className="data-table__scroll">
                <table>
                  <thead>
                    <tr>
                      <th>{t.common.item}</th>
                      <th className="align-right">Dikirim</th>
                      <th className="align-right" style={{ width: '110px' }}>{t.delivery.qtyOk}</th>
                      <th className="align-right" style={{ width: '110px' }}>{t.delivery.qtyRejected}</th>
                      <th>{t.delivery.rejectReason}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {acceptanceLines.map((line, idx) => (
                      <tr key={idx}>
                        <td><strong>{line.item_name}</strong></td>
                        <td className="align-right font-mono">{line.delivered_quantity} pcs</td>
                        <td>
                          <Input
                            type="number"
                            min="0"
                            max={line.delivered_quantity}
                            value={line.quantity_ok}
                            onChange={(e) => {
                              const val = e.target.value;
                              setAcceptanceLines((prev) => {
                                const newLines = [...prev];
                                newLines[idx] = { ...newLines[idx], quantity_ok: val };
                                return newLines;
                              });
                            }}
                          />
                        </td>
                        <td>
                          <Input
                            type="number"
                            min="0"
                            max={line.delivered_quantity}
                            value={line.quantity_rejected}
                            onChange={(e) => {
                              const val = e.target.value;
                              setAcceptanceLines((prev) => {
                                const newLines = [...prev];
                                newLines[idx] = { ...newLines[idx], quantity_rejected: val };
                                return newLines;
                              });
                            }}
                          />
                        </td>
                        <td>
                          <Input
                            placeholder="Alasan reject..."
                            value={line.reject_reason}
                            onChange={(e) => {
                              const val = e.target.value;
                              setAcceptanceLines((prev) => {
                                const newLines = [...prev];
                                newLines[idx] = { ...newLines[idx], reject_reason: val };
                                return newLines;
                              });
                            }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="confirmation-dialog__actions" style={{ marginTop: '1.5rem' }}>
              <Button variant="secondary" onClick={() => setAcceptanceModalOpen(false)}>
                {t.common.cancel}
              </Button>
              <Button onClick={() => void handleSaveAcceptance()} loading={saving}>
                {t.common.save}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
