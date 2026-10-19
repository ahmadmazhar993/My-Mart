import React, { useCallback, useEffect, useState } from 'react';
import useLiveRefresh from '../../hooks/useLiveRefresh';
import useLatestRequest from '../../hooks/useLatestRequest';
import { Link } from 'react-router-dom';
import { adminSellerService } from '../../services';
import {
  Button, Empty, ErrorState, Loading, Pagination, StatusBadge, CARD_GRID, CARD_LIST_ITEM,
  TABLE_WRAP, TBODY, TD, TH, THEAD, TR, apiError, formatDate,
} from '../../components/seller/ui';
import { ListToolbar, useListFilters } from '../../components/seller/filters';

const DEFAULTS = { search: '', status: '' };
const FILTERS = [{
  key: 'status',
  label: 'Account status',
  options: [['', 'All statuses'], ['pending', 'Pending applications'], ['approved', 'Approved'], ['rejected', 'Rejected'], ['suspended', 'Suspended']],
}];

const AdminSellers = () => {
  const [filters, setFilters, reset] = useListFilters(DEFAULTS);
  const [state, setState] = useState({ loading: true, rows: [], pagination: null, error: '' });

  const latest = useLatestRequest();
  const load = useCallback((silent = false) => {
    if (!silent) setState((s) => ({ ...s, loading: true, error: '' }));
    return latest.guard(adminSellerService.listSellers({
      search: filters.search || undefined, status: filters.status || undefined, page: filters.page, limit: 15,
    }))
      .then((res) => setState({ loading: false, rows: res.data.data, pagination: res.data.pagination, error: '' }))
      .catch((err) => setState((s) => ({ ...s, loading: false, error: apiError(err, 'Could not load sellers.') })));
  }, [filters]);
  useEffect(() => { load(); }, [load]);
  useLiveRefresh(['seller'], () => load(true));

  const { rows, pagination } = state;
  const filtered = filters.search || filters.status;

  return (
    <div className="animate-fade-in space-y-4">
      <ListToolbar
        title="Sellers"
        subtitle="Review applications and manage seller accounts."
        searchPlaceholder="Search store, name or email"
        searchLabel="Search sellers"
        filters={FILTERS}
        values={filters}
        defaults={DEFAULTS}
        onChange={setFilters}
        onReset={reset}
        total={pagination?.total}
        loading={state.loading}
        noun="sellers"
        actions={<Link to="/admin/seller-products" className="btn-secondary inline-flex min-h-[44px] items-center !px-4 !py-2.5 text-sm">Product review queue</Link>}
      />

      {state.error ? <ErrorState message={state.error} onRetry={load} /> : null}
      {state.loading && rows.length === 0 ? <Loading text="Loading sellers" /> : null}
      {!state.loading && !state.error && rows.length === 0 ? (
        <Empty
          title={filtered ? 'No sellers match your filters' : 'No sellers yet'}
          text={filtered ? 'Try removing a filter.' : 'Seller applications will appear here.'}
          action={filtered ? <Button variant="outline" onClick={reset}>Clear filters</Button> : null}
        />
      ) : null}

      {rows.length > 0 ? (
        <div className={state.loading ? 'opacity-60 transition' : 'transition'} aria-busy={state.loading}>
          <div className={TABLE_WRAP}>
            <table className="min-w-full text-sm">
              <thead className={THEAD}>
                <tr><th className={TH}>Store</th><th className={TH}>Owner</th><th className={TH}>Status</th><th className={TH}>Products</th><th className={TH}>Applied</th><th className={TH}><span className="sr-only">Open</span></th></tr>
              </thead>
              <tbody className={TBODY}>
                {rows.map((seller) => (
                  <tr key={seller.id} className={TR}>
                    <td className={`${TD} font-semibold text-gray-900`}>{seller.shop_name}</td>
                    <td className={`${TD} text-gray-600`}>{seller.user.name}<span className="block text-xs text-gray-400">{seller.user.email}</span></td>
                    <td className={TD}><StatusBadge status={seller.status} /></td>
                    <td className={`${TD} text-gray-600`}>{seller.products_count}</td>
                    <td className={`${TD} whitespace-nowrap text-gray-500`}>{formatDate(seller.applied_on)}</td>
                    <td className={`${TD} text-right`}><Link to={`/admin/sellers/${seller.id}`} className="font-semibold text-primary hover:underline">{seller.status === 'pending' ? 'Review' : 'Manage'}</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className={CARD_GRID}>
            {rows.map((seller) => (
              <li key={seller.id}>
                <Link to={`/admin/sellers/${seller.id}`} className={`${CARD_LIST_ITEM} block hover:border-primary-200`}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="break-words font-semibold text-gray-900">{seller.shop_name}</p>
                    <StatusBadge status={seller.status} />
                  </div>
                  <p className="mt-1 text-sm text-gray-600">{seller.user.name} · {seller.user.email}</p>
                  <p className="mt-1 text-xs text-gray-400">{seller.products_count} product(s) · applied {formatDate(seller.applied_on)}</p>
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

export default AdminSellers;
