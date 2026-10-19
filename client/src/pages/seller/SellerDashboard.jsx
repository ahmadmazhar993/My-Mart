import React, { useCallback, useEffect, useMemo, useState } from 'react';
import useLiveRefresh from '../../hooks/useLiveRefresh';
import useLatestRequest from '../../hooks/useLatestRequest';
import { Link } from 'react-router-dom';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Tooltip, Filler,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import { sellerPortalService } from '../../services';
import {
  Card, Empty, ErrorState, Loading, PageHeader, StatCard, StatusBadge, apiError, formatDate, formatDateTime, imageSrc, money,
} from '../../components/seller/ui';
import { RangePicker, daysAgo } from '../../components/seller/filters';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Tooltip, Filler);

const BRAND = '#059669';
const BRAND_SOFT = 'rgba(5, 150, 105, 0.12)';
const AMBER = '#F59E0B';


const baseOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: { x: { grid: { display: false }, ticks: { maxTicksLimit: 7, maxRotation: 0 } }, y: { beginAtZero: true } },
};

const shortDay = (day) => new Date(`${day}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });

const SellerDashboard = () => {
  const [range, setRange] = useState({ from: daysAgo(29), to: daysAgo(0) });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const latest = useLatestRequest();
  const load = useCallback((silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    return latest.guard(sellerPortalService.getDashboard(range))
      .then((res) => setData(res.data.data))
      .catch((err) => setError(apiError(err, 'Could not load your dashboard.')))
      .finally(() => setLoading(false));
  }, [range]);

  useEffect(() => { load(); }, [load]);
  useLiveRefresh(['order', 'product', 'inventory', 'return', 'earnings', 'payout'], () => load(true));

  const salesChart = useMemo(() => ({
    labels: (data?.series || []).map((row) => shortDay(row.day)),
    datasets: [{
      label: 'Sales (Rs.)',
      data: (data?.series || []).map((row) => row.sales),
      borderColor: BRAND,
      backgroundColor: BRAND_SOFT,
      fill: true,
      tension: 0.3,
      pointRadius: 2,
    }],
  }), [data]);

  const ordersChart = useMemo(() => ({
    labels: (data?.series || []).map((row) => shortDay(row.day)),
    datasets: [{ label: 'Orders', data: (data?.series || []).map((row) => row.orders), backgroundColor: AMBER, borderRadius: 3 }],
  }), [data]);

  const topChart = useMemo(() => ({
    labels: (data?.top_products || []).map((p) => (p.name.length > 22 ? `${p.name.slice(0, 21)}…` : p.name)),
    datasets: [{ label: 'Revenue (Rs.)', data: (data?.top_products || []).map((p) => p.revenue), backgroundColor: BRAND, borderRadius: 3 }],
  }), [data]);

  if (loading && !data) return <Loading text="Loading your dashboard" minHeight={360} />;
  if (error && !data) return <ErrorState message={error} onRetry={load} />;

  const t = data.totals;
  const p = data.products;
  const isNewSeller = p.total === 0 && t.total_sales === 0;
  const hasSales = data.series.some((row) => row.orders > 0);

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Overview"
        subtitle={`${formatDate(data.range.from)} – ${formatDate(data.range.to)}`}
        actions={<RangePicker from={range.from} to={range.to} onChange={setRange} />}
      />

      {error ? <ErrorState message={error} onRetry={load} /> : null}

      {isNewSeller ? (
        <Empty
          title="Welcome to AHM Mart!"
          text="Your store is approved. Add your first product to start selling. Products are reviewed by our team before they appear on the store."
          action={<Link to="/seller/products/new" className="btn-primary !px-5 !py-2.5 text-sm">Add your first product</Link>}
        />
      ) : null}

      <div className={`grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 ${loading ? 'opacity-60' : ''}`} aria-busy={loading}>
        <StatCard label="Total sales (all time)" value={money(t.total_sales)} hint="Excludes cancelled and refunded orders" tone="text-primary" />
        <StatCard label="Sales in period" value={money(t.period_sales)} hint={`${t.period_units} unit(s) sold`} />
        <StatCard label="Orders in period" value={t.orders} hint={`${t.pending_orders} pending or processing`} />
        <StatCard label="Orders to fulfil" value={t.orders_to_fulfil} hint="Confirmed, awaiting shipment" tone={t.orders_to_fulfil ? 'text-accent-dark' : 'text-dark'} />
        <StatCard label="Products listed" value={p.total} hint={`${p.published} published · ${p.pending_review} in review`} />
        <StatCard label="Low stock" value={p.low_stock} hint={`${p.out_of_stock} out of stock`} tone={p.low_stock || p.out_of_stock ? 'text-rose-600' : 'text-dark'} />
        <StatCard label="Cancelled orders" value={t.cancelled_orders} hint={money(t.cancelled_amount)} />
        <StatCard label="Refunded orders" value={t.refunded_orders} hint={money(t.refunded_amount)} />
      </div>

      <Card title="Earnings breakdown">
        <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <div><dt className="text-gray-500">Gross sales</dt><dd className="mt-0.5 text-lg font-bold">{money(t.period_sales)}</dd></div>
          <div><dt className="text-gray-500">Refunds</dt><dd className="mt-0.5 text-lg font-bold">{money(t.refunded_amount + (data.earnings.refunds || 0))}</dd><p className="text-xs text-gray-400">Refunded orders and returns</p></div>
          <div><dt className="text-gray-500">Commission (paid orders)</dt><dd className="mt-0.5 text-lg font-bold">{money(data.earnings.fees)}</dd></div>
          <div><dt className="text-gray-500">Net earnings (paid orders)</dt><dd className="mt-0.5 text-lg font-bold text-primary">{money(data.earnings.net_earnings)}</dd></div>
        </dl>
        <dl className="mt-4 grid grid-cols-2 gap-4 border-t border-gray-100 pt-4 text-sm sm:grid-cols-4">
          <div><dt className="text-gray-500">Pending earnings</dt><dd className="mt-0.5 font-semibold">{money(data.earnings.pending_earnings)}</dd></div>
          <div><dt className="text-gray-500">Available balance</dt><dd className="mt-0.5 font-semibold">{money(data.earnings.available_balance)}</dd></div>
          <div><dt className="text-gray-500">Payouts requested</dt><dd className="mt-0.5 font-semibold">{money(data.earnings.pending_payouts)}</dd></div>
          <div><dt className="text-gray-500">Paid out</dt><dd className="mt-0.5 font-semibold">{money(data.earnings.paid_out)}</dd></div>
        </dl>
        <p className="mt-3 rounded-lg bg-gray-50 p-3 text-xs text-gray-500">Gross sales here are discounted product amounts. Commission and net earnings count paid orders only, by posting date. Paid sales in this period: {money(t.period_paid_sales)}. <Link to="/seller/earnings" className="font-semibold text-primary underline">See the full breakdown</Link>.</p>
      </Card>

      {hasSales ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card title="Sales trend">
            <div className="h-56 sm:h-64" role="img" aria-label="Line chart of daily sales in rupees"><Line data={salesChart} options={baseOptions} /></div>
          </Card>
          <Card title="Order trend">
            <div className="h-56 sm:h-64" role="img" aria-label="Bar chart of daily order counts"><Bar data={ordersChart} options={{ ...baseOptions, scales: { ...baseOptions.scales, y: { beginAtZero: true, ticks: { precision: 0 } } } }} /></div>
          </Card>
        </div>
      ) : !isNewSeller ? (
        <Empty title="No orders in this period" text="Try a wider date range. Charts appear once customers place orders." />
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Best-performing products">
          {data.top_products.length === 0 ? (
            <p className="text-sm text-gray-500">Product performance will appear after your first sales.</p>
          ) : (
            <>
              <div className="h-48 sm:h-56" role="img" aria-label="Bar chart of revenue by product"><Bar data={topChart} options={{ ...baseOptions, indexAxis: 'y', scales: { x: { beginAtZero: true }, y: { grid: { display: false } } } }} /></div>
              <ul className="mt-3 divide-y divide-gray-50 text-sm">
                {data.top_products.map((product) => (
                  <li key={product.id} className="flex items-center justify-between gap-3 py-2">
                    <span className="min-w-0 truncate font-medium text-gray-800">{product.name}</span>
                    <span className="flex-shrink-0 text-gray-500">{product.units} sold · {money(product.revenue)}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>

        <Card title="Low-stock alerts" action={<Link to="/seller/inventory" className="text-sm font-semibold text-primary hover:underline">Manage</Link>}>
          {data.low_stock_products.length === 0 ? (
            <p className="text-sm text-gray-500">All products are well stocked.</p>
          ) : (
            <ul className="divide-y divide-gray-50">
              {data.low_stock_products.map((product) => (
                <li key={product.id} className="flex items-center gap-3 py-2.5">
                  {product.image_url ? <img src={imageSrc(product.image_url)} alt="" className="h-10 w-10 flex-shrink-0 rounded-md object-cover" /> : <span className="h-10 w-10 flex-shrink-0 rounded-md bg-gray-100" />}
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-800">{product.name}</span>
                  <StatusBadge status={product.stock_quantity <= 0 ? 'out' : 'low'} label={product.stock_quantity <= 0 ? 'Out of stock' : `${product.stock_quantity} left`} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Recent orders" className="lg:col-span-2" action={<Link to="/seller/orders" className="text-sm font-semibold text-primary hover:underline">View all</Link>}>
          {data.recent_orders.length === 0 ? (
            <p className="text-sm text-gray-500">No orders yet.</p>
          ) : (
            <ul className="divide-y divide-gray-50">
              {data.recent_orders.map((order) => (
                <li key={order.id}>
                  <Link to={`/seller/orders/${order.id}`} className="flex flex-wrap items-center justify-between gap-2 py-3 hover:bg-primary-50/40">
                    <span>
                      <span className="block font-semibold text-primary">#{order.order_code}</span>
                      <span className="text-xs text-gray-500">{formatDate(order.created_at)} · {order.units} item(s)</span>
                    </span>
                    <span className="flex items-center gap-3">
                      <StatusBadge status={order.fulfillment_status} />
                      <span className="text-sm font-semibold">{money(order.seller_subtotal)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Quick actions">
          <div className="grid gap-2">
            <Link to="/seller/products/new" className="btn-primary !justify-center !py-2.5 text-center text-sm">Add product</Link>
            <Link to="/seller/orders" className="btn-outline !justify-center !py-2.5 text-center text-sm">Manage orders</Link>
            <Link to="/seller/inventory" className="btn-outline !justify-center !py-2.5 text-center text-sm">Update inventory</Link>
          </div>
        </Card>
      </div>

      <Card title="Recent activity">
        {data.recent_activity.length === 0 ? (
          <p className="text-sm text-gray-500">Your recent changes will be listed here.</p>
        ) : (
          <ul className="divide-y divide-gray-50 text-sm">
            {data.recent_activity.map((entry, index) => (
              <li key={`${entry.at}-${index}`} className="flex flex-wrap justify-between gap-2 py-2">
                <span className="text-gray-700">{entry.description}</span>
                <span className="text-xs text-gray-400">{formatDateTime(entry.at)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
};

export default SellerDashboard;
