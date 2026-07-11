const site = require('../siteConstants');

const buildContactAcknowledgementBody = ({ name, message }) => ({
  name,
  title: 'We received your message',
  intro: [
    `Hi ${name},`,
    'Thank you for contacting AHM Mart. Our support team has received your message and will get back to you shortly.',
  ],
  dictionary: {
    'Your message': message,
    'Response time': 'Within 24 hours on business days',
    'Support hours': 'Monday – Saturday, 9 AM – 9 PM PKT',
  },
  action: [{
    instructions: 'While you wait, you may find answers in our Help Center.',
    button: [{
      color: site.primaryColor,
      text: 'Visit Help Center',
      link: site.helpUrl,
    }],
  }],
  outro: [
    `For urgent order issues, call us at ${site.phoneDisplay}.`,
    `Email: ${site.supportEmail}`,
  ],
  signature: 'AHM Mart Support Team',
});

module.exports = buildContactAcknowledgementBody;
