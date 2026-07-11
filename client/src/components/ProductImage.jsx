import React, { useState } from 'react';
import { getProductImageUrl } from '../utils/product';

const ProductImage = ({ product, className = '' }) => {
  const [hasError, setHasError] = useState(false);
  const src = getProductImageUrl(product);

  if (!src || hasError) {
    return (
      <div
        className={`bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center ${className}`}
      >
        <span className="text-3xl font-extrabold text-primary/40 select-none">
          {product?.name?.charAt(0)?.toUpperCase() || '?'}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={product?.name}
      className={`w-full h-full object-contain ${className}`}
      loading='lazy'
      onError={() => setHasError(true)}
    />
  );
};

export default ProductImage;
