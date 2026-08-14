import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { productService, categoryService } from '../../services';
import { formatPrice } from '../../utils/format';
import ProductModal from '../../components/ProductModal';
import ConfirmDeleteModal from '../../components/ConfirmDeleteModal';
import { useToast } from '../../components/ToastProvider';

const SearchIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const AdminProducts = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const { addToast } = useToast();
  const params = new URLSearchParams(location.search);
  const urlSearch = location.pathname === '/admin/products'
    ? (params.get('search') || '')
    : '';
  const [searchQuery, setSearchQuery] = useState(urlSearch);

  const loadData = (nextPage = page, search = urlSearch) => {
    setLoading(true);
    Promise.all([
      productService.getAllProducts({ page: nextPage, limit: 25, search }),
      categoryService.getAllCategories(),
    ])
      .then(([productsRes, categoriesRes]) => {
        setProducts(productsRes.data?.data || []);
        setPagination(productsRes.data?.pagination || null);
        setCategories(categoriesRes.data?.data || []);
      })
      .catch(() => setError('Failed to load products'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(page, urlSearch); }, [page, urlSearch]);

  useEffect(() => {
    setSearchQuery(urlSearch);
  }, [urlSearch]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmed = searchQuery.trim();
      if (location.pathname === '/admin/products') {
        const current = params.get('search') || '';
        if (trimmed !== current) {
          const next = new URLSearchParams(location.search);
          if (trimmed) next.set('search', trimmed);
          else next.delete('search');
          navigate(`/admin/products${next.toString() ? `?${next.toString()}` : ''}`, { replace: true });
        }
      } else if (trimmed) {
        navigate(`/admin/products?search=${encodeURIComponent(trimmed)}`);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = (e) => {
    e.preventDefault();
    const trimmed = searchQuery.trim();
    if (trimmed) {
      setPage(1);
      navigate(`/admin/products?search=${encodeURIComponent(trimmed)}`);
    } else {
      setPage(1);
      navigate('/admin/products');
    }
  };
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
    const selectedSeller = (products.find((product) => String(product.id) === String(productId))?.seller_id) || null;

    const payload = {
      name: form.name,
      description: form.description,
      price: Number(form.price),
      purchase_price: form.purchase_price ? Number(form.purchase_price) : null,
      discount_price: form.discount_price ? Number(form.discount_price) : null,
      stock_quantity: Number(form.stock_quantity),
      category_id: selectedCategory?.id || form.category_id,
      seller_id: selectedSeller || form.seller_id || null,
      sku: form.sku,
      images: form.images || [],
      variants: form.variants || [],
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
      loadData(page);
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
    if (product.can_delete === false) {
      return;
    }
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
      loadData(page);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to delete product';
      setError(msg);
      addToast(msg, 'error');
    } finally {
      setDeleting(false);
    }
  };

  const totalPages = pagination?.totalPages || 1;
  const limit = pagination?.limit || 25;

  const getPageNumbers = (current, total) => {
    const delta = 1;
    const range = [];
    const rangeWithDots = [];
    let last;

    for (let i = 1; i <= total; i++) {
      if (i === 1 || i === total || (i >= current - delta && i <= current + delta)) {
        range.push(i);
      }
    }

    for (const i of range) {
      if (last) {
        if (i - last === 2) {
          rangeWithDots.push(last + 1);
        } else if (i - last > 2) {
          rangeWithDots.push('...');
        }
      }
      rangeWithDots.push(i);
      last = i;
    }

    return rangeWithDots;
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col gap-3">
        <form onSubmit={handleSearch} className="flex w-full sm:hidden">
          <div className="flex w-full border-2 border-primary rounded-sm overflow-hidden">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Products..."
              className="flex-1 px-4 py-2 text-sm focus:outline-none"
            />
            <button
              type="submit"
              className="bg-primary text-white px-5 flex items-center hover:bg-primary-600 transition-colors"
            >
              <SearchIcon />
            </button>
          </div>
        </form>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-dark">Products</h2>
            <p className="text-gray-500 text-sm">Manage your store inventory</p>
          </div>
          <button type="button" onClick={handleAdd} className="btn-primary shrink-0">
            + Add Product
          </button>
        </div>

        <form onSubmit={handleSearch} className="flex-1 max-w-2xl hidden sm:flex">
          <div className="flex w-full border-2 border-primary rounded-sm overflow-hidden">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Products..."
              className="flex-1 px-4 py-2 text-sm focus:outline-none"
            />
            <button
              type="submit"
              className="bg-primary text-white px-5 flex items-center hover:bg-primary-600 transition-colors"
            >
              <SearchIcon />
            </button>
          </div>
        </form>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-sm text-sm">{error}</div>
      )}

      <div className="bg-white rounded-sm shadow-card overflow-hidden">
        {loading ? (
          <p className="p-5 text-gray-500">Loading...</p>
        ) : products.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500 mb-4">No products found.</p>
            <button type="button" onClick={handleAdd} className="btn-primary">
              Add your first product
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr className="text-left text-gray-500">
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Category</th>
                    <th className="px-4 py-3 font-medium">Price</th>
                    <th className="px-4 py-3 font-medium">Stock</th>
                    <th className="px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.id} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{product.name}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {categories.find((c) => c.id === product.category_id)?.name || product.category_id}
                      </td>
                      <td className="px-4 py-3">{formatPrice(product.discount_price || product.price)}</td>
                      <td className="px-4 py-3">{product.stock_quantity}</td>
                      <td className="px-4 py-3">
                        <button type="button" onClick={() => handleEdit(product)} className="text-primary font-semibold mr-3 hover:underline">Edit</button>
                        <button
                          type="button"
                          onClick={() => handleDeleteClick(product)}
                          disabled={product.can_delete === false}
                          title={product.can_delete === false ? 'This product is in use and cannot be deleted.' : 'Delete product'}
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

            <div className="flex flex-col gap-3 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-gray-600">
                {products.length ? `Showing ${((page - 1) * limit) + 1}-${Math.min(page * limit, pagination?.total || products.length)} of ${pagination?.total || products.length} products` : 'No records'}
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                  aria-label="First page"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 bg-white text-sm text-gray-500 shadow-sm transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
                >
                  «
                </button>

                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={!pagination?.hasPrevPage}
                  aria-label="Previous page"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 bg-white text-sm text-gray-700 shadow-sm transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ‹
                </button>

                <div className="flex items-center gap-1">
                  {getPageNumbers(page, totalPages).map((p, idx) =>
                    p === '...' ? (
                      <span key={`dots-${idx}`} className="inline-flex h-8 w-8 items-center justify-center text-sm text-gray-400">
                        …
                      </span>
                    ) : (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPage(p)}
                        aria-current={p === page ? 'page' : undefined}
                        className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition ${p === page
                          ? 'bg-primary text-white shadow-sm'
                          : 'border border-gray-300 bg-white text-gray-700 hover:border-primary hover:text-primary'
                          }`}
                      >
                        {p}
                      </button>
                    )
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setPage((current) => current + 1)}
                  disabled={!pagination?.hasNextPage}
                  aria-label="Next page"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 bg-white text-sm text-gray-700 shadow-sm transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ›
                </button>

                <button
                  type="button"
                  onClick={() => setPage(totalPages)}
                  disabled={page === totalPages}
                  aria-label="Last page"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 bg-white text-sm text-gray-500 shadow-sm transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
                >
                  »
                </button>
              </div>
            </div>
          </>
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
        message="Are you sure you want to delete this product? This action cannot be undone."
        itemName={deleteTarget?.name}
        loading={deleting}
      />
    </div>
  );
};

export default AdminProducts;
