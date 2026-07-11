import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  const footerSections = [
    {
      title: 'Customer Care',
      links: [
        { label: 'Help Center', to: '/help' },
        { label: 'How to Buy', to: '/pages/how-to-buy' },
        { label: 'Returns & Refunds', to: '/pages/returns-refunds' },
        { label: 'Contact Us', to: '/pages/contact' },
      ],
    },
    {
      title: 'AHM Mart',
      links: [
        { label: 'About Us', to: '/pages/about' },
        { label: 'Careers', to: '/pages/careers' },
        { label: 'AHM Mart Blog', to: '/pages/blog' },
        { label: 'Terms & Conditions', to: '/pages/terms' },
      ],
    },
    {
      title: 'Make Money with Us',
      links: [
        { label: 'Sell on AHM Mart', to: '/pages/sell' },
        { label: 'Become a Seller', to: '/pages/become-seller' },
        { label: 'Affiliate Program', to: '/pages/affiliate' },
        { label: 'Advertise', to: '/pages/advertise' },
      ],
    },
    {
      title: 'Payment Methods',
      links: [
        { label: 'Cash on Delivery', to: '/pages/cash-on-delivery' },
        { label: 'Easy Monthly Installments', to: '/pages/installments' },
        { label: 'Digital Payments', to: '/pages/digital-payments' },
      ],
    },
  ];

  return (
    <footer className="bg-dark text-white mt-auto">
      <div className="container-main py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {footerSections.map((section) => (
            <div key={section.title}>
              <h3 className="font-bold text-sm mb-4 text-white">{section.title}</h3>
              <ul className="space-y-2.5">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.to}
                      className="text-sm text-gray-400 hover:text-white transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-primary-700 mt-10 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
            <span className="text-2xl font-extrabold">
              <span className="text-primary-300">AHM</span> Mart
            </span>
            <span className="text-sm text-gray-400">Your Trusted Online Marketplace</span>
          </Link>
          <p className="text-sm text-gray-500">
            &copy; {new Date().getFullYear()} AHM Mart. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
