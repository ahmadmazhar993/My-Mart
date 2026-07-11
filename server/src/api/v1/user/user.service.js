const HttpStatus = require('http-status-codes');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { validate } = require('uuid');
const db = require('../../../db');

const logger = require('../../../config/winston');
const activityLogger = require('../../../libs/activityLogger');
const { mapUser } = require('../../../libs/serializers');

const { PROFILE_PICTURE_DIR = 'uploads/profile_picture' } = process.env;

const getAllUsers = async (req, res, next) => {
  try {
    const { q } = req.query;
    let {
      search, pageNum, perPage, sortBy, order, offSet
    } = req.query;
    pageNum = (pageNum && pageNum !== 0 && pageNum !== '0' ? (pageNum * 1) - 1 : 0);
    perPage = (perPage && perPage !== 0 && perPage !== '0' ? (perPage * 1) : 10);
    offSet = offSet && !Number.isNaN(offSet * 1) ? (offSet * 1) : (pageNum * perPage);
    search = `%${search || ''}%`;
    let status = ['Active', 'inActive'];
    let rawWhere = [];
    if (q) {
      const multiQuery = q.split(',');
      multiQuery.map((singleQ) => {
        if (singleQ.toLowerCase() === 'active') {
          rawWhere.push('("user"."isActive" = true)');
        }
        if (singleQ.toLowerCase() === 'inActive') {
          status = ['inActive'];
          rawWhere.push('("user"."isActive" = false and "user"."status" = \'inActive\')');
        }
        return singleQ;
      });
    }
    if (search !== '%%') {
      rawWhere.push('(CONCAT("user"."firstName",\' \',"user"."lastName") ilike ? or "user"."email" ilike ? or "user"."phoneNumber" ilike ? or "accessTemplate"."name" ilike ?)');
    }

    rawWhere = rawWhere.join(' and ');

    if (sortBy) {
      switch (sortBy.toLowerCase()) {
        case 'first name':
          sortBy = 'user.firstName';
          break;
        case 'last name':
          sortBy = 'user.lastName';
          break;
        case 'email':
          sortBy = 'user.email';
          break;
        case 'phone number':
          sortBy = 'user.phoneNumber';
          break;
        default:
          sortBy = 'user.createdOn';
      }
    } else {
      sortBy = 'user.createdOn';
    }
    if (order) {
      switch (order.toLowerCase()) {
        case 'asc':
          order = 'asc';
          break;
        default:
          order = 'desc';
          break;
      }
    } else {
      order = 'desc';
    }
    const allUsers = await db('user')
      .select(
        'user.userID as id',
        db.raw('CONCAT(initcap("user"."firstName"),\' \', initcap("user"."lastName")) as "fullName"'),
        'user.email',
        'user.status',
        'user.createdOn',
        'accessTemplate.name as role',
        'user.phoneNumber'
      )
      .join('accessTemplate', 'user.accessTemplateID', '=', 'accessTemplate.accessTemplateID')
      .where((builder) => {
        // builder.whereIn('user.status', status);
        builder.where('isDeleted', false);
        if (rawWhere !== '') {
          builder.whereRaw(rawWhere, [search, search, search, search]);
        }
      })
      .groupBy('user.userID', 'accessTemplate.name')
      .orderBy(sortBy, order)
      .limit(perPage || 10)
      .offset(offSet);

    allUsers.map((users) => ['isDeleted', 'deletedBy'].forEach((e) => delete users[e]));
    const total = await db('user')
      .select(db.raw('cast(sum(count(distinct "user"."userID")) over() as int) total'))
      .join('accessTemplate', 'user.accessTemplateID', '=', 'accessTemplate.accessTemplateID')
      .where((builder) => {
        // builder.whereIn('user.status', status);
        builder.where('isDeleted', false);
        if (rawWhere !== '') {
          builder.whereRaw(rawWhere, [search, search, search, search]);
        }
      })
      .groupBy('user.userID', 'accessTemplate.type');

    req.allUsers = {
      data: allUsers,
      pagination: {
        total: (total.length > 0 && total[0].total) || 0,
        perPage: perPage || 10,
        pageNum: pageNum + 1
      }
    };
    return next();
  } catch (e) {
    logger.error(`[USER][Function::getAllUsers][Path::${req.path}][Method::${req.method}]::Exception::`, e);
    return res.status(HttpStatus.StatusCodes.INTERNAL_SERVER_ERROR).json({
      error: true,
      message: e
    });
  }
};

const getActiveUser = async (req, res, next) => {
  try {
    const user = await db('user').first('user.*', 'accessTemplate.name as role', 'accessTemplate.type as role_type')
      .join('accessTemplate', 'accessTemplate.accessTemplateID', '=', 'user.accessTemplateID')
      .where('user.userID', req.activeUser.userID)
      .where('user.isActive', true)
      .where('user.isDeleted', false);
    if (user) {
      req.user = user;
      req.isExisting = true;
    }
    return next();
  } catch (e) {
    logger.error(`[USER][Function::getActiveUser][Path::${req.path}][Method::${req.method}]::Exception::`, e);
    return res.status(HttpStatus.StatusCodes.INTERNAL_SERVER_ERROR).json({
      error: true,
      message: e
    });
  }
};

const getUserByEmail = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return next();
    }
    const user = await db('user').first('user.*', 'accessTemplate.name as role', 'accessTemplate.type as role_type')
      .join('accessTemplate', 'accessTemplate.accessTemplateID', '=', 'user.accessTemplateID')
      .whereRaw('lower("email") = ?', email.toLowerCase())
      .where('isDeleted', false);
    if (user) {
      req.userByEmail = user;
      req.isExisting = true;
    }
    return next();
  } catch (e) {
    logger.error(`[USER][Function::getUserByEmail][Path::${req.path}][Method::${req.method}]::Exception::`, e);
    return res.status(HttpStatus.StatusCodes.INTERNAL_SERVER_ERROR).json({
      error: true,
      message: e
    });
  }
};

const getUserById = async (req, res, next) => {
  try {
    const { userID } = req.params;
    if (!userID) {
      return next();
    }
    const user = await db('user').first('user.*', 'accessTemplate.name as role', 'accessTemplate.type as role_type')
      .join('accessTemplate', 'accessTemplate.accessTemplateID', '=', 'user.accessTemplateID')
      .where('user.userID', userID)
      .where('isDeleted', false);
    if (user) {
      req.userById = user;
      req.isExisting = true;
    }
    return next();
  } catch (e) {
    logger.error(`[USER][Function::getUserById][Path::${req.path}][Method::${req.method}]::Exception::`, e);
    return res.status(HttpStatus.StatusCodes.INTERNAL_SERVER_ERROR).json({
      error: true,
      message: e
    });
  }
};

const getUserProfilePicture = (req, res, next) => {
  try {
    const options = {
      root: path.join(__dirname, '../../../../', PROFILE_PICTURE_DIR),
      dotfiles: 'deny',
      headers: {
        'x-timestamp': Date.now(),
        'x-sent': true
      }
    };

    let fileName = null;

    if (req.userById) {
      fileName = req.userById.profilePicture;
    } else {
      fileName = req.activeUser.profilePicture;
    }

    if (fileName && fs.existsSync(path.join(options.root, '/', fileName))) {
      return res.sendFile(fileName, options, (err) => {
        if (err) {
          next(err);
        } else {
          console.log('Sent:', fileName);
        }
      });
    }

    return res.status(HttpStatus.StatusCodes.NO_CONTENT).json({
      error: true,
      message: 'User profile image not found'
    });
  } catch (e) {
    logger.error(`[USER][Function::getUserProfilePicture][Path::${req.path}][Method::${req.method}]::Exception::`, e);

    return res.status(HttpStatus.StatusCodes.INTERNAL_SERVER_ERROR).json({
      error: true,
      message: e
    });
  }
};

const createUser = async (req, res, next) => {
  try {
    const { userByEmail, createUserRequest, activeUser } = req;

    const user = activeUser;

    if (!createUserRequest) {
      logger.error(`[USER][Function::createUser][Path::${req.path}][Method::${req.method}]::Error::Required fields are missing`, createUserRequest);
      return res.status(HttpStatus.StatusCodes.BAD_REQUEST).json({
        error: true, message: 'Required fields are missing'
      });
    }

    if (userByEmail) {
      if (userByEmail.role_type === 'Admin') {
        if (req.isNewUserRequest) {
          return res.status(HttpStatus.StatusCodes.CONFLICT).json({
            error: true,
            message: `This User/Email is already exists with the "${userByEmail.role_type}" role`
          });
        }
      }

      req.newUser = [userByEmail];
      return next();
    }
    req.newUserTransaction = await db.transaction();
    const userRole = createUserRequest.accessTemplateID;
    req.userRole = userRole;

    const { accessTemplateID } = (await db('accessTemplate').first().where('name', userRole));

    createUserRequest.accessTemplateID = accessTemplateID;

    const newUser = await req.newUserTransaction('user').insert(createUserRequest, '*');
    logger.log('info', `[USER][Function::createUser][Path::${req.path}][Method::${req.method}]::newUser::Created successfully`, newUser);

    if (newUser.length > 0 && newUser[0].userID) {
      req.newUser = newUser;

      if (userRole === 'Admin') {
        await req.newUserTransaction.commit();

        activityLogger({
          targetEntity: 'Manage Users',
          action: 'Create',
          targetID: newUser[0].userID,
          description: `Created "${userRole}" user with name ${newUser[0].firstName} ${newUser[0].lastName} by ${activeUser.firstName} ${activeUser.lastName}`,
          userID: user.userID,
          req
        });

        return res.status(HttpStatus.StatusCodes.OK).json({ success: true, message: 'New user added successfully', default_branch: req.defaultBranch });
      }
      return next();
    }
    await req.newUserTransaction.rollback();
    return res.status(HttpStatus.StatusCodes.OK).json({ error: true, message: 'Unable to create the new user request' });
  } catch (e) {
    if (req.newUserTransaction) {
      await req.newUserTransaction.rollback();
    }

    logger.error(`[USER][Function::createUser][Path::${req.path}][Method::${req.method}]::Exception::`, e);
    return res.status(HttpStatus.StatusCodes.INTERNAL_SERVER_ERROR).json({
      error: true,
      message: e
    });
  }
};

const verifyCurrentPassword = async (req, res, next) => {
  try {
    const { activeUser, userUpdatePasswordRequest } = req;

    const user = await db('user')
      .first('userID')
      .where('userID', activeUser.userID)
      .where('isDeleted', false)
      .whereRaw('crypt(?, "password")="password"', [userUpdatePasswordRequest.oldPassword]);

    if (!user) {
      return res.status(HttpStatus.StatusCodes.UNAUTHORIZED).json({
        error: true,
        message: 'Current password is incorrect',
      });
    }

    req.userUpdatePasswordRequest = {
      password: userUpdatePasswordRequest.newPassword,
    };

    return next();
  } catch (e) {
    logger.error(`[USER][Function::verifyCurrentPassword][Path::${req.path}][Method::${req.method}]::Exception::`, e);
    return res.status(HttpStatus.StatusCodes.INTERNAL_SERVER_ERROR).json({
      error: true,
      message: e.message || e,
    });
  }
};

const updateUserWithAdmin = async (req, res, next) => {
  try {
    const {
      updateUserRequest, userById, userByEmail, activeUser
    } = req;

    if (!updateUserRequest) {
      logger.error(`[USER][Function::updateUserWithAdmin][Path::${req.path}][Method::${req.method}]::Error::Invalid user update request`);
      return res.status(HttpStatus.StatusCodes.BAD_REQUEST).json({
        error: true, message: 'Required fields are missing'
      });
    }

    if (userByEmail && userByEmail.userID !== userById.userID) {
      return res.status(HttpStatus.StatusCodes.CONFLICT).json({
        error: true,
        message: 'Email address already in use by another user'
      });
    }

    updateUserRequest.updatedOn = db.fn.now();

    const updateUser = await db('user').update(updateUserRequest, '*')
      .where('userID', userById.userID)
      .where('isDeleted', false);
    logger.log('info', `[USER][Function::updateUserWithAdmin][Path::${req.path}][Method::${req.method}]::updateUser::User updated successfully`, updateUser);
    if (updateUser.length > 0 && updateUser[0].userID) {
      activityLogger({
        targetEntity: 'Manage Users',
        action: 'Update',
        targetID: updateUser[0].userID,
        description: `Updated "${updateUser[0].firstName} ${updateUser[0].lastName}" user by ${activeUser.firstName} ${activeUser.lastName}`,
        userID: activeUser.userID
      });

      return next();
    }
    logger.error(`[USER][Function::updateUserWithAdmin][Path::${req.path}][Method::${req.method}]::updateUser::Error::Unable to update the user`, updateUser);
    return res.status(HttpStatus.StatusCodes.BAD_REQUEST).json({ error: true, message: 'Invalid User Id' });
  } catch (e) {
    logger.error(`[USER][Function::updateUserWithAdmin][Path::${req.path}][Method::${req.method}]::Exception::`, e);

    return res.status(HttpStatus.StatusCodes.INTERNAL_SERVER_ERROR).json({
      error: true,
      message: e
    });
  }
};


const updateUserPassword = async (req, res, next) => {
  try {
    if (req.params.userID && !validate(req.params.userID)) {
      return res.status(HttpStatus.StatusCodes.BAD_REQUEST).json({
        error: true,
        message: 'Invalid User Id'
      });
    }

    const { activeUser, userById, userUpdatePasswordRequest } = req;
    const user = userById || activeUser;

    userUpdatePasswordRequest.updatedOn = db.fn.now();

    const setUserPassword = await db('user')
      .update(userUpdatePasswordRequest, '*')
      .where('userID', user.userID)
      .where('isDeleted', false);

    if (setUserPassword.length > 0 && setUserPassword[0].userID) {
      activityLogger({
        targetEntity: 'Profile Management',
        action: 'Update',
        targetID: setUserPassword[0].userID,
        description: 'Updated password',
        userID: activeUser.userID,
        req
      });

      return next();
    }

    logger.error(`[USER][Function::updateUserPassword][Path::${req.path}][Method::${req.method}]::updateActiveUserPassword::Error::Unable to update the user password`, setUserPassword);
    return res.status(HttpStatus.StatusCodes.BAD_REQUEST).json({ error: true, message: 'Invalid User Id' });
  } catch (e) {
    logger.error(`[USER][Function::updateUserPassword][Path::${req.path}][Method::${req.method}]::Exception::`, e);

    return res.status(HttpStatus.StatusCodes.INTERNAL_SERVER_ERROR).json({
      error: true,
      message: e
    });
  }
};

const profilePictureStorage = multer.diskStorage({
  destination(req, file, callback) {
    if (!fs.existsSync(PROFILE_PICTURE_DIR)) {
      fs.mkdirSync(PROFILE_PICTURE_DIR, { recursive: true });
    }
    callback(null, PROFILE_PICTURE_DIR);
  },
  filename(req, file, callback) {
    req.userUpdateProfilePictureRequest.profilePictureName += path.extname(file.originalname);
    callback(null, req.userUpdateProfilePictureRequest.profilePictureName);
  }
});

const profilePictureFilter = (req, file, cb) => {
  if (['.jpg', '.jpeg', '.png'].indexOf((path.extname(file.originalname)).toLowerCase()) === -1) {
    req.profilePictureValidationError = 'Only JPG, JPEG, or PNG image file is allowed!';
    return cb(null, false);
  }
  return cb(null, true);
};

const uploadProfilePicture = multer({
  storage: profilePictureStorage,
  fileFilter: profilePictureFilter,
  limits: { fileSize: (2 * 1000 * 1000) }
}).single('profile_picture');

const updateProfilePicture = (req, res, next) => {
  try {
    return uploadProfilePicture(req, res, async (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(HttpStatus.StatusCodes.OK).json({
            error: true,
            message: 'The image is too large to update, The maximum allowable size for JPG, JPEG, or PNG image file is 2 MB'
          });
        }
        return res.status(HttpStatus.StatusCodes.OK).json({ error: true, message: err });
      }
      if (err) {
        return res.status(HttpStatus.StatusCodes.OK).json({
          error: true,
          message: err
        });
      }

      const { profilePictureValidationError, file } = req;

      if (profilePictureValidationError) {
        return res.status(HttpStatus.StatusCodes.OK).json({
          error: true,
          message: profilePictureValidationError
        });
      }

      if (!file) {
        return res.status(HttpStatus.StatusCodes.OK).json({
          error: true,
          message: 'Please select an image to updated'
        });
      }

      const updateUserProfilePicture = await db('user')
        .update({
          profilePicture: req.userUpdateProfilePictureRequest.profilePictureName,
          updatedOn: db.fn.now()
        }, '*')
        .where('userID', req.activeUser.userID)
        .where('isDeleted', false);

      if (updateUserProfilePicture.length > 0 && updateUserProfilePicture[0].userID) {
        activityLogger({
          targetEntity: 'Profile Management',
          action: 'Update',
          targetID: updateUserProfilePicture[0].userID,
          description: 'Updated profile image',
          userID: req.activeUser.userID,
          req
        });

        return next();
      }

      logger.error(`[USER][Function::updateProfilePicture][Path::${req.path}][Method::${req.method}]::updateUserProfilePicture::Error::Unable to update the user profile picture`, updateUserProfilePicture);

      return res.status(HttpStatus.StatusCodes.BAD_REQUEST).json({ error: true, message: 'Invalid User Id' });
    });
  } catch (e) {
    logger.error(`[USER][Function::updateProfilePicture][Path::${req.path}][Method::${req.method}]::Exception::`, e);

    return res.status(HttpStatus.StatusCodes.INTERNAL_SERVER_ERROR).json({
      error: true,
      message: e
    });
  }
};

const updateUserStatusWithAdmin = async (req, res) => {
  try {
    const { userID } = req.params;
    const { status } = req.body;

    if (!userID) {
      return res.status(400).json({
        success: false,
        message: 'Invalid User ID',
      });
    }

    const allowedStatuses = ['active', 'inactive', 'banned'];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status',
      });
    }

    const user = await db('user')
      .first('*')
      .where('userID', userID);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    if (user.email === 'admin@ahmmart.com') {
      return res.status(403).json({
        success: false,
        message: 'You cannot update AHM MART User',
      });
    }

    const isActive = status === 'active';

    const [updatedUser] = await db('user')
      .where('userID', userID)
      .update({
        status,
        isActive,
        updatedOn: db.fn.now(),
      })
      .returning('*');

    activityLogger({
      targetEntity: 'User Management',
      action: 'Update',
      targetID: userID,
      description: `Updated user status to ${status}`,
      userID: req.activeUser.userID,
      req
    });

    return res.status(200).json({
      success: true,
      message: 'User status updated successfully',
      data: updatedUser
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update user status',
    });
  }
};

const removeUserById = async (req, res, next) => {
  try {
    const { activeUser, userById } = req;

    if (userById.userID === activeUser.userID) {
      return res.status(HttpStatus.StatusCodes.UNAUTHORIZED).json({
        error: true,
        message: 'You cannot delete yourself'
      });
    }

    if (userById.email === 'admin@ahmmart.com') {
      return res.status(HttpStatus.StatusCodes.UNAUTHORIZED).json({
        error: true,
        message: 'You cannot delete AHM MART User'
      });
    }

    if (userById.email === 'demo@example.com') {
      return res.status(HttpStatus.StatusCodes.UNAUTHORIZED).json({
        error: true,
        message: 'You cannot delete App System User'
      });
    }

    const users = await db('user')
      .update({ isDeleted: true, isActive: false, deletedBy: activeUser.userID }, '*')
      .where('userID', req.params.userID)
      .where('isDeleted', false);

    if (users.length > 0 && users[0].userID) {
      activityLogger({
        targetEntity: 'Manage Users',
        action: 'Delete',
        targetID: users[0].userID,
        description: `Deleted "${users[0].firstName} ${users[0].lastName}" user by ${activeUser.firstName} ${activeUser.lastName}`,
        userID: activeUser.userID,
        req
      });

      return next();
    }

    return res.status(HttpStatus.StatusCodes.BAD_REQUEST).json({
      error: true,
      message: 'Invalid User Id'
    });
  } catch (e) {
    logger.error(`[USER][Function::removeUserById][Path::${req.path}][Method::${req.method}]::Exception::`, e);
    return res.status(HttpStatus.StatusCodes.INTERNAL_SERVER_ERROR).json({
      error: true,
      message: e
    });
  }
};

const sendUserResponse = (req, res) => {
  if (req.path === '/' && req.method === 'GET') {
    return res.status(HttpStatus.StatusCodes.OK).json(req.allUsers);
  }
  if (req.path === '/profile' && req.method === 'GET') {
    return res.status(HttpStatus.StatusCodes.OK).json({
      success: true,
      data: mapUser(req.user),
    });
  }
  if (req.path === '/update-password' && req.method === 'PUT') {
    return res.status(HttpStatus.StatusCodes.OK).json({ success: true, message: 'Your password updated successfully' });
  }
  if (req.path === '/update-preferences' && req.method === 'PUT') {
    return res.status(HttpStatus.StatusCodes.OK).json({
      success: true,
      message: 'Your profile updated successfully',
      data: mapUser(req.updatedUser),
    });
  }
  if (req.path === '/update-profile-picture' && req.method === 'PUT') {
    return res.status(HttpStatus.StatusCodes.OK).json({ success: true, message: 'Profile image updated successfully', path: req.file.path });
  }
  if (req.path === '/create' && req.method === 'POST') {
    return res.status(HttpStatus.StatusCodes.OK).json({ success: true, message: 'New user added successfully' });
  }
  if (req.path === `/${req.params.userID}` && req.method === 'GET') {
    return res.status(HttpStatus.StatusCodes.OK).json(req.userById || null);
  }
  if (req.path === `/${req.params.userID}` && req.method === 'DELETE') {
    return res.status(HttpStatus.StatusCodes.OK).json({ success: true, message: 'User deleted successfully' });
  }
  if (req.path === `/${req.params.userID}` && req.method === 'PATCH') {
    return res.status(HttpStatus.StatusCodes.OK).json({ success: true, message: 'User status updated successfully' });
  }
  if (req.path === `/overview/${req.params.userID}` && req.method === 'GET') {
    return res.status(HttpStatus.StatusCodes.OK).json(req.singleUserOverview);
  }
  if (req.path === `/approve-user-request/${req.params.userID}` && req.method === 'PUT') {
    return res.status(HttpStatus.StatusCodes.OK).json({ success: true, message: 'User updated successfully' });
  }
  if (req.path === `/manage-users/${req.params.userID}` && req.method === 'GET') {
    return res.status(HttpStatus.StatusCodes.OK).json(req.allUsers);
  }
  if (req.path === `/update-status/${req.params.userID}` && req.method === 'PUT') {
    return res.status(HttpStatus.StatusCodes.OK).json({ success: true, message: 'User status updated successfully' });
  }
  if (req.path === `/update-password/${req.params.userID}` && req.method === 'PUT') {
    return res.status(HttpStatus.StatusCodes.OK).json({ success: true, message: 'User password updated successfully' });
  }
  if (req.path === `/forgot-password/${req.params.userID}` && req.method === 'PUT') {
    return res.status(HttpStatus.StatusCodes.OK).json({ success: true, message: 'User password forgot link sent successfully' });
  }
  return res.status(HttpStatus.StatusCodes.OK).json({ error: true, message: 'API response object not found' });
};

module.exports = {
  getAllUsers,
  getActiveUser,
  getUserByEmail,
  getUserById,
  getUserProfilePicture,
  createUser,
  verifyCurrentPassword,
  updateUserWithAdmin,
  updateUserPassword,
  updateProfilePicture,
  updateUserStatusWithAdmin,
  removeUserById,
  sendUserResponse,
};
