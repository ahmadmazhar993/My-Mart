import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronDown, Search, SlidersHorizontal, X } from 'lucide-react';

/**
 * Filter toolkit shared by every seller (and seller-related admin) list page.
 * It follows the Admin portal's pattern: a header card with a joined search box,
 * a ghost "Filter" button with a count badge that opens a panel with
 * Apply / Clear all, plus removable chips and a results line.
 */

/* ------------------------------ URL-backed state ------------------------------ */

/**
 * Filter + page state kept in the URL query string, so refresh, back/forward and
 * shared links restore the same results. `defaults` must be a stable object.
 * Any change other than `page` returns to page 1.
 */
export const useListFilters = (defaults) => {
  const [params, setParams] = useSearchParams();
  const defaultsRef = useRef(defaults);

  const filters = useMemo(() => {
    const result = {};
    Object.keys(defaultsRef.current).forEach((key) => {
      result[key] = params.get(key) ?? defaultsRef.current[key];
    });
    result.page = Math.max(1, parseInt(params.get('page'), 10) || 1);
    return result;
  }, [params]);

  const setFilters = useCallback((patch) => {
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      Object.entries(patch).forEach(([key, value]) => {
        const isDefault = key === 'page' ? Number(value) === 1 : value === defaultsRef.current[key];
        if (value === '' || value == null || isDefault) next.delete(key);
        else next.set(key, String(value));
      });
      if (!('page' in patch)) next.delete('page');
      return next;
    }, { replace: true });
  }, [setParams]);

  const reset = useCallback(() => setParams(new URLSearchParams(), { replace: true }), [setParams]);
  return [filters, setFilters, reset];
};

export const useDebouncedValue = (value, delay = 350) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
};

/* --------------------------------- controls ---------------------------------- */

// Native <select> with the project's chevron (select-field only strips the native look).
export const Select = ({ className = '', children, ...props }) => (
  <div className={`relative ${className}`}>
    <select {...props} className="input-field select-field w-full">{children}</select>
    <span className="select-chevron" aria-hidden="true" />
  </div>
);

export const DateInput = (props) => <input type="date" {...props} className={`input-field w-full ${props.className || ''}`} />;

/** Admin-style joined search: input + Search button. Applies on submit and, after a pause, while typing. */
export const SearchBox = ({
  value, onChange, placeholder = 'Search', label = 'Search', className = '',
}) => {
  const [text, setText] = useState(value);
  const debounced = useDebouncedValue(text);
  const lastApplied = useRef(value);

  useEffect(() => { setText(value); lastApplied.current = value; }, [value]); // external reset
  useEffect(() => {
    if (debounced.trim() !== lastApplied.current) {
      lastApplied.current = debounced.trim();
      onChange(debounced.trim());
    }
  }, [debounced]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = (event) => {
    event.preventDefault();
    lastApplied.current = text.trim();
    onChange(text.trim());
  };

  return (
    <form onSubmit={submit} role="search" className={`flex items-stretch ${className}`}>
      <div className="relative min-w-0 flex-1">
        <Search aria-hidden="true" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="search"
          aria-label={label}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          className="search-clear-red h-full min-h-[44px] w-full rounded-l-lg border border-r-0 border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm shadow-sm transition placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-100 sm:w-64"
        />
      </div>
      <button
        type="submit"
        className="min-h-[44px] rounded-r-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-600 shadow-sm transition hover:bg-gray-50 hover:text-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-100"
      >
        Search
      </button>
    </form>
  );
};

/* ------------------------------- filter panel -------------------------------- */

const formatChipDate = (value) => (value ? new Date(`${value}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '');

/**
 * Dropdown menu anchored under the Filter button (like the sort menu in the customer portal).
 * Edits are drafts until "Apply filters". Closes on outside click, Escape or after applying.
 */
const FilterDropdown = ({
  filters, values, onApply, onClearAll, onClose, anchorRef,
}) => {
  const [draft, setDraft] = useState(values);
  const menuRef = useRef(null);

  useEffect(() => {
    const onKey = (event) => { if (event.key === 'Escape') onClose(true); };
    const onPointer = (event) => {
      if (menuRef.current?.contains(event.target) || anchorRef.current?.contains(event.target)) return;
      onClose(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('touchstart', onPointer);
    menuRef.current?.querySelector('select, input')?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('touchstart', onPointer);
    };
  }, [onClose, anchorRef]);

  const range = filters.find((f) => f.type === 'date-range');
  const rangeInvalid = range && draft[range.fromKey] && draft[range.toKey] && draft[range.fromKey] > draft[range.toKey];

  return (
    <div
      ref={menuRef}
      role="dialog"
      aria-label="Filters"
      className="absolute left-0 right-0 top-full z-40 mt-2 rounded-xl border border-gray-200 bg-white shadow-xl sm:left-auto sm:w-80"
    >
      <div className="max-h-[60vh] space-y-4 overflow-y-auto p-4">
        {filters.map((filter) => {
          if (filter.type === 'date-range') {
            return (
              <fieldset key={filter.fromKey}>
                <legend className="mb-1.5 block text-sm font-medium text-gray-700">{filter.label}</legend>
                <div className="space-y-2">
                  <DateInput aria-label={`${filter.label}: from`} value={draft[filter.fromKey]} max={draft[filter.toKey] || undefined} onChange={(e) => setDraft({ ...draft, [filter.fromKey]: e.target.value })} />
                  <DateInput aria-label={`${filter.label}: to`} value={draft[filter.toKey]} min={draft[filter.fromKey] || undefined} onChange={(e) => setDraft({ ...draft, [filter.toKey]: e.target.value })} />
                </div>
                {rangeInvalid ? <p role="alert" className="mt-1 text-xs font-medium text-rose-600">The start date must be before the end date.</p> : null}
              </fieldset>
            );
          }
          return (
            <div key={filter.key}>
              <label htmlFor={`f-${filter.key}`} className="mb-1.5 block text-sm font-medium text-gray-700">{filter.label}</label>
              <Select id={`f-${filter.key}`} value={draft[filter.key]} onChange={(e) => setDraft({ ...draft, [filter.key]: e.target.value })}>
                {filter.options.map(([value, text]) => <option key={value} value={value}>{text}</option>)}
              </Select>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-2 border-t border-gray-100 p-3">
        <button type="button" disabled={rangeInvalid} onClick={() => onApply(draft)} className="btn-primary min-h-[44px] flex-1 !px-4 !py-2.5 text-sm">Apply filters</button>
        <button type="button" onClick={onClearAll} className="min-h-[44px] rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Clear all</button>
      </div>
    </div>
  );
};

/**
 * Header card + search + Filter button/panel + active chips + results line.
 *
 * filters : [{ key, label, options: [[value, label]...], defaultValue? }]  select filters
 *           [{ type: 'date-range', label, fromKey, toKey }]                  date range
 * values  : the applied values (from useListFilters)
 * onChange(patch) applies a patch; onReset clears every filter and the search.
 * `total` is the server-reported count of matching rows (never a client-side count).
 */
export const ListToolbar = ({
  title, subtitle, searchPlaceholder, searchLabel, filters = [], values, defaults, onChange, onReset,
  total, noun = 'results', loading = false, actions = null, hideSearch = false,
}) => {
  const compact = !title; // tabbed sections: just the controls, no title card
  const [open, setOpen] = useState(false);
  const buttonRef = useRef(null);

  const chips = [];
  if (values.search) chips.push({ id: 'search', text: `Search: “${values.search}”`, clear: { search: '' } });
  filters.forEach((filter) => {
    if (filter.type === 'date-range') {
      const from = values[filter.fromKey]; const to = values[filter.toKey];
      if (from || to) {
        const text = from && to ? `${formatChipDate(from)} – ${formatChipDate(to)}` : from ? `From ${formatChipDate(from)}` : `Until ${formatChipDate(to)}`;
        chips.push({ id: filter.fromKey, text: `${filter.label}: ${text}`, clear: { [filter.fromKey]: '', [filter.toKey]: '' } });
      }
      return;
    }
    if (values[filter.key] !== defaults[filter.key]) {
      const option = filter.options.find(([value]) => value === values[filter.key]);
      chips.push({ id: filter.key, text: `${filter.label}: ${option ? option[1] : values[filter.key]}`, clear: { [filter.key]: defaults[filter.key] } });
    }
  });
  const panelCount = chips.filter((chip) => chip.id !== 'search').length;

  const close = useCallback((returnFocus = true) => { setOpen(false); if (returnFocus) buttonRef.current?.focus(); }, []);

  return (
    <div className="space-y-3">
      <div className={compact
        ? 'flex flex-col gap-2.5 rounded-xl border border-gray-100 bg-white p-3 shadow-card sm:flex-row sm:flex-wrap sm:items-center'
        : 'flex flex-col gap-3 rounded-xl border border-gray-100 bg-white px-4 py-4 shadow-card sm:px-6 sm:py-5 2xl:flex-row 2xl:items-center 2xl:justify-between'}
      >
        {compact ? null : (
          <div className="min-w-0">
            <h2 className="text-2xl font-bold tracking-tight text-dark">{title}</h2>
            {subtitle ? <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p> : null}
          </div>
        )}
        <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center">
          {hideSearch ? null : (
            <SearchBox value={values.search} onChange={(search) => onChange({ search })} placeholder={searchPlaceholder} label={searchLabel || searchPlaceholder} className="w-full sm:w-auto" />
          )}
          {filters.length ? (
            <div className="relative">
              <button
                type="button"
                ref={buttonRef}
                onClick={() => setOpen((current) => !current)}
                aria-haspopup="dialog"
                aria-expanded={open}
                className={`inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-lg border bg-white px-3.5 py-2.5 text-sm font-medium shadow-sm transition hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-100 sm:w-auto ${open ? 'border-primary text-primary-700' : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:text-gray-800'}`}
              >
                <SlidersHorizontal size={16} aria-hidden="true" />
                Filter
                {panelCount > 0 ? <span className="ml-0.5 inline-flex h-5 min-w-[18px] items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold text-white" aria-label={`${panelCount} filters applied`}>{panelCount}</span> : null}
                <ChevronDown size={14} aria-hidden="true" className={`transition-transform ${open ? 'rotate-180' : ''}`} />
              </button>
              {open ? (
                <FilterDropdown
                  filters={filters}
                  values={values}
                  anchorRef={buttonRef}
                  onClose={close}
                  onApply={(draft) => {
                    const patch = {};
                    filters.forEach((filter) => {
                      if (filter.type === 'date-range') {
                        patch[filter.fromKey] = draft[filter.fromKey];
                        patch[filter.toKey] = draft[filter.toKey];
                      } else {
                        patch[filter.key] = draft[filter.key];
                      }
                    });
                    onChange(patch);
                    close();
                  }}
                  onClearAll={() => { onReset(); close(); }}
                />
              ) : null}
            </div>
          ) : null}
          {actions}
        </div>
      </div>

      {chips.length ? (
        <div className="flex flex-wrap items-center gap-2" aria-label="Active filters">
          {chips.map((chip) => (
            <span key={chip.id} className="inline-flex items-center gap-1 rounded-full bg-primary-50 py-1 pl-3 pr-1 text-xs font-medium text-primary-700 ring-1 ring-inset ring-primary-100">
              {chip.text}
              <button type="button" onClick={() => onChange(chip.clear)} aria-label={`Remove filter ${chip.text}`} className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-primary-100">
                <X size={12} aria-hidden="true" />
              </button>
            </span>
          ))}
          <button type="button" onClick={onReset} className="px-2 py-1 text-xs font-semibold text-gray-500 underline hover:text-gray-800">Clear all</button>
        </div>
      ) : null}

      <p className="px-1 text-sm text-gray-500" role="status" aria-live="polite">
        {loading && total == null ? 'Loading…' : total == null ? '' : `${total.toLocaleString()} ${total === 1 ? noun.replace(/s$/, '') : noun}${chips.length ? ' match your filters' : ''}${loading ? ' · updating…' : ''}`}
      </p>

    </div>
  );
};

/* ------------------------------ date range picker ----------------------------- */

const isoDay = (date) => date.toISOString().slice(0, 10);
export const daysAgo = (n) => isoDay(new Date(Date.now() - n * 86400000));
export const RANGE_PRESETS = [['7 days', 6], ['30 days', 29], ['90 days', 89]];

/** Preset buttons + from/to inputs for report-style pages (dashboard, analytics). */
export const RangePicker = ({ from, to, onChange }) => (
  <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
    <div className="flex overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm" role="group" aria-label="Date range presets">
      {RANGE_PRESETS.map(([label, days]) => {
        const active = from === daysAgo(days) && to === daysAgo(0);
        return (
          <button
            key={label}
            type="button"
            aria-pressed={active}
            onClick={() => onChange({ from: daysAgo(days), to: daysAgo(0) })}
            className={`min-h-[44px] flex-1 px-3.5 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-100 sm:flex-none ${active ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            {label}
          </button>
        );
      })}
    </div>
    <div className="grid grid-cols-2 gap-2 sm:flex">
      <label className="text-xs font-medium text-gray-500">
        From
        <DateInput value={from} max={to} onChange={(e) => e.target.value && onChange({ from: e.target.value, to })} className="mt-0.5 !py-2" />
      </label>
      <label className="text-xs font-medium text-gray-500">
        To
        <DateInput value={to} min={from} max={daysAgo(0)} onChange={(e) => e.target.value && onChange({ from, to: e.target.value })} className="mt-0.5 !py-2" />
      </label>
    </div>
  </div>
);
