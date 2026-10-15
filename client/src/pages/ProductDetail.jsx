import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import ProductImage from '../components/ProductImage';
import { Breadcrumb } from '../components/ui';
import { useToast } from '../components/ToastProvider';
import { orderService, productService } from '../services';
import { useCartStore, useAuthStore, useWishlistStore } from '../store';
import { formatPrice, getEffectivePrice } from '../utils/format';
import { buildProductPath, parseProductImages, normalizeProductImageUrl, getProductSlug, parseProductVariants, getProductVariantPrice, getProductVariantStock, getProductImageUrl } from '../utils/product';
import SoldOutBanner from '../components/SoldOutBanner';
import BrandLoader from '../components/BrandLoader';

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
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [canReview, setCanReview] = useState(false);
  const [reviewEligibilityMessage, setReviewEligibilityMessage] = useState('');
  const [activeImage, setActiveImage] = useState(null);
  const { addItem, cart, setBuyNowItems } = useCartStore();
  const { isAuthenticated, user } = useAuthStore();
  const currentUserId = user?.id || user?.userID;
  const { addToast } = useToast();
  const { isInWishlist, toggleItem } = useWishlistStore();

  useEffect(() => {
    if (!identifier) return;

    setLoading(true);
    Promise.all([
      productService.getProductById(identifier),
      productService.getProductReviews(identifier),
      isAuthenticated ? orderService.getAllOrders() : Promise.resolve({ data: { data: [] } }),
      isAuthenticated ? productService.checkPurchased(identifier) : Promise.resolve({ data: { purchased: false } }),
    ])
      .then(([productRes, reviewsRes, ordersRes, purchasedRes]) => {
        const nextProduct = productRes.data?.data || null;
        const nextReviews = reviewsRes.data?.data || [];
        const nextOrders = ordersRes?.data?.data || [];
        const purchasedFlag = purchasedRes?.data?.data?.purchased ?? purchasedRes?.data?.purchased ?? false;

        setProduct(nextProduct);
        setReviews(nextReviews);

        if (!nextProduct || !isAuthenticated || !currentUserId) {
          setCanReview(false);
          setReviewEligibilityMessage('');
          return;
        }

        const hasPurchased = purchasedFlag || nextOrders.some((order) => (
          Array.isArray(order.items)
          && order.items.some((item) => String(item.product_id) === String(nextProduct.id))
        ));
        const hasReviewed = nextReviews.some((review) => String(review.userId) === String(currentUserId));

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
  }, [identifier, isAuthenticated, currentUserId]);

  useEffect(() => {
    if (!product || !identifier) return;
    const expectedSlug = getProductSlug(product);
    if (identifier !== expectedSlug) {
      navigate(buildProductPath(product), { replace: true });
    }
  }, [product, identifier, navigate]);

  useEffect(() => {
    if (!product) {
      setSelectedVariant(null);
      return;
    }

    const variants = parseProductVariants(product);
    if (!variants.length) {
      setSelectedVariant(null);
      return;
    }

    setSelectedVariant((current) => {
      if (current && variants.some((variant) => variant.name === current.name)) {
        return current;
      }
      return variants[0];
    });
  }, [product]);

  if (loading) {
    return (
      <div className="container-main py-6">
        <BrandLoader minHeight={420} text="Loading product" />
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
  const variantOptions = parseProductVariants(product);
  const displayPrice = getProductVariantPrice(product, selectedVariant) ?? effectivePrice;
  const variantStock = getProductVariantStock(product, selectedVariant);
  const variantDiscountPrice = selectedVariant?.discount_price != null ? Number(selectedVariant.discount_price) : null;
  const variantDiscountPercent = selectedVariant?.discount_percentage != null ? Number(selectedVariant.discount_percentage) : null;
  const hasDiscount = Boolean(
    variantDiscountPrice != null && variantDiscountPrice < (selectedVariant?.price ?? product.price)
  ) || Boolean(product.discount_price && product.discount_price < product.price);
  const discount = variantDiscountPercent != null
    ? variantDiscountPercent
    : (variantDiscountPrice != null && selectedVariant?.price != null
      ? Math.round(((selectedVariant.price - variantDiscountPrice) / selectedVariant.price) * 100)
      : (product.discount_percentage || (product.discount_price && product.discount_price < product.price
        ? Math.round(((product.price - product.discount_price) / product.price) * 100)
        : null)));
  const images = parseProductImages(product);
  const normalizedImages = images.map((img) => normalizeProductImageUrl(img));
  const primaryImage = getProductImageUrl(product) || normalizeProductImageUrl(images.length > 0 ? images[0] : product.image_url || null);
  const availableStock = Math.max(0, Number(variantStock ?? product.stock_quantity ?? 0));
  const currentCartQuantity = cart.find((entry) => (
    String(entry.id) === String(product.id)
    && (!selectedVariant ? !entry.variant_name : String(entry.variant_name || '') === String(selectedVariant.name))
  ))?.quantity || 0;
  const remainingStock = Math.max(0, availableStock - currentCartQuantity);

  const handleBuyNow = () => {
    if (!isAuthenticated) {
      navigate('/login?redirect=/checkout');
      return;
    }

    if (availableStock <= 0) {
      addToast('This product is currently out of stock.', 'error');
      return;
    }

    if (quantity > remainingStock) {
      const nextQuantity = remainingStock > 0 ? remainingStock : 0;
      if (nextQuantity <= 0) {
        addToast('You already have the full available stock in your cart.', 'error');
      } else {
        setQuantity(nextQuantity);
        addToast(`Only ${nextQuantity} item${nextQuantity === 1 ? '' : 's'} left in stock.`, 'error');
      }
      return;
    }

    const safeQuantity = Math.min(quantity, remainingStock || quantity);

    const displayName = selectedVariant ? `${product.name} (${selectedVariant.name})` : product.name;

    setBuyNowItems([{
      id: product.id,
      product_id: product.id,
      product_name: product.name,
      name: displayName,
      price: displayPrice,
      image: primaryImage,
      images: product.images,
      stock_quantity: availableStock,
      quantity: safeQuantity,
      variant_name: selectedVariant?.name || null,
      variant_label: selectedVariant?.label || selectedVariant?.name || null,
      variant_sku: selectedVariant?.sku || null,
      variant_price: displayPrice,
      variant: selectedVariant || null,
      variants: variantOptions,
    }]);
    navigate('/checkout?mode=buynow');
  };

  const handleAddToCart = () => {
    if (availableStock <= 0) {
      addToast('This product is currently out of stock.', 'error');
      return;
    }

    if (remainingStock <= 0) {
      addToast('You already have the full available stock in your cart.', 'error');
      return;
    }

    if (quantity > remainingStock) {
      const nextQuantity = remainingStock;
      setQuantity(nextQuantity);
      addToast(`Only ${nextQuantity} item${nextQuantity === 1 ? '' : 's'} left in stock.`, 'error');
      return;
    }

    const safeQuantity = Math.min(quantity, remainingStock);
    const displayName = selectedVariant ? `${product.name} (${selectedVariant.name})` : product.name;

    addItem({
      id: product.id,
      product_id: product.id,
      product_name: product.name,
      name: displayName,
      price: displayPrice,
      image: primaryImage,
      images: product.images,
      stock_quantity: availableStock,
      quantity: safeQuantity,
      variant_name: selectedVariant?.name || null,
      variant_label: selectedVariant?.label || selectedVariant?.name || null,
      variant_sku: selectedVariant?.sku || null,
      variant_price: displayPrice,
      variant: selectedVariant || null,
      variants: variantOptions,
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
  const handleToggleWishlist = () => toggleItem({ ...product });
  const isOutOfStock = availableStock <= 0;

  return (
    <div className="container-main animate-fade-in py-3 pb-28 sm:py-6 md:pb-6">
      <div className="hidden sm:block">
        <Breadcrumb items={[
          { label: 'Home', to: '/' },
          { label: 'Products', to: '/products' },
          { label: product.name },
        ]} />
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-card">
        <div className="grid grid-cols-1 gap-0 md:grid-cols-2">
          <div className="flex flex-col items-center justify-center bg-gray-50 p-3 sm:p-6 md:min-h-[400px]">
            <div className="relative aspect-square w-full max-w-[560px] md:aspect-auto">
              <ProductImage
                product={product}
                variant={activeImage ? { image: activeImage } : selectedVariant}
                eager
                className="h-full max-h-[420px] w-full rounded-lg"
              />
              {!isOutOfStock && hasDiscount && discount != null && (
                <span className="badge-sale absolute left-2 top-2 text-xs shadow-sm">-{discount}%</span>
              )}
              {isOutOfStock && (
                <SoldOutBanner />
              )}
            </div>
            {normalizedImages.length > 1 && (
              <div className="scrollbar-hide mt-3 flex w-full max-w-[560px] gap-2 overflow-x-auto pb-1" role="list" aria-label="Product images">
                {normalizedImages.map((img, i) => (
                  <button
                    key={img}
                    type="button"
                    role="listitem"
                    onClick={() => setActiveImage(img)}
                    aria-label={`View image ${i + 1}`}
                    aria-current={(activeImage || primaryImage) === img}
                    className={`h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border-2 bg-white transition ${
                      (activeImage || primaryImage) === img ? 'border-primary' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <img src={img} alt="" loading="lazy" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="p-4 sm:p-6 md:p-8">
            <h1 className="mb-2 text-lg font-bold leading-snug text-dark sm:mb-3 sm:text-2xl">{product.name}</h1>

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

            <div className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1 sm:mb-6">
              <span className="text-2xl font-extrabold text-primary sm:text-3xl">{formatPrice(displayPrice)}</span>
              {hasDiscount && (
                <>
                  <span className="text-base text-gray-400 line-through sm:text-lg">
                    {selectedVariant?.price != null ? formatPrice(selectedVariant.price) : formatPrice(product.price)}
                  </span>
                  {discount != null && <span className="badge-sale text-sm">-{discount}%</span>}
                </>
              )}
            </div>

            <p className="mb-5 text-sm leading-relaxed text-gray-600 sm:mb-6">{product.description}</p>

            {variantOptions.length > 0 && (
              <div className="mb-6">
                <label className="block text-sm font-semibold mb-2">Choose Variant</label>
                <div className="flex flex-wrap gap-2">
                  {variantOptions.map((variant) => {
                    const isSelected = selectedVariant?.name === variant.name;
                    return (
                      <button
                        key={variant.name}
                        type="button"
                        onClick={() => { setSelectedVariant(variant); setActiveImage(null); }}
                        aria-pressed={isSelected}
                        className={`min-h-[40px] rounded-lg border px-3.5 py-2 text-sm font-medium transition-colors ${isSelected ? 'border-primary bg-primary text-white' : 'border-gray-300 bg-white text-gray-700 hover:border-primary'}`}
                      >
                        {variant.label || variant.name}
                      </button>
                    );
                  })}
                </div>
                {selectedVariant?.sku && (
                  <p className="mt-2 text-xs text-gray-500">SKU: {selectedVariant.sku}</p>
                )}
              </div>
            )}

            <div className="space-y-3 mb-6 text-sm">
              <div className="flex gap-2">
                <span className="text-gray-500 w-24">SKU:</span>
                <span className="font-medium">{product.sku || 'N/A'}</span>
              </div>
              {availableStock > 0 && (
                <div className="flex gap-2">
                  <span className="text-gray-500 w-24">Availability:</span>
                  <span className={`font-medium text-green-600`}>{`In Stock (${availableStock})`}</span>
                </div>
              )}
            </div>

            <div className="mb-6 flex items-center gap-4">
              <span className="text-sm font-semibold">Quantity:</span>
              <div className="flex items-center overflow-hidden rounded-lg border border-gray-300">
                <button
                  type="button"
                  aria-label="Decrease quantity"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="h-10 w-10 text-lg transition-colors hover:bg-gray-100"
                >
                  −
                </button>
                <span className="min-w-[48px] border-x border-gray-300 px-3 py-2 text-center font-semibold" aria-live="polite">{quantity}</span>
                <button
                  type="button"
                  onClick={() => {
                    if (remainingStock <= 0) {
                      addToast('You already have the full available stock in your cart.', 'error');
                      return;
                    }
                    if (quantity >= remainingStock) {
                      addToast(`Only ${remainingStock} item${remainingStock === 1 ? '' : 's'} left in stock.`, 'error');
                      return;
                    }
                    setQuantity((current) => current + 1);
                  }}
                  aria-label="Increase quantity"
                  className="h-10 w-10 text-lg transition-colors hover:bg-gray-100 disabled:opacity-40"
                  disabled={remainingStock <= 0}
                >
                  +
                </button>
              </div>
            </div>

            {/* Desktop / tablet actions (phones use the sticky bar below) */}
            <div className="hidden gap-3 md:flex">
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={isOutOfStock}
                className={`flex-1 rounded-lg py-3 font-bold transition-all ${
                  added
                    ? 'bg-green-500 text-white'
                    : (isOutOfStock ? 'cursor-not-allowed bg-gray-200 text-gray-500' : 'btn-primary py-3')
                }`}
              >
                {isOutOfStock ? 'Out of Stock' : (added ? '✓ Added to Cart' : 'Add to Cart')}
              </button>
              <button
                type="button"
                onClick={handleToggleWishlist}
                aria-pressed={inWishlist}
                className={`rounded-lg border-2 px-4 py-3 font-bold transition-all ${
                  inWishlist
                    ? 'border-red-400 bg-red-50 text-red-500'
                    : 'border-gray-300 text-gray-600 hover:border-red-300 hover:text-red-500'
                }`}
              >
                {inWishlist ? '♥ Saved' : '♡ Wishlist'}
              </button>
              <button
                type="button"
                onClick={handleBuyNow}
                disabled={isOutOfStock}
                className="btn-outline flex-1 py-3 text-center"
              >
                Buy Now
              </button>
            </div>

            <ul className="mt-5 grid grid-cols-3 gap-2 border-t border-gray-100 pt-4 text-center text-[11px] text-gray-600 sm:text-xs">
              <li className="flex flex-col items-center gap-1"><span className="text-lg" aria-hidden="true">🚚</span>Fast delivery</li>
              <li className="flex flex-col items-center gap-1"><span className="text-lg" aria-hidden="true">↩️</span>7-day returns</li>
              <li className="flex flex-col items-center gap-1"><span className="text-lg" aria-hidden="true">🔒</span>Secure payment</li>
            </ul>
          </div>
        </div>

        {/* Reviews section */}
        <div className="border-t p-4 sm:p-6">
          <h2 className="mb-4 text-lg font-bold text-dark">
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

      </div>

      {/* Mobile sticky purchase bar */}
      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-gray-200 bg-white px-3 pt-2 pb-safe shadow-[0_-2px_12px_rgba(0,0,0,0.08)] md:hidden">
        <div className="flex items-center gap-2 pb-2">
          <button
            type="button"
            onClick={handleToggleWishlist}
            aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
            aria-pressed={inWishlist}
            className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg border text-xl transition ${
              inWishlist ? 'border-red-300 bg-red-50 text-red-500' : 'border-gray-300 text-gray-500'
            }`}
          >
            {inWishlist ? '♥' : '♡'}
          </button>
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={isOutOfStock}
            className={`h-12 flex-1 rounded-lg border-2 text-sm font-bold transition active:scale-[0.98] ${
              added
                ? 'border-green-500 bg-green-500 text-white'
                : isOutOfStock
                  ? 'cursor-not-allowed border-gray-200 bg-gray-200 text-gray-500'
                  : 'border-primary text-primary'
            }`}
          >
            {isOutOfStock ? 'Out of Stock' : (added ? '✓ Added' : 'Add to Cart')}
          </button>
          <button
            type="button"
            onClick={handleBuyNow}
            disabled={isOutOfStock}
            className="btn-primary h-12 flex-1 px-2 text-sm"
          >
            Buy Now
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
