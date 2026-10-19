import React, { useCallback, useEffect, useState } from 'react';
import useLiveRefresh from '../../hooks/useLiveRefresh';
import useLatestRequest from '../../hooks/useLatestRequest';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { sellerPortalService } from '../../services';
import { useToast } from '../../components/ToastProvider';
import {
  Badge, Button, ConfirmDialog, Empty, ErrorState, Loading, Pagination, StatusBadge,
  CARD_GRID, CARD_LIST_ITEM, TABLE_WRAP, TBODY, TD, TH, THEAD, TR, apiError, formatDate, imageSrc, money,
} from '../../components/seller/ui';
import { ListToolbar, useListFilters } from '../../components/seller/filters';

const DEFAULTS = {
  search: '', status: '', stock: '', category_id: '', sort: 'updated', order: 'desc',
};
const STATUS_OPTIONS = [
  ['', 'All products'], ['draft', 'Draft'], ['pending_review', 'Pending review'], ['rejected', 'Rejected'],
  ['published', 'Published'], ['unpublished', 'Unpublished'], ['archived', 'Archived'],
];
const SORT_OPTIONS = [['updated', 'Last updated'], ['created', 'Newest'], ['name', 'Name'], ['price', 'Price'], ['stock', 'Stock'], ['sales', 'Units sold']];

const publicationStatus = (product) => {
  if (product.approval_status === 'approved') return product.is_active ? 'published' : 'unpublished';
  return product.approval_status;
};

const stockBadge = (qty, threshold) => {
  if (qty <= 0) return <StatusBadge status="out" />;
  if (qty <= threshold) return <Badge tone="amber">{qty} left</Badge>;
  return <span className="text-sm text-gray-700">{qty}</span>;
};

const ProductThumb = ({ product }) => (product.image_url
  ? <img src={imageSrc(product.image_url)} alt="" className="h-12 w-12 flex-shrink-0 rounded-md object-cover" loading="lazy" />
  : <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-md bg-gray-100 text-[10px] text-gray-400">No image</span>);

const SellerProducts = () => {
  const { addToast } = useToast();
  const [filters, setFilters, reset] = useListFilters(DEFAULTS);
  const [categories, setCategories] = useState([]);
  const [state, setState] = useState({ loading: true, rows: [], pagination: null, error: '' });
  const [threshold, setThreshold] = useState(5);
  const [confirm, setConfirm] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const latest = useLatestRequest();
  const load = useCallback((silent = false) => {
    if (!silent) setState((s) => ({ ...s, loading: true, error: '' }));
    const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== ''));
    return latest.guard(sellerPortalService.listProducts({ ...params, limit: 15 }))
      .then((res) => {
        // A page that no longer exists (e.g. the last row was deleted) falls back to the last real page.
        if (res.data.data.length === 0 && filters.page > 1 && res.data.pagination.total > 0) {
          setFilters({ page: res.data.pagination.totalPages });
          return;
        }
        setState({ loading: false, rows: res.data.data, pagination: res.data.pagination, error: '' });
        setThreshold(res.data.meta?.lowStockThreshold ?? 5);
      })
      .catch((err) => setState((s) => ({ ...s, loading: false, error: apiError(err, 'Could not load products.') })));
  }, [filters, setFilters]);
  useEffect(() => { load(); }, [load]);
  useLiveRefresh(['product', 'inventory'], () => load(true));
  useEffect(() => {
    sellerPortalService.getCategories().then((res) => setCategories(res.data.data)).catch(() => {});
  }, []);

  const act = async (product, fn, success) => {
    setBusyId(product.id);
    try {
      await fn(product.id);
      addToast(success);
      load();
    } catch (err) {
      addToast(apiError(err), 'error');
    } finally {
      setBusyId(null);
    }
  };

  const actions = (product) => {
    const status = product.approval_status;
    const busy = busyId === product.id;
    const items = [];
    if (status !== 'archived') items.push(<Link key="edit" to={`/seller/products/${product.id}/edit`} className="btn-secondary min-h-[44px] !px-3 !py-2 text-sm">Edit</Link>);
    if (status === 'draft' || status === 'rejected') items.push(<Button key="submit" busy={busy} onClick={() => act(product, sellerPortalService.submitProduct, 'Submitted for review.')} className="!px-3 !py-2">Submit</Button>);
    if (status === 'approved' && !product.is_active) items.push(<Button key="pub" busy={busy} onClick={() => act(product, sellerPortalService.publishProduct, 'Product published.')} className="!px-3 !py-2">Publish</Button>);
    if (status === 'approved' && product.is_active) items.push(<Button key="unpub" variant="outline" busy={busy} onClick={() => act(product, sellerPortalService.unpublishProduct, 'Product unpublished.')} className="!px-3 !py-2">Unpublish</Button>);
    if (status !== 'archived') items.push(<Button key="del" variant="outline" onClick={() => setConfirm({ product })} className="!px-3 !py-2 !border-rose-200 !text-rose-600 hover:!bg-rose-50">Delete</Button>);
    return items;
  };

  const filterConfig = [
    { key: 'status', label: 'Status', options: STATUS_OPTIONS },
    { key: 'stock', label: 'Stock level', options: [['', 'Any stock level'], ['in', 'In stock'], ['low', `Low stock (≤ ${threshold})`], ['out', 'Out of stock']] },
    { key: 'category_id', label: 'Category', options: [['', 'All categories'], ...categories.map((c) => [c.id, c.name])] },
    { key: 'sort', label: 'Sort by', options: SORT_OPTIONS },
    { key: 'order', label: 'Order', options: [['desc', 'Descending'], ['asc', 'Ascending']] },
  ];
  const filtered = Object.keys(DEFAULTS).some((k) => filters[k] !== DEFAULTS[k]);
  const { rows, pagination } = state;

  return (
    <div className="animate-fade-in space-y-4">
      <ListToolbar
        title="Products"
        subtitle="Create products, submit them for review and manage what is live."
        searchPlaceholder="Search name or SKU"
        searchLabel="Search products by name or SKU"
        filters={filterConfig}
        values={filters}
        defaults={DEFAULTS}
        onChange={setFilters}
        onReset={reset}
        total={pagination?.total}
        loading={state.loading}
        noun="products"
        actions={(
          <Link to="/seller/products/new" className="inline-flex min-h-[44px] items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-600 active:bg-primary-700">
            <Plus size={16} aria-hidden="true" /> Add product
          </Link>
        )}
      />

      {state.error ? <ErrorState message={state.error} onRetry={load} /> : null}
      {state.loading && rows.length === 0 ? <Loading text="Loading products" /> : null}
      {!state.loading && !state.error && rows.length === 0 ? (
        <Empty
          title={filtered ? 'No products match your filters' : 'You have not added any products yet'}
          text={filtered ? 'Try removing a filter or searching for something else.' : 'New products are saved as drafts. Submit them for review and, once approved, publish them to the store.'}
          action={filtered ? <Button variant="outline" onClick={reset}>Clear filters</Button> : <Link to="/seller/products/new" className="btn-primary !px-4 !py-2.5 text-sm">Add product</Link>}
        />
      ) : null}

      {rows.length > 0 ? (
        <div className={state.loading ? 'opacity-60 transition' : 'transition'} aria-busy={state.loading}>
          <div className={TABLE_WRAP}>
            <table className="min-w-full text-sm">
              <thead className={THEAD}>
                <tr>
                  <th className={TH}>Product</th><th className={`${TH} hidden 2xl:table-cell`}>Category</th><th className={TH}>Price</th>
                  <th className={TH}>Stock</th><th className={TH}>Status</th><th className={TH}>Sold</th>
                  <th className={`${TH} hidden 2xl:table-cell`}>Updated</th><th className={TH}><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className={TBODY}>
                {rows.map((product) => (
                  <tr key={product.id} className={TR}>
                    <td className={TD}>
                      <div className="flex min-w-[220px] items-center gap-3">
                        <ProductThumb product={product} />
                        <div className="min-w-0">
                          <p className="max-w-[260px] truncate font-semibold text-gray-900">{product.name}</p>
                          <p className="text-xs text-gray-400">SKU: {product.sku || '—'}</p>
                          {product.rejection_reason ? <p className="mt-0.5 max-w-[260px] text-xs text-rose-600">Rejected: {product.rejection_reason}</p> : null}
                        </div>
                      </div>
                    </td>
                    <td className={`${TD} hidden text-gray-600 2xl:table-cell`}>{product.category_name || '—'}</td>
                    <td className={`${TD} whitespace-nowrap font-semibold`}>
                      {money(product.discount_price ?? product.price)}
                      {product.discount_price != null ? <span className="block text-xs font-normal text-gray-400 line-through">{money(product.price)}</span> : null}
                    </td>
                    <td className={TD}>{stockBadge(product.stock_quantity, threshold)}</td>
                    <td className={TD}><StatusBadge status={publicationStatus(product)} /></td>
                    <td className={`${TD} text-gray-600`}>{product.units_sold}</td>
                    <td className={`${TD} hidden whitespace-nowrap text-gray-500 2xl:table-cell`}>{formatDate(product.updated_at)}</td>
                    <td className={TD}><div className="flex flex-wrap justify-end gap-1.5">{actions(product)}</div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className={CARD_GRID}>
            {rows.map((product) => (
              <li key={product.id} className={CARD_LIST_ITEM}>
                <div className="flex gap-3">
                  <ProductThumb product={product} />
                  <div className="min-w-0 flex-1">
                    <p className="break-words font-semibold text-gray-900">{product.name}</p>
                    <p className="text-xs text-gray-400">{product.category_name || 'No category'} · SKU: {product.sku || '—'}</p>
                  </div>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div><dt className="text-xs text-gray-400">Price</dt><dd className="font-semibold">{money(product.discount_price ?? product.price)}</dd></div>
                  <div><dt className="text-xs text-gray-400">Stock</dt><dd>{stockBadge(product.stock_quantity, threshold)}</dd></div>
                  <div><dt className="text-xs text-gray-400">Status</dt><dd><StatusBadge status={publicationStatus(product)} /></dd></div>
                  <div><dt className="text-xs text-gray-400">Sold</dt><dd>{product.units_sold}</dd></div>
                </dl>
                {product.rejection_reason ? <p className="mt-2 rounded-md bg-rose-50 p-2 text-xs text-rose-700">Rejected: {product.rejection_reason}</p> : null}
                <div className="mt-3 flex flex-wrap gap-2">{actions(product)}</div>
              </li>
            ))}
          </ul>

          <Pagination pagination={pagination} onPage={(page) => setFilters({ page })} />
        </div>
      ) : null}

      <ConfirmDialog
        open={Boolean(confirm)}
        danger
        title="Delete this product?"
        message={confirm ? `"${confirm.product.name}" will be removed. Products that already have orders, reviews or cart entries are archived instead so history is preserved.` : ''}
        confirmLabel="Delete product"
        onClose={() => setConfirm(null)}
        onConfirm={async () => {
          const res = await sellerPortalService.deleteProduct(confirm.product.id);
          addToast(res.data.message || 'Product removed.');
          setConfirm(null);
          load();
        }}
      />
    </div>
  );
};

export default SellerProducts;
