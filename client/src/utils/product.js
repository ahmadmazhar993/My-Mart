export function parseProductImages(product) {
  if (!product?.images) return [];
  if (Array.isArray(product.images)) return product.images;
  try {
    return JSON.parse(product.images);
  } catch {
    return [];
  }
}

import { API_BASE, API_VERSION } from '../services/api';

const getApiBaseUrl = () => {
  if (API_BASE) return API_BASE.replace(/\/+$/, '');
  return typeof window !== 'undefined' ? window.location.origin : '';
};

export function normalizeProductImageUrl(url) {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) return url;
  return `${baseUrl.replace(/\/+$/, '')}/${String(url).replace(/^\/+/, '')}`;
}

export function getProductImageUrl(product) {
  const images = parseProductImages(product);
  if (images.length > 0) return normalizeProductImageUrl(images[0]);
  if (product?.image_url) return normalizeProductImageUrl(product.image_url);
  return null;
}

export const CATEGORY_ICONS = {
  electronics: '📱',
  clothing: '👕',
  accessories: '⌚',
  home: '🏠',
  beauty: '💄',
  sports: '⚽',
  groceries: '🛒',
  toys: '🧸',
  default: '🛍️',
};

export function getCategoryIcon(slug) {
  return CATEGORY_ICONS[slug] || CATEGORY_ICONS.default;
}
