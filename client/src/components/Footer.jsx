import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaWhatsapp } from 'react-icons/fa';
import { ArrowUp, ChevronDown, Mail, MapPin, Phone } from 'lucide-react';
import { WHATSAPP_URL } from './WhatsAppButton';
import { MART_INFO } from '../data/siteContent';
import { SOCIAL_LINKS } from '../config/policies';

const FOOTER_SECTIONS = [
  {
    title: 'Shop & Pay',
    links: [
      { label: 'How to Buy', to: '/pages/how-to-buy' },
      { label: 'Shipping & Delivery', to: '/pages/shipping' },
      { label: 'Cash on Delivery', to: '/pages/cash-on-delivery' },
      { label: 'Digital Payments', to: '/pages/digital-payments' },
    ],
  },
  {
    title: 'Customer Care',
    links: [
      { label: 'Help Center & FAQ', to: '/help' },
      { label: 'Contact Us', to: '/pages/contact' },
      { label: 'Returns & Refunds', to: '/pages/returns-refunds' },
    ],
  },
  {
    title: 'AHM Mart',
    links: [
      { label: 'About Us', to: '/pages/about' },
      { label: 'Blog', to: '/blog' },
      { label: 'Careers', to: '/pages/careers' },
    ],
  },
  {
    title: 'Sell with Us',
    links: [
      { label: 'Sell on AHM Mart', to: '/pages/sell' },
      { label: 'Become a Seller', to: '/pages/become-seller' },
      { label: 'Advertise', to: '/pages/advertise' },
    ],
  },
];

const LEGAL_LINKS = [
  { label: 'Terms & Conditions', to: '/pages/terms' },
  { label: 'Privacy Policy', to: '/pages/privacy' },
];

// Same payment options the checkout offers.
const PAYMENT_OPTIONS = ['Cash on Delivery', 'Bank transfer', 'Easypaisa'];

const linkClass = 'inline-flex min-h-[40px] items-center text-sm text-gray-300 transition-colors hover:text-white focus-visible:text-white';
const phoneHref = `tel:${MART_INFO.phone.replace(/[^\d+]/g, '')}`;
const contactButton = 'inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-white/20 px-4 text-sm font-semibold text-white transition hover:bg-white/10';

// Phones: link groups collapse into an accordion so the footer stays short. From md up the groups
// are shown as columns.
const MobileGroups = () => {
  const [openTitle, setOpenTitle] = useState(null);
  return (
    <div className="divide-y divide-white/10 border-y border-white/10 md:hidden">
      {FOOTER_SECTIONS.map((section) => {
        const isOpen = openTitle === section.title;
        const id = `footer-${section.title.replace(/\W+/g, '-').toLowerCase()}`;
        return (
          <nav key={section.title} aria-label={section.title}>
            <h2>
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={id}
                onClick={() => setOpenTitle(isOpen ? null : section.title)}
                className="flex min-h-[52px] w-full items-center justify-between text-left text-sm font-semibold text-white"
              >
                {section.title}
                <ChevronDown className={`h-4 w-4 text-gray-300 transition-transform ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
              </button>
            </h2>
            <ul id={id} hidden={!isOpen} className="pb-2">
              {section.links.map((link) => (
                <li key={link.to}><Link to={link.to} className={`${linkClass} min-h-[44px]`}>{link.label}</Link></li>
              ))}
            </ul>
          </nav>
        );
      })}
    </div>
  );
};

const Footer = ({ reserveBottomBar = false }) => (
  <footer className={`relative mt-auto overflow-hidden bg-gradient-to-b from-primary-800 to-primary-900 text-white ${reserveBottomBar ? 'pb-[calc(4.75rem+env(safe-area-inset-bottom))] md:pb-0' : ''}`}>
    <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/5" aria-hidden="true" />

    <div className="container-main relative">
      {/* Contact band */}
      <section aria-labelledby="footer-help" className="border-b border-white/10 py-6 sm:py-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 id="footer-help" className="text-lg font-extrabold sm:text-xl">Need help with an order?</h2>
            <p className="mt-1 text-sm text-primary-100/90">Talk to us on WhatsApp, call, or send an email.</p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="col-span-2 inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-[#1ebe5b] px-5 text-sm font-semibold text-white shadow-sm transition hover:brightness-95 sm:col-span-1"
            >
              <FaWhatsapp className="h-5 w-5" aria-hidden="true" />
              Chat on WhatsApp
            </a>
            <a href={phoneHref} className={contactButton}>
              <Phone className="h-4 w-4" aria-hidden="true" />
              <span>{MART_INFO.phone}</span>
            </a>
            <a href={`mailto:${MART_INFO.email}`} className={`${contactButton} min-w-0`}>
              <Mail className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
              <span className="truncate">Email us</span>
            </a>
          </div>
        </div>
      </section>

      <div className="grid gap-6 py-6 sm:py-8 md:grid-cols-2 md:gap-x-8 md:gap-y-10 lg:grid-cols-[1.4fr_repeat(4,1fr)] lg:gap-10 lg:py-12">
        {/* Brand */}
        <div className="md:col-span-2 lg:col-span-1">
          <Link to="/" className="inline-flex items-center gap-2" aria-label="AHM Mart home">
            <img src="/logo-128.png" alt="" className="h-10 w-10 rounded-lg bg-white p-0.5" />
            <span className="whitespace-nowrap text-xl font-extrabold">
              <span className="text-primary-300">AHM</span> Mart
            </span>
          </Link>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-gray-300">
            Everyday shopping for Pakistan with clear prices, simple ordering and order tracking.
          </p>
          <p className="mt-4 flex max-w-xs items-start gap-2 text-sm text-gray-300">
            <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary-300" aria-hidden="true" />
            <span>{MART_INFO.address}</span>
          </p>

          {SOCIAL_LINKS.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-2" aria-label="Social media">
              {SOCIAL_LINKS.map((s) => (
                <li key={s.href}>
                  <a href={s.href} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[44px] items-center rounded-full border border-white/20 px-4 text-sm text-gray-200 hover:bg-white/10">
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        <MobileGroups />

        <div className="hidden gap-x-6 gap-y-8 md:col-span-2 md:grid md:grid-cols-4 lg:contents">
          {FOOTER_SECTIONS.map((section) => (
            <nav key={section.title} aria-label={section.title}>
              <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-primary-200">{section.title}</h2>
              <ul>
                {section.links.map((link) => (
                  <li key={link.to}>
                    <Link to={link.to} className={linkClass}>{link.label}</Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="flex flex-col items-center gap-3 border-t border-white/10 py-5 text-center md:flex-row md:justify-between md:pr-16 md:text-left">
        <p className="text-xs text-gray-300 md:text-sm">
          &copy; {new Date().getFullYear()} AHM Mart. All rights reserved.
        </p>

        <ul className="flex flex-wrap items-center justify-center gap-2" aria-label="Payment options">
          {PAYMENT_OPTIONS.map((option) => (
            <li key={option} className="rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs font-medium text-gray-100">{option}</li>
          ))}
        </ul>

        <div className="flex items-center gap-1">
          <ul className="flex flex-wrap items-center justify-center gap-x-4">
            {LEGAL_LINKS.map((link) => (
              <li key={link.to}><Link to={link.to} className={linkClass}>{link.label}</Link></li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            aria-label="Back to top"
            className="ml-2 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border border-white/20 text-white transition hover:bg-white/10"
          >
            <ArrowUp className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  </footer>
);

export default Footer;
