import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ProductImage from './ProductImage';
import { useCartStore, useWishlistStore } from '../store';
import { useToast } from './ToastProvider';
import { formatPrice, getEffectivePrice } from '../utils/format';
import { buildProductPath, parseProductVariants } from '../utils/product';

const LOW_STOCK_THRESHOLD = 5;

const CheckIcon = (props) => (
  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

const AlertIcon = (props) => (
  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
  </svg>
);

const XIcon = (props) => (
  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

// Self-contained stock indicator: a colored pill badge, plus a thin
// progress bar that appears only when stock is running low.
const StockStatus = ({ quantity, maxStock, compact = false }) => {
  const isOutOfStock = quantity <= 0;
  const isLowStock = !isOutOfStock && quantity <= LOW_STOCK_THRESHOLD;

  const pillClasses = isOutOfStock
    ? 'bg-gray-100 text-gray-500'
    : isLowStock
      ? 'bg-amber-50 text-amber-700'
      : 'bg-green-50 text-green-700';

  const Icon = isOutOfStock ? XIcon : isLowStock ? AlertIcon : CheckIcon;
  const label = isOutOfStock ? 'Out of stock' : isLowStock ? `Only ${quantity} left` : 'In stock';

  // Rough fill for the low-stock bar, relative to when "low stock" kicks in
  const barPercent = isLowStock
    ? Math.max(8, Math.round((quantity / (maxStock || LOW_STOCK_THRESHOLD)) * 100))
    : 0;

  return (
    <div>
      <div
        className={`inline-flex items-center gap-1 ${pillClasses} ${compact ? 'text-[10px] px-1.5 py-0.5' : 'text-[11px] px-2 py-1'} font-semibold rounded-full`}
      >
        <Icon className="shrink-0" />
        <span>{label}</span>
      </div>
      {isLowStock && (
        <div className={`${compact ? 'w-16' : 'w-20'} h-1 bg-gray-100 rounded-full mt-1.5 overflow-hidden`}>
          <div
            className="h-full bg-amber-400 rounded-full"
            style={{ width: `${barPercent}%` }}
          />
        </div>
      )}
    </div>
  );
};

const ProductCard = ({ product, compact = false, showWishlist = true }) => {
  const { addItem, cart } = useCartStore();
  const { isInWishlist, toggleItem } = useWishlistStore();
  const { addToast } = useToast();
  const [added, setAdded] = useState(false);
  const inWishlist = isInWishlist(product.id);
  const variants = parseProductVariants(product);
  const firstVariant = variants[0] || null;
  const availableStock = Number(firstVariant?.stock_quantity ?? product.stock_quantity ?? 0);
  const isOutOfStock = availableStock <= 0;
  const isLowStock = !isOutOfStock && availableStock <= LOW_STOCK_THRESHOLD;
  const effectivePrice = firstVariant?.discount_price != null
    ? Number(firstVariant.discount_price)
    : getEffectivePrice(product);
  const hasDiscount = Boolean(
    firstVariant?.discount_price != null && firstVariant.discount_price < (firstVariant?.price ?? product.price)
  ) || Boolean(product.discount_price && product.discount_price < product.price);
  const discount = firstVariant?.discount_percentage != null
    ? Number(firstVariant.discount_percentage)
    : (firstVariant?.discount_price != null && firstVariant?.price != null
      ? Math.round(((firstVariant.price - firstVariant.discount_price) / firstVariant.price) * 100)
      : (product.discount_percentage || (product.discount_price && product.discount_price < product.price
        ? Math.round(((product.price - product.discount_price) / product.price) * 100)
        : null)));

  const navigate = useNavigate();

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();

    // If the product has variants, require the user to select one on the product page
    if (variants.length > 0) {
      addToast('Please select a variant before adding to cart.', 'info');
      navigate(buildProductPath(product));
      return;
    }

    const currentCartQuantity = cart.find((entry) => String(entry.id) === String(product.id))?.quantity || 0;
    const stock = Number(product.stock_quantity ?? 0);

    if (stock > 0 && currentCartQuantity >= stock) {
      addToast(`Only ${stock} item${stock === 1 ? '' : 's'} left in stock.`, 'error');
      return;
    }

    addItem({
      id: product.id,
      product_id: product.id,
      product_name: product.name,
      name: product.name,
      price: effectivePrice,
      image: product.image_url,
      images: product.images,
      stock_quantity: stock,
      quantity: 1,
      variants,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  const handleWishlist = (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleItem({
      id: product.id,
      name: product.name,
      price: product.price,
      discount_price: product.discount_price,
      image_url: product.image_url,
      images: product.images,
      rating: product.rating,
      review_count: product.review_count,
    });
  };

  return (
    <Link to={buildProductPath(product)} className="product-card flex flex-col h-full group rounded-xl border border-gray-100 overflow-hidden bg-white hover:shadow-md hover:border-gray-200 transition-shadow">
      <div className={`relative ${compact ? 'aspect-square' : 'aspect-[4/5]'} bg-gray-50 overflow-hidden`}>
        <ProductImage
          product={product}
          className={`w-full h-full group-hover:scale-105 transition-transform duration-300 ${isOutOfStock ? 'opacity-60' : ''}`}
        />
        {!isOutOfStock && discount && (
          <span className="absolute top-2 left-2 badge-sale">-{discount}%</span>
        )}
        {isOutOfStock && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="bg-white/95 text-gray-600 text-[11px] font-semibold px-2.5 py-1 rounded-full shadow-sm uppercase tracking-wide">
              Sold out
            </span>
          </div>
        )}
        {showWishlist && (
          <button
            type="button"
            onClick={handleWishlist}
            className={`absolute top-2 right-2 w-8 h-8 rounded-full shadow flex items-center justify-center text-sm transition-colors ${
              inWishlist ? 'bg-red-500 text-white' : 'bg-white text-gray-400 hover:text-red-500'
            }`}
            title={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
          >
            {inWishlist ? '♥' : '♡'}
          </button>
        )}
      </div>
      <div className={`flex flex-col flex-1 ${compact ? 'p-2' : 'p-3'} ${isOutOfStock ? 'opacity-70' : ''}`}>
        <h3 className={`font-medium text-dark line-clamp-2 ${compact ? 'text-xs' : 'text-sm'} mb-1.5 min-h-[2.5em]`}>
          {product.name}
        </h3>
        <div className="flex items-baseline gap-1.5 flex-wrap">
          <span className={`font-bold text-primary ${compact ? 'text-sm' : 'text-base'}`}>
            {formatPrice(effectivePrice)}
          </span>
          {hasDiscount && (
            <span className="text-gray-400 line-through text-xs">
              {firstVariant?.price != null ? formatPrice(firstVariant.price) : formatPrice(product.price)}
            </span>
          )}
        </div>
        <div className="mt-2">
          <StockStatus quantity={availableStock} maxStock={firstVariant?.stock_quantity ?? product.stock_quantity} compact={compact} />
        </div>
        {product.rating > 0 && (
          <div className="flex items-center gap-1 mt-1.5">
            <div className="flex text-accent text-xs">
              {'★'.repeat(Math.round(product.rating))}
              {'☆'.repeat(5 - Math.round(product.rating))}
            </div>
            <span className="text-xs text-gray-400">({product.review_count || 0})</span>
          </div>
        )}
        {variants.length > 0 && (
          <p className="text-[11px] text-gray-500 mt-2">
            {variants.length} variant{variants.length > 1 ? 's' : ''} available
          </p>
        )}
        {!compact && (
          <div className="mt-auto pt-3">
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={isOutOfStock}
              className={`w-full py-2 text-sm font-semibold rounded-sm transition-all border ${
                added
                  ? 'bg-green-500 border-green-500 text-white'
                  : isOutOfStock
                    ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-primary-50 border-transparent text-primary hover:bg-primary hover:text-white'
              }`}
            >
              {isOutOfStock ? 'Out of stock' : (added ? '✓ Added to cart' : 'Add to cart')}
            </button>
          </div>
        )}
      </div>
    </Link>
  );
};

export default ProductCard;