import { getLocalDateInputValue } from './utils/date';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Bell,
  BookOpen,
  Boxes,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  FileCheck,
  FileText,
  Globe,
  LayoutDashboard,
  LogOut,
  MoreHorizontal,
  Moon,
  Package,
  Plus,
  Receipt,
  RotateCcw,
  ShieldCheck,
  Sun,
  Truck,
  Users,
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { NavLink, Navigate, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { permissions, type Permission, useAuth } from './auth';
import { LanguageProvider, useLanguage } from './i18n';
import { ReportsPage } from './components/ReportsPage';
import { MasterDataPage } from './components/MasterDataPage';
import { CustomerPoPage } from './components/CustomerPoPage';
import { DeliveryPage } from './components/DeliveryPage';
import { CustomerReturnsPage } from './components/CustomerReturnsPage';
import { MaterialsPage } from './components/MaterialsPage';
import { PaymentPage } from './components/PaymentPage';
import { InvoicingPage } from './components/InvoicingPage';
import TemplateManagementPage from './pages/TemplateManagementPage';
import UsersManagementPage from './pages/UsersManagementPage';
import { KnowledgeManagementPage } from './components/KnowledgeManagementPage';
import { DocumentationCenterPage } from './components/DocumentationCenterPage';
import { PuffyAssistant } from './features/puffy';
import './features/puffy/puffy.css';
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
  NumericInput,
  KpiCard,
  PageHeader,
  Select,
  StatusBadge,
} from './components/ui';
import { LoginIntro } from './components/LoginIntro';
import { INTRO_TIMING, clearLoginIntro, markLoginIntro, shouldPlayLoginIntro } from './loginIntro';
import './App.css';

type PageKey = 'dashboard' | 'custody' | 'customerPo' | 'materials' | 'delivery' | 'invoicing' | 'payments' | 'reports' | 'templates' | 'master' | 'users' | 'knowledge' | 'documentation';

const routePages: Record<string, PageKey> = {
  '/dashboard': 'dashboard',
  '/custody': 'custody',
  '/customer-po': 'customerPo',
  '/materials': 'materials',
  '/delivery': 'delivery',
  '/invoicing': 'invoicing',
  '/payments': 'payments',
  '/reports': 'reports',
  '/templates': 'templates',
  '/master': 'master',
  '/users': 'users',
  '/knowledge': 'knowledge',
  '/documentation': 'documentation',
};

const formatQuantity = (value: string | number, locale = 'id-ID') =>
  new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(Number(value));

function RequireAuth({ children, allowPasswordChange = false }: { children: React.ReactNode; allowPasswordChange?: boolean }) {
  const { isAuthenticated, isReady, user } = useAuth();
  const { language } = useLanguage();
  const location = useLocation();
  if (!isReady) return <main className="auth-page" aria-busy="true"><Card className="auth-card">{language === 'en' ? 'Checking session…' : 'Memeriksa sesi…'}</Card></main>;
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location }} />;
  if (user?.must_change_password && !allowPasswordChange) return <Navigate to="/change-password" replace />;
  return <>{children}</>;
}

function RequirePermission({ permission, children }: { permission: Permission; children: React.ReactNode }) {
  const { hasPermission } = useAuth();
  return hasPermission(permission) ? <>{children}</> : <Navigate to="/403" replace />;
}

function Sidebar({ mobileOpen, onClose }: { mobileOpen: boolean; onClose: () => void }) {
  const { hasPermission, user, logout } = useAuth();
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  // Logo sidebar mulai berputar setelah logo intro mendarat.
  const [logoHold] = useState(() => (shouldPlayLoginIntro() ? String(INTRO_TIMING.sidebarLogoHoldSec) : undefined));
  const [profileMenu, setProfileMenu] = useState<{ bottom: number; left: number } | null>(null);
  useEffect(() => {
    if (!profileMenu) return;
    const closeOnOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('.sidebar-profile-menu, .sidebar__profile')) return;
      setProfileMenu(null);
    };
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setProfileMenu(null); };
    document.addEventListener('mousedown', closeOnOutside, true);
    window.addEventListener('keydown', closeOnEscape);
    return () => { document.removeEventListener('mousedown', closeOnOutside, true); window.removeEventListener('keydown', closeOnEscape); };
  }, [profileMenu]);
  const signOut = () => { setProfileMenu(null); logout(); navigate('/login', { replace: true }); };
  const [tooltip, setTooltip] = useState<{ label: string; top: number; left: number } | null>(null);
  const showTooltip = (label: string, element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    setTooltip({ label, top: rect.top + rect.height / 2, left: rect.right + 12 });
  };
  const hideTooltip = () => setTooltip(null);

  const navSections = [
    {
      label: t.nav.operations,
      items: [
        { path: '/dashboard', label: t.nav.dashboard, icon: LayoutDashboard, permission: permissions.dashboardView },
        { path: '/custody', label: t.nav.custody, icon: Package, permission: permissions.custodyView },
        { path: '/customer-po', label: t.nav.customerPo, icon: FileText, permission: permissions.poView },
        { path: '/delivery', label: t.nav.delivery, icon: Truck, permission: permissions.deliveryView },
        { path: '/customer-returns', label: t.nav.customerReturns, icon: RotateCcw, permission: permissions.returnView },
      ],
    },
    {
      label: t.nav.finance,
      items: [
        { path: '/invoicing', label: t.nav.invoicing, icon: Receipt, permission: permissions.invoiceView },
        { path: '/payments', label: t.nav.payments, icon: CircleDollarSign, permission: permissions.paymentView },
        { path: '/reports', label: t.nav.reports, icon: FileCheck, permission: permissions.reportView },
        { path: '/templates', label: t.nav.templates, icon: FileText, permission: permissions.invoiceView },
      ],
    },
    {
      label: t.nav.inventory,
      items: [
        { path: '/materials', label: t.nav.materials, icon: Boxes, permission: permissions.materialView },
        { path: '/master', label: t.nav.master, icon: Package, permission: permissions.dashboardView },
        { path: '/knowledge', label: t.nav.knowledge, icon: BookOpen, permission: permissions.dashboardView },
        { path: '/documentation', label: language === 'en' ? 'ERP Documentation' : 'Panduan ERP', icon: BookOpen, permission: permissions.dashboardView },
        { path: '/users', label: t.nav.users, icon: Users, permission: permissions.userManage },
      ],
    },
  ];

  const isCollapsed = collapsed;
  return (
    <aside id="main-sidebar-navigation" className={`sidebar${isCollapsed ? ' sidebar--collapsed' : ''}${mobileOpen ? ' sidebar--mobile-open' : ''}`} aria-label={language === 'en' ? 'Main navigation' : 'Navigasi utama'} onMouseDown={(event) => event.stopPropagation()}>
      <div className="sidebar__brand">
        <div data-sentanu-logo data-loop="true" data-hold={logoHold} style={{ width: '36px', height: '36px', flexShrink: 0 }} />
        <div className="sidebar__brand-copy"><strong>SENTANU JAYA</strong><span>ERP WORKSHOP</span></div>
      </div>
      <div className="sidebar__toggle-row">
        <button type="button" className="icon-button sidebar__collapse" onClick={() => { hideTooltip(); setCollapsed((value) => !value); }} aria-label={collapsed ? (language === 'en' ? 'Expand sidebar' : 'Perlebar sidebar') : (language === 'en' ? 'Collapse sidebar' : 'Ciutkan sidebar')} aria-controls="main-sidebar-navigation" aria-expanded={!collapsed} title={collapsed ? (language === 'en' ? 'Expand sidebar' : 'Perlebar sidebar') : (language === 'en' ? 'Collapse sidebar' : 'Ciutkan sidebar')}>{collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}</button>
      </div>
      <nav className="sidebar__nav" aria-label={language === 'en' ? 'Main navigation' : 'Navigasi utama'} onScroll={hideTooltip}>
        {navSections.map((section) => {
          const visibleItems = section.items.filter((item) => hasPermission(item.permission));
          if (!visibleItems.length) return null;
          return <div className="sidebar__section" key={section.label}><p className="nav-section-label">{section.label}</p>{visibleItems.map((item) => {
            const Icon = item.icon;
            return <NavLink key={item.path} to={item.path} onClick={() => { hideTooltip(); onClose(); }} data-tooltip={item.label} title={isCollapsed && tooltip?.label !== item.label ? item.label : undefined} aria-label={isCollapsed ? item.label : undefined} onMouseEnter={isCollapsed ? (event) => showTooltip(item.label, event.currentTarget) : undefined} onFocus={isCollapsed ? (event) => showTooltip(item.label, event.currentTarget) : undefined} onMouseLeave={hideTooltip} onBlur={hideTooltip} className={({ isActive }) => `nav-item${isActive ? ' nav-item--active' : ''}`}><Icon size={18} aria-hidden="true" /><span>{item.label}</span></NavLink>;
          })}</div>;
        })}
      </nav>
      <div className="sidebar__foot"><ShieldCheck size={18} /><div className="sidebar__foot-copy"><strong>{t.nav.isolatedCustody}</strong><span>{t.nav.offBalanceSheet}</span></div></div>
      <div className="sidebar__profile-wrap">
        <button type="button" className="sidebar__profile" aria-label="Menu pengguna" aria-haspopup="menu" aria-expanded={profileMenu !== null} onClick={(event) => { hideTooltip(); const rect = event.currentTarget.getBoundingClientRect(); setProfileMenu((current) => (current ? null : { bottom: window.innerHeight - rect.top + 8, left: rect.left })); }}>
          <span className="sidebar__avatar" aria-hidden="true">{user?.name.slice(0, 2).toUpperCase()}</span>
          <span className="sidebar__profile-copy"><strong>{user?.name}</strong><span>{user?.role === 'ADMIN' ? 'Administrator' : user?.role}</span></span>
        </button>
      </div>
      {profileMenu ? createPortal(<div className="sidebar-profile-menu" role="menu" aria-label="Menu pengguna" style={{ bottom: profileMenu.bottom, left: profileMenu.left }}><div className="sidebar-profile-menu__header"><strong>{user?.name}</strong><span>{user?.email || 'owner@sentanujaya.id'}</span></div><button type="button" role="menuitem" className="sidebar-profile-menu__item" onClick={signOut}><LogOut size={15} aria-hidden="true" />{t.nav.logout}</button></div>, document.body) : null}
      {isCollapsed && tooltip ? createPortal(<div className="sidebar-tooltip" role="presentation" style={{ top: tooltip.top, left: tooltip.left }}>{tooltip.label}</div>, document.body) : null}
    </aside>
  );
}


function MobileBottomBar() {
  const { hasPermission, user, logout } = useAuth();
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const en = language === 'en';

  const candidates = [
    { path: '/custody', label: t.nav.custody, icon: Package, permission: permissions.custodyView },
    { path: '/customer-po', label: t.nav.customerPo, icon: FileText, permission: permissions.poView },
    { path: '/delivery', label: t.nav.delivery, icon: Truck, permission: permissions.deliveryView },
    { path: '/invoicing', label: t.nav.invoicing, icon: Receipt, permission: permissions.invoiceView },
    { path: '/payments', label: t.nav.payments, icon: CircleDollarSign, permission: permissions.paymentView },
    { path: '/reports', label: t.nav.reports, icon: FileCheck, permission: permissions.reportView },
    { path: '/materials', label: t.nav.materials, icon: Boxes, permission: permissions.materialView },
    { path: '/master', label: t.nav.master, icon: Package, permission: permissions.dashboardView },
    { path: '/templates', label: t.nav.templates, icon: FileText, permission: permissions.invoiceView },
    { path: '/knowledge', label: t.nav.knowledge, icon: BookOpen, permission: permissions.dashboardView },
    { path: '/documentation', label: en ? 'ERP Documentation' : 'Panduan ERP', icon: BookOpen, permission: permissions.dashboardView },
    { path: '/users', label: t.nav.users, icon: Users, permission: permissions.userManage },
  ];
  const available = candidates.filter((item) => hasPermission(item.permission));
  const primaryPaths = ['/custody', '/customer-po', '/delivery'];
  const primary = primaryPaths.map((path) => available.find((item) => item.path === path) ?? null);
  const extraItems = available.filter((item) => !primaryPaths.includes(item.path));
  const isDashboardActive = location.pathname === '/dashboard';
  const moreActive = moreOpen || extraItems.some((item) => location.pathname === item.path) || ['/customer-returns'].includes(location.pathname);

  const closeMore = () => setMoreOpen(false);
  const signOut = () => { closeMore(); logout(); navigate('/login', { replace: true }); };

  return (
    <>
      {moreOpen && <button type="button" className="mobile-more-backdrop" aria-label={en ? 'Close more menu' : 'Tutup menu lainnya'} onClick={closeMore} />}
      {moreOpen && (
        <section className="mobile-more-panel" aria-label={en ? 'More navigation' : 'Navigasi lainnya'}>
          <div className="mobile-more-panel__header">
            <span className="sidebar__avatar" aria-hidden="true">{user?.name.slice(0, 2).toUpperCase()}</span>
            <div><strong>{user?.name}</strong><span>{user?.role === 'ADMIN' ? 'Administrator' : user?.role}</span></div>
          </div>
          <nav className="mobile-more-panel__links" aria-label={en ? 'Other pages' : 'Halaman lainnya'}>
            {extraItems.map((item) => {
              const Icon = item.icon;
              return <NavLink key={item.path} to={item.path} onClick={closeMore} className={({ isActive }) => `mobile-more-panel__link${isActive ? ' mobile-more-panel__link--active' : ''}`}><Icon size={17} aria-hidden="true" /><span>{item.label}</span></NavLink>;
            })}
            {hasPermission(permissions.returnView) && <NavLink to="/customer-returns" onClick={closeMore} className={({ isActive }) => `mobile-more-panel__link${isActive ? ' mobile-more-panel__link--active' : ''}`}><RotateCcw size={17} aria-hidden="true" /><span>{t.nav.customerReturns}</span></NavLink>}
          </nav>
          <button type="button" className="mobile-more-panel__logout" onClick={signOut}><LogOut size={16} aria-hidden="true" />{t.nav.logout}</button>
        </section>
      )}
      <nav className="mobile-bottom-bar" aria-label={en ? 'Primary navigation' : 'Navigasi utama'}>
        <div className="mobile-bottom-bar__slot">
          {primary[0] && (() => { const Icon = primary[0].icon; return <NavLink to={primary[0].path} aria-label={primary[0].label} title={primary[0].label} className={({ isActive }) => `mobile-bottom-bar__item${isActive ? ' mobile-bottom-bar__item--active' : ''}`}><Icon size={20} /><span>{primary[0].label}</span></NavLink>; })()}
        </div>
        <div className="mobile-bottom-bar__slot">
          {primary[1] && (() => { const Icon = primary[1].icon; return <NavLink to={primary[1].path} aria-label={primary[1].label} title={primary[1].label} className={({ isActive }) => `mobile-bottom-bar__item${isActive ? ' mobile-bottom-bar__item--active' : ''}`}><Icon size={20} /><span>{primary[1].label}</span></NavLink>; })()}
        </div>
        <div className="mobile-bottom-bar__slot mobile-bottom-bar__slot--dashboard">
          <NavLink to="/dashboard" aria-label={t.nav.dashboard} title={t.nav.dashboard} aria-current={isDashboardActive ? 'page' : undefined} className={({ isActive }) => `mobile-bottom-bar__dashboard${isActive ? ' mobile-bottom-bar__dashboard--active' : ''}`}><LayoutDashboard size={22} /><span>{t.nav.dashboard}</span></NavLink>
        </div>
        <div className="mobile-bottom-bar__slot">
          {primary[2] && (() => { const Icon = primary[2].icon; return <NavLink to={primary[2].path} aria-label={primary[2].label} title={primary[2].label} className={({ isActive }) => `mobile-bottom-bar__item${isActive ? ' mobile-bottom-bar__item--active' : ''}`}><Icon size={20} /><span>{primary[2].label}</span></NavLink>; })()}
        </div>
        <div className="mobile-bottom-bar__slot">
          <button type="button" className={`mobile-bottom-bar__item${moreActive ? ' mobile-bottom-bar__item--active' : ''}`} aria-label={en ? 'More' : 'Lainnya'} aria-expanded={moreOpen} onClick={() => setMoreOpen((value) => !value)}><MoreHorizontal size={21} /><span>{en ? 'More' : 'Lainnya'}</span></button>
        </div>
      </nav>
    </>
  );
}

function ThemeSwitcher() {
  const { language } = useLanguage();
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
      title={theme === 'light' ? (language === 'en' ? 'Switch to dark theme' : 'Ganti ke Tema Gelap') : (language === 'en' ? 'Switch to light theme' : 'Ganti ke Tema Terang')}
      aria-label={language === 'en' ? 'Switch theme' : 'Ganti Tema'}
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
  const [intro, setIntro] = useState<'off' | 'wait' | 'wave'>(() => (shouldPlayLoginIntro() ? 'wait' : 'off'));
  useEffect(() => { clearLoginIntro(); }, []);
  const location = useLocation();
  const { t, language } = useLanguage();
  const en = language === 'en';
  const pageKey = routePages[location.pathname] ?? 'dashboard';
  const pageTitle = t.pages[`${pageKey}Title` as keyof typeof t.pages] || 'Dashboard';

  const breadcrumbMap: Record<string, string[]> = {
    '/dashboard': ['Workspace', 'Dashboard'],
    '/custody': ['Workspace', en ? 'Operations' : 'Operasional', en ? 'Customer Goods Custody' : 'Penitipan Barang Customer'],
    '/customer-po': ['Workspace', en ? 'Operations' : 'Operasional', 'Customer PO'],
    '/delivery': ['Workspace', en ? 'Operations' : 'Operasional', en ? 'Delivery Orders' : 'Surat Jalan'],
    '/customer-returns': ['Workspace', en ? 'Operations' : 'Operasional', en ? 'Customer Returns' : 'Retur Customer'],
    '/invoicing': ['Workspace', 'Finance & Billing', 'Invoice'],
    '/payments': ['Workspace', 'Finance & Billing', en ? 'Payments' : 'Pembayaran'],
    '/reports': ['Workspace', 'Finance & Billing', en ? 'Reports' : 'Laporan'],
    '/templates': ['Workspace', 'Finance & Billing', en ? 'Document Templates' : 'Template Dokumen'],
    '/materials': ['Workspace', en ? 'Inventory' : 'Inventaris', en ? 'Materials' : 'Material'],
    '/master': ['Workspace', en ? 'Inventory' : 'Inventaris', 'Master Data'],
    '/knowledge': ['Workspace', 'Nanu Knowledge'],
    '/documentation': ['Workspace', en ? 'Help & Documentation' : 'Bantuan & Dokumentasi'],
    '/users': ['Workspace', en ? 'Inventory' : 'Inventaris', en ? 'User Management' : 'Manajemen Pengguna'],
  };
  const breadcrumbItems = breadcrumbMap[location.pathname] || ['Workspace', pageTitle];

  return (
    <>
    <div className={`app-shell${intro !== 'off' ? ' app-shell--intro' : ''}${intro === 'wait' ? ' app-shell--intro-wait' : ''}`} inert={intro !== 'off' ? true : undefined}>
      <Sidebar mobileOpen={false} onClose={() => undefined} />
      <div className="app-shell__main">
        <header className="app-header">
          <div className="app-header__context">
            <div><span className="app-header__eyebrow">SENTANU JAYA ERP</span><strong>{pageTitle}</strong></div>
          </div>
          <div className="app-header__account">
            <ThemeSwitcher />
            <span className="header-divider" />
            <LanguageSwitcher />
            <span className="header-divider" />
            <button className="icon-button" aria-label={language === 'en' ? 'Notifications' : 'Notifikasi'} disabled title={language === 'en' ? 'Notifications are not available yet' : 'Fitur notifikasi belum tersedia'}><Bell size={19} /></button>

          </div>
        </header>
        <main className="app-content"><Breadcrumb items={breadcrumbItems} /><Outlet /></main>
      </div>
      <PuffyAssistant />
      <MobileBottomBar />
    </div>
    {intro !== 'off' && <LoginIntro onWave={() => setIntro((value) => (value === 'wait' ? 'wave' : value))} onDone={() => setIntro('off')} />}
    </>
  );
}

function Dashboard() {
  const { user, hasPermission } = useAuth();
  const { language } = useLanguage();
  const en = language === 'en';
  const tr = (id: string, english: string) => en ? english : id;
  const currency = new Intl.NumberFormat(en ? 'en-US' : 'id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });
  const numberLocale = en ? 'en-US' : 'id-ID';
  const navigate = useNavigate();
  const greeting = en
    ? `Here is today’s Sentanu Jaya operational overview${user?.name ? `, ${user.name}` : ''}.`
    : `Selamat pagi${user?.name ? `, ${user.name}` : ''}. Ini ringkasan operasional Sentanu Jaya hari ini.`;
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
      {hasPermission(permissions.custodyView) && <Button onClick={() => navigate('/custody')}><Plus size={16} /> {tr('Terima Barang', 'Receive Goods')}</Button>}
      {hasPermission(permissions.invoiceView) && <Button variant="secondary" onClick={() => navigate('/invoicing')}><Receipt size={16} /> {tr('Buat Invoice', 'Create Invoice')}</Button>}
      <Button variant="ghost" onClick={() => void loadSummary()} loading={loading}>{tr('Muat ulang', 'Refresh')}</Button>
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
    <section className="kpi-grid" aria-label={tr('Ringkasan operasional', 'Operational summary')}>
      <KpiCard label={tr('Barang Custody Aktif', 'Active Custody Goods')} value={<>{custodyCount}<small> pcs</small></>} detail={tr('Barang customer di workshop', 'Customer goods in the workshop')} icon={<Package size={18} />} />
      <KpiCard label={tr('PO Aktif', 'Open POs')} value={<>{op.active_customer_pos ?? 0}<small> PO</small></>} detail="Customer Purchase Order" icon={<Boxes size={18} />} tone="info" />
      <KpiCard label={tr('Siap ditagihkan', 'Ready to Invoice')} value={<>{uninvoicedCount}<small> SJ</small></>} detail={tr('SJ belum diinvoice', 'Delivery Orders not yet invoiced')} icon={<FileCheck size={18} />} tone="info" />
      <KpiCard label={tr('Tagihan berjalan (AR)', 'Accounts Receivable')} value={currency.format(arOutstanding)} detail={tr('Nilai outstanding invoice POSTED', 'Outstanding balance of posted invoices')} icon={<CircleDollarSign size={18} />} tone="success" />
    </section>
    <div className="dashboard-grid">
      <Card title={tr('Ringkasan Produksi', 'Production Overview')} action={<span className="card__meta">{totalUnits} {tr('unit aktif', 'active units')}</span>}>{totalUnits === 0 ? <p className="chart-note">{tr('Belum ada data produksi.', 'No production data yet.')}</p> : <><div className="production-summary"><p>{tr('Work order per tahap produksi', 'Work orders by production stage')}</p><strong>{totalUnits} <span>{tr('unit', 'units')}</span></strong></div><div className="production-bar" aria-label={tr('Distribusi unit aktif berdasarkan tahap produksi', 'Active units by production stage')}>{productionStages.map(([label, value, tone]) => <div key={label} className={`production-bar__segment production-bar__segment--${tone}`} style={{ width: `${Math.max(5, Number(value) / 1.2)}%` }} title={`${label}: ${value} ${tr('unit', 'units')}`}><span>{label}</span></div>)}</div><div className="production-legend">{productionStages.map(([label, value, tone]) => <span key={label}><i className={`status-dot status-dot--${tone}`} />{label} <strong>{value}</strong></span>)}</div></>}</Card>
      <Card title={tr('Ringkasan Keuangan', 'Financial Summary')} action={<Button variant="ghost" onClick={() => navigate('/invoicing')}>{tr('Lihat invoice', 'View invoices')}</Button>}><div className="alert-item"><div><strong>{tr('Total Invoice Periode Ini', 'Total Invoices This Period')}</strong><span>Rp {Number(fin.total_invoice_period ?? 0).toLocaleString(numberLocale)}</span></div><div><strong>{tr('Total Pembayaran (POSTED)', 'Total Posted Payments')}</strong><span>Rp {Number(fin.total_payment_posted ?? 0).toLocaleString(numberLocale)}</span></div></div></Card>
      <Card title={tr('Tren Pendapatan & Keuangan', 'Revenue & Financial Trend')} className="dashboard-grid__wide" action={<span className="card__meta">{trendData.length ? tr('Data aktual', 'Live data') : tr('Belum ada data', 'No data')}</span>}>{trendData.length === 0 ? <p className="chart-note">{tr('Belum ada data transaksi untuk ditampilkan.', 'No transaction data to display.')}</p> : <div className="chart-container"><ResponsiveContainer width="100%" height={220}><BarChart data={trendData} barGap={2}><CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" /><XAxis dataKey="period" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} /><YAxis tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} tickFormatter={(v: number) => `${(v / 1000000).toFixed(0)}${en ? 'M' : 'jt'}`} /><Tooltip formatter={(v) => `Rp ${Number(v).toLocaleString(numberLocale)}`} /><Legend wrapperStyle={{ fontSize: 12 }} /><Bar dataKey="revenue" name={tr('Pendapatan', 'Revenue')} fill="var(--color-info)" radius={[3, 3, 0, 0]} /><Bar dataKey="payments" name={tr('Pembayaran', 'Payments')} fill="var(--color-warning)" radius={[3, 3, 0, 0]} /><Bar dataKey="net" name={tr('Neto', 'Net')} fill="var(--color-success)" radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer></div>}</Card>
      <Card title={tr('Aktivitas terbaru', 'Recent Activity')} className="dashboard-grid__wide" action={<Button variant="ghost" onClick={() => void loadSummary()}>{tr('Muat ulang', 'Refresh')}</Button>}>{recentActivity.length === 0 ? <p className="chart-note">{tr('Belum ada aktivitas transaksi.', 'No recent transaction activity.')}</p> : <ul className="activity-list">{recentActivity.map((act, i) => <li key={i}><time>{new Date(act.timestamp).toLocaleDateString(en ? 'en-US' : 'id-ID')}</time><span className="activity-list__icon"><CheckCircle2 size={16} /></span><div><strong>{act.description}</strong><span>{act.type}</span></div><StatusBadge status={act.status} /></li>)}</ul>}</Card>
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
  const { t, language } = useLanguage();
  const en = language === 'en';
  const tr = (id: string, english: string) => en ? english : id;
  const [receipts, setReceipts] = useState<GoodsReceipt[]>([]);
  const [balances, setBalances] = useState<CustodyBalance[]>([]);
  const [ledger, setLedger] = useState<CustodyLedger[]>([]);
  const [master, setMaster] = useState<CustodyMaster>(emptyMaster);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [draft, setDraft] = useState({ company_id: '', branch_id: '', customer_id: '', received_date: getLocalDateInputValue(), delivered_by_name: '', vehicle_plate: '', notes: '', customer_item_id: '', quantity_received: '1', condition: 'GOOD' as Condition, custody_location_id: '', color_code: '', damage_description: '' });

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
    if (!draft.company_id || !draft.branch_id || !draft.customer_id || !draft.customer_item_id || !draft.custody_location_id) { setError(tr('Lengkapi perusahaan, cabang, customer, barang, dan lokasi.', 'Complete the company, branch, customer, item, and location fields.')); return; }
    if (!Number.isFinite(Number(draft.quantity_received)) || Number(draft.quantity_received) <= 0) { setError(tr('Jumlah harus lebih besar dari 0.', 'Quantity must be greater than 0.')); return; }
    setSaving(true); setError('');
    const payload: DraftPayload = { company_id: draft.company_id, branch_id: draft.branch_id, customer_id: draft.customer_id, received_date: draft.received_date, delivered_by_name: draft.delivered_by_name || undefined, vehicle_plate: draft.vehicle_plate || undefined, notes: draft.notes || undefined, lines: [{ customer_item_id: draft.customer_item_id, quantity_received: Number(draft.quantity_received), condition: draft.condition, custody_location_id: draft.custody_location_id, color_code: draft.color_code || undefined, damage_description: draft.damage_description || undefined }] };
    try { await goodsReceiptApi.create(payload); setEditorOpen(false); setNotice(tr('STB draft dibuat.', 'Goods receipt draft created.')); await load(); } catch (reason) { setError(apiError(reason)); } finally { setSaving(false); }
  };
  const advance = async (receipt: GoodsReceipt, action: 'submit' | 'post' | 'cancel') => {
    setSaving(true); setError('');
    try { await goodsReceiptApi[action](receipt.id); setNotice(action === 'post' ? tr('STB diposting. Custody ledger dan saldo diperbarui.', 'Goods receipt posted. Custody ledger and balances updated.') : action === 'submit' ? tr('STB dikirim untuk posting.', 'Goods receipt submitted for posting.') : tr('STB draft dibatalkan.', 'Goods receipt draft cancelled.')); await load(); } catch (reason) { setError(apiError(reason)); } finally { setSaving(false); }
  };
  const customerItems = master.items.filter((item) => item.customer_id === draft.customer_id);
  const branchLocations = master.locations.filter((item) => item.branch_id === draft.branch_id);
  const canPost = user?.role === 'ADMIN' || user?.role === 'OWNER';
  const localizedColumns = (columns: any[]) => columns.map((column) => ({
    ...column,
    header: en ? ({
      'No. STB': 'Goods Receipt No.',
      'Diterima': 'Received',
      'Barang': 'Items',
      'Lokasi': 'Location',
      'Tahap': 'Stage',
      'Saldo fisik': 'Physical Balance',
      'Tanggal': 'Date',
      'Mutasi': 'Movement',
      'Masuk': 'In',
      'Keluar': 'Out',
    } as Record<string, string>)[column.header] ?? column.header : column.header,
    cell: en && column.id === 'lines'
      ? (item: GoodsReceipt) => `${item.lines.length} lines`
      : en && column.id === 'location'
        ? (item: CustodyBalance | CustodyLedger) => item.custody_location?.name ?? 'Not specified'
        : en && column.id === 'quantity'
          ? (item: CustodyBalance) => `${formatQuantity(item.balance_quantity, 'en-US')} pcs`
          : en && column.id === 'in'
            ? (item: CustodyLedger) => `${formatQuantity(item.quantity_in, 'en-US')} pcs`
            : en && column.id === 'out'
              ? (item: CustodyLedger) => `${formatQuantity(item.quantity_out, 'en-US')} pcs`
              : column.cell,
  }));
  const receiptTableColumns = localizedColumns(receiptColumns);
  const balanceTableColumns = localizedColumns(balanceColumns);
  const ledgerTableColumns = localizedColumns(ledgerColumns);

  return <>
    <PageHeader title={t.pages.custodyTitle} description={t.pages.custodyDesc} action={<Button onClick={openNew} disabled={loading || !master.companies.length}><Plus size={16} /> {tr('STB baru', 'New Goods Receipt')}</Button>} />
    {error && <Alert tone="danger">{error}</Alert>}{notice && <Alert tone="success">{notice}</Alert>}
    <div className="dashboard-grid"><Card title={tr('Surat Terima Barang', 'Goods Receipt')} className="dashboard-grid__wide" action={<Button variant="ghost" onClick={() => void load()} loading={loading}>{tr('Muat ulang', 'Refresh')}</Button>}><DataTable columns={receiptTableColumns} rows={receipts} searchText={(item) => `${item.stb_number} ${item.customer?.name ?? ''} ${item.status}`} emptyTitle={tr('Belum ada STB', 'No goods receipts yet')} emptyDescription={tr('Buat draft STB saat barang customer diterima secara fisik.', 'Create a goods receipt draft when customer-owned items are physically received.')} />{receipts.filter((item) => item.status === 'DRAFT' || item.status === 'SUBMITTED').map((item) => <div className="alert-item" key={item.id}><div><strong>{item.stb_number}</strong><span>{item.customer?.name} · {item.status}</span></div><div className="page-header__actions">{item.status === 'DRAFT' && <><Button variant="secondary" onClick={() => void advance(item, 'cancel')} disabled={saving}>{tr('Batalkan', 'Cancel')}</Button>{canPost && <Button onClick={() => void advance(item, 'submit')} disabled={saving}>Submit</Button>}</>}{item.status === 'SUBMITTED' && canPost && <Button variant="success" onClick={() => void advance(item, 'post')} disabled={saving}>Post</Button>}</div></div>)}</Card>
      <Card title={tr('Saldo custody', 'Custody Balances')} className="dashboard-grid__wide"><DataTable columns={balanceTableColumns} rows={balances} searchText={(item) => `${item.customer?.name ?? ''} ${item.customer_item?.name ?? ''} ${item.custody_location?.name ?? ''}`} emptyTitle={tr('Belum ada saldo custody', 'No custody balances yet')} emptyDescription={tr('Saldo muncul setelah STB berstatus POSTED. Barang customer tidak masuk stock material.', 'Balances appear after a goods receipt is POSTED. Customer-owned goods are not included in material stock.')} /></Card>
      <Card title={tr('Custody Ledger', 'Custody Ledger')} className="dashboard-grid__wide"><DataTable columns={ledgerTableColumns} rows={ledger} searchText={(item) => `${item.movement_type} ${item.customer?.name ?? ''} ${item.customer_item?.name ?? ''} ${item.custody_location?.name ?? ''}`} emptyTitle={tr('Belum ada mutasi custody', 'No custody movements yet')} emptyDescription={tr('Mutasi IN FROM CUSTOMER muncul saat STB berstatus POSTED.', 'IN FROM CUSTOMER movements appear when a goods receipt is POSTED.')} /></Card></div>
    {editorOpen && <div className="modal-backdrop" role="presentation"><section className="modal" role="dialog" aria-modal="true" aria-labelledby="stb-editor-title"><div className="modal__header"><h2 id="stb-editor-title">{tr('Draft Surat Terima Barang', 'Goods Receipt Draft')}</h2><Button variant="ghost" onClick={() => setEditorOpen(false)}>{tr('Tutup', 'Close')}</Button></div><div className="confirmation-dialog__body"><div className="invoice-layout__form"><div className="dashboard-grid"><FormField label={tr('Perusahaan', 'Company')} htmlFor="stb-company" required><Select id="stb-company" value={draft.company_id} onChange={(event) => { const companyId = event.target.value; const branch = master.branches.find((item) => item.company_id === companyId); setDraft((value) => ({ ...value, company_id: companyId, branch_id: branch?.id ?? '', custody_location_id: master.locations.find((item) => item.branch_id === branch?.id)?.id ?? '' })); }}><option value="">{tr('Pilih perusahaan', 'Select company')}</option>{master.companies.map((item) => <option key={item.id} value={item.id}>{item.code} — {item.name}</option>)}</Select></FormField><FormField label={tr('Cabang', 'Branch')} htmlFor="stb-branch" required><Select id="stb-branch" value={draft.branch_id} onChange={(event) => { const branchId = event.target.value; setDraft((value) => ({ ...value, branch_id: branchId, custody_location_id: master.locations.find((item) => item.branch_id === branchId)?.id ?? '' })); }}><option value="">{tr('Pilih cabang', 'Select branch')}</option>{master.branches.filter((item) => item.company_id === draft.company_id).map((item) => <option key={item.id} value={item.id}>{item.code} — {item.name}</option>)}</Select></FormField></div><FormField label="Customer" htmlFor="stb-customer" required><Select id="stb-customer" value={draft.customer_id} onChange={(event) => setDraft((value) => ({ ...value, customer_id: event.target.value, customer_item_id: '' }))}><option value="">{tr('Pilih customer', 'Select customer')}</option>{master.customers.map((item) => <option key={item.id} value={item.id}>{item.code} — {item.name}</option>)}</Select></FormField><div className="dashboard-grid"><FormField label={tr('Tanggal terima', 'Received Date')} htmlFor="stb-date" required><Input id="stb-date" type="date" value={draft.received_date} onChange={(event) => setDraft((value) => ({ ...value, received_date: event.target.value }))} /></FormField><FormField label={tr('Diterima dari', 'Received From')} htmlFor="stb-delivered-by"><Input id="stb-delivered-by" value={draft.delivered_by_name} onChange={(event) => setDraft((value) => ({ ...value, delivered_by_name: event.target.value }))} /></FormField></div><div className="dashboard-grid"><FormField label={tr('Barang customer', 'Customer Item')} htmlFor="stb-item" required><Select id="stb-item" value={draft.customer_item_id} onChange={(event) => setDraft((value) => ({ ...value, customer_item_id: event.target.value }))}><option value="">{tr('Pilih barang', 'Select item')}</option>{customerItems.map((item) => <option key={item.id} value={item.id}>{item.code} — {item.name}</option>)}</Select></FormField><FormField label={tr('Lokasi custody', 'Custody Location')} htmlFor="stb-location" required><Select id="stb-location" value={draft.custody_location_id} onChange={(event) => setDraft((value) => ({ ...value, custody_location_id: event.target.value }))}><option value="">{tr('Pilih lokasi', 'Select location')}</option>{branchLocations.map((item) => <option key={item.id} value={item.id}>{item.code} — {item.name}</option>)}</Select></FormField><FormField label={tr('Jumlah', 'Quantity')} htmlFor="stb-quantity" required><NumericInput id="stb-quantity" min={0.001} maximumFractionDigits={3} value={draft.quantity_received} onValueChange={(raw) => setDraft((value) => ({ ...value, quantity_received: raw }))} /></FormField><FormField label={tr('Kondisi', 'Condition')} htmlFor="stb-condition"><Select id="stb-condition" value={draft.condition} onChange={(event) => setDraft((value) => ({ ...value, condition: event.target.value as Condition }))}>{(['GOOD', 'DENT', 'CRACK', 'OLD_PAINT', 'OTHER'] as Condition[]).map((condition) => <option key={condition} value={condition}>{condition}</option>)}</Select></FormField></div><FormField label={tr('Catatan', 'Notes')} htmlFor="stb-notes"><textarea id="stb-notes" className="input textarea" value={draft.notes} onChange={(event) => setDraft((value) => ({ ...value, notes: event.target.value }))} /></FormField></div><div className="confirmation-dialog__actions"><Button variant="secondary" onClick={() => setEditorOpen(false)}>{tr('Batal', 'Cancel')}</Button><Button onClick={() => void saveDraft()} loading={saving}>{tr('Simpan draft', 'Save Draft')}</Button></div></div></section></div>}
  </>;
}




function LoginPage() {
  const { isAuthenticated, login, user, getCurrentUser } = useAuth();
  const { language } = useLanguage();
  const en = language === 'en';
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const destination = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? '/dashboard';
  if (isAuthenticated) return <Navigate to={user?.must_change_password ? '/change-password' : '/dashboard'} replace />;
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setError(''); setLoading(true);
    try { markLoginIntro(); await login(email, password); navigate(getCurrentUser()?.must_change_password ? '/change-password' : destination, { replace: true }); } catch (reason) { clearLoginIntro(); setError(reason instanceof Error ? reason.message : (en ? 'Login failed.' : 'Login gagal.')); } finally { setLoading(false); }
  };
  return <main className="auth-page"><Card className="auth-card"><div className="auth-brand"><div data-sentanu-logo data-loop="true" style={{ width: '36px', height: '36px', flexShrink: 0 }} /><div><strong>SENTANU JAYA</strong><span>ERP WORKSHOP</span></div></div><div className="auth-copy"><h1>{en ? 'Sign in to Sentanu Jaya ERP' : 'Masuk ke Sentanu Jaya ERP'}</h1><p>{en ? 'Use your registered account to access the development environment.' : 'Gunakan akun yang terdaftar untuk mengakses lingkungan pengembangan.'}</p></div>{error && <Alert tone="danger">{error}</Alert>}<form className="auth-form" onSubmit={submit}><FormField label="Email" htmlFor="login-email" required><Input id="login-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></FormField><FormField label="Password" htmlFor="login-password" required><Input id="login-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></FormField><Button type="submit" loading={loading}>Login</Button></form><p className="auth-note">{en ? 'Password recovery is not available yet.' : 'Forgot password belum tersedia.'}</p></Card></main>;
}


function PasswordChangePage() {
  const { user, changePassword, logout } = useAuth();
  const { language } = useLanguage();
  const en = language === 'en';
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setError('');
    if (password !== confirmation) { setError(en ? 'Password confirmation does not match.' : 'Konfirmasi password tidak sama.'); return; }
    setLoading(true);
    try { await changePassword(currentPassword, password, confirmation); navigate('/dashboard', { replace: true }); }
    catch (reason) { setError(reason instanceof Error ? reason.message : (en ? 'Failed to update password.' : 'Gagal memperbarui password.')); }
    finally { setLoading(false); }
  };
  return <main className="auth-page"><Card className="auth-card">
    <div className="auth-brand"><div data-sentanu-logo style={{ width: '36px', height: '36px', flexShrink: 0 }} /><div><strong>SENTANU JAYA</strong><span>{en ? 'ACCOUNT SECURITY' : 'KEAMANAN AKUN'}</span></div></div>
    <div className="auth-copy"><h1>{en ? 'Change Password' : 'Ganti Password'}</h1><p>{en ? `Hello ${user?.name}, you must change your temporary password before using the application. Use at least 12 characters.` : `Halo ${user?.name}, password sementara harus diganti sebelum Anda dapat menggunakan aplikasi. Gunakan minimal 12 karakter.`}</p></div>
    {error && <Alert tone="danger">{error}</Alert>}
    <form className="auth-form" onSubmit={submit}>
      <FormField label={en ? 'Current temporary password' : 'Password sementara saat ini'} htmlFor="current-password" required><Input id="current-password" type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required /></FormField>
      <FormField label={en ? 'New password' : 'Password baru'} htmlFor="new-password" required><Input id="new-password" type="password" autoComplete="new-password" minLength={12} value={password} onChange={(event) => setPassword(event.target.value)} required /></FormField>
      <FormField label={en ? 'Confirm new password' : 'Konfirmasi password baru'} htmlFor="confirm-password" required><Input id="confirm-password" type="password" autoComplete="new-password" minLength={12} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required /></FormField>
      <Button type="submit" loading={loading}>{en ? 'Save New Password' : 'Simpan Password Baru'}</Button>
      <Button type="button" variant="ghost" onClick={() => void logout().then(() => navigate('/login', { replace: true }))}>{en ? 'Log out' : 'Keluar'}</Button>
    </form>
  </Card></main>;
}

function ErrorPage({ code, title, description }: { code: '403' | '404'; title: string; description: string }) { const navigate = useNavigate(); const { language } = useLanguage(); const en = language === 'en'; const translatedTitle = en ? (code === '403' ? 'Access denied' : 'Page not found') : title; const translatedDescription = en ? (code === '403' ? 'You do not have permission to access this page.' : 'The page you are looking for does not exist.') : description; return <main className="error-page"><Card className="error-card"><span>{code}</span><h1>{translatedTitle}</h1><p>{translatedDescription}</p><Button onClick={() => navigate('/dashboard')}>{en ? 'Back to Dashboard' : 'Kembali ke Dashboard'}</Button></Card></main>; }

export function App() {
  return (
    <LanguageProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/change-password" element={<RequireAuth allowPasswordChange><PasswordChangePage /></RequireAuth>} />
        <Route element={<RequireAuth><AuthenticatedLayout /></RequireAuth>}>
          <Route path="/dashboard" element={<RequirePermission permission={permissions.dashboardView}><Dashboard /></RequirePermission>} />
          <Route path="/custody" element={<RequirePermission permission={permissions.custodyView}><CustodyPage /></RequirePermission>} />
          <Route path="/customer-po" element={<RequirePermission permission={permissions.poView}><CustomerPoPage /></RequirePermission>} />
          <Route path="/delivery" element={<RequirePermission permission={permissions.deliveryView}><DeliveryPage /></RequirePermission>} />
          <Route path="/customer-returns" element={<RequirePermission permission={permissions.returnView}><CustomerReturnsPage /></RequirePermission>} />
          <Route path="/materials" element={<RequirePermission permission={permissions.materialView}><MaterialsPage /></RequirePermission>} />
          <Route path="/invoicing" element={<RequirePermission permission={permissions.invoiceView}><InvoicingPage /></RequirePermission>} />
          <Route path="/templates" element={<RequirePermission permission={permissions.invoiceView}><TemplateManagementPage /></RequirePermission>} />
          <Route path="/reports" element={<RequirePermission permission={permissions.reportView}><ReportsPage /></RequirePermission>} />
          <Route path="/master" element={<RequirePermission permission={permissions.dashboardView}><MasterDataPage /></RequirePermission>} />
          <Route path="/knowledge" element={<RequirePermission permission={permissions.dashboardView}><KnowledgeManagementPage /></RequirePermission>} />
          <Route path="/documentation" element={<RequirePermission permission={permissions.dashboardView}><DocumentationCenterPage /></RequirePermission>} />
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
