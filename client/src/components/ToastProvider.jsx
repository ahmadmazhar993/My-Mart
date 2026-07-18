import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

const ToastContext = createContext(null);

let toastId = 0;

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback((message, type = 'success') => {
    const id = ++toastId;
    setToasts((current) => [...current, { id, message, type }]);
    window.setTimeout(() => removeToast(id), 3200);
  }, [removeToast]);

  const value = useMemo(() => ({ addToast }), [addToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed inset-x-3 bottom-3 z-[1200] flex flex-col gap-2 sm:inset-auto sm:top-4 sm:right-4 sm:left-auto sm:w-[min(92vw,320px)]">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`w-full rounded-lg border px-4 py-3 text-sm shadow-lg font-medium sm:w-auto ${
              toast.type === 'error'
                ? 'border-red-200 bg-red-50 text-red-700'
                : 'border-emerald-200 bg-emerald-50 text-emerald-800'
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export default ToastProvider;
