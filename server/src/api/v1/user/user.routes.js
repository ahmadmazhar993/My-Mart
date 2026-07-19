const express = require('express');

const router = express.Router();

const { isAuthenticated } = require('../auth/auth.service');

const {
  getAllUsers,
  getActiveUser,
  getUserByEmail,
  getUserById,
  getUserProfilePicture,
  createUser,
  updateProfilePicture,
  verifyCurrentPassword,
  updateUserPassword,
  updateUserWithAdmin,
  updateUserPreferences,
  updateUserStatusWithAdmin,
  removeUserById,
  sendUserResponse,
} = require('./user.service');
const {
  validateCreateUserForm,
  validateUpdateProfilePictureForm,
  validateUpdateUserWithAdminForm,
  validateUserStatusWithAdminForm,
  validateUpdatePasswordForm,
  validateUpdatePreferencesForm,
} = require('./user.validation');

router
  .route('/')
  .get(isAuthenticated, getAllUsers, sendUserResponse);

router
  .route('/profile')
  .get(isAuthenticated, getActiveUser, sendUserResponse);

router
  .route('/update-preferences')
  .put(
    isAuthenticated,
    validateUpdatePreferencesForm,
    updateUserPreferences,
    sendUserResponse,
  );

router
  .route('/update-password')
  .put(
    isAuthenticated,
    validateUpdatePasswordForm,
    verifyCurrentPassword,
    updateUserPassword,
    sendUserResponse,
  );

router
  .route('/update-profile-picture')
  .put(isAuthenticated, validateUpdateProfilePictureForm, updateProfilePicture, sendUserResponse);

router
  .route('/create')
  .post(
    isAuthenticated,
    validateCreateUserForm,
    getUserByEmail,
    createUser,
    sendUserResponse,
  );

router
  .route('/get-profile-picture')
  .get(isAuthenticated, getUserProfilePicture);

router
  .route('/:userID')
  .get(isAuthenticated, getUserById, sendUserResponse)
  .put(
    getUserById,
    validateUpdateUserWithAdminForm,
    getUserByEmail,
    updateUserWithAdmin
  )
  .patch(
    getUserById,
    validateUserStatusWithAdminForm,
    updateUserStatusWithAdmin,
    sendUserResponse
  )
  .delete(
    isAuthenticated,
    getUserById,
    removeUserById,
    sendUserResponse,
  );

module.exports = router;
