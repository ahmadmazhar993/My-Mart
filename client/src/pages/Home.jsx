import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { Link, useLocation, useNavigationType } from 'react-router-dom';
import { getSnapshot, saveSnapshot } from '../utils/listSnapshots';
import HeroBanner from '../components/HeroBanner';
import CategoryGrid from '../components/CategoryGrid';
import ShopByBrand from '../components/ShopByBrand';
import FlashSale from '../components/FlashSale';
import ProductCard from '../components/ProductCard';
import { productService } from '../services';
import BrandLoader from '../components/BrandLoader';
import ProductCardSkeleton from '../components/ProductCardSkeleton';
import usePageMeta from '../hooks/usePageMeta';

const TRUST_FEATURES = [
  {
    title: 'Free Shipping',
    desc: 'On orders over Rs. 2,000',
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    title: 'Secure Payment',
    desc: '100% protected payments',
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
  },
  {
    title: 'Easy Returns',
    desc: '7-day return policy',
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h10a5 5 0 015 5v1M3 10l4-4M3 10l4 4" />
      </svg>
    ),
  },
  {
    title: '24/7 Support',
    desc: "We're here whenever you need us",
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M5.636 5.636l3.536 3.536m0 5.656l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

// WebSite structured data (site name + canonical home URL). No SearchAction: that would need a
// verified search URL template.
const HOME_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': 'https://ahmmart.store/#website',
  name: 'AHM Mart',
  url: 'https://ahmmart.store/',
};

const Home = () => {
  // Back/forward (e.g. returning from a product page) restores the loaded products and scroll
  // position. Without this the list restarts at page 1 while the browser tries to return to the old,
  // much lower scroll offset, which lands on the footer.
  const location = useLocation();
  const navigationType = useNavigationType();
  const restoredRef = useRef(undefined);
  if (restoredRef.current === undefined) {
    restoredRef.current = navigationType === 'POP' ? getSnapshot(location.key) : null;
  }
  const restored = restoredRef.current;

  const [products, setProducts] = useState(restored?.products || []);
  const [loading, setLoading] = useState(!restored);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [page, setPage] = useState(restored?.page || 1);
  const [pagination, setPagination] = useState(restored?.pagination || null);
  const sentinelRef = useRef(null);
  const busyRef = useRef(false);
  const skipFetchRef = useRef(Boolean(restored));
  const scrollYRef = useRef(0);
  const snapshotRef = useRef(null);
  snapshotRef.current = { products, page, pagination, loading };

  useLayoutEffect(() => {
    const timers = [];
    let userMoved = false;
    const markMoved = () => { userMoved = true; };
    if (restored) {
      const target = restored.scrollY || 0;
      window.scrollTo(0, target);
      scrollYRef.current = target;
      // Sections above the list (banner, categories, brands) load their own data and can change the
      // page height after this point, so re-apply the position briefly unless the user has scrolled.
      [150, 400, 900].forEach((ms) => timers.push(setTimeout(() => {
        if (!userMoved) window.scrollTo(0, target);
      }, ms)));
      ['touchstart', 'wheel', 'keydown'].forEach((evt) => window.addEventListener(evt, markMoved, { passive: true, once: true }));
    }
    const onScroll = () => { scrollYRef.current = window.scrollY; };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      timers.forEach(clearTimeout);
      ['touchstart', 'wheel', 'keydown'].forEach((evt) => window.removeEventListener(evt, markMoved));
      window.removeEventListener('scroll', onScroll);
      if (snapshotRef.current && !snapshotRef.current.loading) {
        saveSnapshot(location.key, { ...snapshotRef.current, scrollY: scrollYRef.current });
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (skipFetchRef.current) {
      skipFetchRef.current = false;
      return undefined;
    }
    let cancelled = false;
    const isFirstPage = page === 1;
    busyRef.current = true;
    if (!isFirstPage) setLoadingMore(true);
    setLoadMoreError(false);

    productService.getAllProducts({ page, limit: 24 })
      .then((res) => {
        if (cancelled) return;
        const incoming = res.data?.data || [];
        setProducts((current) => {
          if (isFirstPage) return incoming;
          const seen = new Set(current.map((product) => product.id));
          return [...current, ...incoming.filter((product) => !seen.has(product.id))];
        });
        setPagination(res.data?.pagination || null);
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
  }, [page, retryKey]);

  const hasNextPage = Boolean(pagination?.hasNextPage);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || loading || loadingMore || loadMoreError || !hasNextPage) return undefined;
    if (typeof IntersectionObserver === 'undefined') return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !busyRef.current) {
          busyRef.current = true;
          setPage((current) => current + 1);
        }
      },
      // Start ~2.5 screens early: one page is ~3000px tall on mobile, so a fast flick must not outrun it.
      { rootMargin: `${Math.round(window.innerHeight * 2.5)}px 0px` },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [loading, loadingMore, loadMoreError, hasNextPage, products.length]);

  usePageMeta({
    title: undefined,
    description: 'Shop electronics, fashion, groceries, beauty products, home essentials, and more at AHM Mart. Fast delivery across Pakistan with secure online shopping.',
    path: '/',
    jsonLd: HOME_JSON_LD,
  });

  return (
    <div className="animate-fade-in">
      <HeroBanner />
      <CategoryGrid />
      <ShopByBrand />
      {!loading && products.length > 0 && <FlashSale products={products} />}

      {/* Just For You */}
      <section className="container-main py-4 pb-8">
        <div className="rounded-xl border border-gray-100 bg-white p-3 shadow-card sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold tracking-tight text-dark sm:text-xl">Just For You</h2>
            <Link
              to="/products"
              className="inline-flex items-center gap-1 text-sm font-semibold text-primary transition hover:underline"
            >
              See All
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          {loading ? (
            <BrandLoader minHeight={420} text="Loading products" />
          ) : products.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-gray-500">No products available yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-5">
              {products.map((product) => (
                <div key={product.id}>
                  <ProductCard product={product} />
                </div>
              ))}
              {/* Reserve the space of the incoming page so the footer is not pulled up behind a small spinner. */}
              {loadingMore && Array.from({ length: 12 }, (_, i) => <ProductCardSkeleton key={`skeleton-${i}`} />)}
            </div>
          )}

          {!loading && products.length > 0 && (
            <div className="mt-6">
              {loadingMore && <p className="sr-only" role="status">Loading more products</p>}
              {loadMoreError && (
                <div role="alert" className="rounded-xl border border-red-100 bg-red-50 p-4 text-center">
                  <p className="text-sm text-red-700">We couldn&apos;t load more products.</p>
                  <button
                    type="button"
                    onClick={() => { setLoadMoreError(false); setRetryKey((current) => current + 1); }}
                    className="btn-outline mt-3 bg-white text-sm"
                  >
                    Try again
                  </button>
                </div>
              )}
              {!loadMoreError && hasNextPage && (
                <div ref={sentinelRef} className="h-10" aria-hidden="true" />
              )}
              {!hasNextPage && !loadingMore && (
                <p className="text-center text-sm text-gray-500">
                  You&apos;ve seen all {pagination?.total || products.length} products
                </p>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Trust badges */}
      <section className="container-main pb-10">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {TRUST_FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="flex flex-col items-center gap-2 rounded-xl border border-gray-100 bg-white p-3 text-center shadow-card transition hover:-translate-y-0.5 hover:shadow-card-hover sm:flex-row sm:items-center sm:gap-4 sm:text-left"
            >
              <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-600">
                {feature.icon}
              </span>
              <div>
                <h3 className="text-sm font-bold text-dark">{feature.title}</h3>
                <p className="text-xs text-gray-500">{feature.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Home;