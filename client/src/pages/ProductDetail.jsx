import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ChevronRight, Check, Heart, ShoppingCart, PackageSearch } from 'lucide-react';
import { useToast } from '../components/ToastProvider';
import { orderService, productService } from '../services';
import { useCartStore, useAuthStore, useWishlistStore } from '../store';
import { formatPrice, getEffectivePrice } from '../utils/format';
import { buildProductPath, parseProductImages, normalizeProductImageUrl, getProductSlug, parseProductVariants, getProductVariantPrice, getProductVariantStock, getProductImageUrl, getProductDescription } from '../utils/product';
import usePageMeta from '../hooks/usePageMeta';
import ProductGallery from '../components/product/ProductGallery';
import QuantityStepper from '../components/product/QuantityStepper';
import DeliveryInfo, { ShippingReturnsDetails } from '../components/product/DeliveryInfo';
import ProductAccordion from '../components/product/ProductAccordion';
import ProductReviews, { Stars } from '../components/product/ProductReviews';
import RelatedProducts from '../components/product/RelatedProducts';
import StickyPurchaseBar from '../components/product/StickyPurchaseBar';
import { buildShippingDetails, buildReturnPolicy } from '../utils/storePolicySchema';

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
  const [descriptionRequest, setDescriptionRequest] = useState({ id: null, n: 0 });
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
      // Prefer a variant that can actually be bought; fall back to the first one.
      return variants.find((variant) => Number(getProductVariantStock(product, variant)) > 0) || variants[0];
    });
  }, [product]);

  // Product structured data. Only real stored values are used: no reviews, brand or identifiers are
  // invented, and rating data is emitted only when real reviews exist. The Offer mirrors what the
  // page currently shows: the selected variant's price, stock and SKU (or the product's own).
  const productJsonLd = useMemo(() => {
    if (!product) return null;
    const url = `${window.location.origin}${buildProductPath(product)}`;
    const hasVariants = parseProductVariants(product).length > 0;
    const variant = hasVariants ? selectedVariant : null;
    const price = Number(getProductVariantPrice(product, variant));
    const stock = Number(getProductVariantStock(product, variant) ?? 0);
    const mainImage = getProductImageUrl(product, variant);
    const images = [...new Set([
      mainImage,
      ...parseProductImages(product).map((img) => normalizeProductImageUrl(img)),
    ].filter(Boolean))];

    return {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.name,
      description: getProductDescription(product) || undefined,
      image: images.length ? images : undefined,
      sku: variant?.sku || product.sku || undefined,
      brand: product.brand ? { '@type': 'Brand', name: product.brand } : undefined,
      url,
      offers: Number.isFinite(price) && price > 0
        ? {
          '@type': 'Offer',
          url,
          price: price.toFixed(2),
          priceCurrency: 'PKR',
          availability: `https://schema.org/${stock > 0 ? 'InStock' : 'OutOfStock'}`,
          itemCondition: 'https://schema.org/NewCondition',
          hasMerchantReturnPolicy: buildReturnPolicy(),
          shippingDetails: buildShippingDetails(),
        }
        : undefined,
      aggregateRating: product.rating > 0 && product.review_count > 0
        ? {
          '@type': 'AggregateRating',
          ratingValue: Number(product.rating),
          reviewCount: Number(product.review_count),
        }
        : undefined,
    };
  }, [product, selectedVariant]);

  const metaDescription = product
    ? (String(getProductDescription(product)).replace(/\s+/g, ' ').trim().slice(0, 160)
      || `Buy ${product.name} online at AHM Mart.`)
    : undefined;

  usePageMeta({
    title: product ? product.name : (loading ? undefined : 'Product not found'),
    description: metaDescription,
    path: product ? buildProductPath(product) : undefined,
    image: product ? getProductImageUrl(product) : undefined,
    type: 'product',
    jsonLd: productJsonLd,
    // The server returns 200 for the SPA shell on unknown URLs, so mark missing products noindex.
    noindex: !loading && !product,
  });

  if (loading) {
    return (
      <div className="bg-white">
        <div className="container-main py-4 md:py-8">
          <div className="grid gap-6 md:grid-cols-2 md:gap-10" role="status" aria-busy="true" aria-label="Loading product">
            <div className="aspect-square max-h-[52vh] animate-pulse rounded-2xl bg-gray-100 md:max-h-none" />
            <div className="space-y-4">
              <div className="h-3 w-24 animate-pulse rounded bg-gray-100" />
              <div className="h-7 w-4/5 animate-pulse rounded bg-gray-100" />
              <div className="h-9 w-40 animate-pulse rounded bg-gray-100" />
              <div className="h-20 w-full animate-pulse rounded bg-gray-100" />
              <div className="h-12 w-full animate-pulse rounded-xl bg-gray-100" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="bg-white">
        <div className="container-main flex flex-col items-center py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-500">
            <PackageSearch className="h-7 w-7" aria-hidden="true" />
          </span>
          <h1 className="mt-4 text-xl font-bold text-gray-900">Product not found</h1>
          <p className="mt-1 max-w-sm text-sm text-gray-600">This product may have been removed or is no longer available.</p>
          <Link to="/products" className="mt-5 inline-flex min-h-[44px] items-center rounded-xl bg-primary-600 px-5 text-sm font-semibold text-white hover:bg-primary-700">Browse products</Link>
        </div>
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
    setTimeout(() => setAdded(false), 4000);
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

  const description = getProductDescription(product);
  const longDescription = description.length > 280; // shorter text is shown once, in the summary
  const previousPrice = hasDiscount ? (selectedVariant?.price != null ? selectedVariant.price : product.price) : null;
  const galleryImages = [...new Set([getProductImageUrl(product, selectedVariant), ...normalizedImages].filter(Boolean))];
  const displaySku = selectedVariant?.sku || product.sku || null;
  const hasRating = product.rating > 0 && product.review_count > 0;

  const handleIncreaseQuantity = () => {
    if (remainingStock <= 0) {
      addToast('You already have the full available stock in your cart.', 'error');
      return;
    }
    if (quantity >= remainingStock) {
      addToast(`Only ${remainingStock} item${remainingStock === 1 ? '' : 's'} left in stock.`, 'error');
      return;
    }
    setQuantity((current) => current + 1);
  };

  const showFullDescription = () => {
    setDescriptionRequest((current) => ({ id: 'description', n: current.n + 1 }));
    setTimeout(() => document.getElementById('product-description')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  const accordionItems = [
    longDescription && {
      id: 'description',
      title: 'Description',
      defaultOpen: true,
      content: <p className="whitespace-pre-line">{description}</p>,
    },
    {
      id: 'information',
      title: 'Product information',
      defaultOpen: false,
      content: (
        <dl className="grid grid-cols-[120px_1fr] gap-x-4 gap-y-2">
          {product.brand && (
            <>
              <dt className="text-gray-500">Brand</dt>
              <dd><Link to={`/products?brand=${encodeURIComponent(product.brand)}`} className="font-medium text-primary-700 underline-offset-2 hover:underline">{product.brand}</Link></dd>
            </>
          )}
          {selectedVariant && (
            <>
              <dt className="text-gray-500">Option</dt>
              <dd className="font-medium text-gray-900">{selectedVariant.label || selectedVariant.name}</dd>
            </>
          )}
          {displaySku && (
            <>
              <dt className="text-gray-500">SKU</dt>
              <dd className="break-all font-medium text-gray-900">{displaySku}</dd>
            </>
          )}
          <dt className="text-gray-500">Availability</dt>
          <dd className="font-medium text-gray-900">{isOutOfStock ? 'Out of stock' : 'In stock'}</dd>
        </dl>
      ),
    },
    {
      id: 'shipping',
      title: 'Shipping & returns',
      defaultOpen: false,
      content: <ShippingReturnsDetails />,
    },
  ].filter(Boolean);

  return (
    <div className="animate-fade-in bg-white">
      <div className="container-main pb-10 pt-1 md:pt-5">
        <nav aria-label="Breadcrumb" className="hidden pb-4 text-sm text-gray-500 md:block">
          <ol className="flex min-w-0 items-center gap-1.5">
            <li><Link to="/" className="hover:text-primary-700">Home</Link></li>
            <li aria-hidden="true"><ChevronRight className="h-3.5 w-3.5 text-gray-400" /></li>
            <li><Link to="/products" className="hover:text-primary-700">Products</Link></li>
            <li aria-hidden="true"><ChevronRight className="h-3.5 w-3.5 text-gray-400" /></li>
            <li aria-current="page" className="min-w-0 truncate font-medium text-gray-900">{product.name}</li>
          </ol>
        </nav>

        <div className="grid gap-5 md:grid-cols-2 md:gap-8 lg:gap-12">
          <div className="min-w-0 md:sticky md:top-28 md:self-start">
            <ProductGallery
              product={product}
              images={galleryImages}
              isOutOfStock={isOutOfStock}
              discountLabel={hasDiscount && discount != null ? `-${discount}%` : null}
            />
          </div>

          <div className="min-w-0">
            {product.brand && (
              <Link
                to={`/products?brand=${encodeURIComponent(product.brand)}`}
                className="text-xs font-bold uppercase tracking-wider text-primary-700 hover:underline"
              >
                {product.brand}
              </Link>
            )}
            <h1 className="mt-1 text-[22px] font-bold leading-snug text-gray-900 sm:text-2xl lg:text-[28px]" style={{ overflowWrap: 'anywhere' }}>
              {product.name}
            </h1>

            {hasRating && (
              <a href="#reviews" className="mt-2 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-primary-700">
                <Stars value={product.rating} />
                <span>{Number(product.rating).toFixed(1)} &middot; {product.review_count} review{product.review_count === 1 ? '' : 's'}</span>
              </a>
            )}

            <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="text-3xl font-extrabold tracking-tight text-primary-700">{formatPrice(displayPrice)}</span>
              {previousPrice != null && (
                <span className="text-base text-gray-500 line-through">{formatPrice(previousPrice)}</span>
              )}
              {hasDiscount && discount != null && (
                <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-bold text-red-700">Save {discount}%</span>
              )}
            </div>

            <p className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${isOutOfStock ? 'bg-gray-100 text-gray-600' : 'bg-primary-50 text-primary-800'}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${isOutOfStock ? 'bg-gray-400' : 'bg-primary-600'}`} aria-hidden="true" />
              {isOutOfStock ? 'Out of stock' : 'In stock'}
            </p>

            {description && (
              <div className="mt-4">
                <p className={`text-[15px] leading-relaxed text-gray-700 ${longDescription ? 'line-clamp-3' : ''}`}>{description}</p>
                {longDescription && (
                  <button type="button" onClick={showFullDescription} className="mt-1 text-sm font-semibold text-primary-700 underline-offset-2 hover:underline">
                    Read full description
                  </button>
                )}
              </div>
            )}

            {variantOptions.length > 0 && (
              <fieldset className="mt-5">
                <legend className="mb-2 text-sm font-semibold text-gray-900">
                  Options{selectedVariant && <span className="ml-1.5 font-normal text-gray-600">{selectedVariant.label || selectedVariant.name}</span>}
                </legend>
                <div className="flex flex-wrap gap-2">
                  {variantOptions.map((variant) => {
                    const isSelected = selectedVariant?.name === variant.name;
                    const soldOut = Number(getProductVariantStock(product, variant)) <= 0;
                    return (
                      <button
                        key={variant.name}
                        type="button"
                        onClick={() => setSelectedVariant(variant)}
                        aria-pressed={isSelected}
                        className={`min-h-[44px] rounded-xl border px-4 py-2 text-sm font-medium transition-colors ${
                          isSelected
                            ? 'border-primary-600 bg-primary-50 text-primary-800 ring-1 ring-primary-600'
                            : 'border-gray-300 bg-white text-gray-800 hover:border-gray-400'
                        } ${soldOut ? 'text-gray-500' : ''}`}
                      >
                        {variant.label || variant.name}
                        {soldOut && <span className="ml-1.5 text-xs font-normal">(sold out)</span>}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            )}

            <div className="mt-5 flex items-center gap-3">
              <QuantityStepper
                value={quantity}
                onDecrease={() => setQuantity(Math.max(1, quantity - 1))}
                onIncrease={handleIncreaseQuantity}
                disableDecrease={quantity <= 1 || isOutOfStock}
                disableIncrease={remainingStock <= 0 || isOutOfStock}
              />
              <button
                type="button"
                onClick={handleToggleWishlist}
                aria-pressed={inWishlist}
                aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
                className={`flex h-12 items-center justify-center gap-2 rounded-xl border px-3.5 text-sm font-semibold transition-colors sm:px-4 ${
                  inWishlist ? 'border-red-200 bg-red-50 text-red-600' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Heart className={`h-5 w-5 ${inWishlist ? 'fill-red-500 text-red-500' : ''}`} aria-hidden="true" />
                <span className="hidden sm:inline">{inWishlist ? 'Saved' : 'Save'}</span>
              </button>
            </div>

            {/* Tablet / desktop actions. Phones use the sticky bar at the bottom of the screen. */}
            <div className="mt-3 hidden gap-3 md:flex">
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={isOutOfStock}
                className={`flex h-12 flex-[1.3] items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white transition active:scale-[0.99] ${
                  isOutOfStock ? 'cursor-not-allowed bg-gray-200 text-gray-500' : added ? 'bg-primary-800' : 'bg-primary-600 hover:bg-primary-700'
                }`}
              >
                {added ? <Check className="h-4 w-4" aria-hidden="true" /> : <ShoppingCart className="h-4 w-4" aria-hidden="true" />}
                {isOutOfStock ? 'Out of stock' : added ? 'Added to cart' : 'Add to cart'}
              </button>
              <button
                type="button"
                onClick={handleBuyNow}
                disabled={isOutOfStock}
                className="h-12 flex-1 rounded-xl border border-primary-600 bg-white text-sm font-semibold text-primary-700 transition hover:bg-primary-50 disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-400 disabled:hover:bg-white"
              >
                Buy now
              </button>
            </div>

            <div role="status" aria-live="polite">
              {added && (
                <p className="mt-3 flex items-center gap-2 rounded-xl bg-primary-50 px-3 py-2.5 text-sm text-primary-800">
                  <Check className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                  <span>Added to your cart.</span>
                  <Link to="/cart" className="ml-auto font-semibold underline-offset-2 hover:underline">View cart</Link>
                </p>
              )}
            </div>

            <div className="mt-6"><DeliveryInfo /></div>

            <div className="mt-6">
              <ProductAccordion items={accordionItems} openRequest={descriptionRequest} />
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-gray-100 pt-8 lg:mt-14">
          <ProductReviews
            reviews={productReviews}
            isAuthenticated={isAuthenticated}
            canReview={canReview}
            eligibilityMessage={reviewEligibilityMessage}
            rating={reviewRating}
            comment={reviewComment}
            error={reviewError}
            submitted={reviewSubmitted}
            onRatingChange={setReviewRating}
            onCommentChange={setReviewComment}
            onSubmit={handleSubmitReview}
          />
        </div>

        <RelatedProducts product={product} />
      </div>

      <StickyPurchaseBar
        total={displayPrice * quantity}
        isOutOfStock={isOutOfStock}
        added={added}
        onAddToCart={handleAddToCart}
        onBuyNow={handleBuyNow}
      />
    </div>
  );
};

export default ProductDetail;
