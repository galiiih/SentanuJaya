import { useState, useEffect } from 'react';
import { Plus, Eye, Edit, CheckCircle, XCircle, Archive } from 'lucide-react';
import { useAuth, permissions } from '../auth';
import { useLanguage } from '../i18n';
import {
  apiError,
  customerPoApi,
  custodyApi,
  type CustomerPo,
  type CustomerPoDetail,
  type CustomerPoPayload,
  type Company,
  type Customer,
  type CustomerItem,
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

type MasterData = {
  companies: Company[];
  customers: Customer[];
  items: CustomerItem[];
};

type DraftLine = {
  id?: string;
  customer_item_id: string;
  color_code: string;
  quantity: string | number;
  unit_price: string | number;
  notes: string;
};

type DraftForm = {
  company_id: string;
  customer_id: string;
  po_number: string;
  po_date: string;
  expected_delivery_date: string;
  notes: string;
  lines: DraftLine[];
};

export function CustomerPoPage() {
  const { hasPermission } = useAuth();
  const { t } = useLanguage();

  const [pos, setPos] = useState<CustomerPo[]>([]);
  const [master, setMaster] = useState<MasterData>({ companies: [], customers: [], items: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Pagination & Filter
  const [search] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Modals
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingPo, setEditingPo] = useState<CustomerPoDetail | null>(null);
  const [detailPo, setDetailPo] = useState<CustomerPoDetail | null>(null);

  // Confirmation dialog
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

  const emptyDraft: DraftForm = {
    company_id: '',
    customer_id: '',
    po_number: '',
    po_date: new Date().toISOString().slice(0, 10),
    expected_delivery_date: '',
    notes: '',
    lines: [
      {
        customer_item_id: '',
        color_code: '',
        quantity: '1',
        unit_price: '0',
        notes: '',
      },
    ],
  };

  const [draft, setDraft] = useState<DraftForm>(emptyDraft);

  // Permissions
  const canCreate = hasPermission(permissions.poCreate);
  const canEdit = hasPermission(permissions.poEdit);
  const canActivate = hasPermission(permissions.poActivate);
  const canCancel = hasPermission(permissions.poCancel);
  const canClose = hasPermission(permissions.poClose);

  const loadData = async (page = currentPage) => {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, string | number> = { page };
      if (search.trim()) params.search = search.trim();
      if (statusFilter !== 'ALL') params.status = statusFilter;

      const [poRes, companiesRes, customersRes, itemsRes] = await Promise.all([
        customerPoApi.list(params),
        custodyApi.companies(),
        custodyApi.customers(),
        custodyApi.customerItems(),
      ]);

      setPos(poRes.data || []);
      setCurrentPage(poRes.current_page || 1);
      setLastPage(poRes.last_page || 1);
      setTotalItems(poRes.total || (poRes.data ? poRes.data.length : 0));

      setMaster({
        companies: companiesRes.data || [],
        customers: customersRes.data || [],
        items: itemsRes.data || [],
      });
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData(1);
  }, [search, statusFilter]);

  const openCreateModal = () => {
    setEditingPo(null);
    const firstCompany = master.companies[0]?.id || '';
    setDraft({
      ...emptyDraft,
      company_id: firstCompany,
    });
    setFieldErrors({});
    setError('');
    setEditorOpen(true);
  };

  const openEditModal = async (po: CustomerPo) => {
    setLoading(true);
    try {
      const detail = await customerPoApi.get(po.id);
      setEditingPo(detail);
      setDraft({
        company_id: detail.company_id,
        customer_id: detail.customer_id,
        po_number: detail.po_number,
        po_date: detail.po_date,
        expected_delivery_date: detail.expected_delivery_date || '',
        notes: detail.notes || '',
        lines: detail.lines.map((line) => ({
          id: line.id,
          customer_item_id: line.customer_item_id,
          color_code: line.color_code || '',
          quantity: String(line.quantity),
          unit_price: String(line.unit_price || 0),
          notes: line.notes || '',
        })),
      });
      setFieldErrors({});
      setError('');
      setEditorOpen(true);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  };

  const openDetailModal = async (po: CustomerPo) => {
    setLoading(true);
    try {
      const detail = await customerPoApi.get(po.id);
      setDetailPo(detail);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  };

  const addLine = () => {
    setDraft((prev) => ({
      ...prev,
      lines: [
        ...prev.lines,
        {
          customer_item_id: '',
          color_code: '',
          quantity: '1',
          unit_price: '0',
          notes: '',
        },
      ],
    }));
  };

  const removeLine = (index: number) => {
    if (draft.lines.length <= 1) {
      setError(t.po.validation.linesRequired);
      return;
    }
    setDraft((prev) => ({
      ...prev,
      lines: prev.lines.filter((_, i) => i !== index),
    }));
  };

  const updateLine = (index: number, key: keyof DraftLine, value: string) => {
    setDraft((prev) => {
      const updatedLines = [...prev.lines];
      updatedLines[index] = { ...updatedLines[index], [key]: value };
      return { ...prev, lines: updatedLines };
    });
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!draft.company_id) errors.company_id = t.po.validation.companyRequired;
    if (!draft.customer_id) errors.customer_id = t.po.validation.customerRequired;
    if (!draft.po_number.trim()) errors.po_number = t.po.validation.poNumberRequired;
    if (!draft.po_date) errors.po_date = t.po.validation.poDateRequired;

    if (!draft.lines || draft.lines.length === 0) {
      errors.lines = t.po.validation.linesRequired;
    } else {
      draft.lines.forEach((line, idx) => {
        if (!line.customer_item_id) {
          errors[`lines.${idx}.customer_item_id`] = t.po.validation.itemRequired;
        }
        const qty = Number(line.quantity);
        if (isNaN(qty) || qty <= 0) {
          errors[`lines.${idx}.quantity`] = t.po.validation.quantityPositive;
        }
        // Check customer item ownership
        const item = master.items.find((i) => i.id === line.customer_item_id);
        if (item && item.customer_id !== draft.customer_id) {
          errors[`lines.${idx}.customer_item_id`] = t.po.validation.itemCustomerMismatch;
        }
      });
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const saveDraftPo = async () => {
    if (!validateForm()) return;

    setSaving(true);
    setError('');
    const payload: CustomerPoPayload = {
      company_id: draft.company_id,
      customer_id: draft.customer_id,
      po_number: draft.po_number.trim(),
      po_date: draft.po_date,
      expected_delivery_date: draft.expected_delivery_date || undefined,
      notes: draft.notes || undefined,
      lines: draft.lines.map((l) => ({
        customer_item_id: l.customer_item_id,
        color_code: l.color_code || undefined,
        quantity: Number(l.quantity),
        unit_price: Number(l.unit_price || 0),
        notes: l.notes || undefined,
      })),
    };

    try {
      if (editingPo) {
        await customerPoApi.update(editingPo.id, payload);
        setNotice(t.po.updateSuccess);
      } else {
        await customerPoApi.create(payload);
        setNotice(t.po.createSuccess);
      }
      setEditorOpen(false);
      await loadData(currentPage);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleActivate = (po: CustomerPo) => {
    setConfirmState({
      open: true,
      title: t.po.confirmActivateTitle,
      description: t.po.confirmActivateDesc,
      tone: 'primary',
      onConfirm: async () => {
        setSaving(true);
        try {
          await customerPoApi.activate(po.id);
          setNotice(t.po.activateSuccess);
          await loadData(currentPage);
          if (detailPo?.id === po.id) {
            setDetailPo(await customerPoApi.get(po.id));
          }
        } catch (err) {
          setError(apiError(err));
        } finally {
          setSaving(false);
          setConfirmState((prev) => ({ ...prev, open: false }));
        }
      },
    });
  };

  const handleClose = (po: CustomerPo) => {
    setConfirmState({
      open: true,
      title: t.po.confirmCloseTitle,
      description: t.po.confirmCloseDesc,
      tone: 'danger',
      onConfirm: async () => {
        setSaving(true);
        try {
          await customerPoApi.close(po.id);
          setNotice(t.po.closeSuccess);
          await loadData(currentPage);
          if (detailPo?.id === po.id) {
            setDetailPo(await customerPoApi.get(po.id));
          }
        } catch (err) {
          setError(apiError(err));
        } finally {
          setSaving(false);
          setConfirmState((prev) => ({ ...prev, open: false }));
        }
      },
    });
  };

  const handleCancel = (po: CustomerPo) => {
    setConfirmState({
      open: true,
      title: t.po.confirmCancelTitle,
      description: t.po.confirmCancelDesc,
      tone: 'danger',
      onConfirm: async () => {
        setSaving(true);
        try {
          await customerPoApi.cancel(po.id);
          setNotice(t.po.cancelSuccess);
          await loadData(currentPage);
          if (detailPo?.id === po.id) {
            setDetailPo(await customerPoApi.get(po.id));
          }
        } catch (err) {
          setError(apiError(err));
        } finally {
          setSaving(false);
          setConfirmState((prev) => ({ ...prev, open: false }));
        }
      },
    });
  };

  const customerItemsFiltered = master.items.filter(
    (item) => item.customer_id === draft.customer_id
  );

  const columns: DataTableColumn<CustomerPo>[] = [
    {
      id: 'po_number',
      header: t.po.poNumber,
      cell: (row) => (
        <button
          className="button button--ghost"
          style={{ padding: 0, fontWeight: 'bold', fontFamily: 'monospace' }}
          onClick={() => void openDetailModal(row)}
        >
          {row.po_number}
        </button>
      ),
      sortValue: (row) => row.po_number,
    },
    {
      id: 'customer',
      header: t.common.customer,
      cell: (row) => row.customer?.name || row.customer_id,
      sortValue: (row) => row.customer?.name || '',
    },
    {
      id: 'po_date',
      header: t.po.poDate,
      cell: (row) => row.po_date,
      sortValue: (row) => row.po_date,
    },
    {
      id: 'expected_delivery_date',
      header: t.po.expectedDelivery,
      cell: (row) => row.expected_delivery_date || '-',
      sortValue: (row) => row.expected_delivery_date || '',
    },
    {
      id: 'lines_count',
      header: t.po.lineItems,
      cell: (row) => `${row.lines?.length || 0} ${t.common.items}`,
      sortValue: (row) => row.lines?.length || 0,
      align: 'right',
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
        <div style={{ display: 'flex', gap: '0.25rem' }}>
          <Button variant="ghost" onClick={() => void openDetailModal(row)} title={t.common.details}>
            <Eye size={15} />
          </Button>
          {row.status === 'DRAFT' && canEdit && (
            <Button variant="ghost" onClick={() => void openEditModal(row)} title={t.common.edit}>
              <Edit size={15} />
            </Button>
          )}
          {row.status === 'DRAFT' && canActivate && (
            <Button
              variant="success"
              onClick={() => handleActivate(row)}
              title={t.po.activate}
              disabled={saving}
            >
              <CheckCircle size={15} />
            </Button>
          )}
          {row.status === 'OPEN' && canClose && (
            <Button
              variant="secondary"
              onClick={() => handleClose(row)}
              title={t.po.closePo}
              disabled={saving}
            >
              <Archive size={15} />
            </Button>
          )}
          {(row.status === 'DRAFT' || row.status === 'OPEN') && canCancel && (
            <Button
              variant="danger"
              onClick={() => handleCancel(row)}
              title={t.po.cancelPo}
              disabled={saving}
            >
              <XCircle size={15} />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title={t.pages.poTitle}
        description={t.pages.poDesc}
        action={
          canCreate ? (
            <Button onClick={openCreateModal} disabled={loading}>
              <Plus size={16} /> {t.po.newPo}
            </Button>
          ) : undefined
        }
      />

      <Toast
        open={Boolean(notice)}
        message={notice}
        tone="success"
        onClose={() => setNotice('')}
      />

      {error && <Alert tone="danger">{error}</Alert>}

      <Card>
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <FormField label={t.common.status} htmlFor="status-filter">
            <Select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">{t.common.allStatus}</option>
              <option value="DRAFT">{t.po.statusDraft}</option>
              <option value="OPEN">{t.po.statusOpen}</option>
              <option value="CLOSED">{t.po.statusClosed}</option>
              <option value="CANCELLED">{t.po.statusCancelled}</option>
            </Select>
          </FormField>
        </div>

        <DataTable
          columns={columns}
          rows={pos}
          searchPlaceholder={t.common.search}
          searchText={(row) =>
            `${row.po_number} ${row.customer?.name || ''} ${row.status}`
          }
          emptyTitle={t.po.emptyTitle}
          emptyDescription={t.po.emptyDesc}
        />

        {lastPage > 1 && (
          <div className="data-table__pagination" style={{ marginTop: '1rem' }}>
            <span>
              {t.common.page} {currentPage} {t.common.of} {lastPage} ({totalItems} {t.common.items})
            </span>
            <div>
              <Button
                variant="ghost"
                onClick={() => void loadData(currentPage - 1)}
                disabled={currentPage <= 1 || loading}
              >
                {t.common.previous}
              </Button>
              <Button
                variant="ghost"
                onClick={() => void loadData(currentPage + 1)}
                disabled={currentPage >= lastPage || loading}
              >
                {t.common.next}
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Create / Edit Modal */}
      {editorOpen && (
        <Modal
          open={editorOpen}
          title={editingPo ? t.po.editPo : t.po.newPo}
          onClose={() => setEditorOpen(false)}
        >
          <div className="confirmation-dialog__body" style={{ maxHeight: '80vh', overflowY: 'auto' }}>
            {fieldErrors.lines && <Alert tone="danger">{fieldErrors.lines}</Alert>}

            <div className="dashboard-grid">
              <FormField
                label={t.common.company}
                htmlFor="po-company"
                required
                error={fieldErrors.company_id}
              >
                <Select
                  id="po-company"
                  value={draft.company_id}
                  onChange={(e) => setDraft((prev) => ({ ...prev, company_id: e.target.value }))}
                  disabled={Boolean(editingPo)}
                >
                  <option value="">{t.common.selectCompany}</option>
                  {master.companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} — {c.name}
                    </option>
                  ))}
                </Select>
              </FormField>

              <FormField
                label={t.common.customer}
                htmlFor="po-customer"
                required
                error={fieldErrors.customer_id}
              >
                <Select
                  id="po-customer"
                  value={draft.customer_id}
                  onChange={(e) => {
                    const newCustId = e.target.value;
                    setDraft((prev) => ({
                      ...prev,
                      customer_id: newCustId,
                      lines: prev.lines.map((l) => ({ ...l, customer_item_id: '' })),
                    }));
                  }}
                  disabled={Boolean(editingPo)}
                >
                  <option value="">{t.common.selectCustomer}</option>
                  {master.customers.map((cust) => (
                    <option key={cust.id} value={cust.id}>
                      {cust.code} — {cust.name}
                    </option>
                  ))}
                </Select>
              </FormField>
            </div>

            <div className="dashboard-grid">
              <FormField
                label={t.po.poNumber}
                htmlFor="po-number"
                required
                error={fieldErrors.po_number}
              >
                <Input
                  id="po-number"
                  value={draft.po_number}
                  onChange={(e) => setDraft((prev) => ({ ...prev, po_number: e.target.value }))}
                  placeholder="e.g. PO-2026-001"
                />
              </FormField>

              <FormField
                label={t.po.poDate}
                htmlFor="po-date"
                required
                error={fieldErrors.po_date}
              >
                <Input
                  id="po-date"
                  type="date"
                  value={draft.po_date}
                  onChange={(e) => setDraft((prev) => ({ ...prev, po_date: e.target.value }))}
                />
              </FormField>

              <FormField label={t.po.expectedDelivery} htmlFor="po-expected-date">
                <Input
                  id="po-expected-date"
                  type="date"
                  value={draft.expected_delivery_date}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, expected_delivery_date: e.target.value }))
                  }
                />
              </FormField>
            </div>

            <FormField label={t.common.notes} htmlFor="po-notes">
              <Textarea
                id="po-notes"
                value={draft.notes}
                onChange={(e) => setDraft((prev) => ({ ...prev, notes: e.target.value }))}
                rows={2}
              />
            </FormField>

            <div style={{ marginTop: '1.5rem', marginBottom: '1rem' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '0.5rem',
                }}
              >
                <strong>{t.po.lineItems}</strong>
                <Button variant="secondary" onClick={addLine}>
                  <Plus size={14} /> {t.po.addLine}
                </Button>
              </div>

              {draft.lines.map((line, idx) => (
                <div key={idx} className="card" style={{ marginBottom: '0.75rem', padding: '0.75rem' }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: '0.5rem',
                    }}
                  >
                    <span className="card__meta"># {idx + 1}</span>
                    {draft.lines.length > 1 && (
                      <Button
                        variant="ghost"
                        onClick={() => removeLine(idx)}
                        style={{ color: 'var(--color-danger, red)' }}
                      >
                        {t.po.removeLine}
                      </Button>
                    )}
                  </div>

                  <div className="dashboard-grid">
                    <FormField
                      label={t.common.item}
                      required
                      error={fieldErrors[`lines.${idx}.customer_item_id`]}
                    >
                      <Select
                        value={line.customer_item_id}
                        onChange={(e) => updateLine(idx, 'customer_item_id', e.target.value)}
                        disabled={!draft.customer_id}
                      >
                        <option value="">{t.common.selectItem}</option>
                        {customerItemsFiltered.map((i) => (
                          <option key={i.id} value={i.id}>
                            {i.code} — {i.name}
                          </option>
                        ))}
                      </Select>
                    </FormField>

                    <FormField label={t.common.colorCode}>
                      <Input
                        value={line.color_code}
                        onChange={(e) => updateLine(idx, 'color_code', e.target.value)}
                        placeholder="e.g. RAL9005"
                      />
                    </FormField>

                    <FormField
                      label={t.common.quantity}
                      required
                      error={fieldErrors[`lines.${idx}.quantity`]}
                    >
                      <Input
                        type="number"
                        min="1"
                        value={line.quantity}
                        onChange={(e) => updateLine(idx, 'quantity', e.target.value)}
                      />
                    </FormField>

                    <FormField label={t.common.unitPrice}>
                      <Input
                        type="number"
                        min="0"
                        value={line.unit_price}
                        onChange={(e) => updateLine(idx, 'unit_price', e.target.value)}
                      />
                    </FormField>
                  </div>
                </div>
              ))}
            </div>

            <div className="confirmation-dialog__actions" style={{ marginTop: '1.5rem' }}>
              <Button variant="secondary" onClick={() => setEditorOpen(false)}>
                {t.common.cancel}
              </Button>
              <Button onClick={() => void saveDraftPo()} loading={saving}>
                {t.common.saveDraft}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Detail Modal */}
      {detailPo && (
        <Modal
          open={Boolean(detailPo)}
          title={`${t.po.poDetails} — ${detailPo.po_number}`}
          onClose={() => setDetailPo(null)}
        >
          <div className="confirmation-dialog__body" style={{ maxHeight: '80vh', overflowY: 'auto' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem',
                marginBottom: '1rem',
              }}
            >
              <div>
                <span className="card__meta">{t.common.customer}</span>
                <p>
                  <strong>{detailPo.customer?.name}</strong>
                </p>
              </div>
              <div>
                <span className="card__meta">{t.common.status}</span>
                <p>
                  <StatusBadge status={detailPo.status} />
                </p>
              </div>
              <div>
                <span className="card__meta">{t.po.poDate}</span>
                <p>{detailPo.po_date}</p>
              </div>
              <div>
                <span className="card__meta">{t.po.expectedDelivery}</span>
                <p>{detailPo.expected_delivery_date || '-'}</p>
              </div>
            </div>

            {detailPo.notes && (
              <div style={{ marginBottom: '1rem' }}>
                <span className="card__meta">{t.common.notes}</span>
                <p>{detailPo.notes}</p>
              </div>
            )}

            <h3>{t.po.lineItems}</h3>
            <div className="data-table__scroll" style={{ marginTop: '0.5rem' }}>
              <table>
                <thead>
                  <tr>
                    <th>{t.common.item}</th>
                    <th>{t.common.colorCode}</th>
                    <th className="align-right">{t.po.orderedQty}</th>
                    <th className="align-right">{t.po.fulfilledQty}</th>
                    <th className="align-right">{t.po.remainingQty}</th>
                  </tr>
                </thead>
                <tbody>
                  {detailPo.lines.map((line) => {
                    const fulfilled = line.fulfilled_quantity || 0;
                    const remaining =
                      line.remaining_quantity !== undefined
                        ? line.remaining_quantity
                        : Math.max(0, line.quantity - fulfilled);

                    return (
                      <tr key={line.id}>
                        <td>
                          <strong>{line.customer_item?.name || line.customer_item_id}</strong>
                          {line.customer_item?.code && (
                            <span className="table-secondary">{line.customer_item.code}</span>
                          )}
                        </td>
                        <td>{line.color_code || '-'}</td>
                        <td className="align-right">{line.quantity} pcs</td>
                        <td className="align-right">{fulfilled} pcs</td>
                        <td className="align-right font-mono" style={{ fontWeight: 'bold' }}>
                          {remaining} pcs
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div
              className="confirmation-dialog__actions"
              style={{ marginTop: '1.5rem', justifyContent: 'space-between' }}
            >
              <div>
                {detailPo.status === 'DRAFT' && canActivate && (
                  <Button
                    variant="success"
                    onClick={() => handleActivate(detailPo)}
                    disabled={saving}
                  >
                    <CheckCircle size={15} /> {t.po.activate}
                  </Button>
                )}
                {detailPo.status === 'OPEN' && canClose && (
                  <Button
                    variant="secondary"
                    onClick={() => handleClose(detailPo)}
                    disabled={saving}
                  >
                    <Archive size={15} /> {t.po.closePo}
                  </Button>
                )}
                {(detailPo.status === 'DRAFT' || detailPo.status === 'OPEN') && canCancel && (
                  <Button
                    variant="danger"
                    onClick={() => handleCancel(detailPo)}
                    disabled={saving}
                    style={{ marginLeft: '0.5rem' }}
                  >
                    <XCircle size={15} /> {t.po.cancelPo}
                  </Button>
                )}
              </div>

              <Button variant="ghost" onClick={() => setDetailPo(null)}>
                {t.common.close}
              </Button>
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
        confirmLabel={t.common.confirm}
        cancelLabel={t.common.cancel}
        onConfirm={confirmState.onConfirm}
        onClose={() => setConfirmState((prev) => ({ ...prev, open: false }))}
      />
    </>
  );
}
