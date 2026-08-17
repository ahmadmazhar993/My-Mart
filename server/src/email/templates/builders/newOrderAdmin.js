const site = require('../siteConstants');

const formatPrice = (amount) => {
  return `Rs. ${Number(amount).toLocaleString('en-PK')}`;
};

const buildNewOrderAdminBody = ({
  customerName,
  customerEmail,
  orderId,
  status,
  paymentMethod,
  shippingAddress,
  items = [],
  subtotal,
  shippingCost,
  totalPrice,
}) => ({
  name: 'Admin',
  title: `🛒 New Order Received — #${orderId}`,
  intro: [
    `A new order has been placed on ${site.brandName}.`,
    `Customer: ${customerName || '—'} (${customerEmail || '—'})`,
    `Order ID: #${orderId}`,
  ],
  dictionary: {
    Status: status ? (status.charAt(0).toUpperCase() + status.slice(1)) : '—',
    'Payment Method': paymentMethod || '—',
    'Shipping Address': shippingAddress || '—',
    Subtotal: formatPrice(subtotal || 0),
    Shipping: formatPrice(shippingCost || 0),
    'Grand Total': formatPrice(totalPrice || 0),
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
          'Item Total': formatPrice(item.totalPrice ?? item.unitPrice * item.quantity),
        })),
      },
    ]
    : undefined,
  action: [
    {
      instructions: 'View the order in the admin panel to process it.',
      button: [
        {
          color: site.primaryColor,
          text: 'View Orders',
          link: site.ordersUrl,
        },
      ],
    },
  ],
  outro: [
    `This is an automated notification from ${site.brandName}.`,
  ],
  signature: 'Orders Team',
});

module.exports = buildNewOrderAdminBody;
