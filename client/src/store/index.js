import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { setAuthToken } from '../services/api';
import { buildCartItemKey } from '../utils/product';

const normalizeUser = (user) => {
  if (!user) return null;
  return {
    ...user,
    id: user.id ?? user.userID,
    userID: user.userID ?? user.id,
  };
};

export const useAuthStore = create((set) => ({
  user: normalizeUser(JSON.parse(localStorage.getItem('user') || 'null')),
  token: localStorage.getItem('token') || null,
  isAuthenticated: !!localStorage.getItem('token'),

  login: (user, token) => {
    const normalized = normalizeUser(user);
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(normalized));
    useCartStore.getState().clearCart();
    useWishlistStore.getState().clearItems();
    set({ user: normalized, token, isAuthenticated: true });
  },

  restoreSession: (user, token) => {
    const normalized = normalizeUser(user);
    if (token) {
      localStorage.setItem('token', token);
      setAuthToken(token);
    }
    localStorage.setItem('user', JSON.stringify(normalized));
    set({ user: normalized, token: token || null, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setAuthToken(null);
    set({ user: null, token: null, isAuthenticated: false });
  },

  setUser: (user) => {
    const normalized = normalizeUser(user);
    localStorage.setItem('user', JSON.stringify(normalized));
    set({ user: normalized });
  },
}));

export const useCartStore = create(
  persist(
    (set) => ({
      cart: [],
      buyNowItems: null,

      addItem: (item) => set((state) => {
        const itemKey = buildCartItemKey(item);
        const existing = state.cart.find((c) => buildCartItemKey(c) === itemKey);
        const requestedQuantity = Math.max(1, Number(item.quantity || 1));
        const availableStock = Number(item.stock_quantity ?? item.stock ?? 0);
        const nextQuantity = existing
          ? existing.quantity + requestedQuantity
          : requestedQuantity;
        const safeQuantity = availableStock > 0 ? Math.min(nextQuantity, availableStock) : nextQuantity;

        if (safeQuantity <= 0) return state;

        if (existing) {
          return {
            cart: state.cart.map((c) =>
              buildCartItemKey(c) === itemKey
                ? { ...c, quantity: safeQuantity, price: item.price ?? c.price, stock_quantity: availableStock }
                : c
            ),
          };
        }
        return {
          cart: [...state.cart, { ...item, quantity: safeQuantity, stock_quantity: availableStock }],
        };
      }),

      setBuyNowItems: (items) => set({ buyNowItems: items }),

      clearBuyNowItems: () => set({ buyNowItems: null }),

      removeItem: (itemOrId) => set((state) => {
        const targetKey = typeof itemOrId === 'object' ? buildCartItemKey(itemOrId) : null;
        return {
          cart: state.cart.filter((item) => (
            targetKey ? buildCartItemKey(item) !== targetKey : String(item.id) !== String(itemOrId)
          )),
        };
      }),

      updateQuantity: (itemOrId, quantity) => set((state) => {
        const targetKey = typeof itemOrId === 'object' ? buildCartItemKey(itemOrId) : null;
        const target = state.cart.find((item) => (
          targetKey ? buildCartItemKey(item) === targetKey : String(item.id) === String(itemOrId)
        ));
        const availableStock = Number(target?.stock_quantity ?? target?.stock ?? 0);
        const safeQuantity = availableStock > 0
          ? Math.min(Math.max(1, quantity), availableStock)
          : Math.max(1, quantity);

        return {
          cart: state.cart.map((item) => (
            targetKey ? (buildCartItemKey(item) === targetKey ? { ...item, quantity: safeQuantity } : item) : (String(item.id) === String(itemOrId) ? { ...item, quantity: safeQuantity } : item)
          )),
        };
      }),

      clearCart: () => set({ cart: [] }),
    }),
    {
      name: 'ahm-cart',
      partialize: (state) => ({ cart: state.cart }),
    }
  )
);

export const useProductStore = create((set) => ({
  products: [],
  loading: false,
  error: null,

  setProducts: (products) => set({ products }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}));

export const useWishlistStore = create(
  persist(
    (set, get) => ({
      items: [],

      addItem: (product) => set((state) => {
        if (state.items.some((i) => i.id === product.id)) return state;
        return { items: [...state.items, product] };
      }),

      removeItem: (id) => set((state) => ({
        items: state.items.filter((item) => item.id !== id),
      })),

      clearItems: () => set({ items: [] }),

      isInWishlist: (id) => get().items.some((item) => item.id === id),

      toggleItem: (product) => {
        const { items, addItem, removeItem } = get();
        if (items.some((i) => i.id === product.id)) {
          removeItem(product.id);
          return false;
        }
        addItem(product);
        return true;
      },
    }),
    { name: 'ahm-wishlist' }
  )
);

export const useReviewStore = create(
  persist(
    (set, get) => ({
      reviews: [],

      addReview: (review) => set((state) => ({
        reviews: [{ ...review, id: Date.now(), createdAt: new Date().toISOString() }, ...state.reviews],
      })),

      getProductReviews: (productId) => get().reviews.filter((r) => r.productId === productId),

      getUserReviews: (userId) => get().reviews.filter((r) => r.userId === userId),
    }),
    { name: 'ahm-reviews' }
  )
);
