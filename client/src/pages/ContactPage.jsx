import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FaWhatsapp } from 'react-icons/fa';
import { Breadcrumb } from '../components/ui';
import PageHero from '../components/PageHero';
import usePageMeta from '../hooks/usePageMeta';
import { contactService } from '../services';
import { useAuthStore } from '../store';
import { MART_INFO } from '../data/siteContent';
import { POLICY } from '../config/policies';
import { WHATSAPP_URL } from '../components/WhatsAppButton';
import BrandLoader from '../components/BrandLoader';

const TOPICS = [
  { value: 'order', label: 'Order or delivery question' },
  { value: 'payment', label: 'Payment question' },
  { value: 'returns', label: 'Return, refund or damaged item' },
  { value: 'product', label: 'Product question' },
  { value: 'account', label: 'Account help' },
  { value: 'seller', label: 'Selling on AHM Mart' },
  { value: 'advertising', label: 'Advertising' },
  { value: 'careers', label: 'Careers' },
  { value: 'other', label: 'Something else' },
];

const MAX_MESSAGE = 4500; // backend limit is 5000; leave room for the subject line we prepend
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const validate = (form) => {
  const errors = {};
  if (!form.name.trim()) errors.name = 'Please enter your name.';
  if (!form.email.trim()) errors.email = 'Please enter your email address.';
  else if (!EMAIL_RE.test(form.email.trim())) errors.email = 'Enter a valid email address.';
  if (!form.topic) errors.topic = 'Please choose what your message is about.';
  if (form.message.trim().length < 10) errors.message = 'Your message needs at least 10 characters.';
  else if (form.message.trim().length > MAX_MESSAGE) errors.message = `Please keep your message under ${MAX_MESSAGE} characters.`;
  return errors;
};

const ContactCard = ({ icon, label, children }) => (
  <div className="flex items-start gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-card">
    <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600" aria-hidden="true">{icon}</span>
    <div className="min-w-0">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <div className="mt-0.5 break-words text-sm font-medium text-dark">{children}</div>
    </div>
  </div>
);

const Field = ({ id, label, error, children }) => (
  <div>
    <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-dark">{label}</label>
    {children}
    {error && <p id={`${id}-error`} role="alert" className="mt-1.5 text-xs text-red-600">{error}</p>}
  </div>
);

const ContactPage = () => {
  const [searchParams] = useSearchParams();
  const { user } = useAuthStore();
  const topicParam = searchParams.get('topic');

  const [form, setForm] = useState({
    name: [user?.firstName, user?.lastName].filter(Boolean).join(' '),
    email: user?.email || '',
    topic: TOPICS.some((t) => t.value === topicParam) ? topicParam : '',
    message: '',
  });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState('idle'); // idle | sending | success | error
  const [serverError, setServerError] = useState('');

  usePageMeta({
    title: 'Contact Us',
    description: 'Contact AHM Mart customer support with your order, payment or product question.',
    path: '/pages/contact',
  });

  const update = (field) => (e) => {
    const { value } = e.target;
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nextErrors = validate(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      document.getElementById(`contact-${Object.keys(nextErrors)[0]}`)?.focus();
      return;
    }

    const topicLabel = TOPICS.find((t) => t.value === form.topic)?.label || 'Other';
    setStatus('sending');
    setServerError('');
    try {
      await contactService.sendMessage({
        name: form.name.trim(),
        email: form.email.trim(),
        message: `Subject: ${topicLabel}\n\n${form.message.trim()}`,
      });
      setStatus('success');
    } catch (err) {
      const apiMessage = err.response?.data?.message;
      setServerError(
        err.response?.status === 429
          ? (apiMessage || 'Too many messages sent. Please wait a few minutes and try again.')
          : (apiMessage || 'We could not send your message. Please try again, or contact us on WhatsApp.'),
      );
      setStatus('error');
    }
  };

  const inputClass = (field) => `input-field ${errors[field] ? 'border-red-400 focus:border-red-500 focus:ring-red-200' : ''}`;
  const phoneHref = MART_INFO.phone.replace(/[^\d+]/g, '');

  return (
    <div className="container-main animate-fade-in py-4 sm:py-8">
      <div className="hidden sm:block">
        <Breadcrumb items={[{ label: 'Home', to: '/' }, { label: 'Contact Us' }]} />
      </div>

      <PageHero
        title="Contact Us"
        subtitle="Questions about an order, a payment or a product? Send us a message and our team will get back to you by email."
      />

      <div className="mt-5 grid gap-5 sm:mt-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-6">
        <section aria-labelledby="contact-form-heading" className="rounded-xl border border-gray-100 bg-white p-4 shadow-card sm:p-6 lg:order-1">
          <h2 id="contact-form-heading" className="text-lg font-bold text-dark">Send us a message</h2>

          {status === 'success' ? (
            <div role="status" className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="font-bold text-emerald-800">Message sent</h3>
              <p className="mt-1 text-sm text-emerald-700">
                Thank you. We have emailed a confirmation to {form.email.trim()} and our team will reply there.
              </p>
              <button
                type="button"
                onClick={() => { setForm((p) => ({ ...p, message: '' })); setStatus('idle'); }}
                className="btn-outline mt-4 bg-white text-sm"
              >
                Send another message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="mt-5 space-y-4">
              {status === 'error' && (
                <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {serverError}
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="contact-name" label="Your name" error={errors.name}>
                  <input
                    id="contact-name" type="text" autoComplete="name" value={form.name} onChange={update('name')}
                    aria-invalid={!!errors.name} aria-describedby={errors.name ? 'contact-name-error' : undefined}
                    className={inputClass('name')} placeholder="Full name"
                  />
                </Field>
                <Field id="contact-email" label="Email address" error={errors.email}>
                  <input
                    id="contact-email" type="email" autoComplete="email" inputMode="email" value={form.email} onChange={update('email')}
                    aria-invalid={!!errors.email} aria-describedby={errors.email ? 'contact-email-error' : undefined}
                    className={inputClass('email')} placeholder="you@example.com"
                  />
                </Field>
              </div>

              <Field id="contact-topic" label="What is this about?" error={errors.topic}>
                <select
                  id="contact-topic" value={form.topic} onChange={update('topic')}
                  aria-invalid={!!errors.topic} aria-describedby={errors.topic ? 'contact-topic-error' : undefined}
                  className={inputClass('topic')}
                >
                  <option value="">Select a topic</option>
                  {TOPICS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </Field>

              <Field id="contact-message" label="Message" error={errors.message}>
                <textarea
                  id="contact-message" rows={6} value={form.message} onChange={update('message')}
                  aria-invalid={!!errors.message} aria-describedby={errors.message ? 'contact-message-error' : 'contact-message-hint'}
                  className={inputClass('message')}
                  placeholder="Tell us how we can help. If it is about an order, include your order number."
                />
                <p id="contact-message-hint" className="mt-1 text-right text-xs text-gray-400">
                  {form.message.trim().length}/{MAX_MESSAGE}
                </p>
              </Field>

              <button type="submit" disabled={status === 'sending'} className="btn-primary flex h-12 w-full items-center justify-center gap-2 text-sm sm:w-auto sm:px-10">
                {status === 'sending' ? (
                  <>
                    <BrandLoader variant="button" />
                    Sending...
                  </>
                ) : 'Send message'}
              </button>
              <p className="text-xs text-gray-500">
                We use your details only to reply to your message. See our <Link to="/pages/privacy" className="font-medium text-primary hover:underline">Privacy Policy</Link>.
              </p>
            </form>
          )}
        </section>

        <aside aria-label="Contact details" className="space-y-3">
          <ContactCard
            label="Email"
            icon={<svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l9 6 9-6M5 5h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z" /></svg>}
          >
            <a href={`mailto:${MART_INFO.email}`} className="text-primary hover:underline">{MART_INFO.email}</a>
          </ContactCard>
          <ContactCard
            label="Phone"
            icon={<svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3l2 5-2.5 1.5a11 11 0 005 5L14 12l5 2v3a2 2 0 01-2 2A14 14 0 013 5z" /></svg>}
          >
            <a href={`tel:${phoneHref}`} className="text-primary hover:underline">{MART_INFO.phone}</a>
          </ContactCard>
          <a
            href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-3 text-sm font-semibold text-white shadow-card transition hover:brightness-95"
          >
            <FaWhatsapp className="h-5 w-5" aria-hidden="true" />
            Chat on WhatsApp
          </a>
          <ContactCard
            label="Address"
            icon={<svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 21s7-5.5 7-11a7 7 0 10-14 0c0 5.5 7 11 7 11zm0-8a3 3 0 100-6 3 3 0 000 6z" /></svg>}
          >
            {MART_INFO.address}
          </ContactCard>
          {POLICY.supportHours && (
            <ContactCard
              label="Support hours"
              icon={<svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path strokeLinecap="round" d="M12 7v5l3 2" /></svg>}
            >
              {POLICY.supportHours}
            </ContactCard>
          )}
          <p className="px-1 text-xs text-gray-500">
            Looking for quick answers? Visit the <Link to="/help" className="font-medium text-primary hover:underline">Help Center</Link>.
          </p>
        </aside>
      </div>
    </div>
  );
};

export default ContactPage;
