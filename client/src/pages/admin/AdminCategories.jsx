import React, { useEffect, useState } from 'react';
import { categoryService, productService } from '../../services';
import CategoryModal from '../../components/CategoryModal';
import ConfirmDeleteModal from '../../components/ConfirmDeleteModal';
import { useToast } from '../../components/ToastProvider';

const PlusIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const AdminCategories = () => {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const { addToast } = useToast();

  const loadData = () => {
    setLoading(true);
    Promise.all([
      categoryService.getAllCategories(),
      productService.getAllProducts(),
    ])
      .then(([categoriesRes, productsRes]) => {
        setCategories(categoriesRes.data?.data || []);
        setProducts(productsRes.data?.data || []);
      })
      .catch(() => setError('Failed to load categories'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const handleAdd = () => {
    setSelectedCategory(null);
    setIsModalOpen(true);
  };

  const handleEdit = (category) => {
    setSelectedCategory(category);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setSelectedCategory(null);
    setIsModalOpen(false);
  };

  const handleCategorySubmit = async (form, categoryId) => {
    setSaving(true);
    setError('');

    try {
      if (categoryId) {
        await categoryService.updateCategory(categoryId, form);
        addToast('Category updated successfully.');
      } else {
        await categoryService.createCategory(form);
        addToast('Category created successfully.');
      }
      handleCloseModal();
      loadData();
    } catch {
      setError('Failed to save category');
      addToast('Failed to save category.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (category) => {
    if (category.can_delete === false || products.some((product) => product.category_id === category.id)) {
      return;
    }
    setDeleteTarget(category);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setError('');
    try {
      await categoryService.deleteCategory(deleteTarget.id);
      setDeleteTarget(null);
      addToast('Category deleted successfully.');
      loadData();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to delete category';
      setError(msg);
      addToast(msg, 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header card */}
      <div className="flex flex-col gap-3 rounded-xl border border-gray-100 bg-white px-6 py-5 shadow-card sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-dark">Categories</h2>
          <p className="mt-0.5 text-sm text-gray-500">Organize products into categories</p>
        </div>
        <button
          type="button"
          onClick={handleAdd}
          className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-600 active:bg-primary-700"
        >
          <PlusIcon />
          Add Category
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* Table card */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-card">
        {loading ? (
          <div className="p-6 text-sm text-gray-500">Loading...</div>
        ) : categories.length === 0 ? (
          <div className="p-10 text-center">
            <p className="mb-4 text-sm text-gray-500">No categories found.</p>
            <button
              type="button"
              onClick={handleAdd}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-600"
            >
              <PlusIcon />
              Add your first category
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-gray-50/95 text-left text-gray-500 backdrop-blur">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Name</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Slug</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Description</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat, idx) => {
                  const inUse = cat.can_delete === false || products.some((product) => product.category_id === cat.id);
                  return (
                    <tr
                      key={cat.id}
                      className={`border-b border-gray-50 transition-colors hover:bg-primary-50/40 ${
                        idx % 2 === 1 ? 'bg-gray-50/40' : ''
                      }`}
                    >
                      <td className="px-4 py-3 font-medium text-gray-900">{cat.name}</td>
                      <td className="px-4 py-3 text-gray-600">
                        <code className="rounded bg-gray-50 px-1.5 py-0.5 text-xs text-gray-500">{cat.slug}</code>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{cat.description || '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleEdit(cat)}
                            className="rounded-md px-2 py-1 text-sm font-semibold text-primary transition hover:bg-primary-50"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteClick(cat)}
                            disabled={inUse}
                            title={inUse ? 'This category is in use and cannot be deleted.' : 'Delete category'}
                            className="rounded-md px-2 py-1 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:text-gray-400 disabled:hover:bg-transparent"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CategoryModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleCategorySubmit}
        category={selectedCategory}
        saving={saving}
      />

      <ConfirmDeleteModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Category"
        message="Are you sure you want to delete this category? Products linked to it may be affected."
        itemName={deleteTarget?.name}
        loading={deleting}
      />
    </div>
  );
};

export default AdminCategories;