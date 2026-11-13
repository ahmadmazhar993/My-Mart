import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { categoryService } from '../services';
import { getCategoryIcon } from '../utils/product';
import SectionHeader from './home/SectionHeader';

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
    <section className="container-main py-5 sm:py-8" aria-labelledby="shop-by-category">
      <SectionHeader id="shop-by-category" eyebrow="Browse" title="Shop by category" to="/products" linkLabel="View all" />

      <ul className="grid grid-cols-4 gap-2 sm:grid-cols-6 sm:gap-3 md:grid-cols-8">
        {categories.map((category) => (
          <li key={category.id || category.slug}>
            <Link
              to={`/products?category=${category.slug}`}
              className="group flex h-full flex-col items-center gap-2 rounded-2xl border border-gray-100 bg-white px-1 py-3 shadow-card transition duration-200 hover:-translate-y-1 hover:border-primary-200 hover:shadow-soft sm:px-2 sm:py-4"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-50 to-primary-100 text-2xl ring-1 ring-primary-100 transition-all duration-200 group-hover:from-primary-100 group-hover:to-primary-200 sm:h-14 sm:w-14">
                {getCategoryIcon(category.slug)}
              </span>
              <span className="line-clamp-2 min-h-[2.2em] text-center text-[11px] font-semibold leading-tight text-gray-700 transition-colors group-hover:text-primary-700 sm:text-xs">
                {category.name}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default CategoryGrid;
