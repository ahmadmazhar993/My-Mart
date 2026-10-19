import React, { useEffect, useRef, useState } from 'react';
import BrandLoader from '../BrandLoader';

// Seller + admin-seller screens share these small building blocks so tables,
// badges, dialogs and money all look and behave the same everywhere.

export const money = (value) => `Rs. ${Number(value || 0).toLocaleString('en-PK', { maximumFractionDigits: 2 })}`;

export const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const formatDateTime = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

export const apiError = (err, fallback = 'Something went wrong. Please try again.') => (
  err?.response?.data?.message || fallback
);

export const imageSrc = (path) => {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  const base = (import.meta.env.VITE_API_BASE || import.meta.env.VITE_API_URL || '').replace(/\/api\/v1\/?$/, '');
  return `${base}/${String(path).replace(/^\/+/, '')}`;
};

export const useDebounced = (value, delay = 350) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
};

const BADGES = {
  gray: 'bg-gray-50 text-gray-600 ring-gray-200',
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  amber: 'bg-amber-50 text-amber-700 ring-amber-200',
  red: 'bg-rose-50 text-rose-700 ring-rose-200',
  blue: 'bg-blue-50 text-blue-700 ring-blue-200',
  purple: 'bg-purple-50 text-purple-700 ring-purple-200',
};

const STATUS_TONES = {
  draft: ['gray', 'Draft'],
  pending_review: ['amber', 'Pending review'],
  approved: ['green', 'Approved'],
  rejected: ['red', 'Rejected'],
  archived: ['gray', 'Archived'],
  pending: ['amber', 'Pending'],
  suspended: ['red', 'Suspended'],
  confirmed: ['blue', 'Confirmed'],
  processing: ['blue', 'Processing'],
  ready_to_ship: ['purple', 'Ready to ship'],
  shipped: ['purple', 'Shipped'],
  delivered: ['green', 'Delivered'],
  cancelled: ['red', 'Cancelled'],
  paid: ['green', 'Paid'],
  unpaid: ['amber', 'Unpaid'],
  refunded: ['red', 'Refunded'],
  in: ['green', 'In stock'],
  low: ['amber', 'Low stock'],
  out: ['red', 'Out of stock'],
  published: ['green', 'Published'],
  unpublished: ['gray', 'Unpublished'],
};

export const Badge = ({ tone = 'gray', children }) => (
  <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${BADGES[tone]}`}>
    {children}
  </span>
);

export const StatusBadge = ({ status, label }) => {
  const [tone, text] = STATUS_TONES[status] || ['gray', String(status || '—').replace(/_/g, ' ')];
  return <Badge tone={tone}>{label || text}</Badge>;
};

export const PageHeader = ({ title, subtitle, actions }) => (
  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
    <div className="min-w-0">
      <h2 className="text-2xl font-bold tracking-tight text-dark">{title}</h2>
      {subtitle ? <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p> : null}
    </div>
    {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
  </div>
);

export const Card = ({ title, action, children, className = '' }) => (
  <section className={`rounded-xl border border-gray-100 bg-white p-4 shadow-card sm:p-5 ${className}`}>
    {(title || action) && (
      <div className="mb-4 flex items-center justify-between gap-3">
        {title ? <h3 className="font-bold text-dark">{title}</h3> : <span />}
        {action}
      </div>
    )}
    {children}
  </section>
);

export const StatCard = ({ label, value, hint, tone = 'text-dark' }) => (
  <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-card sm:p-5">
    <p className="text-sm text-gray-500">{label}</p>
    <p className={`mt-1 break-words text-xl font-extrabold sm:text-2xl ${tone}`}>{value}</p>
    {hint ? <p className="mt-1 text-xs text-gray-400">{hint}</p> : null}
  </div>
);

export const ErrorState = ({ message, onRetry }) => (
  <div role="alert" className="rounded-xl border border-rose-100 bg-rose-50 p-5 text-center">
    <p className="text-sm font-medium text-rose-700">{message || 'Something went wrong.'}</p>
    {onRetry ? (
      <button type="button" onClick={onRetry} className="btn-outline mt-3 !px-4 !py-2 text-sm">Try again</button>
    ) : null}
  </div>
);

export const Empty = ({ title, text, action }) => (
  <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white px-6 py-12 text-center">
    <p className="font-semibold text-dark">{title}</p>
    {text ? <p className="mt-1 max-w-sm text-sm text-gray-500">{text}</p> : null}
    {action ? <div className="mt-4">{action}</div> : null}
  </div>
);

export const Loading = ({ text = 'Loading', minHeight = 240 }) => <BrandLoader minHeight={minHeight} text={text} />;

export const Pagination = ({ pagination, onPage }) => {
  if (!pagination || pagination.total === 0) return null;
  const first = (pagination.page - 1) * pagination.limit + 1;
  const last = Math.min(pagination.page * pagination.limit, pagination.total);
  return (
    <nav aria-label="Pagination" className="mt-4 flex flex-col items-center justify-between gap-3 text-sm sm:flex-row">
      <span className="text-gray-500">
        Showing {first.toLocaleString()}–{last.toLocaleString()} of {pagination.total.toLocaleString()}
        {pagination.totalPages > 1 ? ` · Page ${pagination.page} of ${pagination.totalPages}` : ''}
      </span>
      {pagination.totalPages > 1 ? (
        <div className="flex gap-2">
          <button type="button" disabled={!pagination.hasPrevPage} onClick={() => onPage(pagination.page - 1)} className="btn-secondary min-h-[44px] !px-4 !py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40">Previous</button>
          <button type="button" disabled={!pagination.hasNextPage} onClick={() => onPage(pagination.page + 1)} className="btn-secondary min-h-[44px] !px-4 !py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40">Next</button>
        </div>
      ) : null}
    </nav>
  );
};

export const Field = ({ label, error, hint, children, htmlFor }) => (
  <div>
    <label htmlFor={htmlFor} className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
    {children}
    {hint && !error ? <p className="mt-1 text-xs text-gray-400">{hint}</p> : null}
    {error ? <p role="alert" className="mt-1 text-xs font-medium text-rose-600">{error}</p> : null}
  </div>
);

export const Button = ({
  busy, children, variant = 'primary', className = '', ...rest
}) => {
  const base = variant === 'danger'
    ? 'inline-flex items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700'
    : variant === 'outline' ? 'btn-outline !px-4 !py-2.5 text-sm' : 'btn-primary !px-4 !py-2.5 text-sm';
  return (
    <button
      type="button"
      {...rest}
      disabled={busy || rest.disabled}
      aria-busy={busy || undefined}
      className={`${base} min-h-[44px] disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      {busy ? <BrandLoader variant="button" /> : null}
      {children}
    </button>
  );
};

/**
 * Accessible modal. `onConfirm` may be async; the dialog stays open and
 * disabled while it runs, so a double click cannot submit twice.
 * With `requireReason`, a text reason (min 5 chars) is collected and passed on.
 */
export const ConfirmDialog = ({
  open, title, message, confirmLabel = 'Confirm', danger = false, requireReason = false,
  reasonLabel = 'Reason', onConfirm, onClose, extra = null,
}) => {
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const dialogRef = useRef(null);

  useEffect(() => {
    if (open) {
      setReason('');
      setError('');
      setBusy(false);
      setTimeout(() => dialogRef.current?.focus(), 0);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => { if (event.key === 'Escape' && !busy) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, busy, onClose]);

  if (!open) return null;

  const submit = async () => {
    if (requireReason && reason.trim().length < 5) {
      setError('Please enter at least 5 characters.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await onConfirm(reason.trim());
    } catch (err) {
      setError(err.userMessage || apiError(err));
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onMouseDown={() => !busy && onClose()}>
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        onMouseDown={(event) => event.stopPropagation()}
        className="w-full max-w-md rounded-t-2xl bg-white p-5 shadow-xl outline-none sm:rounded-2xl"
      >
        <h3 id="confirm-title" className="text-lg font-bold text-dark">{title}</h3>
        {message ? <p className="mt-2 text-sm text-gray-600">{message}</p> : null}
        {extra}
        {requireReason ? (
          <div className="mt-4">
            <Field label={reasonLabel} htmlFor="confirm-reason" error={error}>
              <textarea
                id="confirm-reason"
                rows={3}
                maxLength={500}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                className="input-field"
              />
            </Field>
          </div>
        ) : error ? <p role="alert" className="mt-3 text-sm font-medium text-rose-600">{error}</p> : null}
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button variant={danger ? 'danger' : 'primary'} busy={busy} onClick={submit}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  );
};

// Table look shared with the Admin portal (sticky tinted header, divided rows).
// `relative` keeps sr-only (absolutely positioned) header text inside the scroll container.
export const TABLE_WRAP = 'relative hidden overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-card xl:block';
// Card layout for tablet/phone: two columns from 768px, one below.
export const CARD_GRID = 'grid gap-3 md:grid-cols-2 xl:hidden';
export const THEAD = 'bg-gray-50/95 text-left text-gray-500';
export const TH = 'whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide';
export const TD = 'px-4 py-3 align-middle';
export const TBODY = 'divide-y divide-gray-100 bg-white';
export const TR = 'transition hover:bg-primary-50/40';
export const CARD_LIST_ITEM = 'rounded-xl border border-gray-200 bg-white p-4 shadow-card';

// Saves an in-memory file (e.g. a CSV from the API) through the browser.
export const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export const Tabs = ({ tabs, value, onChange, label }) => (
  <div role="tablist" aria-label={label} className="flex gap-1 overflow-x-auto border-b border-gray-200">
    {tabs.map(([key, text]) => (
      <button
        key={key}
        type="button"
        role="tab"
        aria-selected={value === key}
        onClick={() => onChange(key)}
        className={`min-h-[44px] whitespace-nowrap border-b-2 px-4 text-sm font-medium transition ${value === key ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
      >
        {text}
      </button>
    ))}
  </div>
);
