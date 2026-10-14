import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Breadcrumb } from '../components/ui';
import Accordion from '../components/Accordion';
import usePageMeta from '../hooks/usePageMeta';
import { HELP_FAQ, HELP_TOPICS, MART_INFO } from '../data/siteContent';
import { POLICY } from '../config/policies';

const slug = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const HelpCenter = () => {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');

  const faqJsonLd = useMemo(() => ({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: HELP_FAQ.flatMap((g) => g.questions).map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  }), []);

  usePageMeta({
    title: 'Help Center & FAQ',
    description: 'Answers to common questions about ordering, payments, delivery, returns and your AHM Mart account.',
    path: '/help',
    jsonLd: faqJsonLd,
  });

  const groups = useMemo(() => {
    const q = search.trim().toLowerCase();
    return HELP_FAQ
      .filter((g) => category === 'all' || g.category === category)
      .map((g) => ({
        ...g,
        questions: q
          ? g.questions.filter((item) => item.q.toLowerCase().includes(q) || item.a.toLowerCase().includes(q))
          : g.questions,
      }))
      .filter((g) => g.questions.length > 0);
  }, [search, category]);

  return (
    <div className="container-main animate-fade-in py-4 sm:py-8">
      <div className="hidden sm:block">
        <Breadcrumb items={[{ label: 'Home', to: '/' }, { label: 'Help Center' }]} />
      </div>

      <header className="rounded-2xl bg-gradient-to-br from-primary-800 via-primary-700 to-primary px-5 py-8 text-center text-white sm:px-10 sm:py-12">
        <h1 className="text-2xl font-extrabold sm:text-4xl">How can we help?</h1>
        <p className="mt-2 text-sm text-white/85">Search the FAQ or browse the topics below.</p>
        <form role="search" onSubmit={(e) => e.preventDefault()} className="mx-auto mt-5 max-w-xl">
          <label htmlFor="help-search" className="sr-only">Search help articles</label>
          <input
            id="help-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search (e.g. track order, refund, payment)"
            className="h-12 w-full rounded-xl px-4 text-sm text-dark shadow-sm focus:outline-none focus:ring-2 focus:ring-white/60"
          />
        </form>
      </header>

      <nav aria-label="Help topics" className="mt-5 grid grid-cols-3 gap-2.5 sm:mt-8 sm:gap-3 lg:grid-cols-6">
        {HELP_TOPICS.map((topic) => (
          <Link
            key={topic.label}
            to={topic.to}
            className="group flex flex-col items-center justify-center gap-1.5 rounded-xl border border-gray-100 bg-white p-3 text-center shadow-card transition hover:-translate-y-0.5 hover:shadow-card-hover sm:p-4"
          >
            <span className="text-2xl transition-transform group-hover:scale-110" aria-hidden="true">{topic.icon}</span>
            <span className="text-[11px] font-semibold leading-tight text-dark sm:text-xs">{topic.label}</span>
          </Link>
        ))}
      </nav>

      <div className="mx-auto mt-8 max-w-3xl">
        <h2 className="mb-3 text-lg font-bold text-dark sm:text-xl">Frequently asked questions</h2>

        <div className="scrollbar-hide -mx-3 mb-4 flex gap-2 overflow-x-auto px-3 pb-1" role="tablist" aria-label="FAQ categories">
          {['all', ...HELP_FAQ.map((g) => g.category)].map((c) => (
            <button
              key={c}
              type="button"
              role="tab"
              aria-selected={category === c}
              onClick={() => setCategory(c)}
              className={`flex-shrink-0 whitespace-nowrap rounded-full border px-3.5 py-2 text-[13px] font-medium transition ${
                category === c ? 'border-primary bg-primary text-white' : 'border-gray-200 bg-white text-gray-600 hover:border-primary hover:text-primary'
              }`}
            >
              {c === 'all' ? 'All' : c}
            </button>
          ))}
        </div>

        {groups.length === 0 ? (
          <div className="rounded-xl border border-gray-100 bg-white p-8 text-center shadow-card">
            <p className="mb-3 text-sm text-gray-500">No answers found for &quot;{search}&quot;.</p>
            <Link to="/pages/contact" className="text-sm font-semibold text-primary hover:underline">Ask our support team →</Link>
          </div>
        ) : (
          <div className="space-y-4">
            {groups.map((group) => (
              <section key={group.category} className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-card" aria-labelledby={`faq-${slug(group.category)}`}>
                <h2 id={`faq-${slug(group.category)}`} className="border-b border-primary-100 bg-primary-50 px-4 py-3 text-sm font-bold text-primary-800 sm:px-5">
                  {group.category}
                </h2>
                <Accordion
                  items={group.questions.map((item) => ({
                    id: `${slug(group.category)}-${slug(item.q)}`,
                    question: item.q,
                    answer: item.a,
                  }))}
                />
              </section>
            ))}
          </div>
        )}

        <aside className="mt-8 rounded-xl border border-primary-100 bg-primary-50 p-5 text-center sm:p-6">
          <h2 className="font-bold text-primary-800">Still need help?</h2>
          <p className="mt-1 text-sm text-gray-600">
            {POLICY.supportHours ? `Our team is available ${POLICY.supportHours}.` : 'Send us a message and our team will reply by email.'}
          </p>
          <div className="mt-4 flex flex-col justify-center gap-2 sm:flex-row">
            <Link to="/pages/contact" className="btn-primary text-sm">Contact us</Link>
            <a href={`mailto:${MART_INFO.email}`} className="btn-outline bg-white text-sm">Email support</a>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default HelpCenter;
