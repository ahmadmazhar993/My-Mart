import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import ProductImage from './ProductImage';
import { useCartStore, useWishlistStore } from '../store';
import { formatPrice, getEffectivePrice } from '../utils/format';

const ProductCard = ({ product, compact = false, showWishlist = true }) => {
  const { addItem } = useCartStore();
  const { isInWishlist, toggleItem } = useWishlistStore();
  const [added, setAdded] = useState(false);
  const inWishlist = isInWishlist(product.id);
  const effectivePrice = getEffectivePrice(product);
  const hasDiscount = product.discount_price && product.discount_price < product.price;
  const discount = product.discount_percentage
    || (hasDiscount ? Math.round(((product.price - product.discount_price) / product.price) * 100) : null);

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    addItem({
      id: product.id,
      name: product.name,
      price: effectivePrice,
      image: product.image_url,
      images: product.images,
      quantity: 1,
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
    <Link to={`/products/${product.id}`} className="product-card block group">
      <div className={`relative ${compact ? 'aspect-square' : 'aspect-[4/5]'} bg-gray-50 overflow-hidden`}>
        <ProductImage
          product={product}
          className="w-full h-full group-hover:scale-105 transition-transform duration-300"
        />
        {discount && (
          <span className="absolute top-2 left-2 badge-sale">-{discount}%</span>
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
      <div className={`${compact ? 'p-2' : 'p-3'}`}>
        <h3 className={`font-medium text-dark line-clamp-2 ${compact ? 'text-xs' : 'text-sm'} mb-1.5 min-h-[2.5em]`}>
          {product.name}
        </h3>
        <div className="flex items-baseline gap-1.5 flex-wrap">
          <span className={`font-bold text-primary ${compact ? 'text-sm' : 'text-base'}`}>
            {formatPrice(effectivePrice)}
          </span>
          {hasDiscount && (
            <span className="text-gray-400 line-through text-xs">
              {formatPrice(product.price)}
            </span>
          )}
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
        {!compact && (
          <button
            type="button"
            onClick={handleAddToCart}
            className={`w-full mt-3 py-2 text-sm font-semibold rounded-sm transition-all ${
              added
                ? 'bg-green-500 text-white'
                : 'bg-primary-50 text-primary hover:bg-primary hover:text-white'
            }`}
          >
            {added ? '✓ Added' : 'Add to Cart'}
          </button>
        )}
      </div>
    </Link>
  );
};

export default ProductCard;
