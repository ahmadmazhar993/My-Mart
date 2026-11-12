import React from 'react';
import { Link } from 'react-router-dom';
import { Star, MessageSquare } from 'lucide-react';

export const Stars = ({ value, className = 'h-4 w-4' }) => (
  <span className="inline-flex items-center gap-0.5" aria-hidden="true">
    {[1, 2, 3, 4, 5].map((n) => (
      <Star key={n} className={`${className} ${n <= Math.round(value) ? 'fill-accent text-accent' : 'fill-gray-100 text-gray-300'}`} />
    ))}
  </span>
);

// Reviews are only ever the ones customers wrote: the average and the bars are computed from the
// loaded reviews, and the form only appears for customers who bought the product (canReview).
const ProductReviews = ({
  reviews,
  isAuthenticated,
  canReview,
  eligibilityMessage,
  rating,
  comment,
  error,
  submitted,
  onRatingChange,
  onCommentChange,
  onSubmit,
}) => {
  const count = reviews.length;
  const average = count ? reviews.reduce((sum, r) => sum + Number(r.rating || 0), 0) / count : 0;
  const counts = [5, 4, 3, 2, 1].map((star) => ({ star, n: reviews.filter((r) => Math.round(r.rating) === star).length }));

  const form = canReview && (
    <form onSubmit={onSubmit} className="rounded-2xl border border-gray-200 bg-white p-4">
      <p className="text-sm font-semibold text-gray-900">Write a review</p>
      <div className="mt-2 flex gap-1" role="radiogroup" aria-label="Your rating">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={star === rating}
            aria-label={`${star} star${star === 1 ? '' : 's'}`}
            onClick={() => onRatingChange(star)}
            className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-gray-50"
          >
            <Star className={`h-6 w-6 ${star <= rating ? 'fill-accent text-accent' : 'fill-gray-100 text-gray-300'}`} aria-hidden="true" />
          </button>
        ))}
      </div>
      <label htmlFor="review-comment" className="sr-only">Your review</label>
      <textarea
        id="review-comment"
        value={comment}
        onChange={(e) => onCommentChange(e.target.value)}
        required
        rows={3}
        placeholder="Share your experience with this product"
        className="input-field mt-2"
      />
      {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
      <button type="submit" className="mt-3 min-h-[44px] rounded-xl bg-primary-600 px-5 text-sm font-semibold text-white transition hover:bg-primary-700">
        {submitted ? 'Review submitted' : 'Submit review'}
      </button>
    </form>
  );

  // One helpful line about what the viewer can do next (never a second, competing notice).
  let guidance = null;
  if (!isAuthenticated) {
    guidance = (<><Link to="/login" className="font-semibold text-primary-700 underline-offset-2 hover:underline">Log in</Link> to review this product after you have bought it.</>);
  } else if (!canReview) {
    guidance = eligibilityMessage || 'You can review this product after purchasing it.';
  }

  return (
    <section id="reviews" aria-labelledby="reviews-heading" className="scroll-mt-28">
      <h2 id="reviews-heading" className="text-xl font-bold text-gray-900">
        Customer reviews{count > 0 && <span className="ml-1.5 text-base font-medium text-gray-500">({count})</span>}
      </h2>

      {count === 0 ? (
        <div className="mt-4 flex flex-col items-center rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-gray-400 ring-1 ring-gray-200">
            <MessageSquare className="h-5 w-5" aria-hidden="true" />
          </span>
          <p className="mt-3 text-sm font-semibold text-gray-900">No reviews yet</p>
          {guidance && <p className="mt-1 max-w-sm text-sm text-gray-600">{guidance}</p>}
          {canReview && <p className="mt-1 max-w-sm text-sm text-gray-600">You have bought this product, so you can write the first review below.</p>}
        </div>
      ) : (
        <div className="mt-4 grid gap-6 md:grid-cols-[220px_1fr]">
          <div>
            <p className="text-4xl font-extrabold leading-none text-gray-900">{average.toFixed(1)}</p>
            <div className="mt-2"><Stars value={average} className="h-5 w-5" /></div>
            <p className="mt-1 text-sm text-gray-600">{count} review{count === 1 ? '' : 's'}</p>
            <ul className="mt-3 space-y-1.5" aria-label="Rating breakdown">
              {counts.map(({ star, n }) => (
                <li key={star} className="flex items-center gap-2 text-xs text-gray-600">
                  <span className="w-3 text-right">{star}</span>
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                    <span className="block h-full rounded-full bg-accent" style={{ width: `${(n / count) * 100}%` }} />
                  </span>
                  <span className="w-5">{n}</span>
                </li>
              ))}
            </ul>
          </div>
          <ul className="divide-y divide-gray-100">
            {reviews.map((review) => (
              <li key={review.id} className="py-4 first:pt-0">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-sm font-semibold text-gray-900">{review.userName}</span>
                  <Stars value={review.rating} className="h-3.5 w-3.5" />
                  <span className="sr-only">{review.rating} out of 5</span>
                  <span className="text-xs text-gray-500">{new Date(review.createdAt).toLocaleDateString()}</span>
                </div>
                <p className="mt-1 text-sm leading-relaxed text-gray-700">{review.comment}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {(form || (count > 0 && guidance)) && (
        <div className="mt-5">
          {form}
          {!canReview && count > 0 && guidance && <p className="text-sm text-gray-600">{guidance}</p>}
        </div>
      )}
    </section>
  );
};

export default ProductReviews;
