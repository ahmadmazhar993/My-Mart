const site = require('../siteConstants');
const { getPaymentMethodLabel } = require('../../../libs/paymentMethods');

const formatPrice = (amount) => `Rs. ${Number(amount || 0).toLocaleString('en-PK')}`;

const buildAdminCreatedOrderBody = ({
  firstName, orderId, status, paymentMethod, shippingAddress, items = [], subtotal, shippingCost, totalPrice,
}) => ({
  name: firstName,
  title: `Your order has been created by ${site.brandName}`,
  intro: [
    `Hi ${firstName},`,
    `Our team has created the following order for your ${site.brandName} account.`,
    'Please review the details below. You can track the order and receive future status updates from your account.',
  ],
  dictionary: {
    'Order ID': `#${orderId}`,
    Status: status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Pending',
    'Payment Method': getPaymentMethodLabel(paymentMethod),
    'Shipping Address': shippingAddress || '—',
    Subtotal: formatPrice(subtotal),
    Shipping: formatPrice(shippingCost),
    'Grand Total': formatPrice(totalPrice),
  },
  table: items.length ? [{
    title: 'Order Items',
    data: items.map((item) => ({
      Product: [item.product_name || `Product #${item.product_id}`, item.variant_label || item.variant_name]
        .filter(Boolean).join(' - '),
      Quantity: item.quantity,
      'Unit Price': formatPrice(item.unitPrice),
      'Item Total': formatPrice(item.totalPrice ?? item.unitPrice * item.quantity),
    })),
  }] : undefined,
  action: [{
    instructions: 'View the order and its latest status from your account.',
    button: [{ color: site.primaryColor, text: 'View My Orders', link: site.ordersUrl }],
  }],
  outro: [
    'We will email you when the order status changes.',
    `For questions, contact us at ${site.supportEmail} or call ${site.phoneDisplay}.`,
  ],
  signature: 'Orders Team',
});

module.exports = buildAdminCreatedOrderBody;