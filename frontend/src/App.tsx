import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  Bell,
  Boxes,
  CheckCircle2,
  CircleDollarSign,
  FileCheck,
  FileText,
  Globe,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Package,
  Plus,
  Receipt,
  ShieldCheck,
  Sun,
  Truck,
  Users,
  X,
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { NavLink, Navigate, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { permissions, type Permission, useAuth } from './auth';
import { LanguageProvider, useLanguage } from './i18n';
import { ReportsPage } from './components/ReportsPage';
import { MasterDataPage } from './components/MasterDataPage';
import { CustomerPoPage } from './components/CustomerPoPage';
import { DeliveryPage } from './components/DeliveryPage';
import { PaymentPage } from './components/PaymentPage';
import { InvoicingPage } from './components/InvoicingPage';
import TemplateManagementPage from './pages/TemplateManagementPage';
import UsersManagementPage from './pages/UsersManagementPage';
import {
  type Material,
} from './services/api';
import {
  apiError,
  custodyApi,
  goodsReceiptApi,
  type Branch,
  type Company,
  type Condition,
  type CustodyBalance,
  type CustodyLedger,
  type CustodyLocation,
  type Customer,
  type CustomerItem,
  type DraftPayload,
  type GoodsReceipt,
  dashboardApi,
} from './services/api';
import {
  Alert,
  Breadcrumb,
  Button,
  Card,
  DataTable,
  type DataTableColumn,
  FormField,
  Input,
  KpiCard,
  PageHeader,
  Select,
  StatusBadge,
} from './components/ui';
import './App.css';

type PageKey = 'dashboard' | 'custody' | 'customerPo' | 'materials' | 'delivery' | 'invoicing' | 'reports' | 'master';

const routePages: Record<string, PageKey> = {
  '/dashboard': 'dashboard',
  '/custody': 'custody',
  '/customer-po': 'customerPo',
  '/materials': 'materials',
  '/delivery': 'delivery',
  '/invoicing': 'invoicing',
  '/reports': 'reports',
  '/master': 'master',
};

const currency = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });
const quantity = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 });
const formatQuantity = (value: string | number) => quantity.format(Number(value));

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isReady } = useAuth();
  const location = useLocation();
  if (!isReady) return <main className="auth-page" aria-busy="true"><Card className="auth-card">Memeriksa sesi…</Card></main>;
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace state={{ from: location }} />;
}

function RequirePermission({ permission, children }: { permission: Permission; children: React.ReactNode }) {
  const { hasPermission } = useAuth();
  return hasPermission(permission) ? <>{children}</> : <Navigate to="/403" replace />;
}

function Sidebar({ mobile, onClose, closeButtonRef }: { mobile?: boolean; onClose?: () => void; closeButtonRef?: React.RefObject<HTMLButtonElement | null> }) {
  const { hasPermission } = useAuth();
  const { t } = useLanguage();

  const navSections = [
    {
      label: t.nav.operations,
      items: [
        { path: '/dashboard', label: t.nav.dashboard, icon: LayoutDashboard, permission: permissions.dashboardView },
        { path: '/custody', label: t.nav.custody, icon: Package, permission: permissions.custodyView },
        { path: '/customer-po', label: t.nav.customerPo, icon: FileText, permission: permissions.poView },
        { path: '/delivery', label: t.nav.delivery, icon: Truck, permission: permissions.deliveryView },
      ],
    },
    {
      label: 'FINANCE & BILLING',
      items: [
        { path: '/invoicing', label: 'Invoice', icon: Receipt, permission: permissions.invoiceView },
        { path: '/payments', label: 'Pembayaran', icon: CircleDollarSign, permission: permissions.paymentView },
        { path: '/reports', label: 'Laporan', icon: FileCheck, permission: permissions.invoiceView },
        { path: '/templates', label: 'Template Dokumen', icon: FileText, permission: permissions.invoiceView },
      ],
    },
    {
      label: t.nav.inventory,
      items: [
        { path: '/materials', label: t.nav.materials, icon: Boxes, permission: permissions.materialView },
        { path: '/master', label: 'Master Data', icon: Package, permission: permissions.dashboardView },
        { path: '/users', label: 'Manajemen Pengguna', icon: Users, permission: permissions.userManage },
      ],
    },
  ];

  return (
    <aside id={mobile ? 'mobile-navigation' : undefined} className={`sidebar${mobile ? ' sidebar--mobile' : ''}`} role={mobile ? 'dialog' : undefined} aria-modal={mobile || undefined} aria-label={mobile ? 'Navigasi utama' : undefined} onMouseDown={(event) => event.stopPropagation()}>
      <div className="sidebar__brand">
        <div data-sentanu-logo style={{ width: '36px', height: '36px', flexShrink: 0 }} />
        <div><strong>SENTANU JAYA</strong><span>ERP WORKSHOP</span></div>
        {mobile && <button ref={closeButtonRef} className="icon-button sidebar__close" onClick={onClose} aria-label="Tutup navigasi"><X size={20} /></button>}
      </div>
      <nav className="sidebar__nav" aria-label="Navigasi utama">
        {navSections.map((section) => {
          const visibleItems = section.items.filter((item) => hasPermission(item.permission));
          if (!visibleItems.length) return null;
          return <div key={section.label}><p className="nav-section-label">{section.label}</p>{visibleItems.map((item) => {
            const Icon = item.icon;
            return <NavLink key={item.path} to={item.path} className={({ isActive }) => `nav-item${isActive ? ' nav-item--active' : ''}`} onClick={onClose}><Icon size={18} /><span>{item.label}</span></NavLink>;
          })}</div>;
        })}
      </nav>
      <div className="sidebar__foot"><ShieldCheck size={18} /><div><strong>{t.nav.isolatedCustody}</strong><span>{t.nav.offBalanceSheet}</span></div></div>
    </aside>
  );
}

function ThemeSwitcher() {
  const [theme, setTheme] = useState(() => localStorage.getItem('sentanu_theme') || 'light');
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('sentanu_theme', theme);
  }, [theme]);
  const toggle = () => setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  return (
    <button
      type="button"
      className="icon-button"
      onClick={toggle}
      title={theme === 'light' ? 'Ganti ke Tema Gelap' : 'Ganti ke Tema Terang'}
      aria-label="Ganti Tema"
    >
      {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
    </button>
  );
}

function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();
  return (
    <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
      <Globe size={16} style={{ color: 'var(--color-text-muted)' }} />
      <button
        type="button"
        className={`button button--ghost${language === 'id' ? ' button--primary' : ''}`}
        style={{ padding: '0.2rem 0.4rem', fontSize: '0.75rem', height: 'auto' }}
        onClick={() => setLanguage('id')}
      >
        ID
      </button>
      <button
        type="button"
        className={`button button--ghost${language === 'en' ? ' button--primary' : ''}`}
        style={{ padding: '0.2rem 0.4rem', fontSize: '0.75rem', height: 'auto' }}
        onClick={() => setLanguage('en')}
      >
        EN
      </button>
    </div>
  );
}

function AuthenticatedLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const drawerCloseButton = useRef<HTMLButtonElement>(null);
  const location = useLocation();
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const pageKey = routePages[location.pathname] ?? 'dashboard';
  const pageTitle = t.pages[`${pageKey}Title` as keyof typeof t.pages] || 'Dashboard';

  const breadcrumbMap: Record<string, string[]> = {
    '/dashboard': ['Workspace', 'Dashboard'],
    '/custody': ['Workspace', 'Operasional', 'Penitindahan STB'],
    '/customer-po': ['Workspace', 'Operasional', 'Customer PO'],
    '/delivery': ['Workspace', 'Operasional', 'Delivery'],
    '/invoicing': ['Workspace', 'Finance & Billing', 'Invoice'],
    '/payments': ['Workspace', 'Finance & Billing', 'Pembayaran'],
    '/reports': ['Workspace', 'Finance & Billing', 'Laporan'],
    '/templates': ['Workspace', 'Finance & Billing', 'Template Dokumen'],
    '/materials': ['Workspace', 'Inventaris', 'Material'],
    '/master': ['Workspace', 'Inventaris', 'Master Data'],
    '/users': ['Workspace', 'Inventaris', 'Manajemen Pengguna'],
  };
  const breadcrumbItems = breadcrumbMap[location.pathname] || ['Workspace', pageTitle];

  useEffect(() => {
    if (!drawerOpen) return;
    drawerCloseButton.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setDrawerOpen(false); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [drawerOpen]);

  const closeDrawer = () => { setDrawerOpen(false); requestAnimationFrame(() => menuButton.current?.focus()); };
  const signOut = () => { logout(); navigate('/login', { replace: true }); };

  return (
    <div className="app-shell">
      <Sidebar />
      {drawerOpen && <div className="drawer-overlay" onMouseDown={closeDrawer}><Sidebar mobile onClose={closeDrawer} closeButtonRef={drawerCloseButton} /></div>}
      <div className="app-shell__main">
        <header className="app-header">
          <div className="app-header__context"><button ref={menuButton} className="icon-button menu-button" onClick={() => setDrawerOpen(true)} aria-label="Buka navigasi" aria-expanded={drawerOpen} aria-controls="mobile-navigation"><Menu size={21} /></button><div><span className="app-header__eyebrow">SENTANU JAYA ERP</span><strong>{pageTitle}</strong></div></div>
          <div className="app-header__account">
            <ThemeSwitcher />
            <span className="header-divider" />
            <LanguageSwitcher />
            <span className="header-divider" />
            <button className="icon-button" aria-label="Notifikasi" disabled title="Fitur notifikasi belum tersedia"><Bell size={19} /></button>
            <span className="header-divider" />
            <div className="user-avatar">{user?.name.slice(0, 2).toUpperCase()}</div>
            <div className="user-copy"><strong>{user?.name}</strong><span>{user?.role === 'ADMIN' ? 'Administrator' : user?.role}</span></div>
            <div className="user-menu"><button className="icon-button" aria-label="Menu pengguna" aria-expanded={menuOpen} onClick={() => setMenuOpen((value) => !value)}><Menu size={18} /></button>{menuOpen && <div className="user-menu__popover"><strong>{user?.name}</strong><span>{user?.email}</span><Button variant="ghost" onClick={signOut}><LogOut size={15} /> {t.nav.logout}</Button></div>}</div>
          </div>
        </header>
        <main className="app-content"><Breadcrumb items={breadcrumbItems} /><Outlet /></main>
      </div>
    </div>
  );
}

function Dashboard() {
  const { user, hasPermission } = useAuth();
  const navigate = useNavigate();
  const greeting = `Good morning${user?.name ? `, ${user.name}` : ''}. Ini ringkasan operasional Sentanu Jaya hari ini.`;
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadSummary = async () => {
    setLoading(true); setError('');
    try {
      const data = await dashboardApi.summary();
      setStats(data);
    } catch (reason) {
      setError(apiError(reason));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSummary();
  }, []);

  const quickActions = (
    <div className="page-header__actions">
      {hasPermission(permissions.custodyView) && <Button onClick={() => navigate('/custody')}><Plus size={16} /> Terima Barang</Button>}
      {hasPermission(permissions.invoiceView) && <Button variant="secondary" onClick={() => navigate('/invoicing')}><Receipt size={16} /> Buat Invoice</Button>}
      <Button variant="ghost" onClick={() => void loadSummary()} loading={loading}>Muat ulang</Button>
    </div>
  );

  const op = stats?.operational ?? {};
  const fin = stats?.financial ?? {};
  const custodyCount = stats?.custody?.total_items ?? 0;
  const uninvoicedCount = stats?.uninvoiced_sj_count ?? 0;
  const arOutstanding = fin.total_outstanding ?? 0;
  const productionStages = [
    ['Raw', op.production_raw ?? 0, 'neutral'],
    ['Paint', op.production_paint ?? 0, 'info'],
    ['Drying', op.production_drying ?? 0, 'warning'],
    ['Polish', op.production_polish ?? 0, 'info'],
    ['QC', op.pending_qc ?? 0, 'success'],
    ['Packing', op.production_packing ?? 0, 'success'],
  ] as const;

  const trendData: Array<{ period: string; revenue: number; payments: number; net: number }> = stats?.financial_trend ?? [];
  const recentActivity: Array<{ type: string; description: string; status: string; timestamp: string }> = stats?.recent_activity ?? [];
  const totalUnits = productionStages.reduce((sum, [, v]) => sum + Number(v), 0);

  return <>
    <PageHeader title="Dashboard" description={greeting} action={quickActions} />
    {error && <Alert tone="danger">{error}</Alert>}
    <section className="kpi-grid" aria-label="Ringkasan operasional">
      <KpiCard label="Custody active" value={<>{custodyCount}<small> pcs</small></>} detail="Barang customer di workshop" icon={<Package size={18} />} />
      <KpiCard label="PO Aktif" value={<>{op.active_customer_pos ?? 0}<small> PO</small></>} detail="Customer Purchase Order" icon={<Boxes size={18} />} tone="info" />
      <KpiCard label="Siap ditagihkan" value={<>{uninvoicedCount}<small> SJ</small></>} detail="SJ belum diinvoice" icon={<FileCheck size={18} />} tone="info" />
      <KpiCard label="Tagihan berjalan (AR)" value={currency.format(arOutstanding)} detail="Nilai outstanding invoice POSTED" icon={<CircleDollarSign size={18} />} tone="success" />
    </section>
    <div className="dashboard-grid">
      <Card title="Production overview" action={<span className="card__meta">{totalUnits} unit aktif</span>}>{totalUnits === 0 ? <p className="chart-note">Belum ada data produksi.</p> : <><div className="production-summary"><p>Work order per tahap produksi</p><strong>{totalUnits} <span>unit</span></strong></div><div className="production-bar" aria-label="Distribusi unit aktif berdasarkan tahap produksi">{productionStages.map(([label, value, tone]) => <div key={label} className={`production-bar__segment production-bar__segment--${tone}`} style={{ width: `${Math.max(5, Number(value) / 1.2)}%` }} title={`${label}: ${value} unit`}><span>{label}</span></div>)}</div><div className="production-legend">{productionStages.map(([label, value, tone]) => <span key={label}><i className={`status-dot status-dot--${tone}`} />{label} <strong>{value}</strong></span>)}</div></>}</Card>
      <Card title="Financial Summary" action={<Button variant="ghost" onClick={() => navigate('/invoicing')}>Lihat invoice</Button>}><div className="alert-item"><div><strong>Total Invoice Periode Ini</strong><span>Rp {Number(fin.total_invoice_period ?? 0).toLocaleString('id-ID')}</span></div><div><strong>Total Pembayaran (POSTED)</strong><span>Rp {Number(fin.total_payment_posted ?? 0).toLocaleString('id-ID')}</span></div></div></Card>
      <Card title="Revenue & Financial Trend" className="dashboard-grid__wide" action={<span className="card__meta">{trendData.length ? 'Data aktual' : 'Belum ada data'}</span>}>{trendData.length === 0 ? <p className="chart-note">Belum ada data transaksi untuk ditampilkan.</p> : <div className="chart-container"><ResponsiveContainer width="100%" height={220}><BarChart data={trendData} barGap={2}><CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" /><XAxis dataKey="period" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} /><YAxis tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} tickFormatter={(v: number) => `${(v / 1000000).toFixed(0)}jt`} /><Tooltip formatter={(v) => `Rp ${Number(v).toLocaleString('id-ID')}`} /><Legend wrapperStyle={{ fontSize: 12 }} /><Bar dataKey="revenue" name="Revenue" fill="var(--color-info)" radius={[3, 3, 0, 0]} /><Bar dataKey="payments" name="Pembayaran" fill="var(--color-warning)" radius={[3, 3, 0, 0]} /><Bar dataKey="net" name="Net" fill="var(--color-success)" radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer></div>}</Card>
      <Card title="Aktivitas terbaru" className="dashboard-grid__wide" action={<Button variant="ghost" onClick={() => void loadSummary()}>Muat ulang</Button>}>{recentActivity.length === 0 ? <p className="chart-note">Belum ada aktivitas transaksi.</p> : <ul className="activity-list">{recentActivity.map((act, i) => <li key={i}><time>{new Date(act.timestamp).toLocaleDateString('id-ID')}</time><span className="activity-list__icon"><CheckCircle2 size={16} /></span><div><strong>{act.description}</strong><span>{act.type}</span></div><StatusBadge status={act.status} /></li>)}</ul>}</Card>
    </div>
  </>;
}


const receiptColumns: DataTableColumn<GoodsReceipt>[] = [
  { id: 'number', header: 'No. STB', cell: (item) => <strong className="font-mono">{item.stb_number}</strong>, sortValue: (item) => item.stb_number },
  { id: 'customer', header: 'Customer', cell: (item) => item.customer?.name ?? item.customer_id, sortValue: (item) => item.customer?.name ?? '' },
  { id: 'received', header: 'Diterima', cell: (item) => item.received_date, sortValue: (item) => item.received_date },
  { id: 'lines', header: 'Barang', cell: (item) => `${item.lines.length} baris`, sortValue: (item) => item.lines.length, align: 'right' },
  { id: 'status', header: 'Status', cell: (item) => <StatusBadge status={item.status} />, sortValue: (item) => item.status },
];

const balanceColumns: DataTableColumn<CustodyBalance>[] = [
  { id: 'customer', header: 'Customer', cell: (item) => item.customer?.name ?? item.customer_id, sortValue: (item) => item.customer?.name ?? '' },
  { id: 'item', header: 'Barang', cell: (item) => <><strong>{item.customer_item?.name ?? item.customer_item_id}</strong><span className="table-secondary">{item.customer_item?.code}</span></>, sortValue: (item) => item.customer_item?.name ?? '' },
  { id: 'location', header: 'Lokasi', cell: (item) => item.custody_location?.name ?? 'Belum ditentukan', sortValue: (item) => item.custody_location?.name ?? '' },
  { id: 'stage', header: 'Tahap', cell: (item) => <StatusBadge status={item.stage} />, sortValue: (item) => item.stage },
  { id: 'quantity', header: 'Saldo fisik', cell: (item) => `${formatQuantity(item.balance_quantity)} pcs`, sortValue: (item) => Number(item.balance_quantity), align: 'right' },
];

const ledgerColumns: DataTableColumn<CustodyLedger>[] = [
  { id: 'date', header: 'Tanggal', cell: (item) => item.movement_date, sortValue: (item) => item.movement_date },
  { id: 'movement', header: 'Mutasi', cell: (item) => <StatusBadge status={item.movement_type} />, sortValue: (item) => item.movement_type },
  { id: 'item', header: 'Barang', cell: (item) => <><strong>{item.customer_item?.name ?? item.customer_item_id}</strong><span className="table-secondary">{item.customer_item?.code}</span></>, sortValue: (item) => item.customer_item?.name ?? '' },
  { id: 'location', header: 'Lokasi', cell: (item) => item.custody_location?.name ?? 'Belum ditentukan', sortValue: (item) => item.custody_location?.name ?? '' },
  { id: 'in', header: 'Masuk', cell: (item) => `${formatQuantity(item.quantity_in)} pcs`, sortValue: (item) => Number(item.quantity_in), align: 'right' },
  { id: 'out', header: 'Keluar', cell: (item) => `${formatQuantity(item.quantity_out)} pcs`, sortValue: (item) => Number(item.quantity_out), align: 'right' },
];

type CustodyMaster = { companies: Company[]; branches: Branch[]; customers: Customer[]; items: CustomerItem[]; locations: CustodyLocation[] };
const emptyMaster: CustodyMaster = { companies: [], branches: [], customers: [], items: [], locations: [] };

function CustodyPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [receipts, setReceipts] = useState<GoodsReceipt[]>([]);
  const [balances, setBalances] = useState<CustodyBalance[]>([]);
  const [ledger, setLedger] = useState<CustodyLedger[]>([]);
  const [master, setMaster] = useState<CustodyMaster>(emptyMaster);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [draft, setDraft] = useState({ company_id: '', branch_id: '', customer_id: '', received_date: new Date().toISOString().slice(0, 10), delivered_by_name: '', vehicle_plate: '', notes: '', customer_item_id: '', quantity_received: '1', condition: 'GOOD' as Condition, custody_location_id: '', color_code: '', damage_description: '' });

  const load = async (showLoading = true) => {
    if (showLoading) setLoading(true); setError('');
    try {
      const [receiptList, balanceList, ledgerList, companies, branches, customers, items, locations] = await Promise.all([goodsReceiptApi.list(), custodyApi.balances(), custodyApi.ledger(), custodyApi.companies(), custodyApi.branches(), custodyApi.customers(), custodyApi.customerItems(), custodyApi.locations()]);
      setReceipts(receiptList.data); setBalances(balanceList.data); setLedger(ledgerList.data); setMaster({ companies: companies.data, branches: branches.data, customers: customers.data, items: items.data, locations: locations.data });
    } catch (reason) { setError(apiError(reason)); } finally { setLoading(false); }
  };
  useEffect(() => { void load(false); }, []);

  const openNew = () => {
    const company = master.companies[0];
    const branch = master.branches.find((item) => item.company_id === company?.id) ?? master.branches[0];
    setDraft((value) => ({ ...value, company_id: company?.id ?? '', branch_id: branch?.id ?? '', customer_id: '', customer_item_id: '', custody_location_id: master.locations.find((item) => item.branch_id === branch?.id)?.id ?? '' }));
    setEditorOpen(true); setError(''); setNotice('');
  };
  const saveDraft = async () => {
    if (!draft.company_id || !draft.branch_id || !draft.customer_id || !draft.customer_item_id || !draft.custody_location_id) { setError('Lengkapi perusahaan, cabang, customer, barang, dan lokasi.'); return; }
    setSaving(true); setError('');
    const payload: DraftPayload = { company_id: draft.company_id, branch_id: draft.branch_id, customer_id: draft.customer_id, received_date: draft.received_date, delivered_by_name: draft.delivered_by_name || undefined, vehicle_plate: draft.vehicle_plate || undefined, notes: draft.notes || undefined, lines: [{ customer_item_id: draft.customer_item_id, quantity_received: Number(draft.quantity_received), condition: draft.condition, custody_location_id: draft.custody_location_id, color_code: draft.color_code || undefined, damage_description: draft.damage_description || undefined }] };
    try { await goodsReceiptApi.create(payload); setEditorOpen(false); setNotice('STB draft dibuat.'); await load(); } catch (reason) { setError(apiError(reason)); } finally { setSaving(false); }
  };
  const advance = async (receipt: GoodsReceipt, action: 'submit' | 'post' | 'cancel') => {
    setSaving(true); setError('');
    try { await goodsReceiptApi[action](receipt.id); setNotice(action === 'post' ? 'STB diposting. Custody ledger dan saldo diperbarui.' : action === 'submit' ? 'STB dikirim untuk posting.' : 'STB draft dibatalkan.'); await load(); } catch (reason) { setError(apiError(reason)); } finally { setSaving(false); }
  };
  const customerItems = master.items.filter((item) => item.customer_id === draft.customer_id);
  const branchLocations = master.locations.filter((item) => item.branch_id === draft.branch_id);
  const canPost = user?.role === 'ADMIN' || user?.role === 'OWNER';

  return <>
    <PageHeader title={t.pages.custodyTitle} description={t.pages.custodyDesc} action={<Button onClick={openNew} disabled={loading || !master.companies.length}><Plus size={16} /> STB baru</Button>} />
    {error && <Alert tone="danger">{error}</Alert>}{notice && <Alert tone="success">{notice}</Alert>}
    <div className="dashboard-grid"><Card title="Surat Terima Barang" className="dashboard-grid__wide" action={<Button variant="ghost" onClick={() => void load()} loading={loading}>Muat ulang</Button>}><DataTable columns={receiptColumns} rows={receipts} searchText={(item) => `${item.stb_number} ${item.customer?.name ?? ''} ${item.status}`} emptyTitle="Belum ada STB" emptyDescription="Buat draft STB saat barang customer diterima secara fisik." />{receipts.filter((item) => item.status === 'DRAFT' || item.status === 'SUBMITTED').map((item) => <div className="alert-item" key={item.id}><div><strong>{item.stb_number}</strong><span>{item.customer?.name} · {item.status}</span></div><div className="page-header__actions">{item.status === 'DRAFT' && <><Button variant="secondary" onClick={() => void advance(item, 'cancel')} disabled={saving}>Batalkan</Button>{canPost && <Button onClick={() => void advance(item, 'submit')} disabled={saving}>Submit</Button>}</>}{item.status === 'SUBMITTED' && canPost && <Button variant="success" onClick={() => void advance(item, 'post')} disabled={saving}>Post</Button>}</div></div>)}</Card>
      <Card title="Saldo custody" className="dashboard-grid__wide"><DataTable columns={balanceColumns} rows={balances} searchText={(item) => `${item.customer?.name ?? ''} ${item.customer_item?.name ?? ''} ${item.custody_location?.name ?? ''}`} emptyTitle="Belum ada saldo custody" emptyDescription="Saldo muncul setelah STB berstatus POSTED. Barang customer tidak masuk stock material." /></Card>
      <Card title="Custody ledger" className="dashboard-grid__wide"><DataTable columns={ledgerColumns} rows={ledger} searchText={(item) => `${item.movement_type} ${item.customer?.name ?? ''} ${item.customer_item?.name ?? ''} ${item.custody_location?.name ?? ''}`} emptyTitle="Belum ada mutasi custody" emptyDescription="Mutasi IN FROM CUSTOMER muncul saat STB berstatus POSTED." /></Card></div>
    {editorOpen && <div className="modal-backdrop" role="presentation"><section className="modal" role="dialog" aria-modal="true" aria-labelledby="stb-editor-title"><div className="modal__header"><h2 id="stb-editor-title">Draft Surat Terima Barang</h2><Button variant="ghost" onClick={() => setEditorOpen(false)}>Tutup</Button></div><div className="confirmation-dialog__body"><div className="invoice-layout__form"><div className="dashboard-grid"><FormField label="Perusahaan" htmlFor="stb-company" required><Select id="stb-company" value={draft.company_id} onChange={(event) => { const companyId = event.target.value; const branch = master.branches.find((item) => item.company_id === companyId); setDraft((value) => ({ ...value, company_id: companyId, branch_id: branch?.id ?? '', custody_location_id: master.locations.find((item) => item.branch_id === branch?.id)?.id ?? '' })); }}><option value="">Pilih perusahaan</option>{master.companies.map((item) => <option key={item.id} value={item.id}>{item.code} — {item.name}</option>)}</Select></FormField><FormField label="Cabang" htmlFor="stb-branch" required><Select id="stb-branch" value={draft.branch_id} onChange={(event) => { const branchId = event.target.value; setDraft((value) => ({ ...value, branch_id: branchId, custody_location_id: master.locations.find((item) => item.branch_id === branchId)?.id ?? '' })); }}><option value="">Pilih cabang</option>{master.branches.filter((item) => item.company_id === draft.company_id).map((item) => <option key={item.id} value={item.id}>{item.code} — {item.name}</option>)}</Select></FormField></div><FormField label="Customer" htmlFor="stb-customer" required><Select id="stb-customer" value={draft.customer_id} onChange={(event) => setDraft((value) => ({ ...value, customer_id: event.target.value, customer_item_id: '' }))}><option value="">Pilih customer</option>{master.customers.map((item) => <option key={item.id} value={item.id}>{item.code} — {item.name}</option>)}</Select></FormField><div className="dashboard-grid"><FormField label="Tanggal terima" htmlFor="stb-date" required><Input id="stb-date" type="date" value={draft.received_date} onChange={(event) => setDraft((value) => ({ ...value, received_date: event.target.value }))} /></FormField><FormField label="Diterima dari" htmlFor="stb-delivered-by"><Input id="stb-delivered-by" value={draft.delivered_by_name} onChange={(event) => setDraft((value) => ({ ...value, delivered_by_name: event.target.value }))} /></FormField></div><div className="dashboard-grid"><FormField label="Barang customer" htmlFor="stb-item" required><Select id="stb-item" value={draft.customer_item_id} onChange={(event) => setDraft((value) => ({ ...value, customer_item_id: event.target.value }))}><option value="">Pilih barang</option>{customerItems.map((item) => <option key={item.id} value={item.id}>{item.code} — {item.name}</option>)}</Select></FormField><FormField label="Lokasi custody" htmlFor="stb-location" required><Select id="stb-location" value={draft.custody_location_id} onChange={(event) => setDraft((value) => ({ ...value, custody_location_id: event.target.value }))}><option value="">Pilih lokasi</option>{branchLocations.map((item) => <option key={item.id} value={item.id}>{item.code} — {item.name}</option>)}</Select></FormField><FormField label="Jumlah" htmlFor="stb-quantity" required><Input id="stb-quantity" min="0.001" step="0.001" type="number" value={draft.quantity_received} onChange={(event) => setDraft((value) => ({ ...value, quantity_received: event.target.value }))} /></FormField><FormField label="Kondisi" htmlFor="stb-condition"><Select id="stb-condition" value={draft.condition} onChange={(event) => setDraft((value) => ({ ...value, condition: event.target.value as Condition }))}>{(['GOOD', 'DENT', 'CRACK', 'OLD_PAINT', 'OTHER'] as Condition[]).map((condition) => <option key={condition} value={condition}>{condition}</option>)}</Select></FormField></div><FormField label="Catatan" htmlFor="stb-notes"><textarea id="stb-notes" className="input textarea" value={draft.notes} onChange={(event) => setDraft((value) => ({ ...value, notes: event.target.value }))} /></FormField></div><div className="confirmation-dialog__actions"><Button variant="secondary" onClick={() => setEditorOpen(false)}>Batal</Button><Button onClick={() => void saveDraft()} loading={saving}>Simpan draft</Button></div></div></section></div>}
  </>;
}
const materialColumns: DataTableColumn<Material>[] = [
  { id: 'sku', header: 'SKU', cell: (item) => <span className="font-mono">{item.sku}</span>, sortValue: (item) => item.sku },
  { id: 'name', header: 'Nama material', cell: (item) => <><strong>{item.name}</strong><span className="table-secondary">{item.category}</span></>, sortValue: (item) => item.name },
  { id: 'stock', header: 'Stok aktual', cell: (item) => `${item.quantity_on_hand ?? 0} ${item.unit}`, sortValue: (item) => item.quantity_on_hand ?? 0, align: 'right' },
  { id: 'minimum', header: 'Minimum', cell: (item) => `${item.minimum_stock ?? 0} ${item.unit}`, sortValue: (item) => item.minimum_stock ?? 0, align: 'right' },
  { id: 'status', header: 'Status', cell: (item) => {
    const stock = item.quantity_on_hand ?? 0;
    const min = item.minimum_stock ?? 0;
    return <StatusBadge status={stock <= min ? 'CRITICAL' : 'AMAN'} label={stock <= min ? 'Stok kritis' : 'Aman'} />;
  }, sortValue: (item) => (item.quantity_on_hand ?? 0) - (item.minimum_stock ?? 0) },
];

function MaterialsPage() {
  const { t } = useLanguage();
  const [materials, setMaterials] = useState<Material[]>([]);

  useEffect(() => {
    axios.get('/api/v1/materials', { params: { per_page: 200 } })
      .then((res: any) => {
        const raw = res.data.data.data || res.data.data || [];
        const mapped = raw.map((m: any) => ({
          id: m.id,
          sku: m.code || m.sku || '-',
          name: m.name || '-',
          category: m.category || 'GENERAL',
          quantity_on_hand: m.quantity_on_hand ?? 0,
          unit: m.unit || 'PCS',
          minimum_stock: m.minimum_stock ?? m.min_stock ?? 0,
          avg_cost: m.avg_cost ?? 0,
        }));
        setMaterials(mapped);
      })
      .catch((err: any) => console.error('Failed to load materials', err));
  }, []);

  return <><PageHeader title={t.pages.materialsTitle} description={t.pages.materialsDesc} action={<Button><Plus size={16} /> Purchase material</Button>} /><Card><DataTable columns={materialColumns} rows={materials} searchText={(item) => `${item.sku} ${item.name} ${item.category}`} emptyTitle="Belum ada material" emptyDescription="Data material akan muncul setelah master material tersedia." /></Card></>;
}

function LoginPage() {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const destination = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? '/dashboard';
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setError(''); setLoading(true);
    try { await login(email, password); navigate(destination, { replace: true }); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Login gagal.'); } finally { setLoading(false); }
  };
  return <main className="auth-page"><Card className="auth-card"><div className="auth-brand"><div data-sentanu-logo style={{ width: '36px', height: '36px', flexShrink: 0 }} /><div><strong>SENTANU JAYA</strong><span>ERP WORKSHOP</span></div></div><div className="auth-copy"><h1>Masuk ke Sentanu Jaya ERP</h1><p>Gunakan akun yang terdaftar untuk mengakses lingkungan pengembangan.</p></div>{error && <Alert tone="danger">{error}</Alert>}<form className="auth-form" onSubmit={submit}><FormField label="Email" htmlFor="login-email" required><Input id="login-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></FormField><FormField label="Password" htmlFor="login-password" required><Input id="login-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></FormField><Button type="submit" loading={loading}>Login</Button></form><p className="auth-note">Forgot password belum tersedia.</p></Card></main>;
}

function ErrorPage({ code, title, description }: { code: '403' | '404'; title: string; description: string }) { const navigate = useNavigate(); return <main className="error-page"><Card className="error-card"><span>{code}</span><h1>{title}</h1><p>{description}</p><Button onClick={() => navigate('/dashboard')}>Kembali ke Dashboard</Button></Card></main>; }

export function App() {
  return (
    <LanguageProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<RequireAuth><AuthenticatedLayout /></RequireAuth>}>
          <Route path="/dashboard" element={<RequirePermission permission={permissions.dashboardView}><Dashboard /></RequirePermission>} />
          <Route path="/custody" element={<RequirePermission permission={permissions.custodyView}><CustodyPage /></RequirePermission>} />
          <Route path="/customer-po" element={<RequirePermission permission={permissions.poView}><CustomerPoPage /></RequirePermission>} />
          <Route path="/delivery" element={<RequirePermission permission={permissions.deliveryView}><DeliveryPage /></RequirePermission>} />
          <Route path="/materials" element={<RequirePermission permission={permissions.materialView}><MaterialsPage /></RequirePermission>} />
          <Route path="/invoicing" element={<RequirePermission permission={permissions.invoiceView}><InvoicingPage /></RequirePermission>} />
          <Route path="/templates" element={<RequirePermission permission={permissions.invoiceView}><TemplateManagementPage /></RequirePermission>} />
          <Route path="/reports" element={<RequirePermission permission={permissions.invoiceView}><ReportsPage /></RequirePermission>} />
          <Route path="/master" element={<RequirePermission permission={permissions.dashboardView}><MasterDataPage /></RequirePermission>} />
          <Route path="/users" element={<RequirePermission permission={permissions.userManage}><UsersManagementPage /></RequirePermission>} />
          <Route path="/payments" element={<RequirePermission permission={permissions.paymentView}><PaymentPage /></RequirePermission>} />
          <Route path="/403" element={<ErrorPage code="403" title="Access Denied" description="Anda tidak memiliki izin untuk membuka halaman ini." />} />
          <Route path="*" element={<ErrorPage code="404" title="Not Found" description="Halaman yang Anda cari tidak tersedia." />} />
        </Route>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </LanguageProvider>
  );
}

export default App;
