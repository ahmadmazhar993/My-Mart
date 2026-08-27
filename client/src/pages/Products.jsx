import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import { ProductSkeleton, Breadcrumb, EmptyState } from '../components/ui';
import { productService, categoryService } from '../services';

const SORT_OPTIONS = [
  { value: 'popular', label: 'Popularity' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'rating', label: 'Top Rated' },
];

const Products = () => {
  const [searchParams] = useSearchParams();
  const search = searchParams.get('search') || '';
  const category = searchParams.get('category') || '';
  const saleOnly = searchParams.get('sale') === 'true';

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState('popular');
  const [sortOpen, setSortOpen] = useState(false);
  const sortButtonRef = useRef(null);
  const sortMenuRef = useRef(null);
  const [priceRange, setPriceRange] = useState('all');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const resultsRef = useRef(null);

  useEffect(() => {
    if (!sortOpen) return undefined;

    const handleOutside = (e) => {
      if (sortMenuRef.current && !sortMenuRef.current.contains(e.target) && !sortButtonRef.current.contains(e.target)) {
        setSortOpen(false);
      }
    };

    const handleKey = (e) => {
      if (e.key === 'Escape') setSortOpen(false);
    };

    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside);
    document.addEventListener('keydown', handleKey);

    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, [sortOpen]);

  useEffect(() => {
    setPage(1);
  }, [search, category, saleOnly, priceRange]);

  const categoryMatch = categories.find((c) => c.slug === category);
  const categoryId = categoryMatch?.id;

  useEffect(() => {
    setLoading(true);
    Promise.all([
      productService.getAllProducts({
        page,
        limit: 24,
        search: search || undefined,
        category_id: categoryId || undefined,
        sale: saleOnly || undefined,
        priceRange,
      }),
      categoryService.getAllCategories(),
    ])
      .then(([productsRes, categoriesRes]) => {
        setProducts(productsRes.data?.data || []);
        setPagination(productsRes.data?.pagination || null);
        setCategories(categoriesRes.data?.data || []);
      })
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [page, search, categoryId, saleOnly, priceRange]);

  // When a search is present on small screens, scroll results into view
  useEffect(() => {
    if (!search) return undefined;

    // only run after loading completes
    if (loading) return undefined;

    let timer = null;
    const doScroll = () => {
      try {
        if (!resultsRef.current) return;
        // small screens only
        if (window.innerWidth > 640) return;

        const rect = resultsRef.current.getBoundingClientRect();
        const top = rect.top + window.pageYOffset;
        const offset = 120; // account for header/filters height
        window.scrollTo({ top: Math.max(top - offset, 0), behavior: 'smooth' });
      } catch (err) {
        // ignore
      }
    };

    // delay slightly to allow mobile keyboard/layout changes
    timer = setTimeout(doScroll, 300);

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [loading, search]);

  const filtered = products
    .filter((p) => {
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (categoryId && p.category_id !== categoryId) return false;
      if (saleOnly && !p.discount_price) return false;
      if (priceRange === 'under-500' && (p.discount_price || p.price) >= 500) return false;
      if (priceRange === '500-2000') {
        const price = p.discount_price || p.price;
        if (price < 500 || price > 2000) return false;
      }
      if (priceRange === 'over-2000' && (p.discount_price || p.price) <= 2000) return false;
      return true;
    })
    .sort((a, b) => {
      const priceA = a.discount_price || a.price;
      const priceB = b.discount_price || b.price;
      if (sort === 'price-asc') return priceA - priceB;
      if (sort === 'price-desc') return priceB - priceA;
      if (sort === 'rating') return (b.rating || 0) - (a.rating || 0);
      return 0;
    });

  const pageTitle = saleOnly
    ? 'Flash Sale'
    : search
      ? `Results for "${search}"`
      : category
        ? categoryMatch?.name || category.charAt(0).toUpperCase() + category.slice(1)
        : 'All Products';

  const totalPages = pagination?.totalPages || 1;
  const limit = pagination?.limit || 24;

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
    <div className="container-main py-6 animate-fade-in">
      <Breadcrumb items={[
        { label: 'Home', to: '/' },
        { label: pageTitle },
      ]} />

      <div className="flex flex-col lg:flex-row gap-6">
        <aside className="lg:w-56 flex-shrink-0">
          <div className="bg-white rounded-sm shadow-card p-4 sticky top-36">
            <h3 className="font-bold text-sm mb-3">Filters</h3>
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Price Range</p>
                {[
                  { value: 'all', label: 'All Prices' },
                  { value: 'under-500', label: 'Under Rs. 500' },
                  { value: '500-2000', label: 'Rs. 500 - 2,000' },
                  { value: 'over-2000', label: 'Over Rs. 2,000' },
                ].map((opt) => (
                  <label key={opt.value} className="flex items-center gap-2 py-1 cursor-pointer text-sm">
                    <input
                      type="radio"
                      name="price"
                      value={opt.value}
                      checked={priceRange === opt.value}
                      onChange={(e) => setPriceRange(e.target.value)}
                      className="accent-primary"
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </aside>

        <div className="flex-1">
          <div className="bg-white rounded-sm shadow-card p-4 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-dark">{pageTitle}</h1>
              <p className="text-sm text-gray-500">{filtered.length === 1 ? `${filtered.length} product found` : `${filtered.length} products found`}</p>
            </div>
            <div className="relative">
              <button
                type="button"
                ref={sortButtonRef}
                onClick={() => setSortOpen((s) => !s)}
                aria-haspopup="listbox"
                aria-expanded={sortOpen}
                className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
              >
                {SORT_OPTIONS.find((o) => o.value === sort)?.label || 'Sort'}
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {sortOpen && (
                <ul ref={sortMenuRef} role="listbox" aria-label="Sort options" className="absolute right-0 mt-2 w-44 rounded-md bg-white shadow-lg z-50">
                  {SORT_OPTIONS.map((opt) => (
                    <li key={opt.value} role="option">
                      <button
                        type="button"
                        onClick={() => { setSort(opt.value); setSortOpen(false); }}
                        className={`w-full text-left px-3 py-2 text-sm ${opt.value === sort ? 'bg-gray-100 font-semibold' : 'hover:bg-gray-50'}`}
                      >
                        {opt.label}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {loading ? (
            <ProductSkeleton count={10} />
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-sm shadow-card">
              <EmptyState
                icon="🔍"
                title="No products found"
                description="Try adjusting your filters or search terms."
                action={<Link to="/products" className="btn-primary">Browse All Products</Link>}
              />
            </div>
          ) : (
            <>
              <div ref={resultsRef} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {filtered.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
              <div className="mt-6 flex flex-col gap-3 rounded-xl border border-gray-200 bg-gradient-to-r from-white to-gray-50 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-gray-600">
                  {products.length ? `Showing ${((page - 1) * limit) + 1}-${Math.min(page * limit, pagination?.total || products.length)} of ${pagination?.total || products.length} products` : 'No products'}
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
    </div>
  );
};

export default Products;
