const site = require('../siteConstants');

const buildPaymentFailureBody = ({
  firstName,
  orderId,
  orderCode,
  failureMessage,
}) => ({
  name: firstName,
  title: 'Payment failed',
  intro: [
    `Hi ${firstName},`,
    `Unfortunately, your payment for order #${orderCode || orderId} could not be completed.`,
    failureMessage ? `Reason: ${failureMessage}` : 'Please try again or choose a different payment method.',
  ],
  dictionary: {
    'Order ID': `#${orderCode || orderId}`,
    Status: 'Payment failed',
  },
  action: [{
    instructions: 'Please retry payment or contact support if you need help.',
    button: [{
      color: site.primaryColor,
      text: 'View My Orders',
      link: site.ordersUrl,
    }],
  }],
  outro: [
    'If you need assistance, our support team is ready to help.',
    `Contact us at ${site.supportEmail} or call ${site.phoneDisplay}.`,
  ],
  signature: 'Payments Team',
});

module.exports = buildPaymentFailureBody;
