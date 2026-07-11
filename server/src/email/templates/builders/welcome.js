const site = require('../siteConstants');

const buildWelcomeBody = ({ firstName }) => ({
  name: firstName,
  title: `Welcome to ${site.brandName}!`,
  intro: [
    `Hi ${firstName},`,
    `Thank you for creating an account on ${site.brandName}. You're now ready to shop Pakistan's trusted marketplace for great deals, fast delivery, and secure checkout.`,
  ],
  action: [{
    instructions: 'Start exploring our catalog and add your favourites to the cart.',
    button: [{
      color: site.primaryColor,
      text: 'Browse Products',
      link: site.productsUrl,
    }],
  }],
  outro: [
    'Track orders, manage your profile, and save items from your account dashboard.',
    `Need help? Visit our Help Center or contact ${site.supportEmail}.`,
  ],
  signature: 'The AHM Mart Team',
});

module.exports = buildWelcomeBody;
