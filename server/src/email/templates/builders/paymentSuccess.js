const site = require('../siteConstants');
const { getPaymentMethodLabel } = require('../../../libs/paymentMethods');

const formatPrice = (amount) => `Rs. ${Number(amount).toLocaleString('en-PK')}`;

const buildPaymentSuccessBody = ({
  firstName,
  orderId,
  orderCode,
  amount,
  paymentMethod,
  shippingAddress,
}) => ({
  name: firstName,
  title: 'Payment received successfully',
  intro: [
    `Hi ${firstName},`,
    `Good news! Your payment for order #${orderCode || orderId} has been received successfully. We’re now processing your order.`,
  ],
  dictionary: {
    'Order ID': `#${orderCode || orderId}`,
    Amount: formatPrice(amount),
    'Payment method': getPaymentMethodLabel(paymentMethod),
    'Shipping address': shippingAddress || 'Not provided',
  },
  action: [{
    instructions: 'You can view your order details and track status from your account.',
    button: [{
      color: site.primaryColor,
      text: 'View My Orders',
      link: site.ordersUrl,
    }],
  }],
  outro: [
    'We will notify you again once the order is confirmed.',
    `If you have any questions, reach out at ${site.supportEmail} or call ${site.phoneDisplay}.`,
  ],
  signature: 'Payments Team',
});

module.exports = buildPaymentSuccessBody;
