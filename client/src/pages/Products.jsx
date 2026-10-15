import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { useSearchParams, Link, useLocation, useNavigationType } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import { Breadcrumb, EmptyState } from '../components/ui';
import { productService, categoryService } from '../services';
import BrandLoader from '../components/BrandLoader';
import { getSnapshot, saveSnapshot } from '../utils/listSnapshots';

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

  // Back/forward navigation (e.g. returning from a product page) restores the list, loaded
  // pages and scroll position saved when this page was left.
  const location = useLocation();
  const navigationType = useNavigationType();
  const restoredRef = useRef(undefined);
  if (restoredRef.current === undefined) {
    restoredRef.current = navigationType === 'POP' ? getSnapshot(location.key) : null;
  }
  const restored = restoredRef.current;

  const [products, setProducts] = useState(restored?.products || []);
  const [categories, setCategories] = useState(restored?.categories || []);
  const [loading, setLoading] = useState(!restored);
  const [sort, setSort] = useState(restored?.sort || 'popular');
  const [sortOpen, setSortOpen] = useState(false);
  const sortButtonRef = useRef(null);
  const sortMenuRef = useRef(null);
  const [priceRange, setPriceRange] = useState(restored?.priceRange || 'all');
  const [page, setPage] = useState(restored?.page || 1);
  const [pagination, setPagination] = useState(restored?.pagination || null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const sentinelRef = useRef(null);
  const filterKeyRef = useRef(restored?.filterKey ?? null);
  const skipFetchRef = useRef(Boolean(restored));
  const scrollYRef = useRef(0);
  const snapshotRef = useRef(null);
  const busyRef = useRef(false); // true while a page request is in flight (prevents advancing mid-request)
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
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

  const categoryMatch = categories.find((c) => c.slug === category);
  const categoryId = categoryMatch?.id;

  // Infinite scroll: `page` is the highest page loaded so far. Page 1 replaces the list (filters
  // changed or first visit); later pages are appended as the sentinel below the grid scrolls into view.
  const filterKey = `${search}|${categoryId || ''}|${saleOnly}|${priceRange}`;

  snapshotRef.current = { products, categories, sort, priceRange, page, pagination, filterKey, loading };

  // Remember scroll position, and save everything when leaving the page.
  useLayoutEffect(() => {
    if (restored) window.scrollTo(0, restored.scrollY || 0);

    const onScroll = () => { scrollYRef.current = window.scrollY; };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (snapshotRef.current && !snapshotRef.current.loading) {
        saveSnapshot(location.key, { ...snapshotRef.current, scrollY: scrollYRef.current });
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (skipFetchRef.current) {
      skipFetchRef.current = false;
      filterKeyRef.current = filterKey;
      return undefined;
    }

    const filtersChanged = filterKeyRef.current !== filterKey;
    filterKeyRef.current = filterKey;

    if (filtersChanged && page !== 1) {
      setPage(1); // effect re-runs with page 1
      return undefined;
    }

    let cancelled = false;
    busyRef.current = true;
    const isFirstPage = page === 1;
    if (isFirstPage) {
      setLoading(true);
      setLoadingMore(false);
    } else {
      setLoadingMore(true);
    }
    setLoadMoreError(false);

    const productsRequest = productService.getAllProducts({
      page,
      limit: 24,
      search: search || undefined,
      category_id: categoryId || undefined,
      sale: saleOnly || undefined,
      priceRange,
    });

    Promise.all([productsRequest, isFirstPage ? categoryService.getAllCategories() : null])
      .then(([productsRes, categoriesRes]) => {
        if (cancelled) return;
        const incoming = productsRes.data?.data || [];
        setProducts((prev) => {
          if (isFirstPage) return incoming;
          const seen = new Set(prev.map((p) => p.id));
          return [...prev, ...incoming.filter((p) => !seen.has(p.id))];
        });
        setPagination(productsRes.data?.pagination || null);
        if (categoriesRes) setCategories(categoriesRes.data?.data || []);
      })
      .catch(() => {
        if (cancelled) return;
        if (isFirstPage) setProducts([]);
        else setLoadMoreError(true);
      })
      .finally(() => {
        if (cancelled) return;
        busyRef.current = false;
        setLoading(false);
        setLoadingMore(false);
      });

    return () => { cancelled = true; };
  }, [page, filterKey, retryKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const hasNextPage = pagination
    ? Boolean(pagination.hasNextPage ?? page < (pagination.totalPages || 1))
    : false;

  // Load the next page when the sentinel is near the viewport.
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || loading || loadingMore || loadMoreError || !hasNextPage) return undefined;
    if (typeof IntersectionObserver === 'undefined') return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !busyRef.current) setPage((current) => current + 1);
      },
      { rootMargin: '600px 0px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [loading, loadingMore, loadMoreError, hasNextPage, products.length]);

  // When a search is present on small screens, scroll results into view
  useEffect(() => {
    if (!search || restoredRef.current) return undefined;

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

  const priceOptions = [
    { value: 'all', label: 'All Prices' },
    { value: 'under-500', label: 'Under Rs. 500' },
    { value: '500-2000', label: 'Rs. 500 - 2,000' },
    { value: 'over-2000', label: 'Over Rs. 2,000' },
  ];

  return (
    <div className="container-main animate-fade-in py-6">
      <Breadcrumb items={[
        { label: 'Home', to: '/' },
        { label: pageTitle },
      ]} />

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Filters sidebar — desktop only */}
        <aside className="hidden flex-shrink-0 lg:block lg:w-56">
          <div className="sticky top-36 rounded-xl border border-gray-100 bg-white p-4 shadow-card">
            <h3 className="mb-3 text-sm font-bold text-dark">Filters</h3>
            <div className="space-y-4">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Price Range</p>
                <div className="space-y-1">
                  {priceOptions.map((opt) => (
                    <label
                      key={opt.value}
                      className={`flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition ${
                        priceRange === opt.value ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
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
          </div>
        </aside>

        <div className="flex-1">
          {/* Results header card */}
          <div className="mb-4 flex flex-col gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-card sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-dark">{pageTitle}</h1>
              <p className="mt-0.5 text-sm text-gray-500">
                {(() => {
                  const count = pagination?.total ?? filtered.length;
                  return count === 1 ? '1 product found' : `${count} products found`;
                })()}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:border-gray-300 hover:bg-gray-50 lg:hidden"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L15 14.414V19a1 1 0 01-.553.894l-3 1.5A1 1 0 0010 20.5V14.414L3.293 6.707A1 1 0 013 6V4z" />
                </svg>
                Filters
                {priceRange !== 'all' && (
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">1</span>
                )}
              </button>

              <div className="relative">
              <button
                type="button"
                ref={sortButtonRef}
                onClick={() => setSortOpen((s) => !s)}
                aria-haspopup="listbox"
                aria-expanded={sortOpen}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:border-gray-300 hover:bg-gray-50"
              >
                {SORT_OPTIONS.find((o) => o.value === sort)?.label || 'Sort'}
                <svg
                  className={`h-4 w-4 text-gray-500 transition-transform ${sortOpen ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {sortOpen && (
                <ul
                  ref={sortMenuRef}
                  role="listbox"
                  aria-label="Sort options"
                  className="absolute right-0 z-50 mt-2 w-48 overflow-hidden rounded-lg border border-gray-100 bg-white py-1 shadow-lg"
                >
                  {SORT_OPTIONS.map((opt) => (
                    <li key={opt.value} role="option">
                      <button
                        type="button"
                        onClick={() => { setSort(opt.value); setSortOpen(false); }}
                        className={`w-full px-3.5 py-2 text-left text-sm transition ${
                          opt.value === sort ? 'bg-primary-50 font-semibold text-primary-700' : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {opt.label}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              </div>
            </div>
          </div>

          {loading ? (
            <BrandLoader minHeight={420} text="Loading products" />
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border border-gray-100 bg-white shadow-card">
              <EmptyState
                icon="🔍"
                title="No products found"
                description="Try adjusting your filters or search terms."
                action={
                  <Link
                    to="/products"
                    className="inline-flex items-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-600"
                  >
                    Browse All Products
                  </Link>
                }
              />
            </div>
          ) : (
            <>
              <div ref={resultsRef} className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {filtered.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              {/* Infinite scroll footer */}
              <div className="mt-6">
                {loadingMore && <BrandLoader minHeight={96} size="sm" text="Loading more products" />}
                {loadMoreError && (
                  <div role="alert" className="rounded-xl border border-red-100 bg-red-50 p-4 text-center">
                    <p className="text-sm text-red-700">We couldn&apos;t load more products.</p>
                    <button type="button" onClick={() => { setLoadMoreError(false); setRetryKey((k) => k + 1); }} className="btn-outline mt-3 bg-white text-sm">
                      Try again
                    </button>
                  </div>
                )}
                {!loadingMore && !loadMoreError && hasNextPage && <div ref={sentinelRef} className="h-10" aria-hidden="true" />}
                {!hasNextPage && !loadingMore && products.length > 0 && (
                  <p className="text-center text-sm text-gray-500">
                    You&apos;ve seen all {pagination?.total || products.length} products
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Mobile filter drawer */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileFiltersOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[80vh] overflow-y-auto rounded-t-2xl bg-white shadow-2xl animate-slide-up">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <h3 className="text-base font-bold text-dark">Filters</h3>
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                aria-label="Close filters"
                className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-5">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Price Range</p>
              <div className="space-y-1">
                {priceOptions.map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2.5 text-sm transition ${
                      priceRange === opt.value ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="price-mobile"
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

            <div className="flex gap-3 border-t border-gray-100 p-5">
              <button
                type="button"
                onClick={() => setPriceRange('all')}
                className="flex-1 rounded-lg border border-gray-200 bg-white py-2.5 text-sm font-medium text-gray-600 shadow-sm transition hover:bg-gray-50"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-600"
              >
                Show Results
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;