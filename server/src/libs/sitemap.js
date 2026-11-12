const path = require('path');
const { pathToFileURL } = require('url');
const db = require('../db');

// Public origin used for every <loc>. Override with SITE_URL if the domain ever changes.
const SITE_URL = (process.env.SITE_URL || 'https://ahmmart.store').replace(/\/+$/, '');

// Sitemaps are limited to 50,000 URLs per file.
const MAX_URLS = 50000;
const CACHE_TTL_MS = 5 * 60 * 1000;

// Indexable, non-dynamic pages. Keep in sync with the public routes in client/src/App.jsx.
// Deliberately excluded: /admin/*, /login, /register, /forgot-password, /reset-password,
// /verify-email, /profile, /orders*, /wishlist, /reviews, /settings, /cart, /checkout.
const STATIC_PATHS = [
  '/',
  '/products',
  '/brands',
  '/blog',
  '/help',
  '/pages/about',
  '/pages/contact',
  '/pages/how-to-buy',
  '/pages/shipping',
  '/pages/returns-refunds',
  '/pages/cash-on-delivery',
  '/pages/digital-payments',
  '/pages/terms',
  '/pages/privacy',
  '/pages/careers',
  '/pages/sell',
  '/pages/become-seller',
  '/pages/advertise',
];

const escapeXml = (value) => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&apos;');

// W3C date (YYYY-MM-DD) or null when the value is missing/invalid.
const toLastmod = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
};

// Blog articles live in the client bundle source (ESM). Load them if the client folder is
// deployed next to the server (app.js already relies on that layout); otherwise skip them.
const loadBlogArticles = async () => {
  try {
    const file = path.join(__dirname, '../../../client/src/data/blog/articles.js');
    const mod = await import(pathToFileURL(file).href);
    return Array.isArray(mod.ARTICLES) ? mod.ARTICLES : [];
  } catch (err) {
    console.warn('[sitemap] Blog articles not loaded:', err.message);
    return [];
  }
};

const buildEntries = async () => {
  // Same visibility rule as the public product API (resolveProductByIdentifier): isActive = true.
  // Out-of-stock products stay publicly viewable, so they remain in the sitemap.
  const [products, articles] = await Promise.all([
    db('products')
      .where('isActive', true)
      .whereNotNull('slug')
      .where('slug', '<>', '')
      .select('slug', 'updatedOn')
      .orderBy('createdOn', 'desc'),
    loadBlogArticles(),
  ]);

  const entries = new Map(); // loc -> lastmod|null (Map de-duplicates URLs)
  const add = (urlPath, lastmod = null) => {
    const loc = `${SITE_URL}${urlPath}`;
    if (!entries.has(loc)) entries.set(loc, lastmod);
  };

  STATIC_PATHS.forEach((p) => add(p));
  articles.forEach((a) => {
    if (a?.slug) add(`/blog/${encodeURIComponent(a.slug)}`, toLastmod(a.publishedAt));
  });
  products.forEach((p) => add(`/products/${encodeURIComponent(p.slug)}`, toLastmod(p.updatedOn)));

  if (entries.size > MAX_URLS) {
    console.warn(`[sitemap] ${entries.size} URLs exceed the ${MAX_URLS} limit; truncating. Split into a sitemap index.`);
  }
  return [...entries].slice(0, MAX_URLS);
};

const renderXml = (entries) => {
  const urls = entries.map(([loc, lastmod]) => (
    `  <url>\n    <loc>${escapeXml(loc)}</loc>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ''}\n  </url>`
  ));
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
};

let cache = { xml: null, expires: 0, pending: null };

const getSitemapXml = async () => {
  if (cache.xml && Date.now() < cache.expires) return cache.xml;
  // Share one in-flight build between concurrent requests.
  if (!cache.pending) {
    cache.pending = buildEntries()
      .then((entries) => {
        const xml = renderXml(entries);
        cache = { xml, expires: Date.now() + CACHE_TTL_MS, pending: null };
        return xml;
      })
      .catch((err) => {
        cache.pending = null;
        throw err;
      });
  }
  return cache.pending;
};

const sitemapHandler = async (req, res) => {
  try {
    const xml = await getSitemapXml();
    res.set({
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    });
    return res.status(200).send(xml);
  } catch (err) {
    console.error('[sitemap] generation failed:', err);
    // 503 (not 200/404) so crawlers retry later instead of treating the sitemap as empty.
    res.set({ 'Retry-After': '300', 'Cache-Control': 'no-store' });
    return res.status(503).type('text/plain').send('Sitemap temporarily unavailable');
  }
};

module.exports = { sitemapHandler, renderXml, buildEntries, escapeXml };
