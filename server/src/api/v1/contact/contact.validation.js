const { StatusCodes } = require('http-status-codes');

const isEmailValid = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return email && email.length <= 254 && emailRegex.test(email);
};

function validateContactForm(req, res, next) {
  const { name, email, message } = req.body;

  if (!name?.trim() || !email?.trim() || !message?.trim()) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      message: 'Name, email, and message are required',
    });
  }

  if (!isEmailValid(email.trim())) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      message: 'Enter a valid email address',
    });
  }

  if (message.trim().length < 10) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      message: 'Message must be at least 10 characters',
    });
  }

  if (message.trim().length > 5000) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      message: 'Message is too long (max 5000 characters)',
    });
  }

  req.contactPayload = {
    name: name.trim(),
    email: email.trim().toLowerCase(),
    message: message.trim(),
  };

  return next();
}

module.exports = { validateContactForm };
