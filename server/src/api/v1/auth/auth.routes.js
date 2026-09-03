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

router
  .route('/')
  .get(isAuthenticated, getActiveUser, sendAuthResponse);

router
  .route('/login')
  .post(validateLoginForm, login);

// Google OAuth
router.get('/google', googleRedirect);
router.get('/google/callback', googleCallback);

router
  .route('/register')
  .post(validateRegisterForm, getUserByEmail, register);

router
  .route('/verify-email')
  .post(validateEmailVerificationForm, verifyEmail, sendAuthResponse);

router
  .route('/verify-email/check')
  .get(verifyEmailCheck);

router
  .route('/resend-verification')
  .post(validateResendVerificationForm, resendVerification);

router
  .route('/logout')
  .get(isAuthenticated, logout);

// Create a password forgot request
router
  .route('/forgot-password')
  .post(validateRecoverPasswordForm, createRecoverUserPasswordToken, sendAuthResponse);

// Verify the password set/forgot token
router
  .route('/validate-token')
  .post(validateResetPasswordTokenValidationForm, validateRecoverPasswordToken, sendAuthResponse);

// Update user password with set/rest password token
router
  .route('/update-password')
  .post(validateResetPasswordForm, updateNewPassword, sendAuthResponse);

module.exports = router;
