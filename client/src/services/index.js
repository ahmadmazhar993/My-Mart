import api from './api';

export const authService = {
  register: (data) => api.post('/auth/register', data),
  login: (email, password) => api.post('/auth/login', { email, password }),
  getCurrentUser: () => api.get('/auth'),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  validateResetToken: (token) => api.post('/auth/validate-token', { token }),
  resetPassword: (data) => api.post('/auth/update-password', data),
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },
};

export const userService = {
  getProfile: () => api.get('/user/profile'),
  updateProfile: (data) => api.put('/user/update-preferences', data),
  changePassword: (data) => api.put('/user/update-password', data),
  getAllUsers: () => api.get('/user'),
  updateUser: (id, data) => api.put(`/user/${id}`, data),
};

export const productService = {
  getAllProducts: (params) => api.get('/products', { params }),
  getProductById: (id) => api.get(`/products/${id}`),
  getProductReviews: (id) => api.get(`/products/${id}/reviews`),
  createReview: (id, data) => api.post(`/products/${id}/reviews`, data),
  createProduct: (data) => api.post('/products', data),
  updateProduct: (id, data) => api.put(`/products/${id}`, data),
  deleteProduct: (id) => api.delete(`/products/${id}`),
};

export const categoryService = {
  getAllCategories: () => api.get('/categories'),
  getCategoryById: (id) => api.get(`/categories/${id}`),
  createCategory: (data) => api.post('/categories', data),
  updateCategory: (id, data) => api.put(`/categories/${id}`, data),
  deleteCategory: (id) => api.delete(`/categories/${id}`),
};

export const orderService = {
  getAllOrders: () => api.get('/orders'),
  getOrderById: (id) => api.get(`/orders/${id}`),
  createOrder: (data) => api.post('/orders', data),
  updateOrderStatus: (id, status, paymentStatus) => api.put(`/orders/${id}`, { status, paymentStatus }),
  submitPaymentProof: (id, formData) => api.post(`/orders/${id}/payment-proof`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
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
