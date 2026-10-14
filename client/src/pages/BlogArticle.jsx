import React, { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Breadcrumb } from '../components/ui';
import BlogCard, { BlogCover } from '../components/blog/BlogCard';
import usePageMeta from '../hooks/usePageMeta';
import { blogService, formatBlogDate } from '../services/blog';
import { MART_INFO } from '../data/siteContent';

const slugify = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const ArticleBody = ({ blocks }) => blocks.map((block, i) => {
  switch (block.t) {
    case 'h2':
      return <h2 key={i} id={slugify(block.text)} className="mb-3 mt-9 scroll-mt-36 text-xl font-bold text-dark sm:text-2xl">{block.text}</h2>;
    case 'ul':
      return (
        <ul key={i} className="my-4 list-disc space-y-2 pl-5 marker:text-primary">
          {block.items.map((item) => <li key={item} className="pl-1">{item}</li>)}
        </ul>
      );
    case 'ol':
      return (
        <ol key={i} className="my-4 list-decimal space-y-2 pl-5 marker:font-semibold marker:text-primary">
          {block.items.map((item) => <li key={item} className="pl-1">{item}</li>)}
        </ol>
      );
    case 'tip':
      return (
        <aside key={i} className="my-6 rounded-xl border-l-4 border-primary bg-primary-50 p-4 text-[15px] text-primary-800">
          <strong className="mr-1">Tip:</strong>{block.text}
        </aside>
      );
    default:
      return <p key={i} className="my-4">{block.text}</p>;
  }
});

const ShareButtons = ({ title, url }) => {
  const [copied, setCopied] = useState(false);
  const enc = encodeURIComponent;
  const links = [
    { label: 'WhatsApp', href: `https://wa.me/?text=${enc(`${title} ${url}`)}` },
    // { label: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}` },
    // { label: 'X', href: `https://twitter.com/intent/tweet?text=${enc(title)}&url=${enc(url)}` },
  ];

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Copy this link', url);
    }
  };

  const btn = 'inline-flex min-h-[40px] items-center rounded-full border border-gray-200 bg-white px-4 text-[13px] font-medium text-gray-700 transition hover:border-primary hover:text-primary';
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="mr-1 text-sm font-semibold text-dark">Share:</span>
      {links.map((l) => (
        <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer" className={btn} aria-label={`Share on ${l.label}`}>{l.label}</a>
      ))}
      <button type="button" onClick={copy} className={btn} aria-live="polite">{copied ? 'Link copied ✓' : 'Copy link'}</button>
    </div>
  );
};

const BlogArticle = () => {
  const { slug } = useParams();
  const article = useMemo(() => blogService.getBySlug(slug), [slug]);
  const related = useMemo(() => (article ? blogService.related(article) : []), [article]);
  const toc = useMemo(
    () => (article ? article.body.filter((b) => b.t === 'h2').map((b) => ({ id: slugify(b.text), text: b.text })) : []),
    [article],
  );

  const jsonLd = useMemo(() => (article ? {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: article.title,
    description: article.excerpt,
    datePublished: article.publishedAt,
    author: { '@type': 'Organization', name: MART_INFO.name },
    publisher: { '@type': 'Organization', name: MART_INFO.name },
    mainEntityOfPage: `${window.location.origin}/blog/${article.slug}`,
  } : null), [article]);

  usePageMeta({
    title: article?.title || 'Article not found',
    description: article?.excerpt,
    path: `/blog/${slug}`,
    type: 'article',
    jsonLd,
  });

  if (!article) {
    return (
      <div className="container-main py-16 text-center">
        <div className="text-5xl" aria-hidden="true">📄</div>
        <h1 className="mt-4 text-xl font-bold text-dark">Article not found</h1>
        <p className="mt-1 text-sm text-gray-500">This article may have been moved or removed.</p>
        <Link to="/blog" className="btn-primary mt-6 inline-block text-sm">Back to the blog</Link>
      </div>
    );
  }

  const url = `${window.location.origin}/blog/${article.slug}`;

  return (
    <div className="container-main animate-fade-in py-4 sm:py-8">
      <div className="hidden sm:block">
        <Breadcrumb items={[{ label: 'Home', to: '/' }, { label: 'Blog', to: '/blog' }, { label: article.title }]} />
      </div>

      <article className="mx-auto max-w-3xl">
        <header>
          <Link
            to={`/blog?category=${article.category}`}
            className="inline-flex rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700 hover:bg-primary-100"
          >
            {article.categoryInfo.label}
          </Link>
          <h1 className="mt-3 text-2xl font-extrabold leading-tight text-dark sm:text-4xl">{article.title}</h1>
          <p className="mt-3 text-base leading-relaxed text-gray-600 sm:text-lg">{article.excerpt}</p>
          <p className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-500">
            <span>By {MART_INFO.name} Team</span>
            <span aria-hidden="true">·</span>
            <time dateTime={article.publishedAt}>{formatBlogDate(article.publishedAt)}</time>
            <span aria-hidden="true">·</span>
            <span>{article.readingMinutes} min read</span>
          </p>
        </header>

        <BlogCover article={article} className="mt-5 rounded-2xl" />

        {toc.length >= 3 && (
          <nav aria-label="Table of contents" className="mt-6 rounded-xl border border-gray-100 bg-white p-4 shadow-card">
            <p className="mb-2 text-sm font-bold text-dark">In this article</p>
            <ol className="space-y-1.5 text-sm">
              {toc.map((item, i) => (
                <li key={item.id}>
                  <a href={`#${item.id}`} className="flex gap-2 rounded-md py-1 text-gray-600 hover:text-primary">
                    <span className="font-semibold text-primary">{i + 1}.</span>
                    <span>{item.text}</span>
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        )}

        <div className="mt-6 text-[16px] leading-[1.8] text-gray-700 sm:text-[17px]">
          <ArticleBody blocks={article.body} />
        </div>

        <p className="mt-8 border-t border-gray-100 pt-4 text-xs text-gray-500">
          Editorial guide by the AHM Mart team. General advice only; product details, prices and availability on the website may change.
        </p>

        {article.cta && (
          <aside className="mt-6 flex flex-col gap-4 rounded-xl border border-primary-100 bg-primary-50 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div>
              <h2 className="text-base font-bold text-primary-800 sm:text-lg">{article.cta.title}</h2>
              <p className="mt-1 text-sm text-gray-600">{article.cta.text}</p>
            </div>
            <Link to={article.cta.to} className="btn-primary flex-shrink-0 text-center text-sm">{article.cta.label}</Link>
          </aside>
        )}

        <div className="mt-6"><ShareButtons title={article.title} url={url} /></div>
      </article>

      {related.length > 0 && (
        <section aria-labelledby="related-heading" className="mx-auto mt-12 max-w-5xl">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 id="related-heading" className="text-lg font-bold text-dark sm:text-xl">Related articles</h2>
            <Link to="/blog" className="text-sm font-semibold text-primary hover:underline">All articles</Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((a) => <BlogCard key={a.slug} article={a} />)}
          </div>
        </section>
      )}
    </div>
  );
};

export default BlogArticle;
