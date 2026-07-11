import React from 'react';
import { Link } from 'react-router-dom';

export const ProductSkeleton = ({ count = 4 }) => (
  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="product-card animate-pulse">
        <div className="bg-gray-200 aspect-square" />
        <div className="p-3 space-y-2">
          <div className="h-3 bg-gray-200 rounded w-full" />
          <div className="h-3 bg-gray-200 rounded w-2/3" />
          <div className="h-4 bg-gray-200 rounded w-1/2" />
        </div>
      </div>
    ))}
  </div>
);

export const EmptyState = ({ icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center py-16 px-4 text-center animate-fade-in">
    <div className="text-5xl mb-4">{icon}</div>
    <h3 className="text-lg font-bold text-dark mb-2">{title}</h3>
    <p className="text-gray-500 text-sm mb-6 max-w-sm">{description}</p>
    {action}
  </div>
);

export const Breadcrumb = ({ items }) => (
  <nav className="flex items-center gap-2 text-sm text-gray-500 mb-4 flex-wrap">
    {items.map((item, index) => (
      <React.Fragment key={item.label}>
        {index > 0 && <span className="text-gray-300">/</span>}
        {item.to ? (
          <Link to={item.to} className="hover:text-primary transition-colors">
            {item.label}
          </Link>
        ) : (
          <span className="text-dark font-medium">{item.label}</span>
        )}
      </React.Fragment>
    ))}
  </nav>
);
