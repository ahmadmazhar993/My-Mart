import React, { useState } from 'react';
import { getProductImageUrl } from '../utils/product';

const ProductImage = ({ product, variant = null, className = '', eager = false }) => {
  const src = getProductImageUrl(product, variant);

  return <ProductImageContent key={src} src={src} name={product?.name} className={className} eager={eager} />;
};

// Keep both the DOM image and its error state scoped to one source URL.
const ProductImageContent = ({ src, name, className, eager }) => {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <div
        className={`bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center ${className}`}
      >
        <span className="text-3xl font-extrabold text-primary/40 select-none">
          {name?.charAt(0)?.toUpperCase() || '?'}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={name}
      className={`w-full h-full object-contain ${className}`}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      onError={() => setHasError(true)}
    />
  );
};

export default ProductImage;
