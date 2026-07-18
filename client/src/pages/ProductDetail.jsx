import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import ProductImage from '../components/ProductImage';
import { Breadcrumb, ProductSkeleton } from '../components/ui';
import { orderService, productService } from '../services';
import { useCartStore, useAuthStore, useWishlistStore } from '../store';
import { formatPrice, getEffectivePrice } from '../utils/format';
import { buildProductPath, parseProductImages, normalizeProductImageUrl, getProductSlug } from '../utils/product';

const ProductDetail = () => {
  const { identifier } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [reviews, setReviews] = useState([]);
  const [canReview, setCanReview] = useState(false);
  const [reviewEligibilityMessage, setReviewEligibilityMessage] = useState('');
  const { addItem, setBuyNowItems } = useCartStore();
  const { isAuthenticated, user } = useAuthStore();
  const { isInWishlist, toggleItem } = useWishlistStore();

  useEffect(() => {
    if (!identifier) return;

    setLoading(true);
    Promise.all([
      productService.getProductById(identifier),
      productService.getProductReviews(identifier),
      isAuthenticated ? orderService.getAllOrders() : Promise.resolve({ data: { data: [] } }),
    ])
      .then(([productRes, reviewsRes, ordersRes]) => {
        const nextProduct = productRes.data?.data || null;
        const nextReviews = reviewsRes.data?.data || [];
        const nextOrders = ordersRes?.data?.data || [];

        setProduct(nextProduct);
        setReviews(nextReviews);

        if (!nextProduct || !isAuthenticated || !user?.id) {
          setCanReview(false);
          setReviewEligibilityMessage('');
          return;
        }

        const hasPurchased = nextOrders.some((order) => (
          Array.isArray(order.items)
          && order.items.some((item) => String(item.product_id) === String(nextProduct.id))
        ));
        const hasReviewed = nextReviews.some((review) => String(review.userId) === String(user.id));

        setCanReview(hasPurchased && !hasReviewed);
        setReviewEligibilityMessage(
          hasReviewed
            ? 'You have already reviewed this product.'
            : hasPurchased
              ? ''
              : 'You can review this product after purchasing it.'
        );
      })
      .catch(() => {
        setProduct(null);
        setReviews([]);
        setCanReview(false);
        setReviewEligibilityMessage('');
      })
      .finally(() => setLoading(false));
  }, [identifier, isAuthenticated, user?.id]);

  useEffect(() => {
    if (!product || !identifier) return;
    const expectedSlug = getProductSlug(product);
    if (identifier !== expectedSlug) {
      navigate(buildProductPath(product), { replace: true });
    }
  }, [product, identifier, navigate]);

  if (loading) {
    return (
      <div className="container-main py-6">
        <ProductSkeleton count={1} />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container-main py-16 text-center">
        <h2 className="text-xl font-bold mb-4">Product not found</h2>
        <Link to="/products" className="btn-primary">Back to Products</Link>
      </div>
    );
  }

  const effectivePrice = getEffectivePrice(product);
  const hasDiscount = product.discount_price && product.discount_price < product.price;
  const discount = product.discount_percentage
    || (hasDiscount ? Math.round(((product.price - product.discount_price) / product.price) * 100) : null);
  const images = parseProductImages(product);
  const normalizedImages = images.map((img) => normalizeProductImageUrl(img));
  const primaryImage = normalizeProductImageUrl(images.length > 0 ? images[0] : product.image_url || null);

  const handleBuyNow = () => {
    if (!isAuthenticated) {
      navigate('/login?redirect=/checkout');
      return;
    }

    setBuyNowItems([{
      id: product.id,
      name: product.name,
      price: effectivePrice,
      image: primaryImage,
      images: product.images,
      quantity,
    }]);
    navigate('/checkout?mode=buynow');
  };

  const handleAddToCart = () => {
    addItem({
      id: product.id,
      name: product.name,
      price: effectivePrice,
      image: primaryImage,
      images: product.images,
      quantity,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!isAuthenticated || !product) return;

    setReviewError('');
    try {
      const [reviewRes, productRes] = await Promise.all([
        productService.createReview(product.id, {
          rating: reviewRating,
          comment: reviewComment.trim(),
        }),
        productService.getProductById(product.id),
      ]);

      const createdReview = reviewRes.data?.data || null;
      if (createdReview) {
        setReviews((prev) => [createdReview, ...prev]);
      }
      setProduct(productRes.data?.data || product);
      setCanReview(false);
      setReviewEligibilityMessage('You have already reviewed this product.');
      setReviewComment('');
      setReviewSubmitted(true);
      setTimeout(() => setReviewSubmitted(false), 3000);
    } catch (error) {
      setReviewError(error.response?.data?.message || 'Failed to submit review. Please try again.');
      setReviewSubmitted(false);
    }
  };

  const productReviews = reviews;
  const inWishlist = isInWishlist(product.id);

  return (
    <div className="container-main py-6 animate-fade-in">
      <Breadcrumb items={[
        { label: 'Home', to: '/' },
        { label: 'Products', to: '/products' },
        { label: product.name },
      ]} />

      <div className="bg-white rounded-sm shadow-card overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
          <div className="bg-gray-50 p-6 flex items-center justify-center min-h-[400px]">
            <ProductImage product={product} className="max-h-[400px] w-full rounded-sm" />
          </div>

          <div className="p-6 md:p-8">
            <h1 className="text-xl sm:text-2xl font-bold text-dark mb-3">{product.name}</h1>

            {product.rating > 0 && (
              <div className="flex items-center gap-2 mb-4">
                <div className="flex text-accent">
                  {'★'.repeat(Math.round(product.rating))}
                  {'☆'.repeat(5 - Math.round(product.rating))}
                </div>
                <span className="text-sm text-gray-500">
                  {product.rating} ({product.review_count || 0} reviews)
                </span>
              </div>
            )}

            <div className="flex items-baseline gap-3 mb-6">
              <span className="text-3xl font-extrabold text-primary">{formatPrice(effectivePrice)}</span>
              {hasDiscount && (
                <>
                  <span className="text-lg text-gray-400 line-through">{formatPrice(product.price)}</span>
                  {discount && <span className="badge-sale text-sm">-{discount}%</span>}
                </>
              )}
            </div>

            <p className="text-gray-600 text-sm leading-relaxed mb-6">{product.description}</p>

            <div className="space-y-3 mb-6 text-sm">
              <div className="flex gap-2">
                <span className="text-gray-500 w-24">SKU:</span>
                <span className="font-medium">{product.sku || 'N/A'}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-gray-500 w-24">Availability:</span>
                <span className={`font-medium ${product.stock_quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {product.stock_quantity > 0 ? `In Stock (${product.stock_quantity})` : 'Out of Stock'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4 mb-6">
              <label className="text-sm font-semibold">Quantity:</label>
              <div className="flex items-center border border-gray-300 rounded-sm">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-3 py-2 hover:bg-gray-100 transition-colors"
                >
                  −
                </button>
                <span className="px-4 py-2 border-x border-gray-300 min-w-[48px] text-center">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity(quantity + 1)}
                  className="px-3 py-2 hover:bg-gray-100 transition-colors"
                >
                  +
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={product.stock_quantity <= 0}
                className={`flex-1 py-3 font-bold rounded-sm transition-all ${
                  added
                    ? 'bg-green-500 text-white'
                    : 'btn-primary py-3'
                }`}
              >
                {added ? '✓ Added to Cart' : 'Add to Cart'}
              </button>
              <button
                type="button"
                onClick={() => toggleItem({
                  id: product.id,
                  name: product.name,
                  price: product.price,
                  discount_price: product.discount_price,
                  image_url: product.image_url,
                  images: product.images,
                  rating: product.rating,
                  review_count: product.review_count,
                })}
                className={`px-4 py-3 font-bold rounded-sm border-2 transition-all ${
                  inWishlist
                    ? 'border-red-400 text-red-500 bg-red-50'
                    : 'border-gray-300 text-gray-600 hover:border-red-300 hover:text-red-500'
                }`}
              >
                {inWishlist ? '♥ Saved' : '♡ Wishlist'}
              </button>
              <button
                type="button"
                onClick={handleBuyNow}
                disabled={product.stock_quantity <= 0}
                className="flex-1 btn-outline text-center py-3"
              >
                Buy Now
              </button>
            </div>
          </div>
        </div>

        {/* Reviews section */}
        <div className="border-t p-6">
          <h2 className="text-lg font-bold text-dark mb-4">
            Customer Reviews ({productReviews.length})
          </h2>

          {isAuthenticated ? (
            canReview ? (
              <form onSubmit={handleSubmitReview} className="bg-gray-50 rounded-sm p-4 mb-6">
                <p className="text-sm font-semibold mb-2">Write a Review</p>
                <div className="flex gap-1 mb-3">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      className={`text-xl ${star <= reviewRating ? 'text-accent' : 'text-gray-300'}`}
                    >
                      ★
                    </button>
                  ))}
                </div>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  required
                  rows={3}
                  placeholder="Share your experience with this product..."
                  className="input-field mb-3"
                />
                {reviewError && (
                  <p className="text-sm text-red-600 mb-3">{reviewError}</p>
                )}
                <button type="submit" className="btn-primary text-sm">
                  {reviewSubmitted ? '✓ Review Submitted' : 'Submit Review'}
                </button>
              </form>
            ) : (
              <div className="mb-6 rounded-sm border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
                {reviewEligibilityMessage || 'Reviews will appear here once you purchase this product.'}
              </div>
            )
          ) : (
            <p className="text-sm text-gray-500 mb-4">
              <Link to="/login" className="text-primary font-semibold hover:underline">Login</Link>
              {' '}to write a review.
            </p>
          )}

          {productReviews.length === 0 ? (
            <p className="text-sm text-gray-500">No reviews yet. Be the first to review!</p>
          ) : (
            <div className="space-y-4">
              {productReviews.map((review) => (
                <div key={review.id} className="border-b border-gray-100 pb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm">{review.userName}</span>
                    <span className="text-accent text-xs">{'★'.repeat(review.rating)}</span>
                    <span className="text-xs text-gray-400">
                      {new Date(review.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{review.comment}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {normalizedImages.length > 1 && (
          <div className="border-t p-4 flex gap-2 overflow-x-auto">
            {normalizedImages.map((img) => (
              <img key={img} src={img} alt="" className="w-16 h-16 object-cover rounded-sm border" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductDetail;
