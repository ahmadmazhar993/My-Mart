import React from 'react';
import { Link } from 'react-router-dom';
import { LifeBuoy, Truck, Undo2, Wallet } from 'lucide-react';
import { SHIPPING_TIERS } from '../../config/shipping';
import { POLICY } from '../../config/policies';
import { formatPrice } from '../../utils/format';

const FREE_TIER = SHIPPING_TIERS.find((tier) => tier.cost === 0);

// Short promises directly under the hero. Every value comes from the same config the cart and the
// policy pages use, so this strip cannot drift from what checkout actually does.
const ITEMS = [
  FREE_TIER && { title: 'Free delivery', desc: `On orders over ${formatPrice(FREE_TIER.minSubtotal)}`, to: '/pages/shipping', Icon: Truck },
  { title: 'Pay your way', desc: 'Cash on delivery or bank transfer', to: '/pages/cash-on-delivery', Icon: Wallet },
  POLICY.returnWindowDays && { title: 'Easy returns', desc: `${POLICY.returnWindowDays}-day return policy`, to: '/pages/returns-refunds', Icon: Undo2 },
  { title: 'Here to help', desc: 'Help center and contact options', to: '/help', Icon: LifeBuoy },
].filter(Boolean);

const ValueStrip = () => (
  <section className="container-main pb-2 pt-1" aria-label="Why shop at AHM Mart">
    <ul className="snap-row gap-2.5 sm:grid sm:grid-cols-2 sm:gap-3 sm:overflow-visible lg:grid-cols-4">
      {ITEMS.map(({ title, desc, to, Icon }) => (
        <li key={title} className="w-[78%] min-w-[220px] flex-shrink-0 sm:w-auto">
          <Link
            to={to}
            className="group flex min-h-[64px] items-center gap-3 rounded-2xl border border-primary-100 bg-white px-3.5 py-3 shadow-card transition duration-200 hover:-translate-y-0.5 hover:border-primary-300 hover:shadow-soft"
          >
            <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-50 to-primary-100 text-primary-700 transition-colors group-hover:from-primary-600 group-hover:to-primary-700 group-hover:text-white">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-bold text-dark">{title}</span>
              <span className="block truncate text-xs text-gray-500">{desc}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  </section>
);

export default ValueStrip;
