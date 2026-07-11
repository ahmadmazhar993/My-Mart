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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-xl font-semibold">
            {category ? 'Edit Category' : 'Add Category'}
          </h2>
          <button type="button" onClick={onClose} className="text-2xl leading-none hover:text-red-500">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 p-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category Name <span className="text-red-500">*</span>
              </label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                required
                placeholder="e.g. Electronics"
                className="input-field w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Slug <span className="text-red-500">*</span>
              </label>
              <input
                name="slug"
                value={form.slug}
                onChange={handleChange}
                required
                placeholder="e.g. electronics"
                className="input-field w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                rows={3}
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Optional category description"
                className="input-field w-full resize-none"
              />
            </div>
          </div>

          <div className="border-t px-6 py-4 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving...' : category ? 'Update Category' : 'Add Category'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CategoryModal;
