import React, { useMemo } from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
import { Breadcrumb } from '../components/ui';
import PageHero from '../components/PageHero';
import usePageMeta from '../hooks/usePageMeta';
import { INFO_PAGES } from '../data/siteContent';

const slugify = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

// Turns a plain-text section body into paragraphs, bullet lists and numbered lists.
const renderBody = (body) => {
  const lines = body.split('\n').map((l) => l.trim()).filter(Boolean);
  const blocks = [];
  lines.forEach((line) => {
    const type = line.startsWith('•') ? 'ul' : /^\d+\.\s/.test(line) ? 'ol' : 'p';
    const text = line.replace(/^•\s*/, '').replace(/^\d+\.\s*/, '');
    const last = blocks[blocks.length - 1];
    if (type !== 'p' && last?.type === type) last.items.push(text);
    else blocks.push({ type, items: [text] });
  });

  return blocks.map((block, i) => {
    if (block.type === 'ul') {
      return (
        <ul key={i} className="my-2 space-y-2 text-sm leading-relaxed text-gray-600 sm:text-[15px]">
          {block.items.map((item) => (
            <li key={item} className="flex gap-2.5">
              <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" aria-hidden="true" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      );
    }
    if (block.type === 'ol') {
      return (
        <ol key={i} className="my-2 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-gray-600 marker:font-semibold marker:text-primary sm:text-[15px]">
          {block.items.map((item) => <li key={item} className="pl-1">{item}</li>)}
        </ol>
      );
    }
    return <p key={i} className="my-2 text-sm leading-relaxed text-gray-600 sm:text-[15px]">{block.items[0]}</p>;
  });
};

const InfoPage = () => {
  const { slug } = useParams();
  const page = INFO_PAGES[slug];

  const sections = useMemo(
    () => (page ? page.sections.map((s) => ({ ...s, id: slugify(s.heading) })) : []),
    [page],
  );

  usePageMeta({
    title: page?.title,
    description: page?.subtitle,
    path: `/pages/${slug}`,
  });

  if (slug === 'blog') return <Navigate to="/blog" replace />;
  if (!page) return <Navigate to="/help" replace />;

  const showToc = sections.length >= 5;

  return (
    <div className="container-main animate-fade-in py-4 sm:py-8">
      <div className="hidden sm:block">
        <Breadcrumb items={[{ label: 'Home', to: '/' }, { label: page.title }]} />
      </div>

      <PageHero title={page.title} subtitle={page.subtitle} />

      <div className={`mt-5 gap-6 sm:mt-8 ${showToc ? 'lg:grid lg:grid-cols-[230px_minmax(0,1fr)]' : ''}`}>
        {showToc && (
          <nav aria-label="On this page" className="hidden lg:block">
            <div className="sticky top-40 rounded-xl border border-gray-100 bg-white p-4 shadow-card">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">On this page</p>
              <ul className="space-y-1">
                {sections.map((s) => (
                  <li key={s.id}>
                    <a href={`#${s.id}`} className="block rounded-md px-2 py-1.5 text-[13px] text-gray-600 transition hover:bg-primary-50 hover:text-primary-700">
                      {s.heading}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </nav>
        )}

        <div className="min-w-0 space-y-3 sm:space-y-4">
          {sections.map((section) => (
            <section
              key={section.id}
              id={section.id}
              className="scroll-mt-40 rounded-xl border border-gray-100 bg-white p-4 shadow-card sm:p-6"
            >
              <h2 className="mb-1 text-base font-bold text-dark sm:text-lg">{section.heading}</h2>
              {renderBody(section.body)}
            </section>
          ))}

          {page.cta && (
            <aside className="flex flex-col gap-4 rounded-xl border border-primary-100 bg-primary-50 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
              <h2 className="text-base font-bold text-primary-800 sm:text-lg">{page.cta.title}</h2>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Link to={page.cta.to} className="btn-primary text-center text-sm">{page.cta.label}</Link>
                {page.cta.secondary && (
                  <Link to={page.cta.secondary.to} className="btn-outline bg-white text-center text-sm">{page.cta.secondary.label}</Link>
                )}
              </div>
            </aside>
          )}
        </div>
      </div>
    </div>
  );
};

export default InfoPage;
