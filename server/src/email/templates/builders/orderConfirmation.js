const site = require('../siteConstants');
const {
  getPaymentMethodLabel,
  getOnlinePaymentInstructions,
} = require('../../../libs/paymentMethods');

const formatPrice = (amount) => {
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

  title: '🎉 Your Order Has Been Placed Successfully!',

  intro: [
    `Hi ${firstName},`,
    `Thank you for shopping with ${site.brandName}! We've successfully received your order and it's now being processed.`,
    `We'll keep you updated by email as your order moves through each stage.`,
  ],

  dictionary: {
    'Order ID': `#${orderId}`,
    Status: status.charAt(0).toUpperCase() + status.slice(1),
    'Payment Method': getPaymentMethodLabel(paymentMethod),
    'Shipping Address': shippingAddress,

    Subtotal: formatPrice(subtotal),
    Shipping: formatPrice(shippingCost),
    'Grand Total': formatPrice(totalPrice),
  },

  table: items.length
    ? [
      {
        title: 'Order Items',
        data: items.map((item) => ({
          Product: [
            item.product_name || `Product #${item.product_id}`,
            item.variant_label || item.variant_name,
          ]
            .filter(Boolean)
            .join(' - '),

          Quantity: item.quantity,

          'Unit Price': formatPrice(item.unitPrice),

          'Item Total': formatPrice(
            item.totalPrice ?? item.unitPrice * item.quantity
          ),
        })),
      },
    ]
    : undefined,

  action: [
    {
      instructions:
        'You can view your order details and track its status anytime.',

      button: [
        {
          color: site.primaryColor,
          text: 'View My Orders',
          link: site.ordersUrl,
        },
      ],
    },
  ],

  outro: [
    ...(paymentMethod === 'online'
      ? [
        'Payment Status: Awaiting Payment',
        `Please transfer ${formatPrice(
          totalPrice
        )} and upload your payment receipt from the "My Orders" page once the payment has been completed.`,
        ...getOnlinePaymentInstructions(orderId, totalPrice),
      ]
      : []),

    'We\'ll send you another email as soon as your order status changes.',

    `If you have any questions, we're happy to help! Contact us at ${site.supportEmail} or call ${site.phoneDisplay}.`,
  ],

  signature: 'Orders Team',
});

module.exports = buildOrderConfirmationBody;