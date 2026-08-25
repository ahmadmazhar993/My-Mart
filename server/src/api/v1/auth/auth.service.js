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
const isSseRequest = (req) => req.headers.accept?.includes('text/event-stream') || req.path.includes('/events');

const isApiRequest = (req) => req.path?.startsWith('/api/') || req.headers.accept?.includes('application/json') || req.headers['x-requested-with'] === 'XMLHttpRequest';

const sendAuthFailure = (req, res, message = 'Authentication failed') => {
  if (isSseRequest(req) || isApiRequest(req)) {
    return res.status(StatusCodes.UNAUTHORIZED).json({ error: true, message });
  }

  return res.status(StatusCodes.FORBIDDEN).json({ error: true, message });
};

const isAuthenticated = (req, res, next) => {
  try {
    let { token } = req.cookies;

    if (!token && req.query?.token) {
      token = req.query.token;
    }

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
          clearTokenCookie(res);
          if (err.name === 'TokenExpiredError') {
            return isSseRequest(req) || isApiRequest(req)
              ? res.status(StatusCodes.UNAUTHORIZED).json({ error: true, message: 'Token expired' })
              : res.redirect('/?error=Token expired');
          }
          return isSseRequest(req) || isApiRequest(req)
            ? res.status(StatusCodes.UNAUTHORIZED).json({ error: true, message: 'Invalid token' })
            : res.redirect('/?error=Invalid token');
        }
        return db('user').first()
          .where('email', decoded.email)
          .where('isActive', true)
          .where('isDeleted', false)
          .then((user) => {
            if (!user) {
              logger.log('info', `[AUTH][Function::isAuthenticated][Path::${req.path}][Method::${req.method}]::Error::Token verification failed. No such user.Decoded::`, decoded);
              return sendAuthFailure(req, res, 'No such user');
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
    return sendAuthFailure(req, res, 'No token provided');
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

    return res.status(StatusCodes.BAD_REQUEST).json({
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
  // include token from cookie or authorization header when available
  const tokenFromCookie = req.cookies?.token || null;
  let tokenFromHeader = null;
  if (req.headers.authorization) {
    const parts = req.headers.authorization.split(' ');
    if (parts.length === 2) tokenFromHeader = parts[1];
  }
  const token = tokenFromCookie || tokenFromHeader || null;

  if (req.path === '/' && req.method === 'GET') {
    const resp = {
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
    };
    if (token) resp.token = token;
    return res.status(StatusCodes.OK).json(resp);
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
    const baseResponse = {};
    if (token) baseResponse.token = token;
    return res.status(StatusCodes.OK).json(baseResponse);
};

// --- Google OAuth handlers ---
const googleRedirect = (req, res) => {
  const { GOOGLE_CLIENT_ID, HOST_PATH = 'http://localhost:5000', CLIENT_URL = 'http://localhost:5173' } = process.env;
  if (!GOOGLE_CLIENT_ID) return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: 'Google client ID not configured' });

  const redirectUri = `${HOST_PATH.replace(/\/+$/, '')}/api/v1/auth/google/callback`;
  const state = req.query.redirect ? encodeURIComponent(req.query.redirect) : '';
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'consent',
    state,
  });

  const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  return res.redirect(url);
};

const googleCallback = async (req, res) => {
  try {
    const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, HOST_PATH = 'http://localhost:5000', CLIENT_URL = 'http://localhost:5173', TOKEN_SECRET_KEY = 'TokenSecretKey' } = process.env;
    const { code, state } = req.query;
    if (!code) return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: 'Missing code' });
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: 'Google OAuth not configured' });

    const tokenUrl = 'https://oauth2.googleapis.com/token';
    const redirectUri = `${HOST_PATH.replace(/\/+$/, '')}/api/v1/auth/google/callback`;

    const tokenRes = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }).toString(),
    });

    if (!tokenRes.ok) {
      const txt = await tokenRes.text();
      return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: `Failed to exchange code: ${txt}` });
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    // Fetch userinfo
    const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!userInfoRes.ok) {
      const txt = await userInfoRes.text();
      return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: `Failed to fetch user info: ${txt}` });
    }

    const profile = await userInfoRes.json();
    const email = profile.email && String(profile.email).toLowerCase();
    if (!email) return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: 'Google account has no email' });

    // Find or create user
    let user = await db('user').first().whereRaw('lower(email) = ?', email.toLowerCase());
    if (!user) {
      // assign Customer role
      const roleRow = await db('accessTemplate').first('accessTemplateID').where('name', 'Customer');
      const createObj = {
        firstName: profile.given_name || profile.name || 'Customer',
        lastName: profile.family_name || '',
        email,
        accessTemplateID: roleRow ? roleRow.accessTemplateID : null,
        password: null,
        isActive: true,
        status: 'Active',
      };
      const rows = await db('user').insert(createObj, '*');
      user = rows && rows[0] ? rows[0] : null;
    } else {
      // ensure active
      if (!user.isActive) {
        await db('user').where({ userID: user.userID }).update({ isActive: true, status: 'Active', updatedOn: db.fn.now() });
      }
    }

    if (!user) return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Unable to create or find user' });

    const tokenPayload = {
      email: user.email.toLowerCase(),
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: `${user.firstName} ${user.lastName}`,
      role: (await db('accessTemplate').first('type').where('accessTemplateID', user.accessTemplateID))?.type || 'Customer',
    };

    const token = jwt.sign(tokenPayload, TOKEN_SECRET_KEY, { expiresIn: '1d' });

    // set cookie and either return a backend JSON response (when state==='backend')
    // or redirect to client (optionally include state as redirect path)
    const decodedState = state ? decodeURIComponent(state) : '';
    // set token cookie
    res.cookie('token', token, getTokenCookieOptions());

    if (decodedState === 'backend') {
      return res.status(StatusCodes.OK).json({ message: 'Welcome to AHM-Mart API Server' });
    }

    const redirectTo = decodedState || CLIENT_URL;
    return res.redirect(redirectTo || CLIENT_URL);
  } catch (err) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: err.message || 'Google OAuth failed' });
  }
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
  ,
  googleRedirect,
  googleCallback
};
