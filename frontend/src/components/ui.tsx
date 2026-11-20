import { type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../i18n';
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
  const { language } = useLanguage();
  useEffect(() => {
    if (!open) return;
    const timeout = window.setTimeout(onClose, duration);
    return () => window.clearTimeout(timeout);
  }, [duration, onClose, open]);

  if (!open) return null;
  return <div className={`toast toast--${tone}`} role={tone === 'danger' ? 'alert' : 'status'}><span>{message}</span><button className="icon-button toast__close" onClick={onClose} aria-label={language === 'en' ? 'Close notification' : 'Tutup notifikasi'}><X size={16} /></button></div>;
}

export function ConfirmationDialog({ open, title, description, confirmLabel, cancelLabel, tone = 'danger', onConfirm, onClose }: { open: boolean; title: string; description: string; confirmLabel?: string; cancelLabel?: string; tone?: 'primary' | 'danger'; onConfirm: () => void; onClose: () => void }) {
  const { language } = useLanguage();
  const resolvedConfirmLabel = confirmLabel ?? (language === 'en' ? 'Confirm' : 'Konfirmasi');
  const resolvedCancelLabel = cancelLabel ?? (language === 'en' ? 'Cancel' : 'Batal');
  const titleId = useId();
  const descriptionId = useId();
  const dialog = useRef<HTMLElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    if (!open) return;
    opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog.current?.querySelector<HTMLButtonElement>('.confirmation-dialog__confirm')?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current();
      if (event.key !== 'Tab') return;
      const focusable = dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled)');
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => { window.removeEventListener('keydown', onKeyDown); };
  }, [open]);

  useEffect(() => {
    if (!open && opener.current) {
      opener.current.focus();
      opener.current = null;
    }
  }, [open]);

  if (!open || typeof document === 'undefined') return null;
  return createPortal(
    <div className="modal-backdrop" onMouseDown={onClose}><section ref={dialog} className="modal confirmation-dialog" role="alertdialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId} onMouseDown={(event) => event.stopPropagation()}><div className="modal__header"><h2 id={titleId}>{title}</h2></div><div className="confirmation-dialog__body"><p id={descriptionId}>{description}</p><div className="confirmation-dialog__actions"><Button variant="secondary" onClick={onClose}>{resolvedCancelLabel}</Button><Button className="confirmation-dialog__confirm" variant={tone} onClick={onConfirm}>{resolvedConfirmLabel}</Button></div></div></section></div>,
    document.body,
  );
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
  searchPlaceholder,
  searchText = (row) => JSON.stringify(row),
  emptyTitle,
  emptyDescription,
  pageSize = 8,
}: DataTableProps<T>) {
  const { language } = useLanguage();
  const searchLabel = searchPlaceholder ?? (language === 'en' ? 'Search data...' : 'Cari data...');
  const emptyHeading = emptyTitle ?? (language === 'en' ? 'No data available' : 'Data belum tersedia');
  const emptyCopy = emptyDescription ?? (language === 'en' ? 'Data will appear here when available.' : 'Data akan muncul setelah tersedia.');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<{ id: string; direction: 'asc' | 'desc' }>();
  const [page, setPage] = useState(0);
  // Reset pagination whenever the backing dataset changes (tab switch, reload, CRUD refresh).
  useEffect(() => { setPage(0); }, [rows]);
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
      <div className="data-table__toolbar"><label className="search-input"><Search size={16} /><Input value={query} onChange={(event) => updateQuery(event.target.value)} placeholder={searchLabel} aria-label={searchLabel} /></label><span>{filteredRows.length} {language === 'en' ? 'records' : 'data'}</span></div>
      {visibleRows.length ? <div className="data-table__scroll"><table><thead><tr>{columns.map((column) => <th key={column.id} className={`align-${column.align ?? 'left'}`}><button className={column.sortValue ? 'table-sort' : 'table-label'} onClick={() => toggleSort(column)} disabled={!column.sortValue}>{column.header}{sort?.id === column.id && (sort.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}</button></th>)}</tr></thead><tbody>{visibleRows.map((row) => <tr key={row.id}>{columns.map((column) => <td className={`align-${column.align ?? 'left'}`} data-label={column.mobileLabel ?? column.header} key={column.id}>{column.cell(row)}</td>)}</tr>)}</tbody></table></div> : <EmptyState title={emptyHeading} description={emptyCopy} />}
      {totalPages > 1 && <div className="data-table__pagination"><span>{language === 'en' ? 'Page' : 'Halaman'} {currentPage + 1} {language === 'en' ? 'of' : 'dari'} {totalPages}</span><div><Button variant="ghost" onClick={() => setPage((value) => value - 1)} disabled={!currentPage}>{language === 'en' ? 'Previous' : 'Sebelumnya'}</Button><Button variant="ghost" onClick={() => setPage((value) => value + 1)} disabled={currentPage === totalPages - 1}>{language === 'en' ? 'Next' : 'Berikutnya'}</Button></div></div>}
    </div>
  );
}

export function Modal({ open, title, children, onClose }: { open: boolean; title: string; children: ReactNode; onClose: () => void }) {
  const { language } = useLanguage();
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
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButton.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') return;

      const focusable = document.querySelector('.glass-modal')?.querySelectorAll<HTMLElement>(
        'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) {
        event.preventDefault();
        closeButton.current?.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || !document.querySelector('.glass-modal')?.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !document.querySelector('.glass-modal')?.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open && opener.current) {
      opener.current.focus();
      opener.current = null;
    }
  }, [open]);

  if (!open || typeof document === 'undefined') return null;
  return createPortal(
    <div className="glass-modal-overlay" role="presentation" onMouseDown={onClose}>
      <section className="glass-modal" role="dialog" aria-modal="true" aria-labelledby={titleId} onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal__header">
          <h2 id={titleId} style={{ color: '#38BDF8', fontWeight: 800, letterSpacing: '-0.025em' }}>{title}</h2>
          <button ref={closeButton} className="icon-button" onClick={onClose} aria-label={language === 'en' ? 'Close dialog' : 'Tutup dialog'} style={{ color: '#94A3B8' }}><X size={18} /></button>
        </div>
        <div style={{ marginTop: '1rem' }}>
          {children}
        </div>
      </section>
    </div>,
    document.body,
  );
}


export type NumericInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> & {
  value: string | number | null | undefined;
  onValueChange: (rawValue: string, numericValue: number | null) => void;
  locale?: string;
  maximumFractionDigits?: number;
  allowNegative?: boolean;
};

/**
 * Locale-aware numeric input. The parent always receives a canonical numeric
 * string (decimal point, no grouping separators); formatting is presentation
 * only. Empty input is represented by an empty string and null numeric value.
 */
export function NumericInput({
  value,
  onValueChange,
  locale: localeOverride,
  maximumFractionDigits = 2,
  allowNegative = false,
  className = '',
  onBlur,
  onFocus,
  min,
  max,
  ...props
}: NumericInputProps) {
  const [focused, setFocused] = useState(false);
  const { language } = useLanguage();
  const locale = localeOverride ?? (language === 'en' ? 'en-US' : 'id-ID');
  const rawValue = value === null || value === undefined ? '' : String(value);
  const formatter = useMemo(() => new Intl.NumberFormat(locale, {
    useGrouping: true,
    maximumFractionDigits,
  }), [locale, maximumFractionDigits]);

  const parseInput = (input: string): string => {
    let normalized = input.replace(/\s/g, '').replace(/[^0-9,.-]/g, '');
    if (!allowNegative) normalized = normalized.replace(/-/g, '');
    else normalized = normalized.replace(/(?!^)-/g, '');

    const comma = normalized.lastIndexOf(',');
    const dot = normalized.lastIndexOf('.');
    if (comma >= 0 && dot >= 0) {
      // With both separators, the last one is decimal and the other is grouping.
      const decimal = comma > dot ? ',' : '.';
      normalized = normalized
        .replace(decimal === ',' ? /\./g : /,/g, '')
        .replace(decimal, '.');
    } else if (comma >= 0) {
      const commaCount = (normalized.match(/,/g) || []).length;
      const trailingDigits = normalized.length - normalized.lastIndexOf(',') - 1;
      const commaIsGrouping = locale.toLowerCase().startsWith('en') && (commaCount > 1 || trailingDigits === 3);
      if (commaIsGrouping) normalized = normalized.replace(/,/g, '');
      else normalized = normalized.replace(/\./g, '').replace(',', '.');
    } else if (dot >= 0) {
      const dotCount = (normalized.match(/\./g) || []).length;
      const trailingDigits = normalized.length - normalized.lastIndexOf('.') - 1;
      // "1.234" is a grouped integer in id-ID; "1.23" remains a decimal.
      if (dotCount > 1 || (locale.toLowerCase().startsWith('id') && trailingDigits === 3 && normalized.indexOf('.') <= 3)) {
        normalized = normalized.replace(/\./g, '');
      }
    }

    const negative = normalized.startsWith('-') ? '-' : '';
    normalized = normalized.replace(/-/g, '');
    const parts = normalized.split('.');
    const integer = parts.shift() ?? '';
    const fraction = parts.join('').slice(0, maximumFractionDigits);
    return negative + integer + (normalized.includes('.') ? '.' + fraction : '');
  };

  const inputRef = useRef<HTMLInputElement>(null);

  const constraintMessage = (raw: string): string => {
    if (raw === '') return '';
    if (raw === '-' || raw === '.' || raw === '-.' || !Number.isFinite(Number(raw))) {
      return language === 'en' ? 'Enter a valid number.' : 'Masukkan angka yang valid.';
    }
    const numeric = Number(raw);
    if (min !== undefined && numeric < Number(min)) {
      return language === 'en' ? `Value must be at least ${min}.` : `Nilai minimal ${min}.`;
    }
    if (max !== undefined && numeric > Number(max)) {
      return language === 'en' ? `Value must not exceed ${max}.` : `Nilai maksimal ${max}.`;
    }
    return '';
  };

  // Keep native form validation synchronized even when a legacy value is
  // populated externally and the user submits without focusing this field.
  const validationMessage = constraintMessage(rawValue);
  useEffect(() => {
    inputRef.current?.setCustomValidity(validationMessage);
  }, [validationMessage]);

  const displayValue = () => {
    if (!rawValue || rawValue === '-') return rawValue;
    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed)) return rawValue;
    return focused ? rawValue : formatter.format(parsed);
  };

  return (
    <input
      {...props}
      ref={inputRef}
      type="text"
      inputMode="decimal"
      className={`input ${className}`}
      value={displayValue()}
      onFocus={(event) => {
        event.currentTarget.setCustomValidity(constraintMessage(rawValue));
        setFocused(true);
        onFocus?.(event);
      }}
      onChange={(event) => {
        const raw = parseInput(event.target.value);
        const numeric = raw === '' || raw === '-' || raw === '.' || raw === '-.' ? null : Number(raw);
        event.currentTarget.setCustomValidity(constraintMessage(raw));
        onValueChange(raw, numeric !== null && Number.isFinite(numeric) ? numeric : null);
      }}
      onBlur={(event) => {
        event.currentTarget.setCustomValidity(constraintMessage(rawValue));
        setFocused(false);
        onBlur?.(event);
      }}
      aria-valuenow={rawValue !== '' && Number.isFinite(Number(rawValue)) ? Number(rawValue) : undefined}
    />
  );
}
