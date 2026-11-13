import React from 'react';
import { Link } from 'react-router-dom';

export const EmptyState = ({ icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center py-16 px-4 text-center animate-fade-in">
    <div className="text-5xl mb-4">{icon}</div>
    <h3 className="text-lg font-bold text-dark mb-2">{title}</h3>
    <p className="text-gray-500 text-sm mb-6 max-w-sm">{description}</p>
    {action}
  </div>
);

export const Breadcrumb = ({ items }) => (
  <nav aria-label="Breadcrumb" className="mb-2 flex flex-wrap items-center gap-x-2 text-sm text-gray-500">
    {items.map((item, index) => (
      <React.Fragment key={item.label}>
        {index > 0 && <span className="text-gray-300">/</span>}
        {item.to ? (
          <Link to={item.to} className="inline-flex min-h-[44px] items-center transition-colors hover:text-primary-700">
            {item.label}
          </Link>
        ) : (
          <span aria-current="page" className="py-2 font-medium text-dark">{item.label}</span>
        )}
      </React.Fragment>
    ))}
  </nav>
);
