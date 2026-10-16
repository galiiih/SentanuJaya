import { type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes, useEffect, useId, useMemo, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, ChevronDown, ChevronUp, Search, X } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  loading?: boolean;
  children: ReactNode;
};

export function Button({ variant = 'primary', loading = false, type = 'button', className = '', children, disabled, ...props }: ButtonProps & { type?: 'button' | 'submit' | 'reset' }) {
  return (
    <button type={type} className={`button button--${variant} ${className}`} disabled={disabled || loading} {...props}>
      {loading && <span className="button__spinner" aria-hidden="true" />}
      {children}
    </button>
  );
}

type CardProps = {
  children: ReactNode;
  className?: string;
  title?: string;
  action?: ReactNode;
};

export function Card({ children, className = '', title, action }: CardProps) {
  return (
    <section className={`card ${className}`}>
      {(title || action) && <div className="card__header"><h2 className="card__title">{title}</h2>{action}</div>}
      {children}
    </section>
  );
}

const statusTone: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  ACCEPTED: 'success',
  AMAN: 'success',
  COMPLETED: 'success',
  CONFIRMED: 'info',
  DELIVERED: 'info',
  DRAFT: 'neutral',
  IN_PROGRESS: 'info',
  INVOICED: 'info',
  PAID: 'success',
  PARTIALLY_PAID: 'warning',
  PENDING: 'warning',
  POSTED: 'info',
  QC_PASS: 'success',
  READY: 'success',
  REJECT: 'danger',
  REJECTED: 'danger',
  CANCELLED: 'neutral',
  CRITICAL: 'danger',
  UNINVOICED: 'warning',
};

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const tone = statusTone[status] ?? 'neutral';
  return <span className={`status-badge status-badge--${tone}`}>{label ?? status.replaceAll('_', ' ')}</span>;
}

export function Breadcrumb({ items }: { items: string[] }) {
  return (
    <nav className="breadcrumb" aria-label="Breadcrumb">
      {items.map((item, index) => <span key={`${item}-${index}`}>{index > 0 && <span className="breadcrumb__divider">/</span>}{item}</span>)}
    </nav>
  );
}

type PageHeaderProps = {
  title: string;
  description: string;
  action?: ReactNode;
  secondaryAction?: ReactNode;
};

export function PageHeader({ title, description, action, secondaryAction }: PageHeaderProps) {
  return (
    <div className="page-header">
      <div><h1>{title}</h1><p>{description}</p></div>
      {(action || secondaryAction) && <div className="page-header__actions">{secondaryAction}{action}</div>}
    </div>
  );
}

export function KpiCard({ label, value, detail, icon, tone = 'primary' }: {
  label: string;
  value: ReactNode;
  detail: ReactNode;
  icon: ReactNode;
  tone?: 'primary' | 'success' | 'warning' | 'info';
}) {
  return (
    <Card className="kpi-card">
      <div className="kpi-card__top"><span>{label}</span><span className={`kpi-card__icon kpi-card__icon--${tone}`}>{icon}</span></div>
      <strong className="kpi-card__value">{value}</strong>
      <p className="kpi-card__detail">{detail}</p>
    </Card>
  );
}

type FormFieldProps = {
  label: string;
  htmlFor?: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: ReactNode;
};

export function FormField({ label, required, hint, error, children }: FormFieldProps) {
  const hintId = useId();
  const errorId = useId();
  return (
    <div className="form-field">
      <span className="form-field__label">{label}{required && <span aria-hidden="true"> *</span>}</span>
      {children}
      {error ? <span id={errorId} className="form-field__error"><AlertCircle size={14} />{error}</span> : hint && <span id={hintId} className="form-field__hint">{hint}</span>}
    </div>
  );
}

export function Input({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`input ${className}`} {...props} />;
}

export function Select({ className = '', children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`input select ${className}`} {...props}>{children}</select>;
}

export function Textarea({ className = '', ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`input textarea ${className}`} {...props} />;
}

export function NumberInput({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <Input className={className} type="number" inputMode="decimal" {...props} />;
}

export function CurrencyInput({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <Input className={className} type="number" inputMode="decimal" min="0" step="1" {...props} />;
}

export function Checkbox({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`checkbox ${className}`} type="checkbox" {...props} />;
}

export function Radio({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`radio ${className}`} type="radio" {...props} />;
}

export function FileUpload({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <Input className={className} type="file" {...props} />;
}

export function DatePicker({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <Input className={className} type="date" {...props} />;
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <div className="empty-state"><strong>{title}</strong><p>{description}</p>{action}</div>;
}

export function Alert({ tone = 'info', children }: { tone?: 'info' | 'warning' | 'danger' | 'success'; children: ReactNode }) {
  return <div className={`alert alert--${tone}`}>{tone === 'success' && <CheckCircle2 size={18} />}{tone === 'danger' && <AlertCircle size={18} />}{children}</div>;
}

type ToastTone = 'info' | 'success' | 'warning' | 'danger';

export function Toast({ open, message, tone = 'info', onClose, duration = 4000 }: { open: boolean; message: string; tone?: ToastTone; onClose: () => void; duration?: number }) {
  useEffect(() => {
    if (!open) return;
    const timeout = window.setTimeout(onClose, duration);
    return () => window.clearTimeout(timeout);
  }, [duration, onClose, open]);

  if (!open) return null;
  return <div className={`toast toast--${tone}`} role={tone === 'danger' ? 'alert' : 'status'}><span>{message}</span><button className="icon-button toast__close" onClick={onClose} aria-label="Tutup notifikasi"><X size={16} /></button></div>;
}

export function ConfirmationDialog({ open, title, description, confirmLabel = 'Konfirmasi', cancelLabel = 'Batal', tone = 'danger', onConfirm, onClose }: { open: boolean; title: string; description: string; confirmLabel?: string; cancelLabel?: string; tone?: 'primary' | 'danger'; onConfirm: () => void; onClose: () => void }) {
  const titleId = useId();
  const descriptionId = useId();
  const dialog = useRef<HTMLElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!open) return;
    opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog.current?.querySelector<HTMLButtonElement>('.confirmation-dialog__confirm')?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key !== 'Tab') return;
      const focusable = dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled)');
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => { window.removeEventListener('keydown', onKeyDown); opener.current?.focus(); };
  }, [onClose, open]);

  if (!open) return null;
  return <div className="modal-backdrop" onMouseDown={onClose}><section ref={dialog} className="modal confirmation-dialog" role="alertdialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId} onMouseDown={(event) => event.stopPropagation()}><div className="modal__header"><h2 id={titleId}>{title}</h2></div><div className="confirmation-dialog__body"><p id={descriptionId}>{description}</p><div className="confirmation-dialog__actions"><Button variant="secondary" onClick={onClose}>{cancelLabel}</Button><Button className="confirmation-dialog__confirm" variant={tone} onClick={onConfirm}>{confirmLabel}</Button></div></div></section></div>;
}

export type DataTableColumn<T> = {
  id: string;
  header: string;
  cell: (row: T) => ReactNode;
  sortValue?: (row: T) => string | number;
  align?: 'left' | 'right' | 'center';
  mobileLabel?: string;
};

type DataTableProps<T extends { id: string }> = {
  columns: DataTableColumn<T>[];
  rows: T[];
  searchPlaceholder?: string;
  searchText?: (row: T) => string;
  emptyTitle?: string;
  emptyDescription?: string;
  pageSize?: number;
};

export function DataTable<T extends { id: string }>({
  columns,
  rows,
  searchPlaceholder = 'Cari data...',
  searchText = (row) => JSON.stringify(row),
  emptyTitle = 'Data belum tersedia',
  emptyDescription = 'Data akan muncul setelah tersedia.',
  pageSize = 8,
}: DataTableProps<T>) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<{ id: string; direction: 'asc' | 'desc' }>();
  const [page, setPage] = useState(0);
  const filteredRows = useMemo(() => rows.filter((row) => searchText(row).toLocaleLowerCase().includes(query.toLocaleLowerCase())), [query, rows, searchText]);
  const sortedRows = useMemo(() => {
    if (!sort) return filteredRows;
    const column = columns.find((item) => item.id === sort.id);
    if (!column?.sortValue) return filteredRows;
    return [...filteredRows].sort((left, right) => {
      const leftValue = column.sortValue!(left);
      const rightValue = column.sortValue!(right);
      const result = typeof leftValue === 'number' && typeof rightValue === 'number' ? leftValue - rightValue : String(leftValue).localeCompare(String(rightValue));
      return sort.direction === 'asc' ? result : -result;
    });
  }, [columns, filteredRows, sort]);
  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const currentPage = Math.min(page, totalPages - 1);
  const visibleRows = sortedRows.slice(currentPage * pageSize, (currentPage + 1) * pageSize);
  const updateQuery = (value: string) => { setQuery(value); setPage(0); };
  const toggleSort = (column: DataTableColumn<T>) => {
    if (!column.sortValue) return;
    setPage(0);
    setSort((previous) => previous?.id === column.id ? { id: column.id, direction: previous.direction === 'asc' ? 'desc' : 'asc' } : { id: column.id, direction: 'asc' });
  };

  return (
    <div className="data-table">
      <div className="data-table__toolbar"><label className="search-input"><Search size={16} /><Input value={query} onChange={(event) => updateQuery(event.target.value)} placeholder={searchPlaceholder} aria-label={searchPlaceholder} /></label><span>{filteredRows.length} data</span></div>
      {visibleRows.length ? <div className="data-table__scroll"><table><thead><tr>{columns.map((column) => <th key={column.id} className={`align-${column.align ?? 'left'}`}><button className={column.sortValue ? 'table-sort' : 'table-label'} onClick={() => toggleSort(column)} disabled={!column.sortValue}>{column.header}{sort?.id === column.id && (sort.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}</button></th>)}</tr></thead><tbody>{visibleRows.map((row) => <tr key={row.id}>{columns.map((column) => <td className={`align-${column.align ?? 'left'}`} data-label={column.mobileLabel ?? column.header} key={column.id}>{column.cell(row)}</td>)}</tr>)}</tbody></table></div> : <EmptyState title={emptyTitle} description={emptyDescription} />}
      {totalPages > 1 && <div className="data-table__pagination"><span>Halaman {currentPage + 1} dari {totalPages}</span><div><Button variant="ghost" onClick={() => setPage((value) => value - 1)} disabled={!currentPage}>Sebelumnya</Button><Button variant="ghost" onClick={() => setPage((value) => value + 1)} disabled={currentPage === totalPages - 1}>Berikutnya</Button></div></div>}
    </div>
  );
}

export function Modal({ open, title, children, onClose }: { open: boolean; title: string; children: ReactNode; onClose: () => void }) {
  const titleId = useId();
  const closeButton = useRef<HTMLButtonElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onCloseRef.current(); };
    window.addEventListener('keydown', onKeyDown);
    return () => { 
      window.removeEventListener('keydown', onKeyDown); 
    };
  }, [open]);

  useEffect(() => {
    if (!open && opener.current) {
      opener.current.focus();
      opener.current = null;
    }
  }, [open]);

  if (!open) return null;
  return <div className="modal-backdrop" role="presentation" onMouseDown={onClose}><section className="modal" role="dialog" aria-modal="true" aria-labelledby={titleId} onMouseDown={(event) => event.stopPropagation()}><div className="modal__header"><h2 id={titleId}>{title}</h2><button ref={closeButton} className="icon-button" onClick={onClose} aria-label="Tutup dialog"><X size={18} /></button></div>{children}</section></div>;
}
