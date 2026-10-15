import React, { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import { EmptyState, Breadcrumb } from '../components/ui';
import { useAuthStore, useWishlistStore } from '../store';
import { productService } from '../services';
import BrandLoader from '../components/BrandLoader';

const Wishlist = () => {
  const { isAuthenticated } = useAuthStore();
  const { items, removeItem } = useWishlistStore();
  const [refreshing, setRefreshing] = useState(true);

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
    <div className="container-main py-6 animate-fade-in">
      <Breadcrumb items={[
        { label: 'Home', to: '/' },
        { label: 'Profile', to: '/profile' },
        { label: 'Wishlist' },
      ]} />

      <div className="bg-white rounded-sm shadow-card p-4 sm:p-6 mb-4">
        <h1 className="text-xl font-bold text-dark">My Wishlist</h1>
        <p className="text-sm text-gray-500">{items.length} saved item{items.length !== 1 ? 's' : ''}</p>
      </div>

      {refreshing && items.length > 0 ? (
        <BrandLoader minHeight={280} text="Loading your wishlist" />
      ) : items.length === 0 ? (
        <div className="bg-white rounded-sm shadow-card">
          <EmptyState
            icon="❤️"
            title="Your wishlist is empty"
            description="Save products you love by clicking the heart icon on any product."
            action={<Link to="/products" className="btn-primary">Browse Products</Link>}
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {items.map((product) => (
            <div key={product.id} className="relative">
              <ProductCard product={product} showWishlist={false} />
              <button
                type="button"
                onClick={() => removeItem(product.id)}
                className="absolute top-2 right-2 w-8 h-8 bg-white rounded-full shadow flex items-center justify-center text-red-500 hover:bg-red-50 text-sm"
                title="Remove from wishlist"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Wishlist;
