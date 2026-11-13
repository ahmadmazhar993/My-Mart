import React, { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Heart, X } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import ProductCardSkeleton from '../components/ProductCardSkeleton';
import { Breadcrumb } from '../components/ui';
import { useAuthStore, useWishlistStore } from '../store';
import { productService } from '../services';
import usePageMeta from '../hooks/usePageMeta';

const Wishlist = () => {
  const { isAuthenticated } = useAuthStore();
  const { items, removeItem } = useWishlistStore();
  const [refreshing, setRefreshing] = useState(true);

  // Private page: keep it out of search results.
  usePageMeta({ title: 'My Wishlist', description: 'Products you saved at AHM Mart.', path: '/wishlist', noindex: true });

  // Saved items are a snapshot; reload each product so stock, price and variants are current.
  useEffect(() => {
    const saved = useWishlistStore.getState().items;
    if (!isAuthenticated || saved.length === 0) {
      setRefreshing(false);
      return undefined;
    }

    let cancelled = false;
    Promise.allSettled(saved.map((item) => productService.getProductById(item.id)))
      .then((results) => {
        if (cancelled) return;
        const current = useWishlistStore.getState().items;
        const merged = current.map((item) => {
          const index = saved.findIndex((s) => s.id === item.id);
          const result = index >= 0 ? results[index] : null;
          const fresh = result?.status === 'fulfilled' ? result.value.data?.data : null;
          return fresh ? { ...item, ...fresh } : item;
        });
        useWishlistStore.setState({ items: merged });
      })
      .finally(() => { if (!cancelled) setRefreshing(false); });

    return () => { cancelled = true; };
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return <Navigate to="/login?redirect=/wishlist" replace />;
  }

  return (
    <div className="container-main animate-fade-in py-6">
      <Breadcrumb items={[
        { label: 'Home', to: '/' },
        { label: 'Profile', to: '/profile' },
        { label: 'Wishlist' },
      ]} />

      <div className="relative mb-5 overflow-hidden rounded-2xl bg-gradient-to-r from-primary-800 via-primary-700 to-primary-600 p-5 text-white shadow-soft sm:p-6">
        <div className="pointer-events-none absolute -right-10 -top-14 h-44 w-44 rounded-full bg-white/10" aria-hidden="true" />
        <div className="relative flex items-center gap-3">
          <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25">
            <Heart className="h-6 w-6" aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">My wishlist</h1>
            <p className="text-sm text-primary-100" aria-live="polite">{items.length} saved item{items.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
      </div>

      {refreshing && items.length > 0 ? (
        <div aria-busy="true">
          <p className="sr-only" role="status">Loading your wishlist</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {items.slice(0, 5).map((item) => <ProductCardSkeleton key={`s-${item.id}`} />)}
          </div>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white px-5 py-12 text-center shadow-card">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary-50 text-primary-700">
            <Heart className="h-7 w-7" aria-hidden="true" />
          </span>
          <h2 className="mt-4 text-lg font-bold text-dark">Your wishlist is empty</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-gray-500">Tap the heart on any product to save it here for later.</p>
          <Link to="/products" className="mt-5 inline-flex min-h-[44px] items-center rounded-xl bg-primary-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700">
            Browse products
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {items.map((product) => (
            <div key={product.id} className="relative">
              <ProductCard product={product} showWishlist={false} />
              <button
                type="button"
                onClick={() => removeItem(product.id)}
                aria-label={`Remove ${product.name} from wishlist`}
                title="Remove from wishlist"
                className="absolute right-1.5 top-1.5 flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-gray-500 shadow transition hover:bg-red-50 hover:text-red-600"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Wishlist;
