const HttpStatus = require('http-status-codes');
const logger = require('../../../config/winston');

const isEmailValid = (email) => {
  const emailRegex = /^[-!#$%&'*+/0-9=?A-Z^_a-z{|}~](\.?[-!#$%&'*+/0-9=?A-Z^_a-z`{|}~])*@[a-zA-Z0-9](-*\.?[a-zA-Z0-9])*\.[a-zA-Z](-?[a-zA-Z0-9])+$/;

  if (!email || email.length > 254) return false;
  if (!emailRegex.test(email)) return false;

  const parts = email.split('@');
  if (parts[0].length > 64) return false;

  const domainParts = parts[1].split('.');
  if (domainParts.some((part) => part.length > 63)) return false;

  return true;
};

const validateLoginForm = (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(HttpStatus.StatusCodes.BAD_REQUEST).json({
        error: true,
        message: 'Email or password missing',
      });
    }

    if (!isEmailValid(email)) {
      return res.status(HttpStatus.StatusCodes.BAD_REQUEST).json({
        error: true,
        message: 'Enter a valid email address',
      });
    }

    return next();
  } catch (e) {
    logger.error('AuthValidation::validateLoginForm::Exception::', e);
    return res.status(HttpStatus.StatusCodes.INTERNAL_SERVER_ERROR).json({
      error: true,
      message: e.message || e,
    });
  }
};

const validateRegisterForm = (req, res, next) => {
  try {
    const {
      first_name, last_name, firstName, lastName, email, password, confirm_password: confirmPassword,
    } = req.body;

    const resolvedFirstName = (first_name || firstName || '').trim();
    const resolvedLastName = (last_name || lastName || '').trim();
    const resolvedEmail = (email || '').trim().toLowerCase();

    if (!resolvedFirstName || !resolvedEmail || !password) {
      return res.status(HttpStatus.StatusCodes.BAD_REQUEST).json({
        error: true,
        message: 'Required fields are missing',
      });
    }

    if (!isEmailValid(resolvedEmail)) {
      return res.status(HttpStatus.StatusCodes.BAD_REQUEST).json({
        error: true,
        message: 'Enter a valid email address',
      });
    }

    if (password.length < 6) {
      return res.status(HttpStatus.StatusCodes.BAD_REQUEST).json({
        error: true,
        message: 'Password must be at least 6 characters',
      });
    }

    if (confirmPassword && password !== confirmPassword) {
      return res.status(HttpStatus.StatusCodes.BAD_REQUEST).json({
        error: true,
        message: 'Passwords do not match',
      });
    }

    req.createUserRequest = {
      firstName: resolvedFirstName,
      lastName: resolvedLastName || resolvedFirstName,
      email: resolvedEmail,
      password,
      accessTemplateID: 'Customer',
      status: 'Active',
      isActive: true,
      isEnabled: true,
    };

    return next();
  } catch (e) {
    logger.error('AuthValidation::validateRegisterForm::Exception::', e);
    return res.status(HttpStatus.StatusCodes.INTERNAL_SERVER_ERROR).json({
      error: true,
      message: e.message || e,
    });
  }
};

const validateResetPasswordForm = (req, res, next) => {
  try {
    const { token, new_password, confirm_new_password } = req.body;

    if (!token || !new_password || !confirm_new_password) {
      return res.status(HttpStatus.StatusCodes.BAD_REQUEST).json({
        error: true,
        message: 'Required fields are missing'
      });
    }

    if (new_password !== confirm_new_password) {
      return res.status(HttpStatus.StatusCodes.BAD_REQUEST).json({
        error: true,
        message: 'New password and Confirm new password does not match'
      });
    }

    req.resetPasswordRequest = { token, password: new_password };

    return next();
  } catch (e) {
    logger.error('AuthValidation::validateResetPasswordForm::Exception::', e);
    return res.status(HttpStatus.StatusCodes.INTERNAL_SERVER_ERROR).json({
      error: true,
      message: e
    });
  }
};

const validateRecoverPasswordForm = (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email || !isEmailValid(email)) {
      return res.status(HttpStatus.StatusCodes.BAD_REQUEST).json({
        error: true,
        message: 'Enter a valid email address'
      });
    }

    req.recoverPasswordRequest = { email };

    return next();
  } catch (e) {
    logger.error('AuthValidation::validateRecoverPasswordForm::Exception::', e);
    return res.status(HttpStatus.StatusCodes.INTERNAL_SERVER_ERROR).json({
      error: true,
      message: e
    });
  }
};

const validateResetPasswordTokenValidationForm = (req, res, next) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(HttpStatus.StatusCodes.BAD_REQUEST).json({
        error: true,
        message: 'Please provide a valid token'
      });
    }

    req.validateResetPasswordTokenRequest = { token };

    return next();
  } catch (e) {
    logger.error('AuthValidation::validateResetPasswordTokenValidationForm::Exception::', e);
    return res.status(HttpStatus.StatusCodes.INTERNAL_SERVER_ERROR).json({
      error: true,
      message: e
    });
  }
};

module.exports = {
  validateLoginForm,
  validateRegisterForm,
  validateResetPasswordForm,
  validateRecoverPasswordForm,
  validateResetPasswordTokenValidationForm,
};
