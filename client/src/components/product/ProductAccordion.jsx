import React, { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';

// Independent disclosure sections. Closed panels stay in the DOM (hidden attribute), so all the
// content remains part of the rendered page. items: [{ id, title, defaultOpen, content }]
// openRequest: { id, n } opens that section whenever n changes (used by the "Read more" link).
const ProductAccordion = ({ items, openRequest = null }) => {
  const [open, setOpen] = useState(() => new Set(items.filter((i) => i.defaultOpen).map((i) => i.id)));
  useEffect(() => {
    if (openRequest?.id) setOpen((prev) => new Set(prev).add(openRequest.id));
  }, [openRequest?.n]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (id) => setOpen((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  return (
    <div className="divide-y divide-gray-200 border-y border-gray-200">
      {items.map((item) => {
        const isOpen = open.has(item.id);
        return (
          <section key={item.id} id={`product-${item.id}`} className="scroll-mt-28">
            <h2>
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={`product-${item.id}-panel`}
                onClick={() => toggle(item.id)}
                className="flex min-h-[52px] w-full items-center justify-between gap-4 py-3 text-left"
              >
                <span className="text-base font-semibold text-gray-900">{item.title}</span>
                <ChevronDown className={`h-5 w-5 flex-shrink-0 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
              </button>
            </h2>
            <div id={`product-${item.id}-panel`} role="region" aria-label={item.title} hidden={!isOpen} className="pb-5 text-sm leading-relaxed text-gray-700">
              {item.content}
            </div>
          </section>
        );
      })}
    </div>
  );
};

export default ProductAccordion;
