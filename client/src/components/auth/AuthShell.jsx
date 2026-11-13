import React from 'react';

// Shared frame for Login and Register: brand mark, heading, and a soft green backdrop behind the card.
const AuthShell = ({ title, subtitle, children, footer }) => (
  <div className="relative animate-fade-in">
    <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-primary-100/70 to-transparent" aria-hidden="true" />
    <div className="container-main relative py-8 sm:py-12">
      <div className="mx-auto max-w-md">
        <div className="mb-6 text-center sm:mb-8">
          <h1 className="mb-1 text-2xl font-extrabold tracking-tight text-dark sm:text-3xl">{title}</h1>
          <p className="text-sm text-gray-500">{subtitle}</p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-soft sm:p-8">
          {children}
        </div>

        {footer && <p className="mt-5 text-center text-sm text-gray-600">{footer}</p>}
      </div>
    </div>
  </div>
);

export default AuthShell;
