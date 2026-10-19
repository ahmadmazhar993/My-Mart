import React, { useCallback, useEffect, useMemo, useState } from 'react';
import useLiveRefresh from '../../hooks/useLiveRefresh';
import useLatestRequest from '../../hooks/useLatestRequest';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Tooltip, Legend, ArcElement,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { sellerPortalService } from '../../services';
import { useToast } from '../../components/ToastProvider';
import {
  Button, Card, Empty, ErrorState, Loading, PageHeader, StatCard, apiError, downloadBlob, formatDate, money,
} from '../../components/seller/ui';
import { RangePicker, Select, daysAgo } from '../../components/seller/filters';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Tooltip, Legend, ArcElement);

const STATUS_COLORS = {
  pending: '#F59E0B', confirmed: '#3B82F6', processing: '#6366F1', shipped: '#8B5CF6', delivered: '#059669', cancelled: '#E11D48',
};

const bucketLabel = (bucket, granularity) => {
  const d = new Date(`${bucket}T00:00:00`);
  if (granularity === 'month') return d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
};

const Delta = ({ value }) => {
  if (value == null) return <span className="text-xs text-gray-400">No earlier data to compare</span>;
  const up = value >= 0;
  return <span className={`text-xs font-medium ${up ? 'text-emerald-600' : 'text-rose-600'}`}>{up ? '▲' : '▼'} {Math.abs(value)}% vs previous period</span>;
};

const SellerAnalytics = () => {
  const { addToast } = useToast();
  const [range, setRange] = useState({ from: daysAgo(29), to: daysAgo(0) });
  const [granularity, setGranularity] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);

  const latest = useLatestRequest();
  const load = useCallback((silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    return latest.guard(sellerPortalService.getAnalytics({ ...range, granularity: granularity || undefined }))
      .then((res) => setData(res.data.data))
      .catch((err) => setError(apiError(err, 'Could not load analytics.')))
      .finally(() => setLoading(false));
  }, [range, granularity]);
  useEffect(() => { load(); }, [load]);
  useLiveRefresh(['order', 'return', 'earnings'], () => load(true));

  const exportCsv = async () => {
    setExporting(true);
    try {
      const res = await sellerPortalService.downloadSalesCsv(range);
      downloadBlob(res.data, `sales-${range.from}-to-${range.to}.csv`);
    } catch (err) {
      addToast('Could not export the CSV.', 'error');
    } finally {
      setExporting(false);
    }
  };

  const g = data?.range.granularity;
  const salesChart = useMemo(() => ({
    labels: (data?.series || []).map((r) => bucketLabel(r.bucket, g)),
    datasets: [
      { label: 'Gross sales', data: (data?.series || []).map((r) => r.gross), borderColor: '#059669', backgroundColor: 'rgba(5,150,105,0.1)', fill: true, tension: 0.3, pointRadius: 2 },
      { label: 'Net sales (after refunds)', data: (data?.series || []).map((r) => r.net), borderColor: '#F59E0B', borderDash: [5, 4], tension: 0.3, pointRadius: 0 },
    ],
  }), [data, g]);
  const ordersChart = useMemo(() => ({
    labels: (data?.series || []).map((r) => bucketLabel(r.bucket, g)),
    datasets: [{ label: 'Orders', data: (data?.series || []).map((r) => r.orders), backgroundColor: '#F59E0B', borderRadius: 3 }],
  }), [data, g]);
  const statusChart = useMemo(() => ({
    labels: (data?.status_breakdown || []).map((r) => r.status),
    datasets: [{ data: (data?.status_breakdown || []).map((r) => r.orders), backgroundColor: (data?.status_breakdown || []).map((r) => STATUS_COLORS[r.status] || '#9CA3AF') }],
  }), [data]);

  if (loading && !data) return <Loading text="Loading analytics" minHeight={360} />;
  if (error && !data) return <ErrorState message={error} onRetry={load} />;

  const t = data.totals;
  const c = data.comparison;
  const axis = { responsive: true, maintainAspectRatio: false, scales: { x: { grid: { display: false }, ticks: { maxTicksLimit: 8, maxRotation: 0 } }, y: { beginAtZero: true } } };

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Analytics"
        subtitle={`${formatDate(data.range.from)} – ${formatDate(data.range.to)} · ${data.range.days} day(s)`}
        actions={<Button variant="outline" busy={exporting} onClick={exportCsv}>Export CSV</Button>}
      />

      <div className="flex flex-col gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-card lg:flex-row lg:flex-wrap lg:items-end lg:justify-between">
        <RangePicker from={range.from} to={range.to} onChange={setRange} />
        <label className="block text-xs font-medium text-gray-500 lg:w-48">
          Group by
          <Select className="mt-0.5" value={granularity} onChange={(e) => setGranularity(e.target.value)}>
            <option value="">Automatic</option><option value="day">Daily</option><option value="week">Weekly</option><option value="month">Monthly</option>
          </Select>
        </label>
      </div>

      {error ? <ErrorState message={error} onRetry={load} /> : null}

      <div className={`grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 ${loading ? 'opacity-60' : ''}`} aria-busy={loading}>
        <StatCard label="Gross sales" value={money(t.gross_sales)} hint={c ? <Delta value={c.change_percent.gross_sales} /> : null} />
        <StatCard label="Refunds" value={money(t.refunds)} hint="Refunded orders and approved returns" />
        <StatCard label="Net sales" value={money(t.net_sales)} tone="text-primary" hint={c ? <Delta value={c.change_percent.net_sales} /> : null} />
        <StatCard label="Orders" value={t.orders} hint={c ? <Delta value={c.change_percent.orders} /> : `${t.cancelled_orders} cancelled`} />
        <StatCard label="Units sold" value={t.units} />
        <StatCard label="Average order value" value={money(t.average_order_value)} />
        <StatCard label="Commission" value={money(t.commission)} hint="Paid orders, by posting date" />
        <StatCard label="Net earnings" value={money(t.net_earnings)} hint="After commission and reversals" tone="text-primary" />
      </div>

      {c ? (
        <p className="text-xs text-gray-500">
          Compared with {formatDate(c.range.from)} – {formatDate(c.range.to)}
          {c.sufficient_data ? '.' : '. There were no orders in that period, so percentage changes are not shown.'}
        </p>
      ) : null}

      {data.series.length === 0 ? (
        <Empty title="No sales in this period" text="Try a wider date range." />
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card title={`${{ day: 'Daily', week: 'Weekly', month: 'Monthly' }[g]} sales`}>
              <div className="h-60 sm:h-72" role="img" aria-label="Line chart of gross and net sales over time"><Line data={salesChart} options={{ ...axis, plugins: { legend: { display: true, position: 'bottom' } } }} /></div>
            </Card>
            <Card title="Orders">
              <div className="h-60 sm:h-72" role="img" aria-label="Bar chart of order counts over time"><Bar data={ordersChart} options={{ ...axis, plugins: { legend: { display: false } }, scales: { ...axis.scales, y: { beginAtZero: true, ticks: { precision: 0 } } } }} /></div>
            </Card>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <Card title="Order status breakdown">
              <div className="mx-auto h-56 max-w-xs" role="img" aria-label="Doughnut chart of orders by status"><Doughnut data={statusChart} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }} /></div>
              <ul className="mt-3 space-y-1 text-sm">
                {data.status_breakdown.map((r) => (
                  <li key={r.status} className="flex items-center justify-between">
                    <span className="flex items-center gap-2 capitalize"><span className="h-2.5 w-2.5 rounded-full" style={{ background: STATUS_COLORS[r.status] || '#9CA3AF' }} />{r.status}</span>
                    <strong>{r.orders}</strong>
                  </li>
                ))}
              </ul>
            </Card>
            <Card title="Product performance" className="lg:col-span-2">
              {data.products.length === 0 ? <p className="text-sm text-gray-500">No product sales in this period.</p> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                        <th className="py-2 pr-3">Product</th><th className="py-2 pr-3">Units</th><th className="py-2 pr-3">Gross</th><th className="py-2 pr-3">Refunds</th><th className="py-2">Net</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.products.map((p) => (
                        <tr key={p.id} className="border-b border-gray-50">
                          <td className="max-w-[220px] truncate py-2 pr-3 font-medium text-gray-800">{p.name}</td>
                          <td className="py-2 pr-3">{p.units}</td>
                          <td className="py-2 pr-3">{money(p.gross)}</td>
                          <td className="py-2 pr-3">{p.refunds ? money(p.refunds) : '—'}</td>
                          <td className="py-2 font-semibold">{money(p.net)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        </>
      )}

      <Card title="About these figures">
        <ul className="list-disc space-y-1 pl-5 text-xs text-gray-500">{data.notes.map((n) => <li key={n}>{n}</li>)}</ul>
      </Card>
    </div>
  );
};

export default SellerAnalytics;
