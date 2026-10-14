import React, { useState } from 'react';

// Accessible single-open accordion. items: [{ id, question, answer }]
const Accordion = ({ items }) => {
  const [openId, setOpenId] = useState(null);

  return (
    <div className="divide-y divide-gray-100">
      {items.map((item) => {
        const isOpen = openId === item.id;
        const panelId = `faq-panel-${item.id}`;
        return (
          <div key={item.id}>
            <h3>
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpenId(isOpen ? null : item.id)}
                className="flex min-h-[52px] w-full items-center justify-between gap-4 px-4 py-3.5 text-left transition-colors hover:bg-gray-50 sm:px-5"
              >
                <span className="text-sm font-semibold text-dark sm:text-[15px]">{item.question}</span>
                <svg
                  className={`h-5 w-5 flex-shrink-0 text-primary transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </h3>
            <div id={panelId} role="region" hidden={!isOpen} className="px-4 pb-4 text-sm leading-relaxed text-gray-600 sm:px-5">
              {item.answer}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default Accordion;
