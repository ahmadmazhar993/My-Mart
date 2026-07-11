import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Breadcrumb, EmptyState } from '../components/ui';
import { useAuthStore, useReviewStore } from '../store';

const Reviews = () => {
  const { isAuthenticated, user } = useAuthStore();
  const { reviews } = useReviewStore();
  const myReviews = reviews.filter((r) => r.userId === user?.id);

  if (!isAuthenticated) {
    return <Navigate to="/login?redirect=/reviews" replace />;
  }

  return (
    <div className="container-main py-6 animate-fade-in">
      <Breadcrumb items={[
        { label: 'Home', to: '/' },
        { label: 'Profile', to: '/profile' },
        { label: 'My Reviews' },
      ]} />

      <div className="bg-white rounded-sm shadow-card p-4 sm:p-6 mb-4">
        <h1 className="text-xl font-bold text-dark">My Reviews</h1>
        <p className="text-sm text-gray-500">Reviews you&apos;ve written on products</p>
      </div>

      {myReviews.length === 0 ? (
        <div className="bg-white rounded-sm shadow-card">
          <EmptyState
            icon="⭐"
            title="No reviews yet"
            description="Purchase a product and leave a review from the product page."
            action={<Link to="/products" className="btn-primary">Shop Now</Link>}
          />
        </div>
      ) : (
        <div className="space-y-4">
          {myReviews.map((review) => (
            <div key={review.id} className="bg-white rounded-sm shadow-card p-5">
              <div className="flex items-start justify-between gap-4 mb-2">
                <div>
                  <Link to={`/products/${review.productId}`} className="font-semibold text-dark hover:text-primary">
                    {review.productName}
                  </Link>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(review.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-accent text-sm flex-shrink-0">
                  {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                </div>
              </div>
              <p className="text-sm text-gray-600">{review.comment}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Reviews;
