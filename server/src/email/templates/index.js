const { sendEmail } = require('..');
const site = require('./siteConstants');
const buildContactAdminBody = require('./builders/contactAdmin');
const buildContactAcknowledgementBody = require('./builders/contactAcknowledgement');
const buildWelcomeBody = require('./builders/welcome');
const buildOrderConfirmationBody = require('./builders/orderConfirmation');
const buildOrderStatusUpdateBody = require('./builders/orderStatusUpdate');
const buildPaymentSuccessBody = require('./builders/paymentSuccess');
const buildPaymentFailureBody = require('./builders/paymentFailure');
const buildPasswordResetBody = require('./builders/passwordReset');
const buildEmailVerificationBody = require('./builders/emailVerification');
const buildNewOrderAdminBody = require('./builders/newOrderAdmin');

async function sendContactEmails({ name, email, message }) {
  const adminResult = await sendEmail({
    to: site.contactToEmail,
    subject: `New contact message from ${name}`,
    body: buildContactAdminBody({ name, email, message }),
  });

  const userResult = await sendEmail({
    to: email,
    subject: 'We received your message – AHM Mart',
    body: buildContactAcknowledgementBody({ name, message }),
  });

  return { adminResult, userResult };
}

async function sendWelcomeEmail({ email, firstName }) {
  return sendEmail({
    to: email,
    subject: `Welcome to ${site.brandName}!`,
    body: buildWelcomeBody({ firstName }),
  });
}

async function sendOrderConfirmationEmail({
  email,
  firstName,
  orderId,
  status,
  paymentMethod,
  shippingAddress,
  items,
  subtotal,
  shippingCost,
  totalPrice,
}) {
  return sendEmail({
    to: email,
    subject: `Order #${orderId} confirmed – AHM Mart`,
    body: buildOrderConfirmationBody({
      firstName,
      orderId,
      status,
      paymentMethod,
      shippingAddress,
      items,
      subtotal,
      shippingCost,
      totalPrice,
    }),
  });
}

async function sendOrderStatusEmail({
  email,
  firstName,
  orderId,
  status,
  previousStatus,
}) {
  return sendEmail({
    to: email,
    subject: `Order #${orderId} is now ${status} – AHM Mart`,
    body: buildOrderStatusUpdateBody({
      firstName,
      orderId,
      status,
      previousStatus,
    }),
  });
}

async function sendPaymentSuccessEmail({
  email,
  firstName,
  orderId,
  orderCode,
  amount,
  paymentMethod,
  shippingAddress,
}) {
  return sendEmail({
    to: email,
    subject: `Payment successful for order #${orderCode || orderId} – AHM Mart`,
    body: buildPaymentSuccessBody({
      firstName,
      orderId,
      orderCode,
      amount,
      paymentMethod,
      shippingAddress,
    }),
  });
}

async function sendPaymentFailureEmail({
  email,
  firstName,
  orderId,
  orderCode,
  failureMessage,
}) {
  return sendEmail({
    to: email,
    subject: `Payment failed for order #${orderCode || orderId} – AHM Mart`,
    body: buildPaymentFailureBody({
      firstName,
      orderId,
      orderCode,
      failureMessage,
    }),
  });
}

async function sendPasswordResetEmail({ email, firstName, resetUrl }) {
  return sendEmail({
    to: email,
    subject: 'Reset your AHM Mart password',
    body: buildPasswordResetBody({ firstName, resetUrl }),
  });
}

async function sendVerificationEmail({ email, firstName, verifyUrl }) {
  return sendEmail({
    to: email,
    subject: 'Verify your AHM Mart email address',
    body: buildEmailVerificationBody({ firstName, verifyUrl }),
  });
}

async function sendAdminNewOrderEmail({
  customerName,
  customerEmail,
  orderId,
  status,
  paymentMethod,
  shippingAddress,
  items,
  subtotal,
  shippingCost,
  totalPrice,
}) {
  const site = require('./siteConstants');
  return sendEmail({
    to: site.contactToEmail,
    subject: `New order received — #${orderId}`,
    body: buildNewOrderAdminBody({
      customerName,
      customerEmail,
      orderId,
      status,
      paymentMethod,
      shippingAddress,
      items,
      subtotal,
      shippingCost,
      totalPrice,
    }),
  });
}

module.exports = {
  sendContactEmails,
  sendWelcomeEmail,
  sendOrderConfirmationEmail,
  sendOrderStatusEmail,
  sendPaymentSuccessEmail,
  sendPaymentFailureEmail,
  sendPasswordResetEmail,
  sendAdminNewOrderEmail,
  sendVerificationEmail,
};
