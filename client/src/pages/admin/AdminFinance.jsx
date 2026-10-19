import React, { useCallback, useEffect, useRef, useState } from 'react';
import useLiveRefresh from '../../hooks/useLiveRefresh';
import useLatestRequest from '../../hooks/useLatestRequest';
import { adminFinanceService } from '../../services';
import { useToast } from '../../components/ToastProvider';
import {
  Button, Card, ConfirmDialog, Empty, ErrorState, Field, Loading, PageHeader, Pagination, StatCard, StatusBadge, Tabs,
  apiError, formatDate, formatDateTime, money, useDebounced,
} from '../../components/seller/ui';
import { Select } from '../../components/seller/filters';

const PAYOUT_LABEL = { requested: 'Requested', completed: 'Paid', rejected: 'Rejected', failed: 'Failed' };
const PayoutBadge = ({ status }) => <StatusBadge status={status === 'requested' ? 'pending' : status === 'completed' ? 'paid' : status} label={PAYOUT_LABEL[status]} />;

const useList = (fetcher, deps) => {
  const [state, setState] = useState({ loading: true, rows: [], pagination: null, error: '' });
  const latest = useLatestRequest();
  const load = useCallback((silent = false) => {
    if (!silent) setState((s) => ({ ...s, loading: true, error: '' }));
    return latest.guard(fetcher())
      .then((res) => setState({ loading: false, rows: res.data.data, pagination: res.data.pagination, error: '' }))
      .catch((err) => setState({ loading: false, rows: [], pagination: null, error: apiError(err) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => { load(); }, [load]);
  useLiveRefresh(['payout', 'earnings', 'commission', 'order', 'return'], () => load(true));
  return [state, load];
};

/* ------------------------------- Commission ------------------------------- */

const CommissionTab = () => {
  const { addToast } = useToast();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [rate, setRate] = useState('');
  const [note, setNote] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [formError, setFormError] = useState('');

  const latest = useLatestRequest();
  const load = useCallback(() => {
    return latest.guard(adminFinanceService.getCommission())
      .then((res) => { setData(res.data.data); setError(''); })
      .catch((err) => setError(apiError(err, 'Could not load commission settings.')));
  }, []);
  useEffect(() => { load(); }, [load]);
  useLiveRefresh(['commission'], () => load(true));

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!data) return <Loading minHeight={200} />;

  const validate = () => {
    const value = Number(rate);
    if (rate === '' || !Number.isFinite(value) || Math.abs(value * 100 - Math.round(value * 100)) > 1e-6) return 'Enter a percentage with at most 2 decimals.';
    if (value < data.min_percent || value > data.max_percent) return `Rate must be between ${data.min_percent}% and ${data.max_percent}%.`;
    if (value === data.current.rate_percent) return 'That is already the current rate.';
    return '';
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Current commission rate">
          <p className="text-4xl font-extrabold text-primary">{data.current.rate_percent}%</p>
          <p className="mt-1 text-sm text-gray-500">Effective since {formatDateTime(data.current.effective_from)}{data.current.set_by ? ` · set by ${data.current.set_by}` : ' · system default'}</p>
          <p className="mt-3 text-xs text-gray-500">Charged on the original product price before discounts. Delivery charges are excluded. {data.note}</p>
        </Card>
        <Card title="Change the rate">
          <form
            className="space-y-3"
            onSubmit={(e) => { e.preventDefault(); const problem = validate(); setFormError(problem); if (!problem) setConfirm(true); }}
            noValidate
          >
            <Field label="New rate (%)" htmlFor="rate" error={formError}>
              <input id="rate" inputMode="decimal" className="input-field" value={rate} onChange={(e) => { setRate(e.target.value.replace(/[^\d.]/g, '')); setFormError(''); }} />
            </Field>
            <Field label="Reason / note (optional)" htmlFor="rate-note">
              <input id="rate-note" className="input-field" maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} />
            </Field>
            <Button type="submit">Review change</Button>
          </form>
        </Card>
      </div>

      <Card title="Rate history">
        <ul className="divide-y divide-gray-50 text-sm">
          {data.history.map((h, i) => (
            <li key={h.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
              <span><strong>{h.rate_percent}%</strong>{i === 0 ? <span className="ml-2 rounded bg-primary-50 px-1.5 py-0.5 text-xs font-semibold text-primary">Current</span> : null}
                {h.note ? <span className="block text-xs text-gray-500">{h.note}</span> : null}</span>
              <span className="text-right text-xs text-gray-500">{formatDateTime(h.effective_from)}<br />{h.set_by || 'System default'}</span>
            </li>
          ))}
        </ul>
      </Card>

      <ConfirmDialog
        open={confirm}
        title={`Change commission to ${rate}%?`}
        message="Only earnings posted after this change use the new rate. Existing transactions and their refunds keep the rate they were charged at."
        confirmLabel="Change rate"
        onClose={() => setConfirm(false)}
        onConfirm={async () => {
          await adminFinanceService.setCommission(Number(rate), note.trim() || undefined);
          addToast(`Commission rate changed to ${rate}%.`);
          setConfirm(false);
          setRate('');
          setNote('');
          load();
        }}
      />
    </div>
  );
};

/* -------------------------------- Overview -------------------------------- */

const OverviewTab = () => {
  const [range, setRange] = useState({ from: '', to: '' });
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [tick, setTick] = useState(0);
  const silent = useRef(false);
  useLiveRefresh(['payout', 'earnings', 'commission', 'order', 'return'], () => { silent.current = true; setTick((t) => t + 1); });
  useEffect(() => {
    if (!silent.current) setData(null);
    silent.current = false;
    adminFinanceService.overview({ from: range.from || undefined, to: range.to || undefined })
      .then((res) => { setData(res.data.data); setError(''); })
      .catch((err) => setError(apiError(err)));
  }, [range, tick]);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <label className="text-xs text-gray-500">From<input type="date" className="input-field mt-0.5 !py-2 text-sm" value={range.from} onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))} /></label>
        <label className="text-xs text-gray-500">To<input type="date" className="input-field mt-0.5 !py-2 text-sm" value={range.to} onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))} /></label>
      </div>
      {error ? <ErrorState message={error} /> : !data ? <Loading minHeight={160} /> : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatCard label="Seller product sales" value={money(data.totals.gross_product_sales)} hint="Paid orders, discounted amounts" />
          <StatCard label="Commission earned" value={money(data.totals.commission_charged)} tone="text-primary" hint="Net of reversals" />
          <StatCard label="Refunds & cancellations" value={money(data.totals.refunds + data.totals.cancellations)} />
          <StatCard label="Net owed to sellers" value={money(data.totals.net_earnings)} hint="Before payouts" />
          <StatCard label="Payouts requested" value={money(data.totals.payout_requested)} hint={`${data.payouts.requested?.count || 0} open`} />
          <StatCard label="Paid out" value={money(data.totals.paid_out)} hint={`${data.payouts.completed?.count || 0} payouts`} />
          <StatCard label="Active sellers" value={data.approved_sellers} />
        </div>
      )}
    </div>
  );
};

/* ------------------------------ Seller balances ----------------------------- */

const SellerDetail = ({ id, onClose }) => {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    adminFinanceService.sellerFinance(id).then((res) => setData(res.data.data)).catch((err) => setError(apiError(err)));
  }, [id]);
  return (
    <Card
      title={data ? `${data.seller.shop_name} — ledger` : 'Seller ledger'}
      action={<Button variant="outline" onClick={onClose} className="!px-3 !py-2">Close</Button>}
    >
      {error ? <ErrorState message={error} /> : !data ? <Loading minHeight={120} /> : (
        <div className="space-y-4 text-sm">
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[['Gross', data.balances.gross_product_sales], ['Commission', data.balances.commission_charged], ['Net', data.balances.net_earnings], ['Available', data.balances.available_for_payout]].map(([l, v]) => (
              <div key={l}><dt className="text-xs text-gray-400">{l}</dt><dd className="font-bold">{money(v)}</dd></div>
            ))}
          </dl>
          <ul className="max-h-80 divide-y divide-gray-50 overflow-y-auto rounded-lg border border-gray-100">
            {data.ledger.map((e) => (
              <li key={e.id} className="flex flex-wrap justify-between gap-2 p-2.5">
                <span>{e.type.replace(/_/g, ' ')}<span className="block text-xs text-gray-400">{e.order_code ? `#${e.order_code} · ` : ''}{e.reason.replace(/_/g, ' ')}{e.commission_rate_percent != null ? ` · ${e.commission_rate_percent}%` : ''}</span></span>
                <span className="text-right"><strong className={e.amount < 0 ? 'text-rose-600' : 'text-emerald-600'}>{e.amount < 0 ? '−' : '+'}{money(Math.abs(e.amount))}</strong><span className="block text-xs text-gray-400">{formatDateTime(e.created_at)}</span></span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
};

const BalancesTab = () => {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const q = useDebounced(search);
  const [state] = useList(() => adminFinanceService.sellerBalances({ search: q || undefined, page, limit: 15 }), [q, page]);
  const [open, setOpen] = useState(null);

  return (
    <div className="space-y-4">
      <input type="search" aria-label="Search sellers" placeholder="Search store name" className="input-field sm:max-w-xs" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
      {state.error ? <ErrorState message={state.error} /> : null}
      {state.loading && !state.rows.length ? <Loading minHeight={160} /> : null}
      {!state.loading && !state.rows.length && !state.error ? <Empty title="No sellers" /> : null}
      {state.rows.length ? (
        <>
          <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white shadow-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <th className="p-3">Seller</th><th className="p-3">Gross</th><th className="p-3">Commission</th><th className="p-3">Net</th>
                  <th className="p-3">Pending</th><th className="p-3">Available</th><th className="p-3">Requested</th><th className="p-3">Paid out</th><th className="p-3"><span className="sr-only">Ledger</span></th>
                </tr>
              </thead>
              <tbody>
                {state.rows.map((s) => (
                  <tr key={s.id} className="border-b border-gray-50">
                    <td className="p-3 font-semibold text-gray-900">{s.shop_name}<span className="ml-2"><StatusBadge status={s.status} /></span></td>
                    <td className="p-3">{money(s.gross_product_sales)}</td>
                    <td className="p-3">{money(s.commission_charged)}</td>
                    <td className="p-3 font-semibold">{money(s.net_earnings)}</td>
                    <td className="p-3">{money(s.pending_earnings)}</td>
                    <td className="p-3">{money(s.available_for_payout)}</td>
                    <td className="p-3">{money(s.payout_requested)}</td>
                    <td className="p-3">{money(s.paid_out)}</td>
                    <td className="p-3 text-right"><button type="button" onClick={() => setOpen(s.id)} className="font-semibold text-primary hover:underline">Ledger</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination pagination={state.pagination} onPage={setPage} />
        </>
      ) : null}
      {open ? <SellerDetail id={open} onClose={() => setOpen(null)} /> : null}
    </div>
  );
};

/* --------------------------------- Payouts --------------------------------- */

const PayoutsTab = () => {
  const { addToast } = useToast();
  const [status, setStatus] = useState('requested');
  const [page, setPage] = useState(1);
  const [state, reload] = useList(() => adminFinanceService.listPayouts({ status: status || undefined, page, limit: 15 }), [status, page]);
  const [action, setAction] = useState(null); // { type, payout }

  const config = action && {
    complete: {
      title: 'Record payout as paid', confirmLabel: 'Mark as paid', requireReason: true, reasonLabel: 'Transfer reference (e.g. bank transaction ID)',
      message: `Only confirm after you have actually transferred ${money(action.payout.amount)} to ${action.payout.shop_name}. The seller will see this as paid.`,
      run: (text) => adminFinanceService.completePayout(action.payout.id, text),
    },
    reject: {
      title: 'Reject payout request', confirmLabel: 'Reject', danger: true, requireReason: true, reasonLabel: 'Reason shown to the seller',
      message: 'The amount returns to the seller\'s available balance.',
      run: (text) => adminFinanceService.rejectPayout(action.payout.id, text),
    },
    fail: {
      title: 'Mark payout as failed', confirmLabel: 'Mark failed', danger: true, requireReason: true, reasonLabel: 'What went wrong?',
      message: 'Use this if the transfer bounced or was not received. The amount returns to the seller\'s available balance.',
      run: (text) => adminFinanceService.failPayout(action.payout.id, text),
    },
  }[action.type];

  return (
    <div className="space-y-4">
      <Select aria-label="Payout status" className="sm:max-w-xs" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
        <option value="requested">Awaiting processing</option><option value="">All</option><option value="completed">Paid</option><option value="rejected">Rejected</option><option value="failed">Failed</option>
      </Select>
      <p className="text-xs text-gray-500">AHM Mart pays sellers manually. No bank details are stored in the system, so arrange the transfer outside it and record the reference here.</p>
      {state.error ? <ErrorState message={state.error} onRetry={reload} /> : null}
      {state.loading && !state.rows.length ? <Loading minHeight={160} /> : null}
      {!state.loading && !state.rows.length && !state.error ? <Empty title="No payouts" /> : null}
      <ul className="space-y-3">
        {state.rows.map((p) => (
          <li key={p.id} className="rounded-xl border border-gray-100 bg-white p-4 shadow-card">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-gray-900">{p.shop_name} · {money(p.amount)}</p>
                <p className="text-xs text-gray-500">Requested {formatDateTime(p.requested_on)}{p.processed_on ? ` · processed ${formatDateTime(p.processed_on)}` : ''}</p>
                {p.seller_note ? <p className="mt-1 text-sm text-gray-600">Seller note: {p.seller_note}</p> : null}
                {p.reference ? <p className="text-xs text-gray-500">Reference: {p.reference}</p> : null}
                {p.admin_note ? <p className="text-xs text-rose-600">{p.admin_note}</p> : null}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <PayoutBadge status={p.status} />
                {p.status === 'requested' ? (
                  <>
                    <Button onClick={() => setAction({ type: 'complete', payout: p })} className="!px-3 !py-2">Mark paid</Button>
                    <Button variant="outline" onClick={() => setAction({ type: 'reject', payout: p })} className="!px-3 !py-2">Reject</Button>
                  </>
                ) : null}
                {['requested', 'completed'].includes(p.status) ? <Button variant="outline" onClick={() => setAction({ type: 'fail', payout: p })} className="!px-3 !py-2 !text-rose-600">Mark failed</Button> : null}
              </div>
            </div>
          </li>
        ))}
      </ul>
      <Pagination pagination={state.pagination} onPage={setPage} />

      <ConfirmDialog
        open={Boolean(action)}
        {...(config || {})}
        onClose={() => setAction(null)}
        onConfirm={async (text) => {
          await config.run(text);
          addToast('Payout updated.');
          setAction(null);
          reload();
        }}
      />
    </div>
  );
};

/* --------------------------------- Report --------------------------------- */

const ReportTab = () => {
  const [group, setGroup] = useState('day');
  const [range, setRange] = useState({ from: '', to: '' });
  const [page, setPage] = useState(1);
  const [state] = useList(() => adminFinanceService.commissionReport({ group, from: range.from || undefined, to: range.to || undefined, page, limit: 20 }), [group, range, page]);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-xs text-gray-500">Group by
          <Select className="mt-0.5" value={group} onChange={(e) => { setGroup(e.target.value); setPage(1); }}>
            <option value="day">Date</option><option value="seller">Seller</option><option value="order">Order</option>
          </Select>
        </label>
        <label className="text-xs text-gray-500">From<input type="date" className="input-field mt-0.5 !py-2 text-sm" value={range.from} onChange={(e) => { setRange((r) => ({ ...r, from: e.target.value })); setPage(1); }} /></label>
        <label className="text-xs text-gray-500">To<input type="date" className="input-field mt-0.5 !py-2 text-sm" value={range.to} onChange={(e) => { setRange((r) => ({ ...r, to: e.target.value })); setPage(1); }} /></label>
      </div>
      {state.error ? <ErrorState message={state.error} /> : null}
      {state.loading && !state.rows.length ? <Loading minHeight={160} /> : null}
      {!state.loading && !state.rows.length && !state.error ? <Empty title="No commission yet" text="Commission is recorded when orders are paid." /> : null}
      {state.rows.length ? (
        <>
          <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white shadow-card">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-100 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <th className="p-3">{{ day: 'Date', seller: 'Seller', order: 'Order' }[group]}</th><th className="p-3">Commission base</th><th className="p-3">Commission (net)</th>
              </tr></thead>
              <tbody>
                {state.rows.map((r) => (
                  <tr key={r.key} className="border-b border-gray-50">
                    <td className="p-3 font-medium">{group === 'day' ? formatDate(r.label) : group === 'order' ? `#${r.label}` : r.label}</td>
                    <td className="p-3">{money(r.commission_base)}</td>
                    <td className="p-3 font-semibold">{money(r.commission)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination pagination={state.pagination} onPage={setPage} />
        </>
      ) : null}
    </div>
  );
};

const TABS = [['overview', 'Overview'], ['commission', 'Commission rate'], ['balances', 'Seller balances'], ['payouts', 'Payouts'], ['report', 'Commission report']];

const AdminFinance = () => {
  const [tab, setTab] = useState('overview');
  return (
    <div className="animate-fade-in space-y-5">
      <PageHeader title="Seller finance" subtitle="Commission settings, seller earnings and payouts." />
      <Tabs label="Finance sections" tabs={TABS} value={tab} onChange={setTab} />
      {tab === 'overview' ? <OverviewTab /> : null}
      {tab === 'commission' ? <CommissionTab /> : null}
      {tab === 'balances' ? <BalancesTab /> : null}
      {tab === 'payouts' ? <PayoutsTab /> : null}
      {tab === 'report' ? <ReportTab /> : null}
    </div>
  );
};

export default AdminFinance;
