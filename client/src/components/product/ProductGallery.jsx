import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import ProductImage from '../ProductImage';

// Product image area. The packshot is always shown whole (object-contain, never cropped or
// stretched) inside a square frame that is capped in height on phones so the price and buy
// controls stay close to the top of the screen. Swipe, arrows (desktop) and thumbnails navigate.
const ProductGallery = ({ product, images, isOutOfStock = false, discountLabel = null }) => {
  const [index, setIndex] = useState(0);
  const touchStartX = useRef(null);
  const count = images.length;
  const imagesKey = images.join('|');

  // A different variant/image set starts again from the first image.
  useEffect(() => { setIndex(0); }, [imagesKey]);

  const go = (next) => { if (count > 1) setIndex((next + count) % count); };
  const current = images[index] || null;

  const onTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
  const onTouchEnd = (e) => {
    if (touchStartX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) > 45) go(index + (dx < 0 ? 1 : -1));
  };

  return (
    <div>
      <div
        className="relative aspect-[6/5] w-full overflow-hidden rounded-2xl border border-gray-100 bg-white md:aspect-square"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div className={`h-full w-full p-4 sm:p-6 ${isOutOfStock ? 'opacity-60' : ''}`}>
          <ProductImage
            product={product}
            variant={current ? { image: current } : null}
            eager
            className="h-full w-full"
          />
        </div>

        {discountLabel && !isOutOfStock && (
          <span className="absolute left-3 top-3 rounded-full bg-red-600 px-2.5 py-1 text-xs font-bold text-white">
            {discountLabel}
          </span>
        )}
        {isOutOfStock && (
          <span className="absolute left-3 top-3 rounded-full bg-gray-900/80 px-3 py-1 text-xs font-semibold text-white">
            Out of stock
          </span>
        )}

        {count > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(index - 1)}
              aria-label="Previous image"
              className="absolute left-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white/90 text-gray-700 shadow-sm transition hover:bg-white md:flex"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => go(index + 1)}
              aria-label="Next image"
              className="absolute right-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white/90 text-gray-700 shadow-sm transition hover:bg-white md:flex"
            >
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </button>
            <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5" aria-hidden="true">
              {images.map((src, i) => (
                <span key={src} className={`h-1.5 rounded-full transition-all ${i === index ? 'w-5 bg-primary-600' : 'w-1.5 bg-gray-300'}`} />
              ))}
            </div>
            <p className="sr-only" role="status">Image {index + 1} of {count}</p>
          </>
        )}
      </div>

      {count > 1 && (
        <ul className="scrollbar-hide mt-3 flex gap-2 overflow-x-auto pb-1" aria-label="Product images">
          {images.map((src, i) => (
            <li key={src} className="flex-shrink-0">
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Show image ${i + 1}`}
                aria-current={i === index}
                className={`h-16 w-16 overflow-hidden rounded-xl border-2 bg-white p-1 transition ${i === index ? 'border-primary-600' : 'border-gray-200 hover:border-gray-300'}`}
              >
                <img src={src} alt="" loading="lazy" className="h-full w-full object-contain" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ProductGallery;
