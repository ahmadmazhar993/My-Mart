const site = require('../siteConstants');

const STATUS_MESSAGES = {
  pending: 'Your order is pending confirmation from our team.',
  confirmed: 'Great news! Your order has been confirmed and is being prepared.',
  processing: 'Your order is now being processed and packed for shipment.',
  shipped: 'Your order is on its way! Our delivery partner will contact you soon.',
  delivered: 'Your order has been delivered. We hope you enjoy your purchase!',
  cancelled: 'Your order has been cancelled. If you did not request this, please contact support.',
};

const buildOrderStatusUpdateBody = ({ firstName, orderId, status, previousStatus }) => ({
  name: firstName,
  title: 'Order status updated',
  intro: [
    `Hi ${firstName},`,
    STATUS_MESSAGES[status] || `Your order status has been updated to "${status}".`,
  ],
  dictionary: {
    'Order ID': `#${orderId}`,
    'Previous status': previousStatus
      ? previousStatus.charAt(0).toUpperCase() + previousStatus.slice(1)
      : '—',
    'Current status': status.charAt(0).toUpperCase() + status.slice(1),
  },
  action: [{
    instructions: 'Check your order dashboard for full details and tracking information.',
    button: [{
      color: site.primaryColor,
      text: 'Track Order',
      link: site.ordersUrl,
    }],
  }],
  outro: [
    `Need assistance with order #${orderId}? Reach us at ${site.supportEmail}.`,
    `Hotline: ${site.phoneDisplay} (Mon – Sat, 9 AM – 9 PM PKT)`,
  ],
  signature: 'Orders Team',
});

module.exports = buildOrderStatusUpdateBody;
