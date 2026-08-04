import React from 'react';

const WHATSAPP_PHONE = '923238818508';
const WHATSAPP_MESSAGE = encodeURIComponent('Hello! I would like to know more about your products.');
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_PHONE}?text=${WHATSAPP_MESSAGE}`;

const WhatsAppButton = () => (
  <a
    href={WHATSAPP_URL}
    target="_blank"
    rel="noopener noreferrer"
    aria-label="Chat with AHM Mart on WhatsApp"
    className="group fixed bottom-6 right-6 z-[60] flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-xl transition-transform duration-200 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#25D366]"
  >
    {/* Tooltip */}
    <span
      className="pointer-events-none absolute right-full top-1/2 mr-3 -translate-y-1/2 whitespace-nowrap rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white opacity-0 shadow-md transition-all duration-200 group-hover:opacity-100 group-hover:mr-3.5"
    >
      Chat on WhatsApp
      <span className="absolute left-full top-1/2 -translate-y-1/2 border-4 border-transparent border-l-gray-900" />
    </span>

    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      fill="currentColor"
      className="h-8 w-8"
      aria-hidden="true"
    >
      <path d="M16.001 2.667c-7.363 0-13.334 5.97-13.334 13.333 0 2.353.615 4.66 1.784 6.693L2.7 29.333l6.79-1.782a13.28 13.28 0 0 0 6.51 1.706h.006c7.362 0 13.333-5.97 13.333-13.333 0-3.56-1.387-6.907-3.905-9.425A13.245 13.245 0 0 0 16.001 2.667Zm0 24.4h-.005a11.06 11.06 0 0 1-5.638-1.544l-.404-.24-4.03 1.058 1.076-3.93-.264-.404a11.045 11.045 0 0 1-1.694-5.884c0-6.106 4.968-11.073 11.076-11.073a11.02 11.02 0 0 1 7.83 3.246 10.99 10.99 0 0 1 3.238 7.83c0 6.107-4.968 11.074-11.075 11.074l-.11-.133Zm6.073-8.293c-.333-.167-1.97-.972-2.275-1.083-.305-.112-.527-.167-.75.166-.222.334-.86 1.084-1.054 1.306-.194.223-.389.25-.722.084-.333-.167-1.406-.518-2.678-1.652-.99-.883-1.659-1.974-1.853-2.307-.194-.334-.02-.514.146-.68.15-.15.334-.39.5-.585.167-.195.222-.334.334-.556.111-.223.055-.417-.028-.583-.084-.167-.75-1.807-1.028-2.474-.271-.65-.546-.562-.75-.573a14.42 14.42 0 0 0-.639-.011.978.978 0 0 0-.708.334c-.242.264-.928.907-.928 2.213s.95 2.567 1.083 2.745c.132.178 1.87 2.855 4.531 4.005.633.273 1.126.437 1.51.559.635.202 1.212.174 1.669.106.509-.076 1.567-.641 1.789-1.26.222-.62.222-1.151.156-1.262-.067-.111-.243-.178-.508-.312Z" />
    </svg>
  </a>
);

export default WhatsAppButton;