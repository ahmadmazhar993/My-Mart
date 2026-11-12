import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { Link, useLocation, useNavigationType } from 'react-router-dom';
import { Truck, Wallet, Undo2, LifeBuoy, ChevronRight } from 'lucide-react';
import { getSnapshot, saveSnapshot } from '../utils/listSnapshots';
import { SHIPPING_TIERS } from '../config/shipping';
import { POLICY } from '../config/policies';
import { formatPrice } from '../utils/format';
import HeroBanner from '../components/HeroBanner';
import CategoryGrid from '../components/CategoryGrid';
import ShopByBrand from '../components/ShopByBrand';
import FlashSale from '../components/FlashSale';
import ProductCard from '../components/ProductCard';
import { productService } from '../services';
import BrandLoader from '../components/BrandLoader';
import ProductCardSkeleton from '../components/ProductCardSkeleton';
import usePageMeta from '../hooks/usePageMeta';

const FREE_DELIVERY_TIER = SHIPPING_TIERS.find((tier) => tier.cost === 0);

// Short promises shown under the product list. Every value comes from the same config the cart and
// policy pages use, so this block cannot drift from what checkout actually does.
const TRUST_FEATURES = [
  FREE_DELIVERY_TIER && {
    title: 'Free delivery',
    desc: `On orders over ${formatPrice(FREE_DELIVERY_TIER.minSubtotal)}`,
    to: '/pages/shipping',
    Icon: Truck,
  },
  {
    title: 'Pay your way',
    desc: 'Cash on delivery or bank transfer',
    to: '/pages/cash-on-delivery',
    Icon: Wallet,
  },
  POLICY.returnWindowDays && {
    title: 'Easy returns',
    desc: `${POLICY.returnWindowDays}-day return policy`,
    to: '/pages/returns-refunds',
    Icon: Undo2,
  },
  {
    title: 'Help when you need it',
    desc: 'Help center and contact options',
    to: '/help',
    Icon: LifeBuoy,
  },
].filter(Boolean);

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
        <div className="rounded-2xl border border-gray-100 bg-white p-3 shadow-card sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold tracking-tight text-dark sm:text-xl">Just for you</h2>
            <Link
              to="/products"
              className="inline-flex min-h-[44px] items-center gap-0.5 pl-2 text-sm font-semibold text-primary-700 transition hover:underline"
            >
              See all
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
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
          {TRUST_FEATURES.map(({ title, desc, to, Icon }) => (
            <Link
              key={title}
              to={to}
              className="flex flex-col items-center gap-2 rounded-2xl border border-gray-100 bg-white p-3 text-center shadow-card transition hover:border-primary-200 hover:shadow-card-hover sm:flex-row sm:items-center sm:gap-4 sm:p-4 sm:text-left"
            >
              <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-700">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-dark">{title}</h3>
                <p className="text-xs text-gray-500">{desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Home;