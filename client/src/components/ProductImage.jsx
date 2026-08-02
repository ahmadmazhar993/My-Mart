import React, { useEffect, useState } from 'react';
import { getProductImageUrl } from '../utils/product';

const ProductImage = ({ product, variant = null, className = '' }) => {
  const [hasError, setHasError] = useState(false);
  const src = getProductImageUrl(product, variant);

  useEffect(() => {
    setHasError(false);
  }, [src]);

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
      loading="eager"
      decoding="async"
      onError={() => setHasError(true)}
    />
  );
};

export default ProductImage;
