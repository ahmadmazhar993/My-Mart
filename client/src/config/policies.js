// Business policy details that are NOT enforced anywhere in code and therefore must be
// confirmed by the owner. Leave a value as `null` and the site will not state it publicly:
// pages fall back to neutral wording ("contact us") instead of inventing a promise.

// Cities the checkout currently accepts (Checkout.jsx imports this list).
export const DELIVERY_CITIES = ['Lahore'];

export const POLICY = {
  // e.g. '2–4 business days'
  deliveryTimeframe: '1–3 working days',
  // e.g. 7 (days after delivery)
  returnWindowDays: 7,
  // e.g. '5–7 business days'
  refundTimeframe: null,
  // Optional Google structured-data details. Leave null unless the business has confirmed them AND they
  // are stated on the Returns / Shipping pages.
  // How a customer sends an item back: 'ReturnByMail' | 'ReturnInStore' | 'ReturnAtKiosk'
  returnMethod: 'ReturnInStore',
  // Who pays for returns: 'FreeReturn' | 'ReturnFeesCustomerResponsibility' (Google-supported values)
  returnFees: 'ReturnFeesCustomerResponsibility',
  // Order processing time before dispatch, in days, e.g. { min: 0, max: 1 }
  handlingDays: { min: 0, max: 2 },
  // e.g. 'Monday – Saturday, 9:00 AM – 9:00 PM PKT'
  supportHours: '9:00 AM – 9:00 PM',
};

// Social profiles shown in the footer. Add { label, href } entries once the accounts exist,
// e.g. { label: 'Facebook', href: 'https://facebook.com/...' }. Empty = nothing is rendered.
export const SOCIAL_LINKS = [];
