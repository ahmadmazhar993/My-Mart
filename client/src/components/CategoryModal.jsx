import React, { useEffect, useState } from 'react';

const initialForm = { name: '', slug: '', description: '' };

const slugify = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const CategoryModal = ({
  isOpen,
  onClose,
  onSubmit,
  category = null,
  saving = false,
}) => {
  const [form, setForm] = useState(initialForm);

  useEffect(() => {
    if (category) {
      setForm({
        name: category.name || '',
        slug: category.slug || '',
        description: category.description || '',
      });
    } else {
      setForm(initialForm);
    }
  }, [category, isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
      ...(name === 'name' && !category ? { slug: slugify(value) } : {}),
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form, category?.id);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="category-modal-title"
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl animate-slide-up"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 id="category-modal-title" className="text-lg font-bold tracking-tight text-dark">
            {category ? 'Edit Category' : 'Add Category'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-4 overflow-y-auto p-6">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Category Name <span className="text-red-500">*</span>
              </label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                required
                placeholder="e.g. Electronics"
                className="w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-100"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Slug <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center rounded-lg border border-gray-200 bg-white shadow-sm transition focus-within:border-primary focus-within:ring-2 focus-within:ring-primary-100">
                <span className="pl-3.5 text-sm text-gray-400"></span>
                <input
                  name="slug"
                  value={form.slug}
                  onChange={handleChange}
                  required
                  placeholder="electronics"
                  className="w-full bg-transparent py-2.5 pr-3.5 text-sm focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                rows={3}
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Optional category description"
                className="w-full resize-none rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-100"
              />
            </div>
          </div>

          <div className="flex shrink-0 justify-end gap-3 border-t border-gray-100 bg-white px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-600 shadow-sm transition hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {saving && (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              )}
              {saving ? 'Saving...' : category ? 'Update Category' : 'Add Category'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CategoryModal;