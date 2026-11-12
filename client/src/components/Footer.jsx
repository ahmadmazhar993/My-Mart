import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaWhatsapp } from 'react-icons/fa';
import { ChevronDown, Mail, Phone } from 'lucide-react';
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

const linkClass = 'inline-block py-1.5 text-sm text-gray-300 transition-colors hover:text-white focus-visible:text-white';
const contactButton = 'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-white/20 px-4 text-sm font-semibold text-white transition hover:bg-white/10';

// Phones: link groups collapse into an accordion so the footer stays short. From md up the groups
// are shown as columns. Contact details and WhatsApp are always visible.
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
                className="flex min-h-[48px] w-full items-center justify-between text-left text-sm font-semibold text-white"
              >
                {section.title}
                <ChevronDown className={`h-4 w-4 text-gray-300 transition-transform ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
              </button>
            </h2>
            <ul id={id} hidden={!isOpen} className="pb-2">
              {section.links.map((link) => (
                <li key={link.to}><Link to={link.to} className={`${linkClass} inline-flex min-h-[44px] items-center`}>{link.label}</Link></li>
              ))}
            </ul>
          </nav>
        );
      })}
    </div>
  );
};

const Footer = ({ reserveBottomBar = false }) => (
  <footer className={`mt-auto bg-dark text-white ${reserveBottomBar ? "pb-[calc(4.75rem+env(safe-area-inset-bottom))] md:pb-0" : ""}`}>
    <div className="container-main py-6 sm:py-10">
      <div className="grid gap-5 md:grid-cols-2 md:gap-x-6 md:gap-y-8 lg:grid-cols-[1.5fr_repeat(4,1fr)] lg:gap-8">
        {/* Brand + contact */}
        <div className="md:col-span-2 lg:col-span-1">
          <Link to="/" className="inline-flex items-center gap-2" aria-label="AHM Mart home">
            <img src="/logo.png" alt="" className="h-9 w-9 rounded-md bg-white p-0.5" />
            <span className="whitespace-nowrap text-xl font-extrabold">
              <span className="text-primary-300">AHM</span> Mart
            </span>
          </Link>
          <p className="mt-2 max-w-xs text-sm leading-relaxed text-gray-300">
            Everyday shopping for Pakistan with clear prices, simple ordering and order tracking.
          </p>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap lg:grid lg:grid-cols-1">
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="col-span-2 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#1ebe5b] px-4 text-sm font-semibold text-white transition hover:brightness-95 sm:col-span-1 lg:hidden"
            >
              <FaWhatsapp className="h-5 w-5" aria-hidden="true" />
              Chat on WhatsApp
            </a>
            <a href={`tel:${MART_INFO.phone.replace(/[^\d+]/g, '')}`} className={`${contactButton} lg:justify-start lg:border-0 lg:px-0 lg:font-normal lg:text-gray-300`}>
              <Phone className="h-4 w-4" aria-hidden="true" />
              <span>{MART_INFO.phone}</span>
            </a>
            <a href={`mailto:${MART_INFO.email}`} className={`${contactButton} min-w-0 lg:justify-start lg:border-0 lg:px-0 lg:font-normal lg:text-gray-300`}>
              <Mail className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
              <span className="truncate">Email us</span>
            </a>
          </div>

          {SOCIAL_LINKS.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-2" aria-label="Social media">
              {SOCIAL_LINKS.map((s) => (
                <li key={s.href}>
                  <a href={s.href} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[40px] items-center rounded-full border border-white/20 px-3.5 text-sm text-gray-200 hover:bg-white/10">
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
              <h2 className="mb-2 text-sm font-bold text-white">{section.title}</h2>
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
      <div className="mt-5 flex flex-col items-center gap-2 pt-1 text-center md:mt-8 md:flex-row md:justify-between md:border-t md:border-white/10 md:pt-5 md:text-left">
        <ul className="flex flex-wrap items-center justify-center gap-x-5 md:order-3">
          {LEGAL_LINKS.map((link) => (
            <li key={link.to}><Link to={link.to} className={`${linkClass} inline-flex min-h-[44px] items-center`}>{link.label}</Link></li>
          ))}
        </ul>
        <p className="text-xs text-gray-400 md:order-2" aria-label="Payment options">
          Cash on Delivery &middot; Bank transfer &middot; Easypaisa
        </p>
        <p className="text-xs text-gray-400 md:order-1 md:text-sm">
          &copy; {new Date().getFullYear()} AHM Mart. All rights reserved.
        </p>
      </div>
    </div>
  </footer>
);

export default Footer;
