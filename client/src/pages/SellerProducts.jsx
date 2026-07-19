import React, { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { productService, categoryService } from '../services';
import ProductModal from '../components/ProductModal';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';
import { useToast } from '../components/ToastProvider';
import { formatPrice } from '../utils/format';
import { useAuthStore } from '../store';

const SearchIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const SellerProducts = () => {
  const { user, isAuthenticated } = useAuthStore();
  const { addToast } = useToast();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  if (!isAuthenticated) {
    return <Navigate to="/login?redirect=/seller/products" replace />;
  }

  if (user?.role !== 'Seller' && user?.role !== 'seller') {
    return <Navigate to="/profile" replace />;
  }

  const loadData = () => {
    setLoading(true);
    Promise.all([
      productService.getSellerProducts(),
      categoryService.getAllCategories(),
    ])
      .then(([productsRes, categoriesRes]) => {
        setProducts(productsRes.data?.data || []);
        setCategories(categoriesRes.data?.data || []);
      })
      .catch(() => setError('Failed to load your products'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return products;

    return products.filter((product) => (
      (product.name || '').toLowerCase().includes(query)
      || (product.description || '').toLowerCase().includes(query)
      || (product.sku || '').toLowerCase().includes(query)
    ));
  }, [products, searchQuery]);

  const handleAdd = () => {
    setSelectedProduct(null);
    setIsModalOpen(true);
  };

  const handleEdit = (product) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setSelectedProduct(null);
    setIsModalOpen(false);
  };

  const handleProductSubmit = async (form, productId) => {
    setSaving(true);
    setError('');

    const selectedCategory = categories.find((category) => {
      const submittedValue = String(form.category_id || '').trim().toLowerCase();
      if (!submittedValue) return false;
      return (
        String(category.id || '').trim().toLowerCase() === submittedValue
        || String(category.slug || '').trim().toLowerCase() === submittedValue
        || String(category.name || '').trim().toLowerCase() === submittedValue
      );
    });

    const payload = {
      name: form.name,
      description: form.description,
      price: Number(form.price),
      discount_price: form.discount_price ? Number(form.discount_price) : null,
      stock_quantity: Number(form.stock_quantity),
      category_id: selectedCategory?.id || form.category_id,
      sku: form.sku,
      images: form.images || [],
      is_active: true,
    };

    try {
      if (productId) {
        await productService.updateProduct(productId, payload);
        addToast('Product updated successfully.');
      } else {
        await productService.createProduct(payload);
        addToast('Product created successfully.');
      }
      handleCloseModal();
      loadData();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to save product';
      setError(msg);
      addToast(msg, 'error');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (product) => {
    setDeleteTarget(product);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setError('');
    try {
      await productService.deleteProduct(deleteTarget.id);
      setDeleteTarget(null);
      addToast('Product deleted successfully.');
      loadData();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to delete product';
      setError(msg);
      addToast(msg, 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="container-main py-6 animate-fade-in">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Seller Inventory</p>
          <h1 className="text-2xl font-bold text-dark">Manage your products</h1>
          <p className="text-sm text-gray-500">Create, update, and remove listings from your catalog.</p>
        </div>
        <button type="button" onClick={handleAdd} className="btn-primary shrink-0">
          + Add Product
        </button>
      </div>

      <div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <label className="flex-1 flex items-center gap-2 rounded-sm border border-gray-200 bg-white px-3 py-2 shadow-sm">
          <SearchIcon />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search your products"
            className="w-full border-none bg-transparent outline-none text-sm"
          />
        </label>
      </div>

      {error && (
        <div className="mb-4 rounded-sm border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>
      )}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <p className="p-5 text-sm text-gray-500">Loading your inventory...</p>
        ) : filteredProducts.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500 mb-4">No products found in your catalog yet.</p>
            <button type="button" onClick={handleAdd} className="btn-primary">
              Add your first product
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Price</th>
                  <th className="px-4 py-3 font-medium">Stock</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-dark">{product.name}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {categories.find((category) => category.id === product.category_id)?.name || product.category_id || '—'}
                    </td>
                    <td className="px-4 py-3">{formatPrice(product.discount_price || product.price)}</td>
                    <td className="px-4 py-3">{product.stock_quantity}</td>
                    <td className="px-4 py-3">
                      <button type="button" onClick={() => handleEdit(product)} className="mr-3 font-semibold text-primary hover:underline">
                        Edit
                      </button>
                      <button type="button" onClick={() => handleDeleteClick(product)} className="font-semibold text-red-600 hover:underline">
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

      <ProductModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleProductSubmit}
        product={selectedProduct}
        categories={categories}
        saving={saving}
      />

      <ConfirmDeleteModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Product"
        message="Deleting this listing will remove it from your storefront."
        itemName={deleteTarget?.name}
        loading={deleting}
      />
    </div>
  );
};

export default SellerProducts;
