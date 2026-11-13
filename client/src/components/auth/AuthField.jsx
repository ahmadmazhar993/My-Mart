import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

// One labelled form field for the sign-in pages: label tied to the input, leading icon, inline error
// (announced to screen readers), and a show/hide toggle for passwords. 48px tall and 16px text on phones,
// which also stops iOS from zooming the page when a field is focused.
const AuthField = ({ id, label, icon: Icon, error, type = 'text', hint, className = '', ...inputProps }) => {
  const [visible, setVisible] = useState(false);
  const isPassword = type === 'password';
  const describedBy = [error ? `${id}-error` : null, hint ? `${id}-hint` : null].filter(Boolean).join(' ') || undefined;

  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-gray-700">{label}</label>
      <div className="relative">
        {Icon && <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />}
        <input
          id={id}
          type={isPassword && visible ? 'text' : type}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy}
          className={`h-12 w-full rounded-xl border bg-white text-base shadow-sm transition focus:outline-none focus:ring-2 sm:text-sm ${Icon ? 'pl-10' : 'pl-3.5'} ${isPassword ? 'pr-12' : 'pr-3.5'} ${
            error
              ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
              : 'border-gray-200 focus:border-primary-500 focus:ring-primary-100'
          }`}
          {...inputProps}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? 'Hide password' : 'Show password'}
            aria-pressed={visible}
            className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
          >
            {visible ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
          </button>
        )}
      </div>
      {hint && !error && <p id={`${id}-hint`} className="mt-1.5 text-xs text-gray-500">{hint}</p>}
      {error && <p id={`${id}-error`} role="alert" className="mt-1.5 text-xs text-red-600">{error}</p>}
    </div>
  );
};

export default AuthField;
