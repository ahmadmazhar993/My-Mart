import { ARTICLES, BLOG_CATEGORIES } from '../data/blog/articles';

// Data-access layer for the blog. Articles currently come from src/data/blog/articles.js because
// the backend has no blog API. Pages only talk to this module, so moving to an API later means
// changing these functions (and making them async) without touching any component.

const WORDS_PER_MINUTE = 200;

const blockText = (block) => block.text || (block.items || []).join(' ');

const withMeta = (article) => {
  const words = article.body.map(blockText).join(' ').split(/\s+/).filter(Boolean).length;
  return {
    ...article,
    readingMinutes: Math.max(1, Math.round(words / WORDS_PER_MINUTE)),
    categoryInfo: BLOG_CATEGORIES.find((c) => c.id === article.category) || BLOG_CATEGORIES[0],
  };
};

const sorted = () => [...ARTICLES]
  .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
  .map(withMeta);

export const blogService = {
  categories: () => BLOG_CATEGORIES.filter((c) => ARTICLES.some((a) => a.category === c.id)),

  // Returns { items, total } filtered by free-text query and/or category id.
  list: ({ query = '', category = '' } = {}) => {
    const q = query.trim().toLowerCase();
    const items = sorted().filter((a) => {
      if (category && a.category !== category) return false;
      if (!q) return true;
      return `${a.title} ${a.excerpt} ${a.categoryInfo.label} ${a.body.map(blockText).join(' ')}`
        .toLowerCase()
        .includes(q);
    });
    return { items, total: items.length };
  },

  featured: () => sorted().find((a) => a.featured) || sorted()[0] || null,

  getBySlug: (slug) => sorted().find((a) => a.slug === slug) || null,

  // Same-category articles first, then the most recent others.
  related: (article, limit = 3) => sorted()
    .filter((a) => a.slug !== article.slug)
    .sort((a, b) => Number(b.category === article.category) - Number(a.category === article.category))
    .slice(0, limit),
};

export const formatBlogDate = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString('en-PK', {
  day: 'numeric', month: 'long', year: 'numeric',
});
