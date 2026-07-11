const express = require('express');
const rateLimit = require('express-rate-limit');

const { submitContactForm } = require('./contact.service');
const { validateContactForm } = require('./contact.validation');

const router = express.Router();

const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many contact requests. Please try again in 15 minutes.',
  },
});

router.post('/', contactLimiter, validateContactForm, submitContactForm);

module.exports = router;
