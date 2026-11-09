const express = require('express');

const router = express.Router();

const {
  isAuthenticated, login, logout, register, createRecoverUserPasswordToken,
  validateRecoverPasswordToken,
  updateNewPassword,
  sendAuthResponse,
  googleRedirect,
  googleCallback,
  verifyEmail,
  verifyEmailCheck,
  resendVerification,
} = require('./auth.service');
const {
  validateRegisterForm,
  validateLoginForm, validateRecoverPasswordForm,
  validateResetPasswordForm, validateResetPasswordTokenValidationForm,
  validateEmailVerificationForm,
  validateResendVerificationForm,
} = require('./auth.validation');
const { getActiveUser, getUserByEmail } = require('../user/user.service');
const {
  loginLimiter, registerLimiter, passwordResetLimiter, verificationLimiter,
} = require('../../../libs/rateLimiters');

router
  .route('/')
  .get(isAuthenticated, getActiveUser, sendAuthResponse);

router
  .route('/login')
  .post(loginLimiter, validateLoginForm, login);

// Google OAuth
router.get('/google', googleRedirect);
router.get('/google/callback', googleCallback);

router
  .route('/register')
  .post(registerLimiter, validateRegisterForm, getUserByEmail, register);

router
  .route('/verify-email')
  .post(verificationLimiter, validateEmailVerificationForm, verifyEmail, sendAuthResponse);

router
  .route('/verify-email/check')
  .get(verifyEmailCheck);

router
  .route('/resend-verification')
  .post(verificationLimiter, validateResendVerificationForm, resendVerification);

router
  .route('/logout')
  .get(isAuthenticated, logout);

// Create a password forgot request
router
  .route('/forgot-password')
  .post(
    passwordResetLimiter,
    validateRecoverPasswordForm,
    createRecoverUserPasswordToken,
    sendAuthResponse,
  );

// Verify the password set/forgot token
router
  .route('/validate-token')
  .post(
    passwordResetLimiter,
    validateResetPasswordTokenValidationForm,
    validateRecoverPasswordToken,
    sendAuthResponse,
  );

// Update user password with set/rest password token
router
  .route('/update-password')
  .post(passwordResetLimiter, validateResetPasswordForm, updateNewPassword, sendAuthResponse);

module.exports = router;
