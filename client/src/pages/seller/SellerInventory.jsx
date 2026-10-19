import React, { useCallback, useEffect, useState } from 'react';
import useLiveRefresh from '../../hooks/useLiveRefresh';
import useLatestRequest from '../../hooks/useLatestRequest';
import { Minus, Plus } from 'lucide-react';
import { sellerPortalService } from '../../services';
import { useToast } from '../../components/ToastProvider';
import {
  Button, Empty, ErrorState, Loading, Pagination, StatusBadge, CARD_LIST_ITEM,
  apiError, formatDateTime, imageSrc,
} from '../../components/seller/ui';
import { ListToolbar, useListFilters } from '../../components/seller/filters';

const DEFAULTS = { search: '', stock: '' };
const REASONS = {
  initial_stock: 'Opening stock',
  seller_adjustment: 'Seller update',
  order_placed: 'Order placed',
  order_cancelled: 'Order cancelled',
  order_reopened: 'Order re-opened',
};

/** One editable stock line (a product, or one variant of it) with − / + steppers. */
const StockEditor = ({ label, current, onSave }) => {
  const [value, setValue] = useState(String(current));
  const [busy, setBusy] = useState(false);
  useEffect(() => setValue(String(current)), [current]);
  const number = value === '' ? NaN : Number(value);
  const dirty = Number.isInteger(number) && number >= 0 && number !== current;
  const step = (delta) => setValue(String(Math.max(0, (Number.isNaN(number) ? current : number) + delta)));

  const submit = async (event) => {
    event.preventDefault();
    if (!dirty || busy) return;
    setBusy(true);
    try { await onSave(number); } finally { setBusy(false); }
  };

  return (
    <form onSubmit={submit} className="flex items-center gap-2">
      <div className="flex items-center overflow-hidden rounded-lg border border-gray-300 bg-white shadow-sm focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
        <button type="button" aria-label={`Decrease stock for ${label}`} onClick={() => step(-1)} disabled={busy || number <= 0} className="flex h-11 w-10 items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-40">
          <Minus size={16} aria-hidden="true" />
        </button>
        <label className="sr-only" htmlFor={`stock-${label}`}>New stock quantity for {label}</label>
        <input
          id={`stock-${label}`}
          inputMode="numeric"
          value={value}
          onChange={(e) => setValue(e.target.value.replace(/\D/g, '').slice(0, 7))}
          className="h-11 w-16 border-x border-gray-200 text-center text-sm font-semibold focus:outline-none"
        />
        <button type="button" aria-label={`Increase stock for ${label}`} onClick={() => step(1)} disabled={busy} className="flex h-11 w-10 items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-40">
          <Plus size={16} aria-hidden="true" />
        </button>
      </div>
      <Button type="submit" busy={busy} disabled={!dirty} className="!px-3 !py-2">Update</Button>
    </form>
  );
};

const History = ({ productId }) => {
  const [state, setState] = useState({ loading: true, rows: [], error: '' });
  useEffect(() => {
    sellerPortalService.listStockMovements(productId)
      .then((res) => setState({ loading: false, rows: res.data.data, error: '' }))
      .catch((err) => setState({ loading: false, rows: [], error: apiError(err) }));
  }, [productId]);

  if (state.loading) return <p className="p-3 text-sm text-gray-500">Loading history…</p>;
  if (state.error) return <p className="p-3 text-sm text-rose-600">{state.error}</p>;
  if (state.rows.length === 0) return <p className="p-3 text-sm text-gray-500">No stock changes recorded yet.</p>;
  return (
    <ul className="divide-y divide-gray-100 text-sm">
      {state.rows.map((row) => (
        <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
          <span className="text-gray-700">{REASONS[row.reason] || row.reason}{row.variant ? ` · ${row.variant}` : ''}{row.note ? ` — ${row.note}` : ''}</span>
          <span className="flex items-center gap-3">
            <strong className={row.delta > 0 ? 'text-emerald-600' : 'text-rose-600'}>{row.delta > 0 ? `+${row.delta}` : row.delta}</strong>
            <span className="text-gray-500">{row.quantity_before} → {row.quantity_after}</span>
            <span className="text-xs text-gray-400">{formatDateTime(row.created_at)}</span>
          </span>
        </li>
      ))}
    </ul>
  );
};

const SellerInventory = () => {
  const { addToast } = useToast();
  const [filters, setFilters, reset] = useListFilters(DEFAULTS);
  const [state, setState] = useState({ loading: true, rows: [], pagination: null, error: '' });
  const [threshold, setThreshold] = useState(5);
  const [openHistory, setOpenHistory] = useState(null);

  const latest = useLatestRequest();
  const load = useCallback((silent = false) => {
    if (!silent) setState((s) => ({ ...s, loading: true, error: '' }));
    return latest.guard(sellerPortalService.listInventory({
      search: filters.search || undefined, stock: filters.stock || undefined, page: filters.page, limit: 20,
    }))
      .then((res) => {
        setState({ loading: false, rows: res.data.data, pagination: res.data.pagination, error: '' });
        setThreshold(res.data.meta?.lowStockThreshold ?? 5);
      })
      .catch((err) => setState((s) => ({ ...s, loading: false, error: apiError(err, 'Could not load inventory.') })));
  }, [filters]);
  useEffect(() => { load(); }, [load]);
  useLiveRefresh(['inventory', 'product', 'order'], () => load(true));

  const saveStock = (product, variantKey) => async (quantity) => {
    try {
      await sellerPortalService.updateStock(product.id, { mode: 'set', quantity, variant_key: variantKey });
      addToast('Stock updated.');
      load(true);
      setOpenHistory((current) => (current === product.id ? null : current));
    } catch (err) {
      addToast(apiError(err), 'error');
    }
  };

  const { rows, pagination } = state;
  const filtered = filters.search || filters.stock;
  const lowCount = rows.filter((r) => r.state === 'low').length;
  const outCount = rows.filter((r) => r.state === 'out').length;

  return (
    <div className="animate-fade-in space-y-4">
      <ListToolbar
        title="Inventory"
        subtitle={`Stock drops automatically when customers order. Low stock means ${threshold} or fewer.`}
        searchPlaceholder="Search name or SKU"
        searchLabel="Search inventory by name or SKU"
        filters={[{ key: 'stock', label: 'Stock level', options: [['', 'All stock levels'], ['out', 'Out of stock'], ['low', `Low stock (≤ ${threshold})`], ['in', 'In stock']] }]}
        values={filters}
        defaults={DEFAULTS}
        onChange={setFilters}
        onReset={reset}
        total={pagination?.total}
        loading={state.loading}
        noun="products"
      />

      {(lowCount > 0 || outCount > 0) && !filters.stock ? (
        <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {outCount > 0 ? `${outCount} product(s) on this page are out of stock. ` : ''}{lowCount > 0 ? `${lowCount} product(s) are running low.` : ''}
        </div>
      ) : null}

      {state.error ? <ErrorState message={state.error} onRetry={() => load()} /> : null}
      {state.loading && rows.length === 0 ? <Loading text="Loading inventory" /> : null}
      {!state.loading && !state.error && rows.length === 0 ? (
        <Empty
          title={filtered ? 'No products match your filters' : 'No products yet'}
          text={filtered ? 'Try removing a filter.' : 'Products you add will appear here so you can manage their stock.'}
          action={filtered ? <Button variant="outline" onClick={reset}>Clear filters</Button> : null}
        />
      ) : null}

      <div className={`space-y-3 transition ${state.loading ? 'opacity-60' : ''}`} aria-busy={state.loading}>
        {rows.map((product) => (
          <div key={product.id} className={CARD_LIST_ITEM}>
            <div className="flex flex-wrap items-center gap-3">
              {product.image_url ? <img src={imageSrc(product.image_url)} alt="" className="h-12 w-12 flex-shrink-0 rounded-md object-cover" loading="lazy" /> : <span className="h-12 w-12 flex-shrink-0 rounded-md bg-gray-100" />}
              <div className="min-w-0 flex-1 basis-48">
                <p className="break-words font-semibold text-gray-900">{product.name}</p>
                <p className="text-xs text-gray-400">SKU: {product.sku || '—'}</p>
              </div>
              <StatusBadge status={product.state} label={product.state === 'in' ? `${product.stock_quantity} in stock` : undefined} />
              <StockEditor label={product.name} current={product.stock_quantity} onSave={saveStock(product, undefined)} />
              <button
                type="button"
                aria-expanded={openHistory === product.id}
                onClick={() => setOpenHistory(openHistory === product.id ? null : product.id)}
                className="min-h-[44px] px-2 text-sm font-semibold text-primary hover:underline"
              >
                History
              </button>
            </div>

            {product.variants.length > 0 ? (
              <ul className="mt-3 divide-y divide-gray-50 rounded-lg border border-gray-100">
                {product.variants.map((variant) => (
                  <li key={variant.key} className="flex flex-wrap items-center justify-between gap-3 px-3 py-2">
                    <span className="text-sm text-gray-700">{variant.name}{variant.sku ? <span className="text-xs text-gray-400"> · {variant.sku}</span> : null}</span>
                    <span className="flex flex-wrap items-center gap-3">
                      <StatusBadge status={variant.state} label={variant.state === 'in' ? `${variant.stock_quantity} in stock` : undefined} />
                      <StockEditor label={`${product.name} ${variant.name}`} current={variant.stock_quantity} onSave={saveStock(product, variant.key)} />
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}

            {openHistory === product.id ? <div className="mt-3 rounded-lg border border-gray-100 bg-gray-50"><History productId={product.id} /></div> : null}
          </div>
        ))}
      </div>

      <Pagination pagination={pagination} onPage={(page) => setFilters({ page })} />
    </div>
  );
};

export default SellerInventory;
