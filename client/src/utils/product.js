import { API_BASE, API_VERSION } from '../services/api';

export function parseProductImages(product) {
  if (!product?.images) return [];
  if (Array.isArray(product.images)) return product.images;
  try {
    return JSON.parse(product.images);
  } catch {
    return [];
  }
}

export function parseProductVariants(product) {
  if (!product?.variants) return [];
  if (Array.isArray(product.variants)) {
    return product.variants
      .map((variant) => normalizeVariant(variant))
      .filter(Boolean);
  }

  if (typeof product.variants === 'string') {
    try {
      const parsed = JSON.parse(product.variants);
      if (Array.isArray(parsed)) {
        return parsed.map((variant) => normalizeVariant(variant)).filter(Boolean);
      }
    } catch {
      return [];
    }
  }

  return [];
}

export function normalizeVariant(variant) {
  if (!variant || typeof variant !== 'object') return null;

  const name = String(variant.name || variant.label || '').trim();
  if (!name) return null;

  return {
    name,
    label: variant.label || name,
    price: variant.price != null ? Number(variant.price) : null,
    discount_price: variant.discount_price != null ? Number(variant.discount_price) : null,
    discount_percentage: variant.discount_percentage != null ? Number(variant.discount_percentage) : null,
    stock_quantity: variant.stock_quantity != null ? Number(variant.stock_quantity) : null,
    sku: variant.sku || '',
  };
}

export function getProductVariantPrice(product, variant) {
  if (!variant) return getEffectiveBasePrice(product);
  if (variant.discount_price != null && !Number.isNaN(Number(variant.discount_price))) {
    return Number(variant.discount_price);
  }
  if (variant.price != null && !Number.isNaN(Number(variant.price))) {
    return Number(variant.price);
  }
  return getEffectiveBasePrice(product);
}

export function getProductVariantStock(product, variant) {
  if (!variant) return Number(product?.stock_quantity ?? 0);
  if (variant.stock_quantity != null && !Number.isNaN(Number(variant.stock_quantity))) {
    return Number(variant.stock_quantity);
  }
  return Number(product?.stock_quantity ?? 0);
}

export function getEffectiveBasePrice(product) {
  if (product?.discount_price != null && product.discount_price !== '') {
    return Number(product.discount_price);
  }
  return Number(product?.price ?? 0);
}

export function buildCartItemKey(item) {
  const productId = item?.product_id ?? item?.id ?? '';
  const variantName = item?.variant_name || item?.variant?.name || '';
  return `${String(productId)}:${variantName || 'default'}`;
}

export function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function getProductSlug(product) {
  return slugify(product?.name || product?.slug || 'product');
}

export function buildProductPath(product) {
  const slug = getProductSlug(product);
  return `/products/${slug}`;
}

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
