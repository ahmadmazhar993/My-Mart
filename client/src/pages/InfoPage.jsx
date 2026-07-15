import React, { useState } from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
import { Breadcrumb } from '../components/ui';
import { INFO_PAGES } from '../data/siteContent';
import { contactService } from '../services';

const InfoPage = () => {
  const { slug } = useParams();
  const page = INFO_PAGES[slug];
  const [contactForm, setContactForm] = useState({ name: '', email: '', message: '' });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  if (!page) {
    return <Navigate to="/help" replace />;
  }

  const renderBody = (body) => {
    const lines = body.split('\n').map((line) => line.trim()).filter(Boolean);
    const isBulletList = lines.every((line) => line.startsWith('•') || /^\d+\./.test(line));

    if (isBulletList) {
      return (
        <ul className="list-disc list-inside space-y-2 text-gray-600 text-sm leading-relaxed">
          {lines.map((line) => (
            <li key={line}>{line.replace(/^•\s*/, '')}</li>
          ))}
        </ul>
      );
    }

    return <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">{body}</p>;
  };

  const getSidebarData = () => {
    const base = {
      title: 'Need help?',
      description: 'If you need assistance, our team is ready to support you with clear guidance and fast responses.',
      links: [
        { label: 'Contact Us', to: '/pages/contact' },
        { label: 'Help Center', to: '/help' },
      ],
    };

    switch (slug) {
      case 'how-to-buy':
        return {
          title: 'Ready to shop?',
          description: 'Explore our full catalog, compare top picks, and use the cart to checkout in just a few clicks.',
          links: [
            { label: 'Browse Products', to: '/products' },
            { label: 'Contact Support', to: '/pages/contact' },
          ],
        };
      case 'returns-refunds':
        return {
          title: 'Return the right way',
          description: 'Follow our easy refund process and track every request from your orders dashboard.',
          links: [
            { label: 'View My Orders', to: '/orders' },
            { label: 'Contact Support', to: '/pages/contact' },
          ],
        };
      case 'about':
        return {
          title: 'Why AHM Mart',
          description: 'Discover our mission, values, and the trusted shopping experience we deliver every day.',
          links: [
            { label: 'Shop Best Sellers', to: '/products' },
            { label: 'Careers', to: '/pages/careers' },
          ],
        };
      case 'careers':
        return {
          title: 'Join our team',
          description: 'Explore open roles and send your resume to careers@ahmmart.com to begin your career with AHM Mart.',
          links: [
            { label: 'Apply Now', to: '/pages/contact' },
            { label: 'About Us', to: '/pages/about' },
          ],
        };
      case 'blog':
        return {
          title: 'Read our insights',
          description: 'Find the latest shopping tips, product recommendations, and seasonal campaign updates.',
          links: [
            { label: 'Help Center', to: '/help' },
            { label: 'Contact Us', to: '/pages/contact' },
          ],
        };
      case 'terms':
        return {
          title: 'Legal and safe',
          description: 'Get clarity on our policies and contact us if you need help understanding terms for your order.',
          links: [
            { label: 'Contact Support', to: '/pages/contact' },
            { label: 'Help Center', to: '/help' },
          ],
        };
      case 'become-seller':
      case 'sell':
        return {
          title: 'Start selling today',
          description: 'Create your store, list products, and reach millions of active shoppers on AHM Mart.',
          links: [
            { label: 'Sell on AHM Mart', to: '/pages/sell' },
            { label: 'Contact Seller Support', to: '/pages/contact' },
          ],
        };
      case 'affiliate':
        return {
          title: 'Earn with AHM Mart',
          description: 'Share your unique referral links and earn commissions on every successful purchase.',
          links: [
            { label: 'Join Affiliate Program', to: '/pages/affiliate' },
            { label: 'Contact Us', to: '/pages/contact' },
          ],
        };
      case 'advertise':
        return {
          title: 'Promote your brand',
          description: 'Reach a wide audience with our advertising packages and premium placement options.',
          links: [
            { label: 'Contact Sales', to: '/pages/contact' },
            { label: 'Advertise on AHM Mart', to: '/pages/advertise' },
          ],
        };
      case 'cash-on-delivery':
        return {
          title: 'Pay on delivery',
          description: 'Enjoy the convenience of Cash on Delivery for eligible orders across major cities.',
          links: [
            { label: 'Digital Payments', to: '/pages/digital-payments' },
            { label: 'Contact Support', to: '/pages/contact' },
          ],
        };
      case 'installments':
        return {
          title: 'Flexible EMI plans',
          description: 'Choose installment plans from partner banks and spread payments across months.',
          links: [
            { label: 'Digital Payments', to: '/pages/digital-payments' },
            { label: 'Contact Support', to: '/pages/contact' },
          ],
        };
      case 'digital-payments':
        return {
          title: 'Secure checkout',
          description: 'Use trusted payment methods for fast order confirmation and better payment control.',
          links: [
            { label: 'Cash on Delivery', to: '/pages/cash-on-delivery' },
            { label: 'Contact Support', to: '/pages/contact' },
          ],
        };
      default:
        return base;
    }
  };

  const sidebarData = getSidebarData();

  const heroActions = (
    <div className="flex flex-col sm:flex-row gap-3 mt-6">
      <Link to="/pages/become-seller" className="btn-primary">Become a Seller</Link>
      <Link to="/pages/contact" className="btn-outline">Contact Support</Link>
    </div>
  );

  const renderSellPage = () => (
    <div className="container-main py-8 animate-fade-in">
      <Breadcrumb
        items={[
          { label: 'Home', to: '/' },
          { label: 'Sell on AHM Mart' },
        ]}
      />

      <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] items-start">
        <div>
          <div className="bg-white rounded-sm shadow-card p-8 sm:p-10">
            <div className="max-w-2xl">
              <span className="inline-flex items-center rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-[0.2em] px-3 py-1 mb-4">
                Grow with AHM Mart
              </span>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-dark mb-4">
                Sell on AHM Mart and scale your business quickly.
              </h1>
              <p className="text-gray-500 text-base sm:text-lg leading-relaxed">
                Join a trusted marketplace for millions of shoppers, unlock operational tools, and grow with a complete seller ecosystem designed for modern businesses.
              </p>
              {heroActions}
            </div>
          </div>

          <div className="grid gap-4 mt-6 md:grid-cols-2">
            {[
              {
                title: 'Fast onboarding',
                description: 'Complete seller registration in minutes and start listing products immediately.',
              },
              {
                title: 'Trusted customer base',
                description: 'Reach engaged customers across Pakistan with high-converting shopping traffic.',
              },
              {
                title: 'Seller analytics',
                description: 'Track sales, customer demand, inventory, and performance from one dashboard.',
              },
              {
                title: 'Support & fulfillment',
                description: 'Get dedicated seller support and access to delivery, returns, and fulfillment guidance.',
              },
            ].map((item) => (
              <div key={item.title} className="bg-white rounded-sm shadow-card p-6">
                <h2 className="text-lg font-bold text-dark mb-2">{item.title}</h2>
                <p className="text-gray-600 text-sm leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-sm shadow-card p-8 mt-6">
            <h2 className="text-2xl font-bold text-dark mb-4">How it works</h2>
            <div className="space-y-4">
              {[
                'Create a seller account and verify your business details.',
                'List your products with high-quality images, clear pricing, and descriptions.',
                'Use our marketing and analytics tools to optimize visibility and performance.',
                'Receive orders, ship quickly, and delight customers with excellent service.',
              ].map((step, index) => (
                <div key={step} className="flex gap-4">
                  <div className="min-w-[36px] h-[36px] rounded-full bg-primary text-white font-semibold flex items-center justify-center">
                    {index + 1}
                  </div>
                  <p className="text-gray-600 leading-relaxed">{step}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="bg-primary text-white rounded-sm p-6 shadow-card">
            <h2 className="text-xl font-semibold mb-3">Seller onboarding made simple</h2>
            <p className="text-sm leading-relaxed">
              Our team is ready to help you start selling in the next 48 hours. We support inventory setup, product publishing, and growth planning.
            </p>
          </div>
          <div className="bg-white rounded-sm shadow-card p-6">
            <h3 className="text-lg font-bold mb-3">What you need</h3>
            <ul className="space-y-2 text-gray-600 leading-relaxed text-sm">
              <li>• Business or CNIC information</li>
              <li>• Product images and descriptions</li>
              <li>• Local delivery or shipping plan</li>
              <li>• Bank account for payouts</li>
            </ul>
          </div>
          <div className="bg-white rounded-sm shadow-card p-6">
            <h3 className="text-lg font-bold mb-3">Contact seller success</h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              Email: <a href="mailto:sellers@ahmmart.com" className="text-primary hover:underline">sellers@ahmmart.com</a>
            </p>
            <p className="text-gray-600 text-sm leading-relaxed mt-2">
              Ready to accelerate your sales? We’ll help you list, promote, and sell with confidence.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );

  const handleFormChange = (field) => (event) => {
    setContactForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!contactForm.name || !contactForm.email || !contactForm.message) {
      return;
    }

    setSubmitting(true);
    setSubmitError('');
    setSubmitted(false);

    try {
      await contactService.sendMessage(contactForm);
      setSubmitted(true);
      setContactForm({ name: '', email: '', message: '' });
    } catch (err) {
      setSubmitError(err.response?.data?.message || 'Failed to send message. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const contactMethods = [
    {
      title: 'Customer Support',
      subtitle: 'ahmmart993@gmail.com',
      href: 'mailto:ahmmart993@gmail.com',
      detail: 'Monday – Saturday, 9 AM – 9 PM PKT',
      icon: '✉️',
    },
    {
      title: 'Phone',
      subtitle: '0313-4591721',
      href: 'tel:+923134591721',
      detail: 'Order help and account support',
      icon: '📞',
    },
    {
      title: 'Seller Inquiries',
      subtitle: 'sellers@ahmmart.com',
      href: 'mailto:sellers@ahmmart.com',
      detail: 'Start selling on AHM Mart today',
      icon: '🏪',
    },
  ];

  const renderContactPage = () => (
    <div className="container-main py-8 animate-fade-in">
      <Breadcrumb
        items={[
          { label: 'Home', to: '/' },
          { label: 'Contact Us' },
        ]}
      />

      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="bg-white rounded-sm shadow-card p-8 sm:p-10">
          <span className="inline-flex items-center rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-[0.2em] px-3 py-1 mb-4">
            Get in touch
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-dark mb-4">
            Professional support for every question.
          </h1>
          <p className="text-gray-500 text-base sm:text-lg leading-relaxed">
            Whether you are a customer, seller, or partner, our team is here to answer your request fast and clearly.
          </p>

          <div className="mt-8 space-y-3">
            {contactMethods.map((item) => (
              <div
                key={item.title}
                className="flex items-start gap-4 rounded-sm border border-gray-200 bg-white p-4 sm:p-5 min-w-0 hover:border-primary/30 hover:shadow-sm transition-all"
              >
                <div className="flex-shrink-0 w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center text-lg">
                  {item.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-dark mb-1">{item.title}</h3>
                  <a
                    href={item.href}
                    className="text-primary font-semibold text-sm break-all hover:underline block mb-1"
                  >
                    {item.subtitle}
                  </a>
                  <p className="text-gray-500 text-xs sm:text-sm leading-relaxed">{item.detail}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            <div className="rounded-sm bg-primary/5 border border-primary/20 p-6">
              <h3 className="font-semibold text-dark mb-3">Business address</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                AHM Mart (Pvt.) Ltd.
                Main Boulevard, Gulberg III
                Lahore, Punjab 54000
              </p>
            </div>
            <div className="rounded-sm bg-gray-50 border border-gray-200 p-6">
              <h3 className="font-semibold text-dark mb-3">Need faster support?</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Visit the Help Center for order tracking, returns, and frequently asked questions.
              </p>
              <Link to="/help" className="mt-4 inline-block text-primary font-semibold hover:underline">
                Open Help Center →
              </Link>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-sm shadow-card p-8">
            <h2 className="text-2xl font-bold text-dark mb-4">Send us a message</h2>
            <p className="text-gray-500 text-sm leading-relaxed mb-6">
              Share your question and our support team will get back to you shortly.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <label className="block text-sm text-gray-700">Name</label>
              <input
                type="text"
                value={contactForm.name}
                onChange={handleFormChange('name')}
                className="input-field"
                placeholder="Your full name"
              />
              <label className="block text-sm text-gray-700">Email</label>
              <input
                type="email"
                value={contactForm.email}
                onChange={handleFormChange('email')}
                className="input-field"
                placeholder="you@example.com"
              />
              <label className="block text-sm text-gray-700">Message</label>
              <textarea
                value={contactForm.message}
                onChange={handleFormChange('message')}
                className="input-field min-h-[140px] resize-none"
                placeholder="Tell us how we can help you..."
              />
              <button type="submit" disabled={submitting} className="btn-primary w-full">
                {submitting ? 'Sending...' : 'Send Message'}
              </button>
              {submitError && (
                <p className="text-sm text-red-600">{submitError}</p>
              )}
              {submitted && (
                <p className="text-sm text-green-600">Thanks! Your message has been sent. Our team will contact you soon.</p>
              )}
            </form>
          </div>
          <div className="bg-white rounded-sm shadow-card p-6">
            <h3 className="text-lg font-semibold text-dark mb-3">Need seller support?</h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              Email <a href="mailto:sellers@ahmmart.com" className="text-primary hover:underline">sellers@ahmmart.com</a> or visit <Link to="/pages/become-seller" className="text-primary hover:underline">Become a Seller</Link>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderGenericPage = () => (
    <div className="container-main py-8 animate-fade-in">
      <Breadcrumb
        items={[
          { label: 'Home', to: '/' },
          { label: 'Help Center', to: '/help' },
          { label: page.title },
        ]}
      />

      <div className="grid gap-8 lg:grid-cols-[1.7fr_0.9fr] items-start">
        <div>
          <div className="bg-white rounded-sm shadow-card p-8 sm:p-10 mb-8">
            <span className="inline-flex items-center rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-[0.2em] px-3 py-1 mb-4">
              {page.title}
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-dark mb-4">{page.title}</h1>
            <p className="text-gray-500 text-base sm:text-lg leading-relaxed">{page.subtitle}</p>

            <div className="grid gap-4 mt-8 sm:grid-cols-3">
              {[
                { title: 'Clear information', detail: 'Every page is designed to help customers and partners act with confidence.' },
                { title: 'Easy navigation', detail: 'Quick links and support are available from every page.' },
                { title: 'Professional service', detail: 'AHM Mart helps you shop, sell, and pay with trusted tools.' },
              ].map((item) => (
                <div key={item.title} className="rounded-sm border border-gray-200 p-5 bg-slate-50">
                  <h3 className="text-sm font-semibold text-dark mb-2">{item.title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{item.detail}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            {page.sections.map((section) => (
              <div key={section.heading} className="bg-white rounded-sm shadow-card p-8">
                <h2 className="text-xl font-semibold text-dark mb-4">{section.heading}</h2>
                {renderBody(section.body)}
              </div>
            ))}
          </div>
        </div>

        <aside className="space-y-6">
          <div className="bg-primary text-white rounded-sm p-6 shadow-card">
            <h2 className="text-xl font-semibold mb-3">{sidebarData.title}</h2>
            <p className="text-sm leading-relaxed">{sidebarData.description}</p>
          </div>
          <div className="bg-white rounded-sm shadow-card p-6">
            <h3 className="text-lg font-semibold text-dark mb-4">Helpful links</h3>
            <ul className="space-y-3">
              {sidebarData.links.map((link) => (
                <li key={link.label}>
                  <Link to={link.to} className="text-primary hover:underline text-sm font-medium">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-white rounded-sm shadow-card p-6">
            <h3 className="text-lg font-semibold text-dark mb-3">Need quick support?</h3>
            <p className="text-gray-600 text-sm leading-relaxed">Contact our support team directly for urgent questions about orders, payments, or seller onboarding.</p>
            <Link to="/pages/contact" className="btn-outline mt-4 inline-flex">Contact Support</Link>
          </div>
        </aside>
        </div>
      </div>
    );

  if (slug === 'sell') {
    return renderSellPage();
  }

  if (slug === 'contact') {
    return renderContactPage();
  }

  return renderGenericPage();
};

export default InfoPage;
