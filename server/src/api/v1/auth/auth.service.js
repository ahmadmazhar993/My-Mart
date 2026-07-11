const { StatusCodes } = require('http-status-codes');
const jwt = require('jsonwebtoken');

const db = require('../../../db');
const logger = require('../../../config/winston');
const activityLogger = require('../../../libs/activityLogger');
const { sendWelcomeEmail, sendPasswordResetEmail } = require('../../../email/templates');
const { mapUser } = require('../../../libs/serializers');

const { NODE_ENV = 'development', TOKEN_SECRET_KEY = 'TokenSecretKey', CLIENT_URL = 'http://localhost:5173' } = process.env;

const getTokenCookieOptions = () => ({
  httpOnly: true,
  secure: NODE_ENV.toLowerCase() === 'production',
  sameSite: 'lax',
  path: '/',
});

const clearTokenCookie = (res) => res.clearCookie('token', getTokenCookieOptions());

const isAuthenticated = (req, res, next) => {
  try {
    let { token } = req.cookies;

    if (!token) {
      const authorizationHeader = req.headers.authorization;

      if (authorizationHeader) {
        token = authorizationHeader.split(' ').length === 2 ? authorizationHeader.split(' ')[1] : null;
      }
    }

    if (token) {
      return jwt.verify(token, TOKEN_SECRET_KEY, (err, decoded) => {
        if (err) {
          logger.log('info', `[AUTH][Function::isAuthenticated][Path::${req.path}][Method::${req.method}]::Error::Token verification failed. You are not authorized to perform this operation!`, err);
          if (err.name === 'TokenExpiredError') {
            return clearTokenCookie(res)
              .redirect('/?error=Token expired');
          }
          return clearTokenCookie(res)
            .redirect('/?error=Invalid token');
        }
        return db('user').first()
          .where('email', decoded.email)
          .where('isActive', true)
          .where('isDeleted', false)
          .then((user) => {
            if (!user) {
              logger.log('info', `[AUTH][Function::isAuthenticated][Path::${req.path}][Method::${req.method}]::Error::Token verification failed. No such user.Decoded::`, decoded);
              return res.status(StatusCodes.FORBIDDEN).json({ error: true, message: 'No such user' });
            }
            req.activeUser = user;
            if (decoded.isMustChange) {
              req.isMustChange = true;
            }
            if (decoded.isAdUser) {
              req.isAdUser = true;
            }
            if (decoded.isAzureUser) {
              req.isAzureUser = true;
            }
            return next();
          });
      });
    }
    logger.log('info', `[AUTH][Function::isAuthenticated][Path::${req.path}][Method::${req.method}]::Error::Authentication failed. No token provided.`);
    return res.status(StatusCodes.FORBIDDEN).json({
      error: true, message: 'No token provided'
    });
  } catch (e) {
    logger.error(`[AUTH][Function::isAuthenticated][Path::${req.path}][Method::${req.method}]::Exception::`, e);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      error: true,
      message: e
    });
  }
};

const register = async (req, res) => {
  try {
    if (req.userByEmail) {
      return res.status(StatusCodes.CONFLICT).json({
        error: true,
        message: 'An account with this email already exists',
      });
    }

    const { createUserRequest } = req;
    const roleRow = await db('accessTemplate').first('accessTemplateID').where('name', 'Customer');

    if (!roleRow) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        error: true,
        message: 'Customer role is not configured',
      });
    }

    createUserRequest.accessTemplateID = roleRow.accessTemplateID;

    const [newUser] = await db('user').insert(createUserRequest, '*');
    const user = newUser;

    if (user && user.email) {
      sendWelcomeEmail({
        email: user.email,
        firstName: user.firstName || 'Customer',
      }).catch((err) => {
        logger.error('[AUTH][register]::Failed to send welcome email', err);
      });
    } else {
      logger.error('[AUTH][register]::Cannot send welcome email, no recipient email provided', { user });
    }

    return res
      .status(StatusCodes.CREATED)
      .json({
        success: true,
        data: {
          user: mapUser(user)
        },
      });
  } catch (e) {
    logger.error(`[AUTH][Function::register][Path::${req.path}][Method::${req.method}]::Exception::`, e);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      error: true,
      message: e.message || e,
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await db('user')
      .first(
        'userID',
        'email',
        'firstName',
        'lastName',
        db.raw('CONCAT(initcap("user"."firstName"),\' \', initcap("user"."lastName")) as "fullName"'),
        db.raw('(select type from "accessTemplate" at where at."accessTemplateID" = ??) as "role"', ['user.accessTemplateID'])
      )
      .where('isActive', true)
      .where('isDeleted', false)
      .whereRaw('lower("email") = ?', email.toLowerCase())
      .whereRaw('crypt(?, "password")="password"', password);

    if (user) {
      const tokenPayload = {
        email: user.email.toLowerCase(),
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        role: user.role,
      };

      const token = jwt.sign(tokenPayload, TOKEN_SECRET_KEY, { expiresIn: '1d' });

      activityLogger({
        targetEntity: 'Auth',
        action: 'Login',
        targetID: user.userID,
        description: 'Login successfully',
        data: { email: user.email },
        userID: user.userID
      });

      return res
        .cookie('token', token, getTokenCookieOptions())
        .status(StatusCodes.OK)
        .json({
          success: true,
          token,
          data: {
            user: {
              userID: user.userID,
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName,
              fullName: user.fullName,
              role: user.role,
            }
          },
        });
    }

    logger.log('info', `[AUTH][Function::login][Path::${req.path}][Method::${req.method}]::Error::Invalid username or password.`);

    return res.status(StatusCodes.UNAUTHORIZED).json({
      error: true, message: 'Invalid username or password'
    });
  } catch (e) {
    logger.error(`[AUTH][Function::login][Path::${req.path}][Method::${req.method}]::Exception::`, e);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      error: true,
      message: e
    });
  }
};

const isAdmin = async (req, res, next) => {
  try {
    const roleRow = await db('accessTemplate')
      .first('type')
      .where('accessTemplateID', req.activeUser.accessTemplateID);

    if (!roleRow || roleRow.type !== 'Admin') {
      return res.status(StatusCodes.FORBIDDEN).json({
        success: false,
        message: 'Admin access required',
      });
    }

    return next();
  } catch (e) {
    logger.error(`[AUTH][Function::isAdmin][Path::${req.path}][Method::${req.method}]::Exception::`, e);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: e.message || e,
    });
  }
};

const logout = (req, res) => {
  activityLogger({
    targetEntity: 'Auth',
    action: 'Logout',
    targetID: req.activeUser.userID,
    description: 'Logout successfully',
    userID: req.activeUser.userID
  });

  return clearTokenCookie(res)
    .status(StatusCodes.OK)
    .json({
      success: true,
      message: 'Successfully logged out',
      redirectURL: null
    });
};

const createRecoverUserPasswordToken = async (req, res, next) => {
  try {
    const { email } = req.recoverPasswordRequest;

    const user = await db('user').first()
      .where('isActive', true)
      .where('isDeleted', false)
      .whereRaw('lower("email") = ?', email.toLowerCase());

    if (!user) {
      logger.log('info', `[AUTH][Function::createRecoverUserPasswordToken][Path::${req.path}][Method::${req.method}]::Error::No such user`, user);
      return res.status(StatusCodes.NOT_FOUND).json({
        error: true,
        message: 'No such user found'
      });
    }

    const updateRecoverPasswordToken = await db('user').update({ resetPasswordToken: db.raw('uuid_generate_v4()') }, '*')
      .where('userID', user.userID);
    if (updateRecoverPasswordToken[0].userID) {
      sendPasswordResetEmail({
        email: updateRecoverPasswordToken[0].email,
        firstName: updateRecoverPasswordToken[0].firstName,
        resetUrl: `${CLIENT_URL}/reset-password?token=${updateRecoverPasswordToken[0].resetPasswordToken}`,
      }).catch((err) => {
        logger.error('[AUTH][createRecoverUserPasswordToken]::Failed to send password reset email', err);
      });
      return next();
    }

    logger.log('info', `[AUTH][Function::createRecoverUserPasswordToken][Path::${req.path}][Method::${req.method}]::Error::Unable to update the user recover password token`, updateRecoverPasswordToken);
    return next();
  } catch (e) {
    logger.error(`[AUTH][Function::createRecoverUserPasswordToken][Path::${req.path}][Method::${req.method}]::Exception::`, e);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      error: true,
      message: e
    });
  }
};

const validateRecoverPasswordToken = async (req, res, next) => {
  try {
    const { token } = req.validateResetPasswordTokenRequest;

    const user = await db('user').first()
      .where('resetPasswordToken', token).where('isDeleted', false);

    if (!user) {
      logger.log('info', `[AUTH][Function::validateRecoverPasswordToken][Path::${req.path}][Method::${req.method}]::Error::No such user`, user);
      return res.status(StatusCodes.NOT_FOUND).json({ error: true, message: 'Forgot password token is not valid' });
    }
    return next();
  } catch (e) {
    logger.error(`[AUTH][Function::validateRecoverPasswordToken][Path::${req.path}][Method::${req.method}]::Exception::`, e);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      error: true,
      message: e
    });
  }
};

const updateNewPassword = async (req, res, next) => {
  try {
    const { token, password } = req.resetPasswordRequest;

    const user = await db('user')
      .where('resetPasswordToken', token)
      .where('isDeleted', false)
      .first();

    if (!user) {
      logger.log('info', `[AUTH][Function::updateNewPassword][Path::${req.path}][Method::${req.method}]::Error::No such user`, user);
      return res.status(StatusCodes.NOT_FOUND).json({ error: true, message: 'No such user' });
    }

    const updateUserPassword = await db('user').update({
      password,
      isActive: true,
      status: 'Active',
      resetPasswordToken: null,
      updatedOn: db.fn.now()
    }, '*')
      .where('resetPasswordToken', token);
    if (updateUserPassword[0].userID) {
      activityLogger({
        targetEntity: 'Auth',
        action: 'Update',
        targetID: user.userID,
        description: `${user.email} password updated successfully.`,
        userID: user.userID
      });
      return next();
    }

    logger.log('info', `[AUTH][Function::updateNewPassword][Path::${req.path}][Method::${req.method}]::Error::Unable to update the user password`, updateUserPassword);
    return res.status(StatusCodes.OK).json({ error: true, message: 'Unable to update the user password' });
  } catch (e) {
    logger.error(`[AUTH][Function::updateNewPassword][Path::${req.path}][Method::${req.method}]::Exception::`, e);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      error: true,
      message: e
    });
  }
};

const sendAuthResponse = (req, res) => {
  if (req.path === '/' && req.method === 'GET') {
    return res.status(StatusCodes.OK).json({
      success: true,
      data: {
        user: {
          userID: req.user.userID,
          email: req.user.email,
          firstName: req.user.firstName,
          lastName: req.user.lastName,
          fullName: `${req.user.firstName} ${req.user.lastName}`,
          role: req.user.role,
        }
      }
    });
  } if (req.path === '/access-request' && req.method === 'POST') {
    return res.status(StatusCodes.OK).json({
      success: true,
      message: 'Your Access Request is Submitted successfully'
    });
  } if (req.path === '/forgot-password' && req.method === 'POST') {
    return res.status(StatusCodes.OK).json({
      success: true,
      message: 'Password reset email sent successfully.'
    });
  } if (req.path === '/validate-token' && req.method === 'POST') {
    return res.status(StatusCodes.OK).json({
      success: true,
      message: 'Forgot password token is valid'
    });
  } if (req.path === '/update-password' && req.method === 'POST') {
    return res.status(StatusCodes.OK).json({
      success: true,
      message: 'Your password is updated successfully'
    });
  }
  return res.status(StatusCodes.OK).json({});
};

module.exports = {
  isAuthenticated,
  register,
  login,
  isAdmin,
  logout,
  createRecoverUserPasswordToken,
  validateRecoverPasswordToken,
  updateNewPassword,
  sendAuthResponse
};
