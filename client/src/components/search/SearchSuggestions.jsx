import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import ProductImage from '../ProductImage';
import { productService } from '../../services';
import { formatPrice, getEffectivePrice } from '../../utils/format';
import { buildProductPath } from '../../utils/product';

const MIN_CHARS = 2;
const MAX_SUGGESTIONS = 6;

// Type-ahead results for the header search box. Real products only; nothing is invented.
export const useSearchSuggestions = (query, enabled) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const trimmed = query.trim();

  useEffect(() => {
    if (!enabled || trimmed.length < MIN_CHARS) {
      setItems([]);
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(() => {
      productService.getAllProducts({ search: trimmed, limit: MAX_SUGGESTIONS, sort: 'popular' })
        .then((res) => {
          if (cancelled) return;
          const data = res.data?.data;
          const list = Array.isArray(data) ? data : (data?.products || data?.items || []);
          setItems(list.slice(0, MAX_SUGGESTIONS));
        })
        .catch(() => { if (!cancelled) setItems([]); })
        .finally(() => { if (!cancelled) setLoading(false); });
    }, 250);

    return () => { cancelled = true; clearTimeout(timer); };
  }, [trimmed, enabled]);

  return { items, loading, ready: trimmed.length >= MIN_CHARS };
};

// Keep focus in the input while the pointer/finger is on the list so the click still lands.
const keepFocus = (e) => e.preventDefault();

export const optionId = (listId, index) => `${listId}-opt-${index}`;

export const SuggestionList = ({ listId, items, loading, query, activeIndex, onNavigate, onSeeAll }) => {
  const seeAllIndex = items.length;

  return (
    <div
      id={listId}
      role="listbox"
      aria-label="Search suggestions"
      onMouseDown={keepFocus}
      onPointerDown={keepFocus}
      className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[70vh] overflow-y-auto overscroll-contain rounded-2xl border border-gray-100 bg-white py-1.5 shadow-soft"
    >
      {items.length === 0 && loading && (
        <p className="px-4 py-3 text-sm text-gray-500" role="status">Searching…</p>
      )}
      {items.map((product, index) => {
        const active = activeIndex === index;
        return (
          <Link
            key={product.id}
            id={optionId(listId, index)}
            role="option"
            aria-selected={active}
            to={buildProductPath(product)}
            onClick={onNavigate}
            className={`flex min-h-[56px] items-center gap-3 px-3 py-2 transition-colors ${active ? 'bg-primary-50' : 'hover:bg-gray-50'}`}
          >
            <span className="h-11 w-11 flex-shrink-0 overflow-hidden rounded-lg border border-gray-100 bg-white">
              <ProductImage product={product} className="p-0.5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-dark">{product.name}</span>
              {product.brand && <span className="block truncate text-xs text-gray-500">{product.brand}</span>}
            </span>
            <span className="flex-shrink-0 text-sm font-bold text-primary-700">{formatPrice(getEffectivePrice(product))}</span>
          </Link>
        );
      })}
      {!loading && items.length === 0 && (
        <p className="px-4 py-3 text-sm text-gray-500" role="status">No products match “{query.trim()}”.</p>
      )}
      <button
        type="button"
        id={optionId(listId, seeAllIndex)}
        role="option"
        aria-selected={activeIndex === seeAllIndex}
        onClick={onSeeAll}
        className={`flex min-h-[48px] w-full items-center gap-2 border-t border-gray-100 px-4 text-left text-sm font-semibold text-primary-700 transition-colors ${activeIndex === seeAllIndex ? 'bg-primary-50' : 'hover:bg-gray-50'}`}
      >
        <Search className="h-4 w-4" aria-hidden="true" />
        See all results for “{query.trim()}”
      </button>
    </div>
  );
};
