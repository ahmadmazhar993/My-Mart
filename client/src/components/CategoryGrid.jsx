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
      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-card sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-tight text-dark sm:text-xl">Shop by Category</h2>
          <Link
            to="/products"
            className="text-sm font-semibold text-primary transition hover:underline"
          >
            View all
          </Link>
        </div>

        <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 md:grid-cols-8">
          {categories.map((category) => (
            <Link
              key={category.id || category.slug}
              to={`/products?category=${category.slug}`}
              className="group flex flex-col items-center gap-2 rounded-xl p-2 transition-colors hover:bg-primary-50"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-50 to-primary-100 text-2xl shadow-sm ring-1 ring-primary-100 transition-all duration-200 group-hover:-translate-y-1 group-hover:shadow-md group-hover:ring-primary-200 sm:h-16 sm:w-16">
                {getCategoryIcon(category.slug)}
              </div>
              <span className="line-clamp-2 text-center text-xs font-medium text-gray-700 transition-colors group-hover:text-primary-700">
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