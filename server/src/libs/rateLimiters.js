const rateLimit = require('express-rate-limit');

const build = (windowMinutes, max, message) => rateLimit({
  windowMs: windowMinutes * 60 * 1000,
  max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message },
});

// Brute-force protection for the unauthenticated auth endpoints.
module.exports = {
  loginLimiter: build(15, 20, 'Too many login attempts. Please try again in 15 minutes.'),
  registerLimiter: build(60, 10, 'Too many sign-up attempts. Please try again later.'),
  passwordResetLimiter: build(15, 5, 'Too many password reset requests. Please try again in 15 minutes.'),
  verificationLimiter: build(15, 10, 'Too many verification requests. Please try again in 15 minutes.'),
};
