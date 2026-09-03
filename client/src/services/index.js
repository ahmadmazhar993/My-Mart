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

export const sellerService = {
  getAllSellers: () => api.get('/sellers'),
  getSellerById: (id) => api.get(`/sellers/${id}`),
  createSeller: (data) => api.post('/sellers', data),
};

export const contactService = {
  sendMessage: (data) => api.post('/contact', data),
};
