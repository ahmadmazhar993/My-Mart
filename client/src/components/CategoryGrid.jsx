import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { categoryService } from '../services';
import { getCategoryIcon } from '../utils/product';

const FALLBACK_CATEGORIES = [
  { id: 1, name: 'Electronics', slug: 'electronics' },
  { id: 2, name: 'Fashion', slug: 'clothing' },
  { id: 3, name: 'Accessories', slug: 'accessories' },
  { id: 4, name: 'Home & Living', slug: 'home' },
  { id: 5, name: 'Beauty', slug: 'beauty' },
  { id: 6, name: 'Sports', slug: 'sports' },
  { id: 7, name: 'Groceries', slug: 'groceries' },
  { id: 8, name: 'Toys', slug: 'toys' },
];

const CategoryGrid = () => {
  const [categories, setCategories] = useState(FALLBACK_CATEGORIES);

  useEffect(() => {
    categoryService.getAllCategories()
      .then((res) => {
        if (res.data?.data?.length) {
          setCategories(res.data.data.filter((c) => !c.parentId).slice(0, 8));
        }
      })
      .catch(() => {});
  }, []);

  return (
    <section className="container-main py-4">
      <div className="bg-white rounded-sm shadow-card p-4 sm:p-6">
        <h2 className="section-title">Categories</h2>
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
          {categories.map((category) => (
            <Link
              key={category.id || category.slug}
              to={`/products?category=${category.slug}`}
              className="flex flex-col items-center gap-2 p-2 rounded-sm hover:bg-primary-50 transition-colors group"
            >
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-primary-50 rounded-full flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                {getCategoryIcon(category.slug)}
              </div>
              <span className="text-xs text-center text-gray-700 font-medium line-clamp-2">
                {category.name}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CategoryGrid;
