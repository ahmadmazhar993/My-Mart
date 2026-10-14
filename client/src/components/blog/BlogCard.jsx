import React from 'react';
import { Link } from 'react-router-dom';
import { formatBlogDate } from '../../services/blog';

// Branded cover: gradient + category emoji at a fixed aspect ratio. Swap for an <img> once
// the articles have real photography (add an `image` field to the article).
export const BlogCover = ({ article, className = '' }) => (
  <div
    role="img"
    aria-label={`${article.categoryInfo.label} article cover`}
    className={`relative flex aspect-[16/9] items-center justify-center overflow-hidden bg-gradient-to-br ${article.categoryInfo.gradient} ${className}`}
  >
    <span className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-white/10" aria-hidden="true" />
    <span className="absolute -bottom-8 left-6 h-24 w-24 rounded-full bg-white/10" aria-hidden="true" />
    <span className="relative text-5xl drop-shadow sm:text-6xl" aria-hidden="true">{article.categoryInfo.emoji}</span>
  </div>
);

export const BlogMeta = ({ article, className = '' }) => (
  <p className={`flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500 ${className}`}>
    <time dateTime={article.publishedAt}>{formatBlogDate(article.publishedAt)}</time>
    <span aria-hidden="true">·</span>
    <span>{article.readingMinutes} min read</span>
  </p>
);

const BlogCard = ({ article }) => (
  <article className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-gray-100 bg-white shadow-card transition hover:-translate-y-0.5 hover:shadow-card-hover focus-within:ring-2 focus-within:ring-primary">
    <Link to={`/blog/${article.slug}`} tabIndex={-1} aria-hidden="true">
      <BlogCover article={article} className="transition-transform duration-300 group-hover:scale-[1.02]" />
    </Link>
    <div className="flex flex-1 flex-col p-4">
      <span className="mb-2 inline-flex w-fit rounded-full bg-primary-50 px-2.5 py-0.5 text-[11px] font-semibold text-primary-700">
        {article.categoryInfo.label}
      </span>
      <h3 className="text-base font-bold leading-snug text-dark">
        <Link to={`/blog/${article.slug}`} className="after:absolute after:inset-0 hover:text-primary focus:outline-none">
          <span className="line-clamp-2">{article.title}</span>
        </Link>
      </h3>
      <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-gray-600">{article.excerpt}</p>
      <BlogMeta article={article} className="mt-auto pt-3" />
    </div>
  </article>
);

export default BlogCard;
