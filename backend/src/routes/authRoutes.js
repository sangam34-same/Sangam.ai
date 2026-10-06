const express = require('express');
const authController = require('../controllers/authController');
const validateRequest = require('../middleware/validateRequest');
const { protect, verifyRefreshToken } = require('../middleware/auth');
const { authLimiter, passwordResetLimiter, bodySizeLimiter, strictSchemaValidation } = require('../middleware/rateLimiter');
const { registerValidator, loginValidator, forgotPasswordValidator, resetPasswordValidator, revokeSessionValidator } = require('../validators/authValidators');

const router = express.Router();

const registerFields = ['name', 'businessName', 'email', 'phone', 'password', 'confirmPassword', 'terms'];
const loginFields = ['email', 'password', 'rememberMe'];
const forgotPasswordFields = ['email'];
const resetPasswordFields = ['password', 'confirmPassword'];

router.post(
  '/register',
  authLimiter,
  bodySizeLimiter,
  registerValidator,
  validateRequest,
  strictSchemaValidation(registerFields),
  authController.register
);

router.post(
  '/login',
  authLimiter,
  bodySizeLimiter,
  loginValidator,
  validateRequest,
  strictSchemaValidation(loginFields),
  authController.login
);

router.post(
  '/logout',
  bodySizeLimiter,
  authController.logout
);

router.get(
  '/me',
  protect,
  authController.getMe
);

router.post(
  '/refresh',
  verifyRefreshToken,
  authController.refreshToken
);

router.post(
  '/refresh-token',
  verifyRefreshToken,
  authController.refreshToken
);

router.post(
  '/forgot-password',
  passwordResetLimiter,
  bodySizeLimiter,
  forgotPasswordValidator,
  validateRequest,
  strictSchemaValidation(forgotPasswordFields),
  authController.forgotPassword
);

router.post(
  '/reset-password/:token',
  bodySizeLimiter,
  resetPasswordValidator,
  validateRequest,
  strictSchemaValidation(resetPasswordFields),
  authController.resetPassword
);

router.delete(
  '/sessions',
  protect,
  authController.revokeSessions
);

router.delete(
  '/sessions/:sessionId',
  protect,
  revokeSessionValidator,
  validateRequest,
  authController.revokeSessions
);

module.exports = router;