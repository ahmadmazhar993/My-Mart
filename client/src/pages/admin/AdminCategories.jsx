import React, { useEffect, useState } from 'react';
import { categoryService, productService } from '../../services';
import CategoryModal from '../../components/CategoryModal';
import ConfirmDeleteModal from '../../components/ConfirmDeleteModal';
import { useToast } from '../../components/ToastProvider';

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-dark">Categories</h2>
          <p className="text-gray-500 text-sm">Organize products into categories</p>
        </div>
        <button type="button" onClick={handleAdd} className="btn-primary shrink-0">
          + Add Category
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-sm text-sm">{error}</div>
      )}

      <div className="bg-white rounded-sm shadow-card overflow-hidden">
        {loading ? (
          <p className="p-5 text-gray-500">Loading...</p>
        ) : categories.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500 mb-4">No categories found.</p>
            <button type="button" onClick={handleAdd} className="btn-primary">
              Add your first category
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="text-left text-gray-500">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Slug</th>
                  <th className="px-4 py-3 font-medium">Description</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat) => (
                  <tr key={cat.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{cat.name}</td>
                    <td className="px-4 py-3 text-gray-600">{cat.slug}</td>
                    <td className="px-4 py-3 text-gray-500">{cat.description || '—'}</td>
                    <td className="px-4 py-3">
                      <button type="button" onClick={() => handleEdit(cat)} className="text-primary font-semibold mr-3 hover:underline">Edit</button>
                      <button
                        type="button"
                        onClick={() => handleDeleteClick(cat)}
                        disabled={cat.can_delete === false || products.some((product) => product.category_id === cat.id)}
                        title={cat.can_delete === false || products.some((product) => product.category_id === cat.id) ? 'This category is in use and cannot be deleted.' : 'Delete category'}
                        className="text-red-600 font-semibold hover:underline disabled:text-gray-400 disabled:cursor-not-allowed"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
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
