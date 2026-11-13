import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Star } from 'lucide-react';
import { Breadcrumb } from '../components/ui';
import { useAuthStore, useReviewStore } from '../store';
import { buildProductPath } from '../utils/product';
import usePageMeta from '../hooks/usePageMeta';

const Reviews = () => {
  const { isAuthenticated, user } = useAuthStore();
  const { reviews } = useReviewStore();
  const currentUserId = user?.id || user?.userID;
  const myReviews = reviews.filter((r) => r.userId === currentUserId);

  usePageMeta({ title: 'My Reviews', description: 'Reviews you wrote on AHM Mart.', path: '/reviews', noindex: true });

  if (!isAuthenticated) {
    return <Navigate to="/login?redirect=/reviews" replace />;
  }

  return (
    <div className="container-main animate-fade-in py-6">
      <Breadcrumb items={[
        { label: 'Home', to: '/' },
        { label: 'Profile', to: '/profile' },
        { label: 'My Reviews' },
      ]} />

      <div className="relative mb-5 overflow-hidden rounded-2xl bg-gradient-to-r from-primary-800 via-primary-700 to-primary-600 p-5 text-white shadow-soft sm:p-6">
        <div className="pointer-events-none absolute -right-10 -top-14 h-44 w-44 rounded-full bg-white/10" aria-hidden="true" />
        <div className="relative flex items-center gap-3">
          <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25">
            <Star className="h-6 w-6" aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">My reviews</h1>
            <p className="text-sm text-primary-100">Reviews you&apos;ve written on products</p>
          </div>
        </div>
      </div>

      {myReviews.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white px-5 py-12 text-center shadow-card">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary-50 text-primary-700">
            <Star className="h-7 w-7" aria-hidden="true" />
          </span>
          <h2 className="mt-4 text-lg font-bold text-dark">No reviews yet</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-gray-500">Purchase a product and leave a review from the product page.</p>
          <Link to="/products" className="mt-5 inline-flex min-h-[44px] items-center rounded-xl bg-primary-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700">
            Shop now
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {myReviews.map((review) => (
            <li key={review.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-card sm:p-5">
              <div className="mb-2 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <Link
                    to={buildProductPath({ id: review.productId, name: review.productName || review.product?.name || 'product' })}
                    className="inline-flex min-h-[32px] items-center font-semibold text-dark transition hover:text-primary-700"
                  >
                    {review.productName}
                  </Link>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {new Date(review.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex flex-shrink-0 items-center gap-0.5 text-accent" role="img" aria-label={`${review.rating} out of 5 stars`}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star key={n} className="h-4 w-4" fill={n <= review.rating ? 'currentColor' : 'none'} aria-hidden="true" />
                  ))}
                </div>
              </div>
              <p className="text-sm text-gray-600">{review.comment}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Reviews;
