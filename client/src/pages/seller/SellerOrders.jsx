import React, { useCallback, useEffect, useState } from 'react';
import useLiveRefresh from '../../hooks/useLiveRefresh';
import useLatestRequest from '../../hooks/useLatestRequest';
import { Link } from 'react-router-dom';
import { sellerPortalService } from '../../services';
import {
  Button, Empty, ErrorState, Loading, Pagination, StatusBadge,
  CARD_GRID, CARD_LIST_ITEM, TABLE_WRAP, TBODY, TD, TH, THEAD, TR, apiError, formatDate, money,
} from '../../components/seller/ui';
import { ListToolbar, useListFilters } from '../../components/seller/filters';

const DEFAULTS = {
  search: '', status: '', fulfillment: '', from: '', to: '',
};
const STATUS_OPTIONS = [['', 'Any order status'], ...['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'].map((s) => [s, s[0].toUpperCase() + s.slice(1)])];
const FULFILLMENT_OPTIONS = [['', 'Any fulfillment'], ['pending', 'Not started'], ['processing', 'Processing'], ['ready_to_ship', 'Ready to ship'], ['shipped', 'Shipped']];
const FILTERS = [
  { key: 'status', label: 'Order status', options: STATUS_OPTIONS },
  { key: 'fulfillment', label: 'Your fulfillment', options: FULFILLMENT_OPTIONS },
  { type: 'date-range', label: 'Order date', fromKey: 'from', toKey: 'to' },
];

const SellerOrders = () => {
  const [filters, setFilters, reset] = useListFilters(DEFAULTS);
  const [state, setState] = useState({ loading: true, rows: [], pagination: null, error: '' });

  const latest = useLatestRequest();
  const load = useCallback((silent = false) => {
    if (!silent) setState((s) => ({ ...s, loading: true, error: '' }));
    const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== ''));
    return latest.guard(sellerPortalService.listOrders({ ...params, limit: 15 }))
      .then((res) => setState({ loading: false, rows: res.data.data, pagination: res.data.pagination, error: '' }))
      .catch((err) => setState((s) => ({ ...s, loading: false, error: apiError(err, 'Could not load orders.') })));
  }, [filters]);
  useEffect(() => { load(); }, [load]);
  useLiveRefresh(['order'], () => load(true));

  const { rows, pagination } = state;
  const filtered = Object.keys(DEFAULTS).some((k) => filters[k] !== DEFAULTS[k]);

  return (
    <div className="animate-fade-in space-y-4">
      <ListToolbar
        title="Orders"
        subtitle="Orders that include your products. You only see your own items."
        searchPlaceholder="Search order number"
        searchLabel="Search orders by order number"
        filters={FILTERS}
        values={filters}
        defaults={DEFAULTS}
        onChange={setFilters}
        onReset={reset}
        total={pagination?.total}
        loading={state.loading}
        noun="orders"
      />

      {state.error ? <ErrorState message={state.error} onRetry={load} /> : null}
      {state.loading && rows.length === 0 ? <Loading text="Loading orders" /> : null}
      {!state.loading && !state.error && rows.length === 0 ? (
        <Empty
          title={filtered ? 'No orders match your filters' : 'No orders yet'}
          text={filtered ? 'Try removing a filter or widening the date range.' : 'When a customer buys one of your published products, the order will show up here.'}
          action={filtered ? <Button variant="outline" onClick={reset}>Clear filters</Button> : null}
        />
      ) : null}

      {rows.length > 0 ? (
        <div className={state.loading ? 'opacity-60 transition' : 'transition'} aria-busy={state.loading}>
          <div className={TABLE_WRAP}>
            <table className="min-w-full text-sm">
              <thead className={THEAD}>
                <tr>
                  <th className={TH}>Order</th><th className={TH}>Date</th><th className={TH}>Customer</th><th className={TH}>Items</th>
                  <th className={TH}>Your total</th><th className={TH}>Order status</th><th className={TH}>Payment</th><th className={TH}>Your fulfillment</th>
                </tr>
              </thead>
              <tbody className={TBODY}>
                {rows.map((order) => (
                  <tr key={order.id} className={TR}>
                    <td className={`${TD} font-semibold`}><Link to={`/seller/orders/${order.id}`} className="text-primary hover:underline">#{order.order_code}</Link></td>
                    <td className={`${TD} whitespace-nowrap text-gray-600`}>{formatDate(order.created_at)}</td>
                    <td className={`${TD} text-gray-600`}>{order.customer_name || '—'}</td>
                    <td className={`${TD} text-gray-600`}>{order.units}</td>
                    <td className={`${TD} whitespace-nowrap font-semibold`}>{money(order.seller_subtotal)}</td>
                    <td className={TD}><StatusBadge status={order.order_status} /></td>
                    <td className={TD}><StatusBadge status={order.payment_status} /></td>
                    <td className={TD}><StatusBadge status={order.fulfillment_status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className={CARD_GRID}>
            {rows.map((order) => (
              <li key={order.id}>
                <Link to={`/seller/orders/${order.id}`} className={`${CARD_LIST_ITEM} block hover:border-primary-200`}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-primary">#{order.order_code}</p>
                      <p className="text-xs text-gray-500">{formatDate(order.created_at)} · {order.customer_name || '—'}</p>
                    </div>
                    <p className="font-semibold">{money(order.seller_subtotal)}</p>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <StatusBadge status={order.order_status} />
                    <StatusBadge status={order.payment_status} />
                    <span className="text-xs text-gray-400">Your fulfillment:</span>
                    <StatusBadge status={order.fulfillment_status} />
                  </div>
                  <p className="mt-2 text-xs text-gray-400">{order.units} item(s)</p>
                </Link>
              </li>
            ))}
          </ul>
          <Pagination pagination={pagination} onPage={(page) => setFilters({ page })} />
        </div>
      ) : null}
    </div>
  );
};

export default SellerOrders;
