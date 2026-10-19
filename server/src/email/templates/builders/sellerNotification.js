const site = require('../siteConstants');

// One generic, plain seller notification (new order, return request, payout update).
const buildSellerNotificationBody = ({
  shopName, title, lines = [], dictionary, buttonText, link,
}) => ({
  name: shopName,
  title,
  intro: [`Hi ${shopName},`, ...lines],
  dictionary,
  action: link ? [{
    instructions: 'Open the Seller Centre to review the details.',
    button: [{ color: site.primaryColor, text: buttonText || 'Open Seller Centre', link }],
  }] : undefined,
  outro: [
    'You can turn these emails off any time in Store settings.',
    `Questions? Contact ${site.supportEmail}.`,
  ],
  signature: 'Seller Support',
});

module.exports = buildSellerNotificationBody;
