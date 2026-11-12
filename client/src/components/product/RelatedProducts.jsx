import React, { useEffect, useState } from 'react';
import ProductCard from '../ProductCard';
import { productService } from '../../services';

const MAX_ITEMS = 8;

// Other active products from the same category (an existing API filter). Renders nothing when
// there are none, so there is never an empty or unrelated block.
const RelatedProducts = ({ product }) => {
  const [items, setItems] = useState([]);
  const categoryId = product?.category_id;
  const productId = product?.id;

  useEffect(() => {
    if (!categoryId) { setItems([]); return undefined; }
    let cancelled = false;
    productService.getAllProducts({ category_id: categoryId, limit: MAX_ITEMS + 1, sort: 'popular' })
      .then((res) => {
        if (cancelled) return;
        const list = (res.data?.data || []).filter((p) => p.id !== productId).slice(0, MAX_ITEMS);
        setItems(list);
      })
      .catch(() => { if (!cancelled) setItems([]); });
    return () => { cancelled = true; };
  }, [categoryId, productId]);

  if (items.length === 0) return null;

  return (
    <section aria-labelledby="related-heading" className="mt-10 border-t border-gray-100 pt-8 lg:mt-14">
      <h2 id="related-heading" className="text-xl font-bold text-gray-900">You may also like</h2>
      <ul className="snap-row mt-4 md:grid md:grid-cols-4 md:gap-3 md:overflow-visible">
        {items.map((item) => (
          <li key={item.id} className="w-[46%] min-w-[150px] flex-shrink-0 snap-start md:w-auto md:min-w-0">
            <ProductCard product={item} compact />
          </li>
        ))}
      </ul>
    </section>
  );
};

export default RelatedProducts;
