import React from 'react';

const ConfirmDeleteModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Delete',
  message = 'Are you sure you want to delete this item? This action cannot be undone.',
  itemName = '',
  loading = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="border-b px-6 py-4">
          <h2 className="text-xl font-semibold text-dark">{title}</h2>
        </div>

        <div className="px-6 py-5">
          <p className="text-gray-600 text-sm leading-relaxed">{message}</p>
          {itemName && (
            <p className="mt-3 text-sm font-semibold text-dark bg-gray-50 border border-gray-200 rounded-sm px-3 py-2 break-words">
              {itemName}
            </p>
          )}
        </div>

        <div className="border-t px-6 py-4 flex justify-end gap-3">
          <button type="button" onClick={onClose} disabled={loading} className="btn-secondary">
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="bg-red-600 text-white font-semibold px-6 py-2.5 rounded-sm hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDeleteModal;
