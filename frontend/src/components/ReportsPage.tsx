import { useState, useEffect, useCallback } from 'react';
import { FileText, Download, RefreshCw, DollarSign, Activity, Package } from 'lucide-react';
import { reportApi, apiError } from '../services/api';
import { Alert, Button, Card, FormField, Input } from './ui';


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
          <Card title="Detail Laporan Keuangan">
            <pre style={{ background: 'var(--color-background-subtle)', padding: '1rem', borderRadius: '6px', fontSize: '0.85rem', overflowX: 'auto' }}>
              {JSON.stringify(financialData, null, 2)}
            </pre>
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
            <pre style={{ background: 'var(--color-background-subtle)', padding: '1rem', borderRadius: '6px', fontSize: '0.85rem', overflowX: 'auto' }}>
              {JSON.stringify(receivablesData, null, 2)}
            </pre>
          </Card>
        </div>
      )}

      {!loading && activeTab === 'operational' && operationalData && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1.25rem' }}>
          <Card title="Ringkasan Operasional & Produksi">
            <pre style={{ background: 'var(--color-background-subtle)', padding: '1rem', borderRadius: '6px', fontSize: '0.85rem', overflowX: 'auto' }}>
              {JSON.stringify(operationalData, null, 2)}
            </pre>
          </Card>
        </div>
      )}

      {!loading && activeTab === 'custody' && custodyData && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1.25rem' }}>
          <Card title="Ledger Kustodi Barang Customer">
            <pre style={{ background: 'var(--color-background-subtle)', padding: '1rem', borderRadius: '6px', fontSize: '0.85rem', overflowX: 'auto' }}>
              {JSON.stringify(custodyData, null, 2)}
            </pre>
          </Card>
        </div>
      )}
    </div>
  );
}
