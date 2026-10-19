import React, { useCallback, useEffect, useRef, useState } from 'react';
import useLiveRefresh from '../../hooks/useLiveRefresh';
import useLatestRequest from '../../hooks/useLatestRequest';
import { Link } from 'react-router-dom';
import { sellerPortalService } from '../../services';
import { useToast } from '../../components/ToastProvider';
import {
  Button, Card, CARD_GRID, CARD_LIST_ITEM, ConfirmDialog, Empty, ErrorState, Field, Loading, PageHeader, Pagination, StatCard, StatusBadge, Tabs,
  TABLE_WRAP, TBODY, TD, TH, THEAD, TR, apiError, formatDate, formatDateTime, money,
} from '../../components/seller/ui';
import { ListToolbar, useListFilters } from '../../components/seller/filters';

const newKey = () => (window.crypto?.randomUUID ? window.crypto.randomUUID() : `k-${Date.now()}-${Math.random().toString(36).slice(2)}`);

// One URL-backed filter set; switching tabs clears the other tab's filters.
const DEFAULTS = {
  tab: 'transactions', search: '', status: '', type: '', from: '', to: '',
};
const CLEARED = {
  search: '', status: '', type: '', from: '', to: '',
};
const ORDER_STATUSES = [['', 'Any order status'], ...['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'].map((s) => [s, s[0].toUpperCase() + s.slice(1)])];
const LEDGER_TYPES = [['', 'All entry types'], ['sale_earnings_credit', 'Sale earnings'], ['sale_commission', 'Commission'], ['commission_reversal', 'Commission reversal'], ['refund_adjustment', 'Refund / cancellation'], ['payout', 'Payout'], ['payout_reversal', 'Payout reversal']];
const PAYOUT_STATUSES = [['', 'Any status'], ['requested', 'Requested'], ['completed', 'Paid'], ['rejected', 'Rejected'], ['failed', 'Failed']];
const PAYOUT_LABEL = { requested: 'Requested', completed: 'Paid', rejected: 'Rejected', failed: 'Failed' };
const DATE = { type: 'date-range', fromKey: 'from', toKey: 'to' };

const TAB_CONFIG = {
  transactions: {
    noun: 'order lines', placeholder: 'Search order number', hideSearch: false,
    filters: [{ key: 'status', label: 'Order status', options: ORDER_STATUSES }, { ...DATE, label: 'Posted date' }],
  },
  ledger: {
    noun: 'entries', placeholder: '', hideSearch: true,
    filters: [{ key: 'type', label: 'Entry type', options: LEDGER_TYPES }, { ...DATE, label: 'Entry date' }],
  },
  payouts: {
    noun: 'payouts', placeholder: '', hideSearch: true,
    filters: [{ key: 'status', label: 'Payout status', options: PAYOUT_STATUSES }, { ...DATE, label: 'Requested date' }],
  },
};

/** Generic server-paginated list for one earnings tab. */
const useTabData = (fetcher, filters, keys) => {
  const [state, setState] = useState({ loading: true, rows: [], pagination: null, error: '' });
  const params = {};
  keys.forEach((k) => { if (filters[k]) params[k] = filters[k]; });
  const signature = JSON.stringify([params, filters.page]);
  const latest = useLatestRequest();
  const load = useCallback((silent = false) => {
    if (!silent) setState((s) => ({ ...s, loading: true, error: '' }));
    return latest.guard(fetcher({ ...params, page: filters.page, limit: 15 }))
      .then((res) => setState({ loading: false, rows: res.data.data, pagination: res.data.pagination, error: '' }))
      .catch((err) => setState((s) => ({ ...s, loading: false, error: apiError(err, 'Could not load this list.') })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, fetcher]);
  useEffect(() => { load(); }, [load]);
  useLiveRefresh(['earnings', 'payout', 'order'], () => load(true));
  return [state, load];
};

const Transactions = ({ state }) => (
  <>
    <div className={TABLE_WRAP}>
      <table className="min-w-full text-sm">
        <thead className={THEAD}>
          <tr><th className={TH}>Order / product</th><th className={TH}>Qty</th><th className={TH}>Original price</th><th className={TH}>Paid price</th><th className={TH}>Commission</th><th className={TH}>Refunds</th><th className={TH}>Net</th></tr>
        </thead>
        <tbody className={TBODY}>
          {state.rows.map((row, i) => (
            <tr key={`${row.order_id}-${i}`} className={`${TR} align-top`}>
              <td className={TD}><p className="font-semibold text-primary">#{row.order_code}</p><p className="max-w-[220px] truncate text-xs text-gray-500">{row.product}</p><p className="mt-0.5 text-xs text-gray-400">{formatDate(row.posted_on)} · <StatusBadge status={row.order_status} /></p></td>
              <td className={TD}>{row.quantity}</td>
              <td className={`${TD} whitespace-nowrap`}>{money(row.original_unit_price)}</td>
              <td className={`${TD} whitespace-nowrap`}>{money(row.unit_price)}</td>
              <td className={`${TD} whitespace-nowrap`}>{money(row.commission)}<p className="text-xs text-gray-400">{row.commission_rate_percent}% of {money(row.commission_base)}</p></td>
              <td className={`${TD} whitespace-nowrap`}>{row.refunds_and_cancellations ? money(row.refunds_and_cancellations) : '—'}</td>
              <td className={`${TD} whitespace-nowrap font-semibold`}>{money(row.net)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <ul className={CARD_GRID}>
      {state.rows.map((row, i) => (
        <li key={`${row.order_id}-${i}`} className={CARD_LIST_ITEM}>
          <div className="flex justify-between gap-2"><p className="font-semibold text-primary">#{row.order_code}</p><StatusBadge status={row.order_status} /></div>
          <p className="mt-1 break-words text-sm text-gray-600">{row.product} × {row.quantity}</p>
          <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <div><dt className="text-xs text-gray-400">Original price</dt><dd>{money(row.original_unit_price)}</dd></div>
            <div><dt className="text-xs text-gray-400">Paid price</dt><dd>{money(row.unit_price)}</dd></div>
            <div><dt className="text-xs text-gray-400">Commission ({row.commission_rate_percent}%)</dt><dd>{money(row.commission)}</dd></div>
            <div><dt className="text-xs text-gray-400">Net</dt><dd className="font-semibold">{money(row.net)}</dd></div>
          </dl>
          <p className="mt-2 text-xs text-gray-400">Commission base {money(row.commission_base)} (original price × quantity)</p>
        </li>
      ))}
    </ul>
  </>
);

const Ledger = ({ state }) => (
  <>
    <p className="mb-3 text-xs text-gray-500">The ledger is append-only: corrections are shown as new opposite entries.</p>
    <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white shadow-card">
      {state.rows.map((e) => (
        <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
          <span>
            <span className="font-medium text-gray-800">{e.label}</span>
            <span className="block text-xs text-gray-400">{e.order_code ? `Order #${e.order_code} · ` : ''}{e.reason.replace(/_/g, ' ')}{e.commission_rate_percent != null ? ` · ${e.commission_rate_percent}% of ${money(e.commission_base)}` : ''}</span>
          </span>
          <span className="text-right">
            <strong className={e.amount < 0 ? 'text-rose-600' : 'text-emerald-600'}>{e.amount < 0 ? '−' : '+'}{money(Math.abs(e.amount))}</strong>
            <span className="block text-xs text-gray-400">{formatDateTime(e.created_at)}</span>
          </span>
        </li>
      ))}
    </ul>
  </>
);

const Payouts = ({ state }) => (
  <>
    <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white shadow-card">
      {state.rows.map((p) => (
        <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
          <span>
            <strong>{money(p.amount)}</strong>
            <span className="block text-xs text-gray-400">Requested {formatDate(p.requested_on)}{p.processed_on ? ` · processed ${formatDate(p.processed_on)}` : ''}</span>
            {p.reference ? <span className="block text-xs text-gray-500">Reference: {p.reference}</span> : null}
            {p.admin_note ? <span className="block text-xs text-rose-600">{p.admin_note}</span> : null}
          </span>
          <StatusBadge status={p.status === 'requested' ? 'pending' : p.status === 'completed' ? 'paid' : p.status} label={PAYOUT_LABEL[p.status]} />
        </li>
      ))}
    </ul>
    <p className="mt-3 text-xs text-gray-400">AHM Mart records transfers manually. We do not collect bank details in this dashboard.</p>
  </>
);

const FETCHERS = {
  transactions: (params) => sellerPortalService.listTransactions(params),
  ledger: (params) => sellerPortalService.listLedger(params),
  payouts: (params) => sellerPortalService.listPayouts(params),
};

const TabList = ({ tab, filters, setFilters, reset, refreshKey }) => {
  const cfg = TAB_CONFIG[tab];
  const [state, load] = useTabData(FETCHERS[tab], filters, ['search', 'status', 'type', 'from', 'to']);
  useEffect(() => { if (refreshKey) load(); }, [refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const filtered = ['search', 'status', 'type', 'from', 'to'].some((k) => filters[k]);
  const { pagination } = state;
  const View = { transactions: Transactions, ledger: Ledger, payouts: Payouts }[tab];

  return (
    <div className="space-y-3">
      <ListToolbar
        filters={cfg.filters}
        hideSearch={cfg.hideSearch}
        searchPlaceholder={cfg.placeholder}
        searchLabel="Search by order number"
        values={filters}
        defaults={DEFAULTS}
        onChange={setFilters}
        onReset={reset}
        total={pagination?.total}
        loading={state.loading}
        noun={cfg.noun}
      />
      {state.error ? <ErrorState message={state.error} onRetry={load} /> : null}
      {state.loading && state.rows.length === 0 ? <Loading minHeight={160} /> : null}
      {!state.loading && !state.error && state.rows.length === 0 ? (
        <Empty
          title={filtered ? 'Nothing matches your filters' : { transactions: 'No earnings yet', ledger: 'No ledger entries', payouts: 'No payout requests yet' }[tab]}
          text={filtered ? 'Try removing a filter or widening the date range.' : { transactions: 'Earnings appear here once an order is paid. Cash-on-delivery orders count when AHM Mart marks them delivered.', ledger: 'Every earning, commission, refund and payout is recorded here.', payouts: 'Request a payout once you have an available balance.' }[tab]}
          action={filtered ? <Button variant="outline" onClick={reset}>Clear filters</Button> : null}
        />
      ) : null}
      {state.rows.length > 0 ? (
        <div className={state.loading ? 'opacity-60 transition' : 'transition'} aria-busy={state.loading}>
          <View state={state} />
          <Pagination pagination={pagination} onPage={(page) => setFilters({ page })} />
        </div>
      ) : null}
    </div>
  );
};

const SellerEarnings = () => {
  const { addToast } = useToast();
  const [filters, setFilters] = useListFilters(DEFAULTS);
  const tab = TAB_CONFIG[filters.tab] ? filters.tab : 'transactions';
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [dialog, setDialog] = useState(false);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const keyRef = useRef(newKey()); // one key per form session: a double click replays instead of duplicating

  const latest = useLatestRequest();
  const load = useCallback((silent = false) => {
    if (!silent) setLoading(true);
    return latest.guard(sellerPortalService.getEarnings())
      .then((res) => { setData(res.data.data); setError(''); })
      .catch((err) => setError(apiError(err, 'Could not load your earnings.')))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);
  useLiveRefresh(['earnings', 'payout', 'order', 'commission'], () => load(true));

  // Clear-all keeps the active tab; only filters/search/page reset.
  const resetFilters = () => setFilters({ ...CLEARED });

  if (loading && !data) return <Loading text="Loading earnings" minHeight={360} />;
  if (error && !data) return <ErrorState message={error} onRetry={load} />;

  const b = data.balances;
  const openRequest = () => {
    setAmount(b.available_for_payout ? String(b.available_for_payout) : '');
    setNote('');
    keyRef.current = newKey();
    setDialog(true);
  };

  const submitPayout = async () => {
    const value = Number(amount);
    const fail = (userMessage) => { throw Object.assign(new Error(userMessage), { userMessage }); };
    if (!(value > 0) || Math.abs(value * 100 - Math.round(value * 100)) > 1e-6) fail('Enter a valid amount greater than 0 (up to 2 decimals).');
    if (value > b.available_for_payout) fail(`You can request up to ${money(b.available_for_payout)}.`);
    await sellerPortalService.requestPayout({ amount: value, note: note.trim() || undefined }, keyRef.current);
    addToast('Payout requested. It is pending until AHM Mart records the transfer.');
    setDialog(false);
    load();
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Earnings"
        subtitle={`Current commission: ${data.current_commission_percent}% of the original product price before discounts. Delivery charges are not charged commission.`}
        actions={<Button onClick={openRequest} disabled={b.available_for_payout <= 0}>Request payout</Button>}
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Gross product sales" value={money(b.gross_product_sales)} hint="Discounted amount customers paid" />
        <StatCard label="Commission charged" value={money(b.commission_charged)} hint="Net of reversals" />
        <StatCard label="Refunds & cancellations" value={money(b.refunds + b.cancellations)} />
        <StatCard label="Net earnings" value={money(b.net_earnings)} tone="text-primary" />
        <StatCard label="Pending earnings" value={money(b.pending_earnings)} hint="Paid, not delivered yet" />
        <StatCard label="Available balance" value={money(b.available_for_payout)} hint="Delivered, after payouts" tone="text-primary" />
        <StatCard label="Payouts requested" value={money(b.payout_requested)} hint="Awaiting AHM Mart" />
        <StatCard label="Paid out" value={money(b.paid_out)} hint="Recorded as transferred" />
      </div>

      <Card title="How these numbers work">
        <ul className="list-disc space-y-1 pl-5 text-sm text-gray-600">
          {Object.values(data.definitions).map((text) => <li key={text}>{text}</li>)}
          <li>Cash-on-delivery orders become earnings when AHM Mart marks them delivered (payment collected). Unpaid and cancelled orders never produce earnings.</li>
          <li>A payout request is not a payment. It is only paid once AHM Mart records the transfer.</li>
        </ul>
      </Card>

      <section className="space-y-4" aria-label="Earnings detail">
        <Tabs
          label="Earnings detail"
          value={tab}
          onChange={(next) => setFilters({ tab: next, ...CLEARED })}
          tabs={[['transactions', 'Order breakdown'], ['ledger', 'Ledger'], ['payouts', 'Payouts']]}
        />
        <TabList key={tab} tab={tab} filters={filters} setFilters={setFilters} reset={resetFilters} refreshKey={refreshKey} />
      </section>
      <p className="text-xs text-gray-400">Need to see sales trends? Open <Link to="/seller/analytics" className="font-semibold text-primary underline">Analytics</Link>.</p>

      <ConfirmDialog
        open={dialog}
        title="Request a payout"
        confirmLabel="Request payout"
        message={`Available now: ${money(b.available_for_payout)}`}
        onClose={() => setDialog(false)}
        onConfirm={submitPayout}
        extra={(
          <div className="mt-4 space-y-3">
            <Field label="Amount (Rs.)" htmlFor="payout-amount">
              <input id="payout-amount" inputMode="decimal" className="input-field" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))} />
            </Field>
            <Field label="Note (optional)" htmlFor="payout-note">
              <input id="payout-note" className="input-field" maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} />
            </Field>
          </div>
        )}
      />
    </div>
  );
};

export default SellerEarnings;
