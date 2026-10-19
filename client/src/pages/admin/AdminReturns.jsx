import React, { useCallback, useEffect, useState } from 'react';
import useLiveRefresh from '../../hooks/useLiveRefresh';
import useLatestRequest from '../../hooks/useLatestRequest';
import { adminReturnService } from '../../services';
import { useToast } from '../../components/ToastProvider';
import {
  Button, Card, ConfirmDialog, Empty, ErrorState, Field, Loading, Pagination, StatusBadge,
  apiError, formatDate, money, CARD_LIST_ITEM,
} from '../../components/seller/ui';
import { ListToolbar, useListFilters } from '../../components/seller/filters';
import ReturnThread, { EvidenceGallery, REASON_LABEL } from '../../components/seller/ReturnThread';

const LABEL = { requested: 'Awaiting review', approved: 'Approved', received: 'Received', refunded: 'Refunded', rejected: 'Rejected', cancelled: 'Cancelled' };
const Status = ({ status }) => <StatusBadge status={{ requested: 'pending', received: 'processing', refunded: 'refunded' }[status] || status} label={LABEL[status]} />;

const Detail = ({ id, onClose, onChanged }) => {
  const { addToast } = useToast();
  const [ret, setRet] = useState(null);
  const [error, setError] = useState('');
  const [dialog, setDialog] = useState(null);
  const [amount, setAmount] = useState('');

  const latest = useLatestRequest();
  const load = useCallback(() => {
    return latest.guard(adminReturnService.get(id)).then((res) => { setRet(res.data.data); setAmount(String(res.data.data.max_refund)); setError(''); }).catch((err) => setError(apiError(err)));
  }, [id]);
  useEffect(() => { load(); }, [load]);
  useLiveRefresh(['return'], () => load(true));
  const done = (message) => { addToast(message); setDialog(null); load(); onChanged(); };

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!ret) return <Loading minHeight={160} />;
  const open = !['cancelled', 'rejected', 'refunded'].includes(ret.status);

  return (
    <Card title={`${ret.product} × ${ret.quantity} · #${ret.order_code}`} action={<Button variant="outline" onClick={onClose} className="!px-3 !py-2">Close</Button>}>
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-4 text-sm">
          <div className="flex flex-wrap items-center gap-2"><Status status={ret.status} /><span className="text-gray-500">{ret.shop_name} · {ret.customer?.name} ({ret.customer?.email}) · {formatDate(ret.created_at)}</span></div>
          <dl className="space-y-2">
            <div><dt className="text-xs text-gray-400">Reason</dt><dd className="font-medium">{REASON_LABEL[ret.reason] || ret.reason}</dd></div>
            {ret.details ? <div><dt className="text-xs text-gray-400">Details</dt><dd className="whitespace-pre-line break-words">{ret.details}</dd></div> : null}
            {ret.inspection_note ? <div><dt className="text-xs text-gray-400">Seller inspection</dt><dd>{ret.inspection_note}</dd></div> : null}
            {ret.decision_note ? <div><dt className="text-xs text-gray-400">Decision note</dt><dd>{ret.decision_note}</dd></div> : null}
            {ret.refund_amount != null ? <div><dt className="text-xs text-gray-400">Refunded</dt><dd className="font-semibold">{money(ret.refund_amount)}</dd></div> : null}
          </dl>
          <EvidenceGallery images={ret.evidence} />

          <div className="flex flex-wrap gap-2 border-t border-gray-100 pt-4">
            {ret.status === 'requested' ? (
              <>
                <Button onClick={() => setDialog('approve')}>Approve return</Button>
                <Button variant="danger" onClick={() => setDialog('reject')}>Reject</Button>
              </>
            ) : null}
            {['approved', 'received'].includes(ret.status) ? <Button onClick={() => setDialog('refund')}>Complete refund</Button> : null}
          </div>
          <p className="text-xs text-gray-400">Completing a refund records it as final and adjusts the seller&apos;s earnings and commission proportionally. Paying the customer back happens outside this system.</p>
        </div>
        <div>
          <h4 className="mb-2 font-semibold text-dark">Conversation</h4>
          <ReturnThread messages={ret.messages || []} canReply={open} onSend={async (body) => { await adminReturnService.message(id, body); load(); }} />
        </div>
      </div>

      <ConfirmDialog
        open={dialog === 'approve'} title="Approve this return?" confirmLabel="Approve" message="The seller will be asked to record the item when it arrives."
        onClose={() => setDialog(null)} onConfirm={async () => { await adminReturnService.approve(id, ''); done('Return approved.'); }}
      />
      <ConfirmDialog
        open={dialog === 'reject'} danger requireReason reasonLabel="Reason shown to the customer" title="Reject this return?" confirmLabel="Reject"
        onClose={() => setDialog(null)} onConfirm={async (note) => { await adminReturnService.reject(id, note); done('Return rejected.'); }}
      />
      <ConfirmDialog
        open={dialog === 'refund'} title="Complete refund" confirmLabel="Record refund"
        message={`Maximum refundable: ${money(ret.max_refund)} (product amount paid for ${ret.quantity} item(s), delivery excluded).`}
        extra={(
          <div className="mt-4">
            <Field label="Refund amount (Rs.)" htmlFor="refund-amount">
              <input id="refund-amount" inputMode="decimal" className="input-field" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))} />
            </Field>
          </div>
        )}
        onClose={() => setDialog(null)}
        onConfirm={async () => {
          const value = Number(amount);
          if (!(value > 0) || value > ret.max_refund || Math.abs(value * 100 - Math.round(value * 100)) > 1e-6) {
            throw Object.assign(new Error('bad amount'), { userMessage: `Enter an amount up to ${money(ret.max_refund)} (2 decimals).` });
          }
          await adminReturnService.refund(id, value);
          done('Refund recorded.');
        }}
      />
    </Card>
  );
};

const DEFAULTS = { search: '', status: 'requested' };
const FILTERS = [{ key: 'status', label: 'Status', options: [['all', 'All returns'], ...Object.entries(LABEL)] }];

const AdminReturns = () => {
  const { addToast } = useToast();
  const [filters, setFilters, reset] = useListFilters(DEFAULTS);
  const [state, setState] = useState({ loading: true, rows: [], pagination: null, error: '' });
  const [open, setOpen] = useState(null);
  const [windowDays, setWindowDays] = useState('');
  const [savingWindow, setSavingWindow] = useState(false);

  const latest = useLatestRequest();
  const load = useCallback((silent = false) => {
    if (!silent) setState((s) => ({ ...s, loading: true, error: '' }));
    return latest.guard(adminReturnService.list({ search: filters.search || undefined, status: filters.status === 'all' ? undefined : filters.status, page: filters.page, limit: 15 }))
      .then((res) => setState({ loading: false, rows: res.data.data, pagination: res.data.pagination, error: '' }))
      .catch((err) => setState((s) => ({ ...s, loading: false, error: apiError(err, 'Could not load returns.') })));
  }, [filters]);
  useEffect(() => { load(); }, [load]);
  useLiveRefresh(['return'], () => load(true));
  useEffect(() => { adminReturnService.getSettings().then((res) => setWindowDays(String(res.data.data.return_window_days))).catch(() => {}); }, []);

  const saveWindow = async (event) => {
    event.preventDefault();
    setSavingWindow(true);
    try {
      await adminReturnService.setReturnWindow(Number(windowDays));
      addToast('Return window saved.');
    } catch (err) {
      addToast(apiError(err), 'error');
    } finally {
      setSavingWindow(false);
    }
  };

  return (
    <div className="animate-fade-in space-y-5">
      <ListToolbar
        title="Returns & refunds"
        subtitle="You make the final decision on every return and complete every refund."
        searchPlaceholder="Search order number"
        searchLabel="Search returns by order number"
        filters={FILTERS}
        values={filters}
        defaults={DEFAULTS}
        onChange={setFilters}
        onReset={reset}
        total={state.pagination?.total}
        loading={state.loading}
        noun="returns"
      />

      <form onSubmit={saveWindow} className="flex flex-wrap items-end gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-card">
        <Field label="Return window (days after delivery)" htmlFor="window">
          <input id="window" inputMode="numeric" className="input-field !w-28" value={windowDays} onChange={(e) => setWindowDays(e.target.value.replace(/D/g, '').slice(0, 2))} />
        </Field>
        <Button type="submit" busy={savingWindow} disabled={windowDays === ''} variant="outline">Save window</Button>
      </form>

      {open ? <Detail id={open} onClose={() => setOpen(null)} onChanged={load} /> : null}
      {state.error ? <ErrorState message={state.error} onRetry={load} /> : null}
      {state.loading && !state.rows.length ? <Loading minHeight={160} /> : null}
      {!state.loading && !state.rows.length && !state.error ? <Empty title="No returns" text="Nothing matches this filter." /> : null}
      <ul className={`space-y-3 ${state.loading ? 'opacity-60' : ''}`}>
        {state.rows.map((r) => (
          <li key={r.id}>
            <button type="button" onClick={() => setOpen(r.id)} className={`${CARD_LIST_ITEM} block w-full text-left hover:border-primary-200`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="break-words font-semibold text-gray-900">{r.product} × {r.quantity} · #{r.order_code}</p>
                  <p className="text-xs text-gray-500">{r.shop_name} · {r.customer?.name} · {formatDate(r.created_at)}</p>
                </div>
                <Status status={r.status} />
              </div>
              <p className="mt-2 text-sm text-gray-600">{REASON_LABEL[r.reason] || r.reason}</p>
            </button>
          </li>
        ))}
      </ul>
      <Pagination pagination={state.pagination} onPage={(page) => setFilters({ page })} />
    </div>
  );
};

export default AdminReturns;
