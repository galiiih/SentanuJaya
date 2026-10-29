import { useState, useEffect, useCallback } from 'react';
import { FileText, Download, RefreshCw, DollarSign, Activity, Package } from 'lucide-react';
import { reportApi, apiError } from '../services/api';
import { Alert, Button, Card, FormField, Input, StatusBadge } from './ui';


const fmt = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

export function ReportsPage() {
  const [activeTab, setActiveTab] = useState<'financial' | 'receivables' | 'operational' | 'custody'>('financial');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [financialData, setFinancialData] = useState<any>(null);
  const [receivablesData, setReceivablesData] = useState<any>(null);
  const [operationalData, setOperationalData] = useState<any>(null);
  const [custodyData, setCustodyData] = useState<any>(null);

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError('');
    const params: Record<string, string> = {};
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;

    try {
      if (activeTab === 'financial') {
        const res = await reportApi.financial(params);
        setFinancialData(res);
      } else if (activeTab === 'receivables') {
        const res = await reportApi.receivables(params);
        setReceivablesData(res);
      } else if (activeTab === 'operational') {
        const res = await reportApi.operational(params);
        setOperationalData(res);
      } else if (activeTab === 'custody') {
        const res = await reportApi.custody(params);
        setCustodyData(res);
      }
    } catch (e) {
      setError(apiError(e));
    }
    setLoading(false);
  }, [activeTab, startDate, endDate]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const exportCsv = () => {
    let dataList: any[] = [];
    let filename = `report_${activeTab}.csv`;

    if (activeTab === 'financial' && financialData) {
      dataList = financialData.invoices ?? financialData.items ?? [financialData];
    } else if (activeTab === 'receivables' && receivablesData) {
      dataList = receivablesData.customers ?? receivablesData.receivables ?? receivablesData.items ?? [];
    } else if (activeTab === 'operational' && operationalData) {
      dataList = operationalData.work_orders ?? operationalData.items ?? [operationalData];
    } else if (activeTab === 'custody' && custodyData) {
      dataList = custodyData.balances ?? custodyData.items ?? [];
    }

    if (!dataList || dataList.length === 0) {
      // Export summary object as simple csv
      dataList = [financialData || receivablesData || operationalData || custodyData || {}];
    }

    const headers = Object.keys(dataList[0] || {});
    const csvContent = [
      headers.join(','),
      ...dataList.map((row) => headers.map((h) => JSON.stringify(row[h] ?? '')).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Advanced Reporting & Analytics</h1>
          <p className="page-subtitle">Laporan resmi keuangan, piutang, operasional, dan kustodi material.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Button variant="secondary" onClick={() => loadReport()} loading={loading}>
            <RefreshCw size={16} style={{ marginRight: 6 }} /> Muat Ulang
          </Button>
          <Button variant="primary" onClick={exportCsv}>
            <Download size={16} style={{ marginRight: 6 }} /> Ekspor CSV
          </Button>
        </div>
      </div>

      {error && <Alert tone="danger">{error}</Alert>}

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem' }}>
        <Button variant={activeTab === 'financial' ? 'primary' : 'ghost'} onClick={() => setActiveTab('financial')}>
          <DollarSign size={16} style={{ marginRight: 6 }} /> Financial Report
        </Button>
        <Button variant={activeTab === 'receivables' ? 'primary' : 'ghost'} onClick={() => setActiveTab('receivables')}>
          <FileText size={16} style={{ marginRight: 6 }} /> Receivables Report
        </Button>
        <Button variant={activeTab === 'operational' ? 'primary' : 'ghost'} onClick={() => setActiveTab('operational')}>
          <Activity size={16} style={{ marginRight: 6 }} /> Operational Report
        </Button>
        <Button variant={activeTab === 'custody' ? 'primary' : 'ghost'} onClick={() => setActiveTab('custody')}>
          <Package size={16} style={{ marginRight: 6 }} /> Custody Report
        </Button>
      </div>

      <Card title="Filter Periode & Parameter">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'end' }}>
          <FormField label="Tanggal Mulai">
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </FormField>
          <FormField label="Tanggal Akhir">
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </FormField>
          <div>
            <Button variant="primary" onClick={() => loadReport()} style={{ width: '100%' }}>
              Terapkan Filter
            </Button>
          </div>
        </div>
      </Card>

      {loading && <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>Memuat data laporan...</p>}

      {!loading && activeTab === 'financial' && financialData && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1.25rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            <Card title="Total Revenue (Posted)">
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-success)' }}>
                {fmt(financialData.total_revenue ?? financialData.total_invoice_amount ?? 0)}
              </div>
            </Card>
            <Card title="Total Invoiced">
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                {fmt(financialData.total_invoice_amount ?? 0)}
              </div>
            </Card>
            <Card title="Total Payments">
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-info)' }}>
                {fmt(financialData.total_payment_amount ?? 0)}
              </div>
            </Card>
          </div>
          <Card title="Daftar Faktur (Invoice) & Pembayaran">
            {financialData.invoices?.length === 0 && financialData.payments?.length === 0 ? (
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', padding: '1rem', textAlign: 'center' }}>Tidak ada transaksi keuangan pada periode ini.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div>
                  <h4 style={{ fontWeight: 600, marginBottom: '0.75rem', fontSize: '0.95rem' }}>Faktur (Invoices) Posted</h4>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}>
                          <th style={{ padding: '0.5rem' }}>No. Invoice</th>
                          <th style={{ padding: '0.5rem' }}>Tanggal</th>
                          <th style={{ padding: '0.5rem', textAlign: 'right' }}>Total</th>
                          <th style={{ padding: '0.5rem', textAlign: 'right' }}>Due</th>
                          <th style={{ padding: '0.5rem', textAlign: 'center' }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {financialData.invoices?.map((inv: any) => (
                          <tr key={inv.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                            <td style={{ padding: '0.5rem', fontWeight: 500 }}>{inv.invoice_number}</td>
                            <td style={{ padding: '0.5rem', color: 'var(--color-text-secondary)' }}>{inv.invoice_date}</td>
                            <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: 600 }}>{fmt(inv.total_amount)}</td>
                            <td style={{ padding: '0.5rem', textAlign: 'right' }}>{fmt(inv.amount_due)}</td>
                            <td style={{ padding: '0.5rem', textAlign: 'center' }}><StatusBadge status={inv.status} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div>
                  <h4 style={{ fontWeight: 600, marginBottom: '0.75rem', fontSize: '0.95rem' }}>Pembayaran (Payments) Posted</h4>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}>
                          <th style={{ padding: '0.5rem' }}>No. Pembayaran</th>
                          <th style={{ padding: '0.5rem' }}>Tanggal</th>
                          <th style={{ padding: '0.5rem' }}>Metode</th>
                          <th style={{ padding: '0.5rem', textAlign: 'right' }}>Jumlah</th>
                          <th style={{ padding: '0.5rem', textAlign: 'center' }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {financialData.payments?.map((pay: any) => (
                          <tr key={pay.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                            <td style={{ padding: '0.5rem', fontWeight: 500 }}>{pay.payment_number}</td>
                            <td style={{ padding: '0.5rem', color: 'var(--color-text-secondary)' }}>{pay.payment_date}</td>
                            <td style={{ padding: '0.5rem' }}>{pay.payment_method ?? 'Transfer'}</td>
                            <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: 600, color: 'var(--color-success)' }}>{fmt(pay.amount)}</td>
                            <td style={{ padding: '0.5rem', textAlign: 'center' }}><StatusBadge status={pay.status} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {!loading && activeTab === 'receivables' && receivablesData && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1.25rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            <Card title="Total Outstanding Piutang">
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-warning)' }}>
                {fmt(receivablesData.total_outstanding ?? 0)}
              </div>
            </Card>
          </div>
          <Card title="Ringkasan Piutang Per Customer">
            {receivablesData.receivables?.length === 0 ? (
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', padding: '1rem', textAlign: 'center' }}>Tidak ada piutang outstanding.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}>
                      <th style={{ padding: '0.5rem' }}>Customer</th>
                      <th style={{ padding: '0.5rem', textAlign: 'right' }}>Total Billed</th>
                      <th style={{ padding: '0.5rem', textAlign: 'right' }}>Total Paid</th>
                      <th style={{ padding: '0.5rem', textAlign: 'right' }}>Outstanding</th>
                    </tr>
                  </thead>
                  <tbody>
                    {receivablesData.receivables?.map((c: any) => (
                      <tr key={c.customer_id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <td style={{ padding: '0.5rem', fontWeight: 500 }}>
                          <div>{c.customer_name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>{c.customer_code}</div>
                        </td>
                        <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: 600 }}>{fmt(c.total_billed)}</td>
                        <td style={{ padding: '0.5rem', textAlign: 'right', color: 'var(--color-success)' }}>{fmt(c.total_paid)}</td>
                        <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: 700, color: 'var(--color-warning)' }}>{fmt(c.outstanding)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {!loading && activeTab === 'operational' && operationalData && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1.25rem' }}>
          <Card title="Active Customer POs">
            {operationalData.active_customer_pos?.length === 0 ? (
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', padding: '1rem', textAlign: 'center' }}>Tidak ada PO aktif.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}>
                      <th style={{ padding: '0.5rem' }}>No. PO</th>
                      <th style={{ padding: '0.5rem' }}>Customer</th>
                      <th style={{ padding: '0.5rem' }}>Tanggal</th>
                      <th style={{ padding: '0.5rem', textAlign: 'center' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {operationalData.active_customer_pos?.map((po: any) => (
                      <tr key={po.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <td style={{ padding: '0.5rem', fontWeight: 500 }}>{po.po_number}</td>
                        <td style={{ padding: '0.5rem' }}>{po.customer?.name ?? '-'}</td>
                        <td style={{ padding: '0.5rem', color: 'var(--color-text-secondary)' }}>{po.po_date}</td>
                        <td style={{ padding: '0.5rem', textAlign: 'center' }}><StatusBadge status={po.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {!loading && activeTab === 'custody' && custodyData && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1.25rem' }}>
          <Card title="Ledger Kustodi Barang Customer (STB)">
            {custodyData.custody_balances?.length === 0 ? (
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', padding: '1rem', textAlign: 'center' }}>Tidak ada saldo kustodi.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}>
                      <th style={{ padding: '0.5rem' }}>Customer</th>
                      <th style={{ padding: '0.5rem' }}>Material / Barang</th>
                      <th style={{ padding: '0.5rem', textAlign: 'right' }}>Saldo Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {custodyData.custody_balances?.map((cb: any) => (
                      <tr key={cb.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <td style={{ padding: '0.5rem', fontWeight: 500 }}>{cb.customer?.name ?? '-'}</td>
                        <td style={{ padding: '0.5rem' }}>{cb.customer_item?.name ?? cb.material_id ?? '-'}</td>
                        <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: 700, color: 'var(--color-primary)' }}>{cb.quantity ?? 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
