import React, { useEffect, useState, useMemo } from 'react';
import { reportsService } from '../../services';
import { formatPrice } from '../../utils/format';
import { Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend);

const AdminSales = () => {
  const [groupBy, setGroupBy] = useState('product');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      if (groupBy) params.group_by = groupBy;
      const res = await reportsService.getSalesSummary(params);
      setData(res.data?.data || []);
    } catch (err) {
      console.error(err);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const csvExport = () => {
    if (!data || !data.length) return;
    let headers = [];
    let rows = [];
    if (groupBy === 'product') {
      headers = ['product_id', 'product_name', 'quantity_sold', 'revenue', 'cost', 'profit'];
      rows = data.map((r) => [r.product_id, r.product_name, r.quantity_sold, r.revenue, r.cost, r.profit]);
    } else if (groupBy === 'variant') {
      headers = ['product_id', 'product_name', 'variant_sku', 'variant_name', 'quantity_sold', 'revenue', 'cost', 'profit'];
      rows = data.map((r) => [r.product_id, r.product_name, r.variant_sku || '', r.variant_name || '', r.quantity_sold, r.revenue, r.cost, r.profit]);
    } else {
      headers = ['date', 'quantity_sold', 'revenue', 'cost', 'profit'];
      rows = data.map((r) => [r.date, r.quantity_sold, r.revenue, r.cost, r.profit]);
    }
    // build CSV with metadata header, column headers, rows, and totals
    const meta = [
      [`Report: Sales Summary (${groupBy})`],
      [`Date Range: ${startDate || 'ALL'} to ${endDate || 'ALL'}`],
      [`Generated At: ${new Date().toISOString()}`],
      [],
    ];

    const formattedHeaders = headers.map((h) => h.toString());
    const totalRow = groupBy === 'product'
      ? ['Totals', '', totals.qty, totals.revenue, totals.cost, totals.profit]
      : ['', totals.qty, totals.revenue, totals.cost, totals.profit];

    const allRows = [
      ...meta,
      formattedHeaders,
      ...rows,
      [],
      totalRow,
    ];

    const csvContent = allRows
      .map((row) => row.map((cell) => `"${String(cell == null ? '' : cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales_${groupBy}_${startDate || 'start'}_${endDate || 'end'}_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const chartData = useMemo(() => {
    if (!data || !data.length) return null;
    if (groupBy === 'product') {
      const top = data.slice(0, 10);
      return {
        labels: top.map((r) => r.product_name),
        datasets: [
          {
            label: 'Revenue',
            data: top.map((r) => Number(r.revenue || 0)),
            backgroundColor: 'rgba(59,130,246,0.8)',
          },
          {
            label: 'Profit',
            data: top.map((r) => Number(r.profit || 0)),
            backgroundColor: 'rgba(16,185,129,0.8)',
          },
        ],
      };
    }

    if (groupBy === 'variant') {
      const top = data.slice(0, 10);
      return {
        labels: top.map((r) => `${r.product_name} / ${r.variant_name || r.variant_sku || ''}`),
        datasets: [
          {
            label: 'Revenue',
            data: top.map((r) => Number(r.revenue || 0)),
            backgroundColor: 'rgba(59,130,246,0.8)',
          },
          {
            label: 'Profit',
            data: top.map((r) => Number(r.profit || 0)),
            backgroundColor: 'rgba(16,185,129,0.8)',
          },
        ],
      };
    }

    // date
    return {
      labels: data.map((r) => r.date),
      datasets: [
        {
          label: 'Revenue',
          data: data.map((r) => Number(r.revenue || 0)),
          borderColor: 'rgba(59,130,246,0.9)',
          backgroundColor: 'rgba(59,130,246,0.3)',
          tension: 0.2,
        },
        {
          label: 'Profit',
          data: data.map((r) => Number(r.profit || 0)),
          borderColor: 'rgba(16,185,129,0.9)',
          backgroundColor: 'rgba(16,185,129,0.3)',
          tension: 0.2,
        },
      ],
    };
  }, [data, groupBy]);

  const totals = useMemo(() => {
    const qty = data.reduce((s, r) => s + (Number(r.quantity_sold || 0)), 0);
    const revenue = data.reduce((s, r) => s + (Number(r.revenue || 0)), 0);
    const cost = data.reduce((s, r) => s + (Number(r.cost || 0)), 0);
    const profit = data.reduce((s, r) => s + (Number(r.profit || 0)), 0);
    return { qty, revenue, cost, profit };
  }, [data]);

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'top' } },
    scales: { y: { beginAtZero: true } },
  }), []);

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-dark mb-1">Sales</h2>
        <p className="text-gray-500 text-sm">Sales and profit reports</p>
      </div>

      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-card sm:p-5">
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); load(); }}>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium uppercase tracking-wide text-gray-500">From</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-100 sm:w-44"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium uppercase tracking-wide text-gray-500">To</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-100 sm:w-44"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium uppercase tracking-wide text-gray-500">Group By</label>
                <select
                  value={groupBy}
                  onChange={(e) => setGroupBy(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-100 sm:w-40"
                >
                  <option value="product">Product</option>
                  <option value="variant">Variant</option>
                  <option value="date">Date</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="submit"
                className="inline-flex h-[38px] items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-600 active:bg-primary-700"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 12a8 8 0 10-8 8" />
                  <path d="M20 4v6h-6" />
                </svg>
                Apply
              </button>

              <button
                type="button"
                onClick={csvExport}
                className="inline-flex h-[38px] items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 text-sm font-medium text-gray-600 shadow-sm transition hover:border-gray-300 hover:bg-gray-50 hover:text-gray-800"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <path d="M7 10l5 5 5-5" />
                  <path d="M12 15V3" />
                </svg>
                Export CSV
              </button>

              <button
                type="button"
                onClick={() => { setStartDate(''); setEndDate(''); setData([]); setLoading(false); }}
                className="inline-flex h-[38px] items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3.5 text-sm font-medium text-red-600 shadow-sm transition hover:border-red-300 hover:bg-red-100"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 6l12 12M6 18L18 6" />
                </svg>
                Clear
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3">
            <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Quick range</span>
            {[
              { label: 'Today', onClick: () => { const t = new Date(); setEndDate(t.toISOString().slice(0, 10)); setStartDate(t.toISOString().slice(0, 10)); } },
              { label: '7 days', onClick: () => { const t = new Date(); const s = new Date(); s.setDate(t.getDate() - 6); setEndDate(t.toISOString().slice(0, 10)); setStartDate(s.toISOString().slice(0, 10)); } },
              { label: '30 days', onClick: () => { const t = new Date(); const s = new Date(); s.setDate(t.getDate() - 29); setEndDate(t.toISOString().slice(0, 10)); setStartDate(s.toISOString().slice(0, 10)); } },
              { label: 'This month', onClick: () => { const t = new Date(); const s = new Date(t.getFullYear(), t.getMonth(), 1); setStartDate(s.toISOString().slice(0, 10)); setEndDate(t.toISOString().slice(0, 10)); } },
              { label: 'This year', onClick: () => { const t = new Date(); const s = new Date(t.getFullYear(), 0, 1); setStartDate(s.toISOString().slice(0, 10)); setEndDate(t.toISOString().slice(0, 10)); } },
            ].map((r) => (
              <button
                key={r.label}
                type="button"
                onClick={r.onClick}
                className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-600 transition hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700"
              >
                {r.label}
              </button>
            ))}
          </div>
        </form>
      </div>

      <div className="bg-white rounded-sm shadow-card p-3 sm:p-4 max-w-full overflow-hidden">
        <div className="flex items-center justify-between mb-4 gap-3">
          <div className="flex-1">
              {chartData ? (
              <div className="w-full h-56 sm:h-80 overflow-hidden">{/* responsive chart container */}
                {groupBy === 'product' ? (
                  <Bar data={chartData} options={chartOptions} />
                ) : (
                  <Line data={chartData} options={chartOptions} />
                )}
              </div>
            ) : null}
          </div>
          
        </div>
        {loading ? (
          <p className="text-gray-500">Loading...</p>
        ) : data.length === 0 ? (
          <p className="text-gray-500">No data for selected range.</p>
        ) : (
          <>
          <div className="mb-4 grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="bg-white border rounded-sm p-2 sm:p-3 text-sm">
              <div className="text-gray-500">Total Qty</div>
              <div className="text-base sm:text-lg font-semibold">{totals.qty}</div>
            </div>
            <div className="bg-white border rounded-sm p-2 sm:p-3 text-sm">
              <div className="text-gray-500">Total Revenue</div>
              <div className="text-base sm:text-lg font-semibold">{formatPrice(totals.revenue)}</div>
            </div>
            <div className="bg-white border rounded-sm p-2 sm:p-3 text-sm">
              <div className="text-gray-500">Total Cost</div>
              <div className="text-base sm:text-lg font-semibold">{formatPrice(totals.cost)}</div>
            </div>
            <div className="bg-white border rounded-sm p-2 sm:p-3 text-sm">
              <div className="text-gray-500">Total Profit</div>
              <div className="text-base sm:text-lg font-semibold">{formatPrice(totals.profit)}</div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full table-auto text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-gray-500">
                  <th className="pb-2 font-medium max-w-[220px] sm:max-w-none">{groupBy === 'product' ? 'Product' : groupBy === 'variant' ? 'Product / Variant' : 'Date'}</th>
                  <th className="pb-2 font-medium text-right sm:text-left">Qty</th>
                  <th className="pb-2 font-medium text-right sm:text-left">Revenue</th>
                  <th className="pb-2 font-medium text-right sm:text-left">Cost</th>
                  <th className="pb-2 font-medium text-right sm:text-left">Profit</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row, idx) => (
                  <tr key={idx} className="border-b border-gray-50">
                    <td className="py-2.5 font-medium max-w-[220px] break-words whitespace-normal">{groupBy === 'product' ? row.product_name : groupBy === 'variant' ? `${row.product_name} / ${row.variant_name || row.variant_sku || ''}` : row.date}</td>
                    <td className="py-2.5 text-right sm:text-left">{row.quantity_sold}</td>
                    <td className="py-2.5 text-right sm:text-left">{formatPrice(row.revenue)}</td>
                    <td className="py-2.5 text-right sm:text-left">{formatPrice(row.cost)}</td>
                    <td className="py-2.5 font-semibold text-right sm:text-left">{formatPrice(row.profit)}</td>
                  </tr>
                ))}
                <tr className="bg-gray-50 border-t font-semibold">
                  <td className="py-2.5">Totals</td>
                  <td className="py-2.5 text-right sm:text-left">{totals.qty}</td>
                  <td className="py-2.5 text-right sm:text-left">{formatPrice(totals.revenue)}</td>
                  <td className="py-2.5 text-right sm:text-left">{formatPrice(totals.cost)}</td>
                  <td className="py-2.5 text-right sm:text-left">{formatPrice(totals.profit)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AdminSales;
