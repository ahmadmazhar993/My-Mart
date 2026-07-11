const site = require('../siteConstants');

const buildContactAdminBody = ({ name, email, message }) => ({
  name,
  title: 'New contact form submission',
  intro: [
    'A customer has submitted a message through the AHM Mart contact page.',
    'Please review the details below and respond as soon as possible.',
  ],
  dictionary: {
    Name: name,
    Email: email,
    Message: message,
  },
  action: [{
    instructions: 'You can reply directly to the customer using their email address.',
    button: [{
      color: site.primaryColor,
      text: `Reply to ${name}`,
      link: `mailto:${email}?subject=Re: Your AHM Mart inquiry`,
    }],
  }],
  outro: [
    `Support inbox: ${site.supportEmail}`,
    `Submitted via ${site.contactUrl}`,
  ],
  signature: 'AHM Mart Notifications',
});

module.exports = buildContactAdminBody;
