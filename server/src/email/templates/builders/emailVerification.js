const site = require('../siteConstants');

const buildEmailVerificationBody = ({ firstName, verifyUrl }) => ({
  name: firstName || 'Customer',
  title: 'Verify your email address',
  intro: [
    `Hi ${firstName || 'Customer'},`,
    'Thanks for creating an account with AHM Mart. Please verify your email address by clicking the button below.',
  ],
  action: [{
    instructions: 'Click the button below to verify your email address.',
    button: [{
      color: site.primaryColor,
      text: 'Verify Email',
      link: verifyUrl,
    }],
  }],
  outro: [
    'If you did not create an account, you can ignore this email.',
  ],
  signature: 'The AHM Mart Team',
});

module.exports = buildEmailVerificationBody;
