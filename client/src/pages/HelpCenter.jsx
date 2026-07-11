import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Breadcrumb } from '../components/ui';
import { HELP_FAQ, HELP_TOPICS } from '../data/siteContent';

const HelpCenter = () => {
  const [search, setSearch] = useState('');
  const [openFaq, setOpenFaq] = useState(null);

  const filteredFaq = useMemo(() => {
    if (!search.trim()) return HELP_FAQ;
    const q = search.toLowerCase();
    return HELP_FAQ.map((group) => ({
      ...group,
      questions: group.questions.filter(
        (item) => item.q.toLowerCase().includes(q) || item.a.toLowerCase().includes(q),
      ),
    })).filter((group) => group.questions.length > 0);
  }, [search]);

  const toggleFaq = (key) => {
    setOpenFaq(openFaq === key ? null : key);
  };

  return (
    <div className="container-main py-8 animate-fade-in">
      <Breadcrumb items={[
        { label: 'Home', to: '/' },
        { label: 'Help Center' },
      ]} />

      {/* Hero */}
      <div className="bg-gradient-to-r from-primary-700 via-primary to-primary-400 rounded-sm text-white p-8 sm:p-12 mb-8 text-center">
        <h1 className="text-2xl sm:text-3xl font-extrabold mb-2">How can we help you?</h1>
        <p className="text-white/80 text-sm mb-6">Search our help center or browse topics below</p>
        <div className="max-w-xl mx-auto">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search for help (e.g. track order, refund, payment)"
            className="w-full px-5 py-3 rounded-sm text-dark text-sm focus:outline-none focus:ring-2 focus:ring-white/50"
          />
        </div>
      </div>

      {/* Quick topics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-10">
        {HELP_TOPICS.map((topic) => (
          <Link
            key={topic.label}
            to={topic.to}
            className="bg-white rounded-sm shadow-card p-4 text-center hover:shadow-card-hover transition-shadow group"
          >
            <span className="text-2xl block mb-2 group-hover:scale-110 transition-transform">{topic.icon}</span>
            <span className="text-xs font-semibold text-dark">{topic.label}</span>
          </Link>
        ))}
      </div>

      {/* FAQ */}
      <div className="max-w-3xl mx-auto">
        <h2 className="text-xl font-bold text-dark mb-4">Frequently Asked Questions</h2>

        {filteredFaq.length === 0 ? (
          <div className="bg-white rounded-sm shadow-card p-8 text-center">
            <p className="text-gray-500 mb-4">No results found for &quot;{search}&quot;</p>
            <Link to="/pages/contact" className="text-primary font-semibold hover:underline">
              Contact our support team →
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredFaq.map((group) => (
              <div key={group.category} className="bg-white rounded-sm shadow-card overflow-hidden">
                <div className="px-5 py-3 bg-primary-50 border-b border-primary-100">
                  <h3 className="font-bold text-sm text-primary-800">{group.category}</h3>
                </div>
                <div className="divide-y divide-gray-100">
                  {group.questions.map((item) => {
                    const key = `${group.category}-${item.q}`;
                    const isOpen = openFaq === key;
                    return (
                      <div key={key}>
                        <button
                          type="button"
                          onClick={() => toggleFaq(key)}
                          className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
                        >
                          <span className="font-medium text-sm text-dark pr-4">{item.q}</span>
                          <span className="text-primary text-lg flex-shrink-0">{isOpen ? '−' : '+'}</span>
                        </button>
                        {isOpen && (
                          <div className="px-5 pb-4 text-sm text-gray-600 leading-relaxed">
                            {item.a}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Contact CTA */}
        <div className="mt-10 bg-white rounded-sm shadow-card p-6 sm:p-8 text-center">
          <h3 className="font-bold text-dark mb-2">Can&apos;t find what you&apos;re looking for?</h3>
          <p className="text-sm text-gray-500 mb-4">
            Our support team is available Monday – Saturday, 9 AM – 9 PM
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/pages/contact" className="btn-primary">Contact Us</Link>
            <a href="mailto:support@ahmmart.com" className="btn-outline">Email Support</a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpCenter;
