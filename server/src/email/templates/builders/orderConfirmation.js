const site = require('../siteConstants');
const { getPaymentMethodLabel, getOnlinePaymentInstructions } = require('../../../libs/paymentMethods');

// const formatPrice = (amount) => `Rs. ${Number(amount).toLocaleString('en-PK')}`;

const formatPrice = (amount) => {
  console.log('formatPrice called with amount:', amount);
  return `Rs. ${Number(amount).toLocaleString('en-PK')}`;
};
const buildOrderConfirmationBody = ({
  firstName,
  orderId,
  status,
  paymentMethod,
  shippingAddress,
  items = [],
  subtotal,
  shippingCost,
  totalPrice,
}) => ({
  name: firstName,
  title: 'Order placed successfully',
  intro: [
    `Hi ${firstName},`,
    `Thank you for shopping with ${site.brandName}! We've received your order and will notify you when it moves to the next stage.`,
  ],
  dictionary: {
    'Order ID': `#${orderId}`,
    Status: status.charAt(0).toUpperCase() + status.slice(1),
    'Payment method': getPaymentMethodLabel(paymentMethod),
    'Shipping address': shippingAddress,
    Subtotal: formatPrice(subtotal),
    Shipping: formatPrice(shippingCost),
    Total: formatPrice(totalPrice),
  },
  table: items.length ? [{
    title: 'Order items',
    data: items.map((item) => ({
      Product: [
        item.product_name || `Product #${item.product_id}`,
        item.variant_label || item.variant_name,
      ].filter(Boolean).join(' - '),
      Qty: item.quantity,
      Price: formatPrice(item.totalPrice ?? item.unitPrice * item.quantity),
    })),
  }] : undefined,
  action: [{
    instructions: 'View your order details and track progress anytime.',
    button: [{
      color: site.primaryColor,
      text: 'View My Orders',
      link: site.ordersUrl,
    }],
  }],
  outro: [
    ...(paymentMethod === 'online'
      ? [
        'Payment status: Awaiting Payment',
        `Please transfer Rs. ${Number(totalPrice).toLocaleString('en-PK')} and upload your receipt from My Orders after payment.`,
        ...getOnlinePaymentInstructions(orderId, totalPrice),
      ]
      : []),
    'We will send you another email when your order status changes.',
    `Questions? Contact us at ${site.supportEmail} or call ${site.phoneDisplay}.`,
  ],
  signature: 'Orders Team',
});

module.exports = buildOrderConfirmationBody;
