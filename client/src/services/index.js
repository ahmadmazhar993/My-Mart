import api from './api';

export const authService = {
  register: (data) => api.post('/auth/register', data),
  login: (email, password) => api.post('/auth/login', { email, password }),
  verifyEmail: (token) => api.post('/auth/verify-email', { token }),
  checkEmailVerification: (token) => api.get(`/auth/verify-email/check`, { params: { token } }),
  resendVerification: (email) => api.post('/auth/resend-verification', { email }),
  getCurrentUser: () => api.get('/auth'),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  validateResetToken: (token) => api.post('/auth/validate-token', { token }),
  resetPassword: (data) => api.post('/auth/update-password', data),
  logout: async () => {
    try {
      // call backend logout to clear httpOnly cookie
      const resp = await api.get('/auth/logout');
      return resp;
    } catch (err) {
      // still proceed to clear local state on error
      return Promise.reject(err);
    }
  },
};

export const userService = {
  getProfile: () => api.get('/user/profile'),
  getAddresses: () => api.get('/user/addresses'),
  getAddressesForUser: (userId) => api.get(`/user/${userId}/addresses`),
  createAddress: (data) => api.post('/user/addresses', data),
  deleteAddress: (id) => api.delete(`/user/addresses/${id}`),
  updateProfile: (data) => api.put('/user/update-preferences', data),
  changePassword: (data) => api.put('/user/update-password', data),
  getAllUsers: (params = {}) => api.get('/user', { params }),
  updateUser: (id, data) => api.put(`/user/${id}`, data),
};

export const productService = {
  getAllProducts: (params) => api.get('/products', { params }),
  getProductById: (identifier) => api.get(`/products/${identifier}`),
  getAllProductsAdmin: (params) => api.get('/products/admin', { params }),
  getProductByIdAdmin: (identifier) => api.get(`/products/admin/${identifier}`),
  getProductReviews: (identifier) => api.get(`/products/${identifier}/reviews`),
  checkPurchased: (identifier) => api.get(`/products/${identifier}/purchased`),
  createReview: (identifier, data) => api.post(`/products/${identifier}/reviews`, data),
  createProduct: (data) => api.post('/products', data),
  updateProduct: (identifier, data) => api.put(`/products/${identifier}`, data),
  deleteProduct: (identifier) => api.delete(`/products/${identifier}`),
};

export const categoryService = {
  getAllCategories: () => api.get('/categories'),
  getCategoryById: (id) => api.get(`/categories/${id}`),
  createCategory: (data) => api.post('/categories', data),
  updateCategory: (id, data) => api.put(`/categories/${id}`, data),
  deleteCategory: (id) => api.delete(`/categories/${id}`),
};

export const orderService = {
  getAllOrders: (params = {}) => api.get('/orders', { params }),
  getOrderById: (id) => api.get(`/orders/${id}`),
  createOrder: (data) => api.post('/orders', data),
  updateOrderStatus: (id, status, paymentStatus) => api.put(`/orders/${id}`, { status, paymentStatus }),
  submitPaymentProof: (id, formData) => api.post(`/orders/${id}/payment-proof`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
};

export const reportsService = {
  getSalesSummary: (params = {}) => api.get('/reports/sales', { params }),
};

export const receiptService = {
  getReceiptByOrderId: (orderId) => api.get(`/receipts/order/${orderId}`),
};

export const cartService = {
  getCart: () => api.get('/cart'),
  addToCart: (data) => api.post('/cart/add', data),
  removeFromCart: (itemId) => api.delete(`/cart/remove/${itemId}`),
  updateCartItem: (itemId, quantity) => api.put(`/cart/items/${itemId}`, { quantity }),
};

// Seller self-service (approved sellers) and the public application endpoints.
export const sellerPortalService = {
  getMyStatus: () => api.get('/seller/me'),
  apply: (data) => api.post('/seller/apply', data),
  getDashboard: (params) => api.get('/seller/dashboard', { params }),
  getProfile: () => api.get('/seller/profile'),
  updateProfile: (data) => api.put('/seller/profile', data),
  uploadLogo: (file) => {
    const form = new FormData();
    form.append('logo', file);
    return api.post('/seller/profile/logo', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  getCategories: () => api.get('/seller/categories'),
  listProducts: (params) => api.get('/seller/products', { params }),
  getProduct: (id) => api.get(`/seller/products/${id}`),
  createProduct: (data) => api.post('/seller/products', data),
  updateProduct: (id, data) => api.put(`/seller/products/${id}`, data),
  submitProduct: (id) => api.post(`/seller/products/${id}/submit`),
  publishProduct: (id) => api.post(`/seller/products/${id}/publish`),
  unpublishProduct: (id) => api.post(`/seller/products/${id}/unpublish`),
  deleteProduct: (id) => api.delete(`/seller/products/${id}`),
  uploadProductImages: (files) => {
    const form = new FormData();
    files.forEach((file) => form.append('images', file));
    return api.post('/seller/products/upload-images', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  listInventory: (params) => api.get('/seller/inventory', { params }),
  updateStock: (id, data) => api.put(`/seller/inventory/${id}`, data),
  listStockMovements: (id) => api.get(`/seller/inventory/${id}/movements`),
  listOrders: (params) => api.get('/seller/orders', { params }),
  getOrder: (id) => api.get(`/seller/orders/${id}`),
  updateFulfillment: (id, status) => api.put(`/seller/orders/${id}/fulfillment`, { status }),
  getFeePolicy: () => api.get('/seller/fee-policy'),
  getEarnings: (params) => api.get('/seller/earnings', { params }),
  listTransactions: (params) => api.get('/seller/earnings/transactions', { params }),
  listLedger: (params) => api.get('/seller/earnings/ledger', { params }),
  listPayouts: (params) => api.get('/seller/payouts', { params }),
  // The key makes a retried/double-clicked request return the original payout instead of creating another.
  requestPayout: (data, idempotencyKey) => api.post('/seller/payouts', data, { headers: { 'Idempotency-Key': idempotencyKey } }),
  getAnalytics: (params) => api.get('/seller/analytics', { params }),
  downloadSalesCsv: (params) => api.get('/seller/analytics/export.csv', { params, responseType: 'blob' }),
  listReturns: (params) => api.get('/seller/returns', { params }),
  getReturn: (id) => api.get(`/seller/returns/${id}`),
  messageReturn: (id, body) => api.post(`/seller/returns/${id}/messages`, { body }),
  receiveReturn: (id, note) => api.post(`/seller/returns/${id}/receive`, { note }),
};

// Customer returns.
export const returnService = {
  uploadEvidence: (files) => {
    const form = new FormData();
    files.forEach((file) => form.append('images', file));
    return api.post('/returns/upload-evidence', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  create: (data) => api.post('/returns', data),
  mine: () => api.get('/returns/mine'),
  forOrder: (orderId) => api.get(`/returns/order/${orderId}`),
  get: (id) => api.get(`/returns/${id}`),
  message: (id, body) => api.post(`/returns/${id}/messages`, { body }),
  cancel: (id) => api.post(`/returns/${id}/cancel`),
};

// Admin finance and returns.
export const adminFinanceService = {
  getCommission: () => api.get('/admin/finance/commission'),
  setCommission: (rate_percent, note) => api.post('/admin/finance/commission', { rate_percent, note }),
  overview: (params) => api.get('/admin/finance/overview', { params }),
  commissionReport: (params) => api.get('/admin/finance/commissions', { params }),
  sellerBalances: (params) => api.get('/admin/finance/sellers', { params }),
  sellerFinance: (id) => api.get(`/admin/finance/sellers/${id}`),
  listPayouts: (params) => api.get('/admin/finance/payouts', { params }),
  completePayout: (id, reference) => api.post(`/admin/finance/payouts/${id}/complete`, { reference }),
  rejectPayout: (id, reason) => api.post(`/admin/finance/payouts/${id}/reject`, { reason }),
  failPayout: (id, reason) => api.post(`/admin/finance/payouts/${id}/fail`, { reason }),
};

export const adminReturnService = {
  list: (params) => api.get('/admin/returns', { params }),
  get: (id) => api.get(`/admin/returns/${id}`),
  message: (id, body) => api.post(`/admin/returns/${id}/messages`, { body }),
  approve: (id, note) => api.post(`/admin/returns/${id}/approve`, { note }),
  reject: (id, note) => api.post(`/admin/returns/${id}/reject`, { note }),
  refund: (id, amount) => api.post(`/admin/returns/${id}/refund`, { amount }),
  getSettings: () => api.get('/admin/returns/settings'),
  setReturnWindow: (return_window_days) => api.put('/admin/returns/settings', { return_window_days }),
};

// Admin seller management.
export const adminSellerService = {
  listSellers: (params) => api.get('/sellers', { params }),
  getSeller: (id) => api.get(`/sellers/${id}`),
  updateSeller: (id, data) => api.put(`/sellers/${id}`, data),
  approve: (id) => api.post(`/sellers/${id}/approve`),
  reject: (id, reason) => api.post(`/sellers/${id}/reject`, { reason }),
  suspend: (id, reason) => api.post(`/sellers/${id}/suspend`, { reason }),
  reactivate: (id) => api.post(`/sellers/${id}/reactivate`),
  listSellerOrders: (id, params) => api.get(`/sellers/${id}/orders`, { params }),
  listSellerProducts: (id, params) => api.get(`/sellers/${id}/products`, { params }),
  listReviewQueue: (params) => api.get('/sellers/products/review', { params }),
  approveProduct: (productId) => api.post(`/sellers/products/${productId}/approve`),
  rejectProduct: (productId, reason) => api.post(`/sellers/products/${productId}/reject`, { reason }),
};

export const contactService = {
  sendMessage: (data) => api.post('/contact', data),
};
