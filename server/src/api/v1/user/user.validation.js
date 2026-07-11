const HttpStatus = require('http-status-codes');
const { validate } = require('uuid');
const logger = require('../../../config/winston');

const isEmailValid = (email) => {
  const emailRegex = /^[-!#$%&'*+/0-9=?A-Z^_a-z{|}~](\.?[-!#$%&'*+/0-9=?A-Z^_a-z`{|}~])*@[a-zA-Z0-9](-*\.?[a-zA-Z0-9])*\.[a-zA-Z](-?[a-zA-Z0-9])+$/;

  if (!email) { return false; }

  if (email.length > 254) { return false; }

  const valid = emailRegex.test(email);
  if (!valid) { return false; }

  // Further checking of some things regex can't handle
  const parts = email.split('@');
  if (parts[0].length > 64) { return false; }

  const domainParts = parts[1].split('.');
  if (domainParts.some((part) => part.length > 63)) { return false; }

  return true;
};

const validateUpdatePasswordForm = (req, res, next) => {
  try {
    const {
      old_password,
      current_password,
      new_password,
      confirm_password,
      must_change,
    } = req.body;

    const currentPassword = current_password || old_password;

    if (!currentPassword || !new_password || !confirm_password) {
      return res.status(HttpStatus.StatusCodes.BAD_REQUEST).json({
        error: true,
        message: 'Current password, new password, and confirm password are required',
      });
    }

    if (new_password.length < 6) {
      return res.status(HttpStatus.StatusCodes.BAD_REQUEST).json({
        error: true,
        message: 'New password must be at least 6 characters',
      });
    }

    if (typeof must_change !== 'undefined' && typeof must_change !== 'boolean') {
      return res.status(HttpStatus.StatusCodes.BAD_REQUEST).json({
        error: true,
        message: 'Must Change field should be true/false',
      });
    }

    if (new_password !== confirm_password) {
      return res.status(HttpStatus.StatusCodes.BAD_REQUEST).json({
        error: true,
        message: 'The new and confirm passwords do not match',
      });
    }

    req.userUpdatePasswordRequest = {
      oldPassword: currentPassword,
      newPassword: new_password,
      isMustChange: must_change,
    };

    return next();
  } catch (e) {
    logger.error(`[USER-VALIDATION][Function::validateUpdatePasswordForm][Path::${req.path}][Method::${req.method}]::Exception::`, e);
    return res.status(HttpStatus.StatusCodes.INTERNAL_SERVER_ERROR).json({
      error: true,
      message: e,
    });
  }
};

const validateUpdatePreferencesForm = (req, res, next) => {
  try {
    const {
      first_name, last_name, phone, phone_number, address, city, postal_code,
    } = req.body;

    if (!first_name || !last_name) {
      return res.status(HttpStatus.StatusCodes.BAD_REQUEST).json({
        error: true,
        message: 'First name and last name are required',
      });
    }

    req.updateUserRequest = {
      firstName: first_name.trim(),
      lastName: last_name.trim(),
      phoneNumber: (phone_number || phone || '').trim() || null,
      address: address?.trim() || null,
      city: city?.trim() || null,
      postalCode: postal_code?.trim() || null,
    };

    return next();
  } catch (e) {
    logger.error(`[USER-VALIDATION][Function::validateUpdatePreferencesForm][Path::${req.path}][Method::${req.method}]::Exception::`, e);
    return res.status(HttpStatus.StatusCodes.INTERNAL_SERVER_ERROR).json({
      error: true,
      message: e,
    });
  }
};

const validateUpdateProfilePictureForm = (req, res, next) => {
  try {
    if (req.params.userID && !validate(req.params.userID)) {
      return res.status(HttpStatus.StatusCodes.BAD_REQUEST).json({
        error: true,
        message: 'Invalid User Id'
      });
    }

    req.userUpdateProfilePictureRequest = {
      profilePictureName: req.params.userID || req.activeUser.userID
    };

    return next();
  } catch (e) {
    logger.error(`[USER-VALIDATION][Function::validateUpdateProfilePictureForm][Path::${req.path}][Method::${req.method}]::Exception::`, e);
    return res.status(HttpStatus.StatusCodes.INTERNAL_SERVER_ERROR).json({
      error: true,
      message: e
    });
  }
};

const validateCreateUserForm = (req, res, next) => {
  try {
    const { activeUser } = req;
    const {
      firstName, lastName, email, phoneNumber,
      accessTemplate, role, password, Status
    } = req.body;

    if (!firstName || !lastName || !email || !accessTemplate) {
      return res.status(HttpStatus.StatusCodes.BAD_REQUEST).json({
        error: true,
        message: 'Required fields are missing'
      });
    }

    if (!isEmailValid(email)) {
      return res.status(HttpStatus.StatusCodes.BAD_REQUEST).json({
        error: true,
        message: 'Enter a valid email address'
      });
    }

    req.createUserRequest = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim().toLowerCase(),
      password: password,
      phoneNumber: phoneNumber && phoneNumber.trim(),
      accessTemplateID: role.trim(),
      status: Status || 'Pending',
      isActive: true,
      createdBy: activeUser.userID
    };

    req.isNewUserRequest = true;

    return next();
  } catch (e) {
    logger.error(`[USER-VALIDATION][Function::validateCreateUserForm][Path::${req.path}][Method::${req.method}]::Exception::`, e);
    return res.status(HttpStatus.StatusCodes.INTERNAL_SERVER_ERROR).json({
      error: true,
      message: e
    });
  }
};

const validateUserStatusWithAdminForm = (req, res, next) => {
  try {
    const { is_active } = req.body;

    if (typeof is_active === 'undefined' || is_active === null || typeof is_active !== 'boolean') {
      return res.status(HttpStatus.StatusCodes.BAD_REQUEST).json({
        error: true,
        message: 'Required fields are missing'
      });
    }

    req.updateUserStatusRequest = {
      isActive: is_active,
      status: is_active ? 'Active' : 'Deactivated'
    };

    return next();
  } catch (e) {
    logger.error(`[USER-VALIDATION][Function::validateUserStatusWithAdminForm][Path::${req.path}][Method::${req.method}]::Exception::`, e);
    return res.status(HttpStatus.StatusCodes.INTERNAL_SERVER_ERROR).json({
      error: true,
      message: e
    });
  }
};

const validateUpdatePasswordWithAdminForm = (req, res, next) => {
  try {
    const { new_password } = req.body;

    if (!new_password) {
      return res.status(HttpStatus.StatusCodes.BAD_REQUEST).json({
        error: true,
        message: 'Required fields are missing'
      });
    }

    req.userUpdatePasswordRequest = {
      newPassword: new_password
    };

    return next();
  } catch (e) {
    logger.error(`[USER-VALIDATION][Function::validateUpdatePasswordWithAdminForm][Path::${req.path}][Method::${req.method}]::Exception::`, e);
    return res.status(HttpStatus.StatusCodes.INTERNAL_SERVER_ERROR).json({
      error: true,
      message: e
    });
  }
};

const validateUpdateUserWithAdminForm = (req, res, next) => {
  try {
    const {
      first_name, last_name, email, phone_number,
      access_template, role
    } = req.body;

    let { userRolesLookup } = req;
    const { userById } = req;
    const user = userById;

    if (!first_name || !last_name || !email || !access_template) {
      return res.status(HttpStatus.StatusCodes.BAD_REQUEST).json({
        error: true,
        message: 'Required fields are missing'
      });
    }

    if (!isEmailValid(email)) {
      return res.status(HttpStatus.StatusCodes.BAD_REQUEST).json({
        error: true,
        message: 'Enter a valid email address'
      });
    }

    userRolesLookup = userRolesLookup.map((roles) => roles.type);

    if (userRolesLookup && userRolesLookup.indexOf(access_template) === -1) {
      return res.status(HttpStatus.StatusCodes.BAD_REQUEST).json({
        error: true,
        message: 'Invalid access template'
      });
    }

    if (user.roleName !== role) {
      req.isRoleUpdated = true;
    } else {
      req.isRoleUpdated = false;
    }

    req.updateUserRequest = {
      firstName: first_name.trim(),
      lastName: last_name.trim(),
      email: email.trim().toLowerCase(),
      phoneNumber: phone_number && phone_number.trim(),
      accessTemplateID: role.trim()
    };

    req.isUpdateUserRequest = true;

    return next();
  } catch (e) {
    logger.error(`[USER-VALIDATION][Function::validateUpdateUserWithAdminForm][Path::${req.path}][Method::${req.method}]::Exception::`, e);
    return res.status(HttpStatus.StatusCodes.INTERNAL_SERVER_ERROR).json({
      error: true,
      message: e
    });
  }
};

module.exports = {
  validateUpdatePasswordForm,
  validateUpdateProfilePictureForm,
  validateCreateUserForm,
  validateUpdatePasswordWithAdminForm,
  validateUserStatusWithAdminForm,
  validateUpdateUserWithAdminForm,
  validateUpdatePreferencesForm,
};
