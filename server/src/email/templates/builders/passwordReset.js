const site = require('../siteConstants');

const buildPasswordResetBody = ({ firstName, resetUrl }) => ({
  name: firstName || 'Customer',
  title: 'Reset your password',
  intro: [
    `Hi ${firstName || 'Customer'},`,
    'We received a request to reset your password for your AHM Mart account.',
  ],
  action: [{
    instructions: 'Click the button below to choose a new password.',
    button: [{
      color: site.primaryColor,
      text: 'Reset Password',
      link: resetUrl,
    }],
  }],
  outro: [
    'If you did not request this, you can safely ignore this email.',
    'The link will expire soon for your security.',
  ],
  signature: 'The AHM Mart Team',
});

module.exports = buildPasswordResetBody;
