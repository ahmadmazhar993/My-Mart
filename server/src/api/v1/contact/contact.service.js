const { StatusCodes } = require('http-status-codes');
const { sendContactEmails } = require('../../../email/templates');

async function submitContactForm(req, res) {
  try {
    const { contactPayload } = req;
    const { adminResult, userResult } = await sendContactEmails(contactPayload);

    if (!adminResult.success || !userResult.success) {
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to send message. Please try again later.',
      });
    }

    return res.status(StatusCodes.OK).json({
      success: true,
      message: 'Your message has been sent successfully. We will contact you soon.',
    });
  } catch (err) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: err.message || 'Failed to send message. Please try again later.',
    });
  }
}

module.exports = { submitContactForm };
