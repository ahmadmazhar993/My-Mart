import React from 'react';
import { FaWhatsapp } from 'react-icons/fa';

const WHATSAPP_PHONE = '923238818508';
const WHATSAPP_MESSAGE = encodeURIComponent(
  'Hello! I would like to know more about your products.'
);
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_PHONE}?text=${WHATSAPP_MESSAGE}`;

const WhatsAppButton = () => (
  <a
    href={WHATSAPP_URL}
    target="_blank"
    rel="noopener noreferrer"
    aria-label="Chat with AHM Mart on WhatsApp"
    className="
      group
      fixed
      bottom-6
      right-6
      z-[9999]
      flex
      h-14
      w-14
      items-center
      justify-center
      rounded-full
      bg-[#25D366]
      text-white
      shadow-lg
      transition-transform
      duration-200
      hover:scale-105
      focus-visible:outline-none
      focus-visible:ring-2
      focus-visible:ring-[#25D366]
      focus-visible:ring-offset-2
    "
  >
    {/* Tooltip */}
    <span
      className="
        pointer-events-none
        absolute
        right-full
        top-1/2
        mr-3
        -translate-y-1/2
        whitespace-nowrap
        rounded-md
        bg-gray-900
        px-3
        py-1.5
        text-xs
        font-medium
        text-white
        opacity-0
        shadow-md
        transition-all
        duration-200
        group-hover:opacity-100
        group-hover:mr-3.5
      "
    >
      Chat on WhatsApp

      <span
        className="
          absolute
          left-full
          top-1/2
          -translate-y-1/2
          border-4
          border-transparent
          border-l-gray-900
        "
      />
    </span>

    {/* WhatsApp Icon */}
    <FaWhatsapp
      className="h-8 w-8 shrink-0"
      aria-hidden="true"
    />
  </a>
);

export default WhatsAppButton;