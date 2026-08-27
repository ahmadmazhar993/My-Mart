import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { orderService } from '../../services';
import { PAYMENT_METHOD_LABELS } from '../../config/paymentAccounts';

const STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];

const statusClasses = {
  pending: 'bg-amber-100 text-amber-700',
  confirmed: 'bg-blue-100 text-blue-700',
  processing: 'bg-indigo-100 text-indigo-700',
  shipped: 'bg-purple-100 text-purple-700',
  delivered: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-rose-100 text-rose-700',
};

const paymentStatusClasses = {
  pending: 'bg-slate-100 text-slate-700',
  paid: 'bg-emerald-100 text-emerald-700',
  unpaid: 'bg-amber-100 text-amber-700',
  failed: 'bg-rose-100 text-rose-700',
  refunded: 'bg-violet-100 text-violet-700',
};

const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Filter panel UI state (draft values until Apply)
  const [filterOpen, setFilterOpen] = useState(false);
  const [draftStatus, setDraftStatus] = useState('');
  const [draftPayment, setDraftPayment] = useState('');
  const [draftStart, setDraftStart] = useState('');
  const [draftEnd, setDraftEnd] = useState('');
  const filterButtonRef = useRef(null);
  const panelRef = useRef(null);

  const loadOrders = (nextPage = page) => {
    setLoading(true);
    setError('');
    orderService.getAllOrders({
      page: nextPage,
      limit: 10,
      status: statusFilter || undefined,
      paymentStatus: paymentFilter || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    })
      .then((res) => {
        setOrders(res.data?.data || []);
        setPagination(res.data?.pagination || null);
      })
      .catch(() => setError('Failed to load orders'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadOrders(page); }, [page, statusFilter, paymentFilter, startDate, endDate]);

  // Focus management + simple focus trap for filter panel
  useEffect(() => {
    if (!filterOpen) return undefined;

    const panel = panelRef.current;
    if (!panel) return undefined;

    const focusableSelector = 'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';
    const getFocusable = () => Array.from(panel.querySelectorAll(focusableSelector)).filter((el) => el.offsetParent !== null);

    // focus first control
    const focusable = getFocusable();
    const first = focusable[0];
    if (first) first.focus();

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setFilterOpen(false);
        return;
      }

      if (e.key === 'Tab') {
        const list = getFocusable();
        if (list.length === 0) return;
        const firstEl = list[0];
        const lastEl = list[list.length - 1];
        const active = document.activeElement;
        if (!e.shiftKey && active === lastEl) {
          e.preventDefault();
          firstEl.focus();
        } else if (e.shiftKey && active === firstEl) {
          e.preventDefault();
          lastEl.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      // return focus to filter button
      try { filterButtonRef.current?.focus(); } catch (err) { /* ignore */ }
    };
  }, [filterOpen]);

  const getProductNames = (order) => {
    const fromProductName = order?.product_name;
    if (typeof fromProductName === 'string' && fromProductName.trim()) {
      return fromProductName;
    }

    const fromProductNames = order?.product_names;
    if (typeof fromProductNames === 'string' && fromProductNames.trim()) {
      return fromProductNames;
    }

    const productItems = Array.isArray(order?.products)
      ? order.products
      : Array.isArray(order?.items)
        ? order.items
        : [];

    const names = productItems
      .map((item) => item?.product_name || item?.name || item?.product?.name || item?.product?.product_name)
      .filter(Boolean);

    return names.length ? names.join(', ') : '—';
  };

  const broadcastOrderUpdate = () => {
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel('orders-updates');
      channel.postMessage({ type: 'orders-updated' });
      channel.close();
    }

    localStorage.setItem('orders:updated', String(Date.now()));
    window.dispatchEvent(new Event('orders:updated'));
  };

  const handleStatusChange = async (id, status) => {
    try {
      await orderService.updateOrderStatus(id, status);
      broadcastOrderUpdate();
      loadOrders(page);
    } catch {
      setError('Failed to update order status');
    }
  };

  const handlePaymentApproval = async (id) => {
    try {
      await orderService.updateOrderStatus(id, undefined, 'paid');
      broadcastOrderUpdate();
      loadOrders(page);
    } catch {
      setError('Failed to update payment status');
    }
  };

  const renderBadge = (value, type) => {
    const classes = type === 'status'
      ? statusClasses[value?.toLowerCase?.() || 'pending'] || statusClasses.pending
      : paymentStatusClasses[value?.toLowerCase?.() || 'pending'] || paymentStatusClasses.pending;

    return (
      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${classes}`}>
        {value || 'pending'}
      </span>
    );
  };

  const totalPages = pagination?.totalPages || 1;
  const limit = pagination?.limit || 10;
  const totalItems = pagination?.total || orders.length;
  const startItem = orders.length ? (page - 1) * limit + 1 : 0;
  const endItem = Math.min(page * limit, totalItems);

  const getPageNumbers = (current, total) => {
    const delta = 1;
    const range = [];
    const rangeWithDots = [];
    let last;

    for (let i = 1; i <= total; i++) {
      if (i === 1 || i === total || (i >= current - delta && i <= current + delta)) {
        range.push(i);
      }
    }

    for (const i of range) {
      if (last) {
        if (i - last === 2) {
          rangeWithDots.push(last + 1);
        } else if (i - last > 2) {
          rangeWithDots.push('...');
        }
      }
      rangeWithDots.push(i);
      last = i;
    }

    return rangeWithDots;
  };

  return (
    <div className="animate-fade-in space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-dark">Orders</h2>
          <p className="text-sm text-gray-500">Manage customer orders</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setDraftStatus(statusFilter);
              setDraftPayment(paymentFilter);
              setDraftStart(startDate);
              setDraftEnd(endDate);
              setFilterOpen(true);
            }}
            ref={filterButtonRef}
            className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L15 14.414V19a1 1 0 01-.553.894l-3 1.5A1 1 0 0010 20.5V14.414L3.293 6.707A1 1 0 013 6V4z" />
            </svg>
            Filter
            {(() => {
              const count = (statusFilter ? 1 : 0) + (paymentFilter ? 1 : 0) + ((startDate || endDate) ? 1 : 0);
              return count > 0 ? <span className="ml-1 inline-flex h-5 min-w-[18px] items-center justify-center rounded-full bg-primary px-2 text-xs font-semibold text-white">{count}</span> : null;
            })()}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Filter panel overlay & panel (rendered only when open to avoid aria-hidden on focusable elements) */}
      {filterOpen && (
        <>
          <div className="fixed inset-0 z-40">
            <div className="absolute inset-0 bg-black/30" onClick={() => setFilterOpen(false)} />
          </div>

          <div className="fixed inset-0 z-50 flex items-end justify-center md:items-start md:justify-end">
            <div ref={panelRef} role="dialog" aria-modal="true" aria-labelledby="orders-filter-title" className="w-full max-w-md md:w-96 bg-white shadow-lg rounded-t-lg md:rounded-none md:h-full">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between" id="orders-filter-title">
          <h3 className="text-lg font-semibold">Filters</h3>
          <button type="button" onClick={() => setFilterOpen(false)} className="text-sm text-gray-600 hover:underline">Close</button>
        </div>

        <div className="p-4 space-y-4 overflow-auto">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select value={draftStatus} onChange={(e) => setDraftStatus(e.target.value)} className="input-field w-full" aria-label="Filter by status">
              <option value="">All</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Payment Status</label>
            <select value={draftPayment} onChange={(e) => setDraftPayment(e.target.value)} className="input-field w-full" aria-label="Filter by payment status">
              <option value="">All</option>
              <option value="unpaid">Unpaid</option>
              <option value="paid">Paid</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
            <div className="flex items-center gap-2">
              <input type="date" value={draftStart} onChange={(e) => setDraftStart(e.target.value)} className="input-field w-full" />
              <span className="text-sm text-gray-400">to</span>
              <input type="date" value={draftEnd} onChange={(e) => setDraftEnd(e.target.value)} className="input-field w-full" />
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-gray-100 flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              // Apply drafts to active filters
              setStatusFilter(draftStatus);
              setPaymentFilter(draftPayment);
              setStartDate(draftStart);
              setEndDate(draftEnd);
              setPage(1);
              setFilterOpen(false);
            }}
            className="btn-primary"
          >
            Apply Filters
          </button>

          <button
            type="button"
            onClick={() => {
              setDraftStatus('');
              setDraftPayment('');
              setDraftStart('');
              setDraftEnd('');
              setStatusFilter('');
              setPaymentFilter('');
              setStartDate('');
              setEndDate('');
              setPage(1);
              setFilterOpen(false);
            }}
            className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Clear All
          </button>
        </div>
          </div>
          </div>
        </>
      )}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <div className="p-6 text-sm text-gray-500">Loading...</div>
        ) : orders.length === 0 ? (
          <div className="p-6 text-sm text-gray-500">No orders yet.</div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full text-sm">
                <thead className="sticky top-0 z-10 bg-gray-50/95 text-left text-gray-600 backdrop-blur">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Order #</th>
                    <th className="px-4 py-3 font-semibold">Customer</th>
                    <th className="px-4 py-3 font-semibold">Product Name</th>
                    <th className="px-4 py-3 font-semibold">Total</th>
                    <th className="px-4 py-3 font-semibold">Payment Method</th>
                    <th className="px-4 py-3 font-semibold">Payment Status</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {orders.map((order) => {
                    const productNames = getProductNames(order);
                    const isOnlinePendingPayment = order.payment_method === 'online' && order.payment_status !== 'paid';

                    return (
                      <tr key={order.id} className="align-top transition-colors hover:bg-gray-50/80">
                        <td className="px-4 py-3 font-semibold text-gray-900">
                          <Link to={`/orders/${order.id}`} state={{ from: '/admin/orders' }} className="text-primary hover:underline">#{order.display_order_id || order.id}</Link>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-900">{String(order.userName || '—')}</span>
                            <span className="text-xs text-gray-500">{order.userEmail || ''}</span>
                          </div>
                        </td>
                        <td className="max-w-[240px] px-4 py-3">
                          <div className="truncate" title={productNames}>{productNames}</div>
                        </td>
                        <td className="px-4 py-3 font-semibold text-gray-900">Rs. {Number(order.total_price).toLocaleString()}</td>
                        <td className="px-4 py-3 text-gray-600">
                          {PAYMENT_METHOD_LABELS[order.payment_method] || order.payment_method || '—'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-2">
                            {renderBadge(order.payment_status, 'payment')}
                            {isOnlinePendingPayment && (
                              <button
                                type="button"
                                onClick={() => handlePaymentApproval(order.id)}
                                className="w-fit rounded-md bg-primary px-2.5 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-primary-600"
                              >
                                Approve Payment
                              </button>
                            )}
                            {order.payment_method === 'online' && order.payment_status === 'paid' && (
                              <span className="text-xs font-medium text-emerald-600">Receipt verified</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={order.status}
                            onChange={(e) => handleStatusChange(order.id, e.target.value)}
                            className="w-full min-w-[120px] rounded-md border border-gray-300 bg-white px-2.5 py-2 text-sm font-medium capitalize text-gray-700 shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                          >
                            {STATUSES.map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                          {order.created_at ? new Date(order.created_at).toLocaleDateString() : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 p-3 md:hidden">
              {orders.map((order) => {
                const productNames = getProductNames(order);
                const isOnlinePendingPayment = order.payment_method === 'online' && order.payment_status !== 'paid';

                return (
                  <div key={order.id} className="rounded-lg border border-gray-200 bg-gray-50 p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          <Link to={`/orders/${order.id}`} state={{ from: '/admin/orders' }} className="text-primary hover:underline">#{order.display_order_id || order.id}</Link>
                        </p>
                        <p className="text-sm text-gray-700">{String(order.userName || '—')}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900">Rs. {Number(order.total_price).toLocaleString()}</p>
                        <p className="text-xs text-gray-500">{order.created_at ? new Date(order.created_at).toLocaleDateString() : '—'}</p>
                      </div>
                    </div>

                    <div className="mt-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Product</span>
                        <span className="max-w-[60%] truncate text-sm text-gray-700" title={productNames}>{productNames}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Payment</span>
                        <span className="text-sm text-gray-700">
                          {PAYMENT_METHOD_LABELS[order.payment_method] || order.payment_method || '—'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Status</span>
                        {renderBadge(order.payment_status, 'payment')}
                      </div>
                    </div>

                    <div className="mt-3 flex flex-col gap-2">
                      {isOnlinePendingPayment && (
                        <button
                          type="button"
                          onClick={() => handlePaymentApproval(order.id)}
                          className="w-full rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-600"
                        >
                          Approve Payment
                        </button>
                      )}
                      <select
                        value={order.status}
                        onChange={(e) => handleStatusChange(order.id, e.target.value)}
                        className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium capitalize text-gray-700 shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-col gap-3 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-gray-600">
                {orders.length ? `Showing ${startItem}-${endItem} of ${totalItems} orders` : 'No records'}
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                  aria-label="First page"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 bg-white text-sm text-gray-500 shadow-sm transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
                >
                  «
                </button>

                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={!pagination?.hasPrevPage}
                  aria-label="Previous page"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 bg-white text-sm text-gray-700 shadow-sm transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ‹
                </button>

                <div className="flex items-center gap-1">
                  {getPageNumbers(page, totalPages).map((p, idx) =>
                    p === '...' ? (
                      <span key={`dots-${idx}`} className="inline-flex h-8 w-8 items-center justify-center text-sm text-gray-400">
                        …
                      </span>
                    ) : (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPage(p)}
                        aria-current={p === page ? 'page' : undefined}
                        className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition ${p === page
                          ? 'bg-primary text-white shadow-sm'
                          : 'border border-gray-300 bg-white text-gray-700 hover:border-primary hover:text-primary'
                          }`}
                      >
                        {p}
                      </button>
                    )
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setPage((current) => current + 1)}
                  disabled={!pagination?.hasNextPage}
                  aria-label="Next page"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 bg-white text-sm text-gray-700 shadow-sm transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ›
                </button>

                <button
                  type="button"
                  onClick={() => setPage(totalPages)}
                  disabled={page === totalPages}
                  aria-label="Last page"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 bg-white text-sm text-gray-500 shadow-sm transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
                >
                  »
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AdminOrders;
