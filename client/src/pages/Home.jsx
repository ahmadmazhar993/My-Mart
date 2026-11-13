import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';
import { getSnapshot, saveSnapshot } from '../utils/listSnapshots';
import HeroBanner from '../components/HeroBanner';
import ValueStrip from '../components/home/ValueStrip';
import SectionHeader from '../components/home/SectionHeader';
import CategoryGrid from '../components/CategoryGrid';
import ShopByBrand from '../components/ShopByBrand';
import FlashSale from '../components/FlashSale';
import ProductCard from '../components/ProductCard';
import EndOfList from '../components/EndOfList';
import { productService } from '../services';
import BrandLoader from '../components/BrandLoader';
import ProductCardSkeleton from '../components/ProductCardSkeleton';
import usePageMeta from '../hooks/usePageMeta';

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
      <ValueStrip />
      <CategoryGrid />
      <ShopByBrand />
      {!loading && products.length > 0 && <FlashSale products={products} />}

      {/* Just For You */}
      <section className="container-main py-5 pb-10 sm:py-8" aria-labelledby="just-for-you">
        <div>
          <SectionHeader id="just-for-you" eyebrow="Explore" title="Just for you" subtitle="Browse products from across our store" to="/products" linkLabel="See all" />

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
                <EndOfList total={pagination?.total || products.length} browseAllTo="/products" />
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default Home;