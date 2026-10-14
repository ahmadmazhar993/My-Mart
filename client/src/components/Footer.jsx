import React from 'react';
import { Link } from 'react-router-dom';
import { FaWhatsapp } from 'react-icons/fa';
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

const Footer = () => (
  <footer className="mt-auto bg-dark text-white">
    <div className="container-main py-8 sm:py-12">
      <div className="grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-[1.5fr_repeat(4,1fr)] lg:gap-8">
        {/* Brand + contact */}
        <div className="col-span-2 lg:col-span-1">
          <Link to="/" className="inline-flex items-center gap-2" aria-label="AHM Mart home">
            <img src="/logo.png" alt="" className="h-9 w-9 rounded-md bg-white p-0.5" />
            <span className="whitespace-nowrap text-xl font-extrabold">
              <span className="text-primary-300">AHM</span> Mart
            </span>
          </Link>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-gray-300">
            Everyday shopping for Pakistan with clear prices, simple ordering and order tracking.
          </p>
          <ul className="mt-4 space-y-1 text-sm">
            <li><a href={`mailto:${MART_INFO.email}`} className={linkClass}>{MART_INFO.email}</a></li>
            <li><a href={`tel:${MART_INFO.phone.replace(/[^\d+]/g, '')}`} className={linkClass}>{MART_INFO.phone}</a></li>
          </ul>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-[#25D366] px-4 text-sm font-semibold text-white transition hover:brightness-95"
          >
            <FaWhatsapp className="h-5 w-5" aria-hidden="true" />
            Chat on WhatsApp
          </a>
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

      {/* Bottom bar */}
      <div className="mt-8 flex flex-col items-center gap-3 border-t border-white/10 pt-5 text-center md:flex-row md:justify-between md:text-left">
        <p className="text-xs text-gray-400 md:text-sm">
          &copy; {new Date().getFullYear()} AHM Mart. All rights reserved.
        </p>
        <p className="text-xs text-gray-400" aria-label="Payment options">
          Cash on Delivery &middot; Bank transfer &middot; Easypaisa
        </p>
        <ul className="flex flex-wrap items-center justify-center gap-x-5">
          {LEGAL_LINKS.map((link) => (
            <li key={link.to}><Link to={link.to} className={linkClass}>{link.label}</Link></li>
          ))}
        </ul>
      </div>
    </div>
  </footer>
);

export default Footer;
