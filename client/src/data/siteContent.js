import { SHIPPING_TIERS } from '../config/shipping';
import { DELIVERY_CITIES, POLICY } from '../config/policies';
import { PAYMENT_METHOD_LABELS } from '../config/paymentAccounts';

// Verified business details (also used on receipts and by the WhatsApp button).
export const MART_INFO = {
  name: 'AHM Mart',
  logoUrl: '/logo.png',
  address: 'AHM Mart (Pvt.) Ltd., Near Lahore General Hospital, Ismail Nagar, Lahore, Pakistan',
  phone: '+92 323 881 8508',
  email: 'support@ahmmart.store',
  website: 'https://www.ahmmart.store',
  support: 'support@ahmmart.store',
};

const pkr = (n) => `Rs. ${n.toLocaleString('en-PK')}`;
const deliveryCities = DELIVERY_CITIES.join(', ');

// Delivery charges are generated from config/shipping.js so this page can never drift from checkout.
const shippingTierLines = [...SHIPPING_TIERS]
  .sort((a, b) => a.minSubtotal - b.minSubtotal)
  .map((tier, i, asc) => {
    const next = asc[i + 1];
    let range;
    if (i === 0) range = `Below ${pkr(next.minSubtotal)}`;
    else if (!next) range = `${pkr(tier.minSubtotal)} and above`;
    else range = `${pkr(tier.minSubtotal)} to ${pkr(next.minSubtotal - 1)}`;
    return `• ${range}: ${tier.cost === 0 ? 'Free delivery' : pkr(tier.cost)}`;
  })
  .join('\n');

const freeShippingThreshold = SHIPPING_TIERS.find((t) => t.cost === 0)?.minSubtotal;

// Each page: title, subtitle (also the meta description), optional cta, and sections.
// A section body is plain text: lines starting with "•" or "1." become lists.
export const INFO_PAGES = {
  about: {
    title: 'About AHM Mart',
    subtitle: 'An online store for everyday shopping in Pakistan, built around clear prices and simple ordering.',
    sections: [
      {
        heading: 'Who we are',
        body: 'AHM Mart is an online shopping website serving customers in Pakistan. We bring everyday products from categories such as electronics, fashion, accessories, home & living, beauty, sports, groceries and toys into one easy-to-browse store.',
      },
      {
        heading: 'How shopping works here',
        body: '• Browse by category or search for what you need, and filter by price\n• See prices, discounts, stock availability and product variants up front\n• Add items to your cart or save them to a wishlist\n• Pay with Cash on Delivery or by online bank / Easypaisa transfer\n• Track every order from your account, with status updates as it moves forward',
      },
      {
        heading: 'Our commitment to customers',
        body: `We aim to keep the shopping experience honest and simple: delivery charges are shown before you pay (free on orders of ${freeShippingThreshold ? pkr(freeShippingThreshold) : 'qualifying value'} and above), reviews can only be written by customers who have bought the product, and our team is reachable through the contact page and WhatsApp if something goes wrong.`,
      },
      {
        heading: 'Where we deliver today',
        body: `Checkout currently accepts delivery addresses in ${deliveryCities}. We will announce additional cities on this website when they are added.`,
      },
    ],
    cta: { title: 'Ready to start shopping?', label: 'Browse products', to: '/products', secondary: { label: 'Contact us', to: '/pages/contact' } },
  },

  'how-to-buy': {
    title: 'How to Buy',
    subtitle: 'Place an order on AHM Mart in a few simple steps.',
    sections: [
      {
        heading: '1. Find your product',
        body: 'Use the search bar, the category menu or the filters on the Products page. Open a product to see its price, stock availability, description and customer reviews. If a product has variants (for example size or pack), choose one before adding it.',
      },
      {
        heading: '2. Add to cart or Buy Now',
        body: 'Choose a quantity and tap Add to Cart to keep shopping, or Buy Now to go straight to checkout with just that item. You can also save products to your Wishlist for later.',
      },
      {
        heading: '3. Sign in and enter your address',
        body: 'Checkout requires an account. You can register with your email or continue with Google. Enter your delivery details; you can save the address for next time.',
      },
      {
        heading: '4. Choose how to pay',
        body: `• ${PAYMENT_METHOD_LABELS.cod}: pay the delivery agent when your order arrives\n• ${PAYMENT_METHOD_LABELS.online}: transfer the total to the bank or Easypaisa account shown at checkout, then upload your payment receipt and enter your sender account number\nSee Digital Payments and Cash on Delivery for details.`,
      },
      {
        heading: '5. Track your order',
        body: 'After placing your order you can follow it in My Orders. Order statuses are: Pending, Confirmed, Processing, Shipped, Delivered and Cancelled.',
      },
    ],
    cta: { title: 'Start shopping', label: 'Browse products', to: '/products', secondary: { label: 'Visit Help Center', to: '/help' } },
  },

  shipping: {
    title: 'Shipping & Delivery',
    subtitle: 'Delivery areas, delivery charges and how to follow your order.',
    sections: [
      {
        heading: 'Delivery area',
        body: `Checkout currently accepts delivery addresses in ${deliveryCities}.`,
      },
      {
        heading: 'Delivery charges',
        body: `Delivery charges depend on your cart subtotal and are shown in your cart and at checkout before you pay:\n${shippingTierLines}`,
      },
      {
        heading: 'Delivery time',
        body: POLICY.deliveryTimeframe
          ? `Orders are usually delivered within ${POLICY.deliveryTimeframe}. Timing can be longer during sale periods or for out-of-stock items.`
          : 'Delivery time depends on the product and your location. For an estimate on a specific order, contact our team through the contact page or WhatsApp.',
      },
      {
        heading: 'Following your order',
        body: 'Sign in and open My Orders to see the status of each order: Pending, Confirmed, Processing, Shipped, Delivered or Cancelled. Orders paid by online transfer move forward once we have verified your payment.',
      },
      {
        heading: 'Receiving your order',
        body: 'Please make sure the phone number and address you give at checkout are correct so our delivery agent can reach you. If you paid by Cash on Delivery, keep the exact amount ready.',
      },
    ],
    cta: { title: 'Need help with a delivery?', label: 'Contact us', to: '/pages/contact?topic=order', secondary: { label: 'My Orders', to: '/orders' } },
  },

  'returns-refunds': {
    title: 'Returns & Refunds',
    subtitle: 'What to do if something is wrong with your order.',
    sections: [
      {
        heading: 'If there is a problem with your order',
        body: 'If an item arrives damaged, defective or different from what you ordered, contact us as soon as possible with your order number and, where possible, clear photos. We will review your case and tell you the options available for your order.',
      },
      {
        heading: 'How to contact us about a return',
        body: `1. Have your order number ready (find it in My Orders)\n2. Send us a message from the contact page, email ${MART_INFO.email}, or message us on WhatsApp\n3. Describe the issue and attach photos if the item is damaged\nOur team will reply with the next steps. At this time there is no automated "Request Return" button, so returns are handled by our support team.`,
      },
      {
        heading: 'Return eligibility',
        body: POLICY.returnWindowDays
          ? `Returns must be requested within ${POLICY.returnWindowDays} days of delivery. Items should be unused and in their original packaging. Some products, such as perishable groceries or personal-care items, may not be returnable unless they arrive damaged or defective.`
          : 'Eligibility depends on the product and the reason for the return. Perishable groceries and personal-care items are generally not suitable for return unless they arrive damaged or defective. Contact us and we will confirm what applies to your order.',
      },
      {
        heading: 'Refunds',
        body: POLICY.refundTimeframe
          ? `Approved refunds are processed within ${POLICY.refundTimeframe}. Refunds for Cash on Delivery orders are arranged with you directly, for example by bank transfer.`
          : 'If a refund is approved, we will confirm the amount and how it will be paid back to you (for example by bank transfer for Cash on Delivery orders). Timing is confirmed by our team when your case is approved.',
      },
      {
        heading: 'Cancelling an order',
        body: 'Contact us as early as possible if you want to cancel. Orders that have not yet been shipped are the easiest to cancel; our team will confirm whether cancellation is still possible.',
      },
    ],
    cta: { title: 'Need to report an issue?', label: 'Contact support', to: '/pages/contact?topic=returns', secondary: { label: 'My Orders', to: '/orders' } },
  },

  'cash-on-delivery': {
    title: 'Cash on Delivery',
    subtitle: 'Pay when your order arrives.',
    sections: [
      {
        heading: 'How it works',
        body: '1. Choose Cash on Delivery at checkout\n2. Place your order; our team confirms it\n3. Pay the delivery agent in cash when you receive your items',
      },
      {
        heading: 'Where it is available',
        body: `Cash on Delivery is offered at checkout for delivery addresses in ${deliveryCities}.`,
      },
      {
        heading: 'Good to know',
        body: `• Delivery charges still apply, based on your subtotal (see Shipping & Delivery)\n• Please keep the exact amount ready and check your parcel at delivery\n• If you would rather pay in advance, you can use ${PAYMENT_METHOD_LABELS.online} instead`,
      },
    ],
    cta: { title: 'Ready to order?', label: 'Browse products', to: '/products', secondary: { label: 'Shipping & Delivery', to: '/pages/shipping' } },
  },

  'digital-payments': {
    title: 'Digital Payments',
    subtitle: 'Pay in advance by bank transfer or Easypaisa.',
    sections: [
      {
        heading: 'Accepted methods',
        body: '• Bank transfer (Meezan Bank), including by scanning the QR code shown at checkout\n• Easypaisa transfer\n• Cash on Delivery is also available as an alternative',
      },
      {
        heading: 'How to pay online',
        body: '1. Choose Online Payment at checkout and copy the account details shown (tap an account to copy)\n2. Transfer the full order total from your banking or Easypaisa app\n3. Upload a screenshot or PDF of your payment receipt (PNG, JPG or PDF, up to 5 MB)\n4. Enter the account number you sent the money from, then place your order',
      },
      {
        heading: 'Payment verification',
        body: 'We check each online payment manually against the receipt you upload, then update your order status. Please send the exact total and make sure the receipt clearly shows the amount and transaction details. You can follow progress in My Orders.',
      },
      {
        heading: 'Staying safe',
        body: 'Only send money to the account details displayed on the AHM Mart checkout page. We will never ask you to share your banking password, PIN or one-time codes.',
      },
    ],
    cta: { title: 'Questions about a payment?', label: 'Contact us', to: '/pages/contact?topic=payment', secondary: { label: 'My Orders', to: '/orders' } },
  },

  terms: {
    title: 'Terms & Conditions',
    subtitle: 'The rules that apply when you browse and shop on AHM Mart.',
    sections: [
      {
        heading: 'Acceptance of these terms',
        body: 'By using the AHM Mart website, creating an account or placing an order, you agree to these Terms & Conditions and to our Privacy Policy. If you do not agree, please do not use the website.',
      },
      {
        heading: 'Your account',
        body: 'You can register with your email or sign in with Google. You are responsible for keeping your login details secure and for activity under your account. Please give accurate information, including a working email address and phone number, so we can confirm and deliver your orders.',
      },
      {
        heading: 'Products and pricing',
        body: 'Prices are shown in Pakistani Rupees (PKR). Product descriptions, images, prices, discounts and stock levels are shown in good faith and may change. If we find an error in price or availability, we may contact you or cancel the affected order.',
      },
      {
        heading: 'Placing and confirming orders',
        body: 'Placing an order is a request to buy. An order is accepted when our team confirms it, and its status is shown in My Orders. We may decline or cancel orders, for example when stock is unavailable, payment cannot be verified, or an order looks fraudulent.',
      },
      {
        heading: 'Payments',
        body: 'You can pay by Cash on Delivery or by online bank / Easypaisa transfer. For online payments you must upload a valid payment receipt and sender account number; the order is processed after we verify the payment. Providing a false or altered receipt is not permitted.',
      },
      {
        heading: 'Delivery',
        body: 'Delivery areas, charges and options are described on the Shipping & Delivery page. You are responsible for providing a correct address and being reachable at the phone number you supply.',
      },
      {
        heading: 'Returns, refunds and cancellations',
        body: 'These are handled as described on the Returns & Refunds page.',
      },
      {
        heading: 'Reviews',
        body: 'Reviews should be honest and based on your own experience. We may remove content that is abusive, misleading or unlawful.',
      },
      {
        heading: 'Acceptable use',
        body: 'Do not misuse the website, attempt to access other users\' data, interfere with its operation, or use it for unlawful purposes.',
      },
      {
        heading: 'Limitation of liability',
        body: 'To the extent permitted by law, AHM Mart is not liable for indirect or consequential losses arising from the use of the website. Nothing in these terms limits rights you have under applicable consumer protection law.',
      },
      {
        heading: 'Changes to these terms',
        body: 'We may update these terms from time to time. The version published on this page applies when you use the website.',
      },
      {
        heading: 'Contact',
        body: `Questions about these terms? Email ${MART_INFO.email} or use the contact page.`,
      },
    ],
    cta: { title: 'Questions about these terms?', label: 'Contact us', to: '/pages/contact', secondary: { label: 'Privacy Policy', to: '/pages/privacy' } },
  },

  privacy: {
    title: 'Privacy Policy',
    subtitle: 'What personal information AHM Mart collects, why, and the choices you have.',
    sections: [
      {
        heading: 'Information we collect',
        body: '• Account details: name, email address, phone number and password (stored in hashed form). If you use Google sign-in, we receive basic profile details from Google\n• Delivery details: addresses, city and phone number you enter at checkout or save to your account\n• Order information: items purchased, totals, order status and history\n• Payment proof: for online payments, the receipt file you upload and the sender account number you enter. We do not collect card numbers\n• Messages: what you send through the contact form\n• Reviews you choose to write',
      },
      {
        heading: 'How we use it',
        body: '• To create and secure your account and verify your email\n• To process, deliver and support your orders and verify online payments\n• To send transactional emails such as order confirmations, status updates, password resets and replies to your messages\n• To prevent fraud and misuse, and to improve the website',
      },
      {
        heading: 'Information stored in your browser',
        body: 'Your cart, wishlist and some preferences are stored in your browser (local storage) so they are still there when you come back. Session cookies keep you signed in. You can clear this data at any time from your browser settings.',
      },
      {
        heading: 'Third-party services',
        body: '• Google, if you choose "Continue with Google", and for the Google Fonts used to display text on this website\n• An email delivery service used to send our emails to you\n• Hosting and infrastructure providers that store the website and its data\nThese providers process data only as needed to provide their service and have their own privacy policies.',
      },
      {
        heading: 'Sharing',
        body: 'We do not sell your personal information. We share it only with service providers described above, with delivery staff to the extent needed to deliver your order, or where required by law.',
      },
      {
        heading: 'Security',
        body: 'Passwords are stored hashed, and requests to our server are rate-limited for sensitive actions such as sending messages. No online system is completely secure, so please use a strong password and keep your login details private.',
      },
      {
        heading: 'Retention',
        body: 'We keep order and account information for as long as needed to provide our service, handle support and returns, and meet record-keeping needs. You can ask us to review or delete your information using the contact details below.',
      },
      {
        heading: 'Your choices',
        body: 'You can view and update your name and phone number in Account Settings and manage saved addresses in your Profile. To ask for a copy of your data, a correction, or deletion of your account, contact us and we will respond to your request.',
      },
      {
        heading: 'Contact',
        body: `Privacy questions: ${MART_INFO.email}, or use the contact page.`,
      },
    ],
    cta: { title: 'Questions about your data?', label: 'Contact us', to: '/pages/contact', secondary: { label: 'Terms & Conditions', to: '/pages/terms' } },
  },

  careers: {
    title: 'Careers',
    subtitle: 'Interested in working with AHM Mart?',
    sections: [
      {
        heading: 'Current openings',
        body: 'We do not have any open positions listed right now. When roles open up, we will announce them on this page.',
      },
      {
        heading: 'Get in touch anyway',
        body: `If you would like us to keep you in mind, send a short introduction and your CV through the contact page or to ${MART_INFO.email}, and tell us which area interests you (for example customer support, operations, or technology).`,
      },
    ],
    cta: { title: 'Share your details', label: 'Contact us', to: '/pages/contact?topic=careers', secondary: { label: 'About AHM Mart', to: '/pages/about' } },
  },

  sell: {
    title: 'Sell on AHM Mart',
    subtitle: 'Want to list your products with us? Start with a conversation.',
    sections: [
      {
        heading: 'Selling with AHM Mart',
        body: 'We are interested in hearing from businesses that offer quality products in the categories we sell. You can apply online with your AHM Mart account. Every application is reviewed by our team before a seller account is activated, and new products are reviewed before they appear on the store.',
      },
      {
        heading: 'How to get started',
        body: '1. Sign in (or create a customer account) and submit the seller application\n2. Our team reviews your application and you can check its status any time\n3. Once approved, add products in the Seller Centre; each product is reviewed before it goes live\nThe current seller fees are shown on the application page before you submit.',
      },
    ],
    cta: { title: 'Ready to start?', label: 'Apply to sell', to: '/seller/apply', secondary: { label: 'Ask a question first', to: '/pages/contact?topic=seller' } },
  },

  'become-seller': {
    title: 'Become a Seller',
    subtitle: 'How to apply to sell your products on AHM Mart.',
    sections: [
      {
        heading: 'What to send us',
        body: '• Your name and business (or shop) name\n• The categories and kinds of products you want to sell\n• A phone number and email address where we can reach you\n• Anything that helps us understand your business, such as a website or social page',
      },
      {
        heading: 'What happens next',
        body: 'Our team reviews your application. Your account is not a seller account until it is approved, and we will explain the requirements and any commercial terms before anything is agreed.',
      },
    ],
    cta: { title: 'Apply to sell', label: 'Start your application', to: '/seller/apply', secondary: { label: 'Ask a question first', to: '/pages/contact?topic=seller' } },
  },

  advertise: {
    title: 'Advertise with AHM Mart',
    subtitle: 'Interested in promoting a brand or product on our website?',
    sections: [
      {
        heading: 'Work with us',
        body: 'If you would like to promote your brand or products on AHM Mart, send us an enquiry describing what you have in mind. We will let you know what is possible and share details directly.',
      },
      {
        heading: 'What to include',
        body: '• Your brand or business name\n• What you want to promote and your goals\n• Your preferred timing\n• How we can contact you',
      },
    ],
    cta: { title: 'Start the conversation', label: 'Send an enquiry', to: '/pages/contact?topic=advertising', secondary: { label: 'About AHM Mart', to: '/pages/about' } },
  },
};

const supportHoursLine = POLICY.supportHours ? ` Our support team is available ${POLICY.supportHours}.` : '';

export const HELP_FAQ = [
  {
    category: 'Orders & Purchasing',
    questions: [
      {
        q: 'How do I place an order?',
        a: 'Add products to your cart (or tap Buy Now), then go to checkout. You will need to sign in or register, enter your delivery details and choose a payment method. See How to Buy for the full steps.',
      },
      {
        q: 'How do I track my order?',
        a: 'Sign in and open My Orders. Each order shows its current status: Pending, Confirmed, Processing, Shipped, Delivered or Cancelled.',
      },
      {
        q: 'Can I cancel or change my order?',
        a: 'Contact us as soon as possible with your order number. Orders that have not been shipped are the easiest to cancel or change; our team will confirm what is still possible.',
      },
      {
        q: 'Do I need an account to buy?',
        a: 'Yes. You can browse without an account, but checkout requires you to register or sign in (including with Google) so you can track your order.',
      },
    ],
  },
  {
    category: 'Payments',
    questions: [
      {
        q: 'Which payment methods do you accept?',
        a: 'Cash on Delivery, and Online Payment by bank transfer (Meezan Bank) or Easypaisa. The account details are shown at checkout.',
      },
      {
        q: 'How does online payment work?',
        a: 'At checkout, transfer the order total to the account shown, upload your payment receipt (PNG, JPG or PDF up to 5 MB) and enter your sender account number. We verify the payment and update your order status.',
      },
      {
        q: 'Is Cash on Delivery available?',
        a: `Yes, for delivery addresses in ${deliveryCities}. Choose it at checkout and pay the delivery agent when your order arrives.`,
      },
      {
        q: 'Do you accept debit or credit cards?',
        a: 'Not at the moment. Payment is by Cash on Delivery or by bank / Easypaisa transfer.',
      },
    ],
  },
  {
    category: 'Shipping & Delivery',
    questions: [
      {
        q: 'What are the delivery charges?',
        a: `Delivery is free on orders of ${freeShippingThreshold ? pkr(freeShippingThreshold) : 'qualifying value'} and above. Below that, charges depend on your subtotal and are shown in your cart before you pay. See Shipping & Delivery for the full table.`,
      },
      {
        q: 'Which cities do you deliver to?',
        a: `Checkout currently accepts delivery addresses in ${deliveryCities}.`,
      },
      {
        q: 'How long will delivery take?',
        a: POLICY.deliveryTimeframe
          ? `Orders are usually delivered within ${POLICY.deliveryTimeframe}.`
          : 'Delivery time depends on the product and your location. Contact us with your order number for an estimate.',
      },
    ],
  },
  {
    category: 'Returns & Refunds',
    questions: [
      {
        q: 'What if my item is damaged or wrong?',
        a: 'Contact us with your order number and photos of the item. We will review it and explain the options for your order. See Returns & Refunds.',
      },
      {
        q: 'How do I request a return?',
        a: 'Returns are handled by our support team: contact us through the contact page, email or WhatsApp with your order number and the reason.',
      },
      {
        q: 'When will I get my refund?',
        a: POLICY.refundTimeframe
          ? `Approved refunds are processed within ${POLICY.refundTimeframe}.`
          : 'If a refund is approved, our team will confirm the amount, the method and the timing with you.',
      },
    ],
  },
  {
    category: 'Account & Security',
    questions: [
      {
        q: 'How do I reset my password?',
        a: 'On the login page choose "Forgot password", enter your email and follow the link we send you.',
      },
      {
        q: 'Can I sign in with Google?',
        a: 'Yes. Choose "Continue with Google" on the login page.',
      },
      {
        q: 'Are my payment details safe?',
        a: 'We do not collect card numbers. For online payments you send money from your own banking or Easypaisa app and upload a receipt. Only pay to the account details shown on the AHM Mart checkout page, and never share your PIN or one-time codes.',
      },
      {
        q: 'How is my personal information used?',
        a: 'See our Privacy Policy for what we collect and why.',
      },
    ],
  },
  {
    category: 'Products & Reviews',
    questions: [
      {
        q: 'Who can write a product review?',
        a: 'Reviews can be written by signed-in customers who have purchased the product.',
      },
      {
        q: 'How do I know if a product is in stock?',
        a: 'Stock availability is shown on every product card and product page. Items that are out of stock cannot be added to the cart.',
      },
      {
        q: 'I want to sell on AHM Mart. What do I do?',
        a: 'Sign in and submit the seller application. See Become a Seller for what to prepare, or send us an enquiry through the contact page.',
      },
    ],
  },
];

export const HELP_TOPICS = [
  { label: 'How to Buy', to: '/pages/how-to-buy', icon: '🛒' },
  { label: 'Track Order', to: '/orders', icon: '📦' },
  { label: 'Shipping', to: '/pages/shipping', icon: '🚚' },
  { label: 'Returns & Refunds', to: '/pages/returns-refunds', icon: '↩️' },
  { label: 'Payment Methods', to: '/pages/digital-payments', icon: '💳' },
  { label: 'Contact Us', to: '/pages/contact', icon: '📞' },
];

export const HELP_SUPPORT_HOURS_NOTE = supportHoursLine.trim();
