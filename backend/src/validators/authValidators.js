const { body, param } = require('express-validator');

const registerValidator = [
  body('name')
    .notEmpty().withMessage('Name is required')
    .trim()
    .isLength({ max: 100 }).withMessage('Name cannot exceed 100 characters')
    .custom((value) => !/<script/i.test(value)).withMessage('Name contains invalid characters'),
  body('businessName')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Business name cannot exceed 100 characters'),
  body('email')
    .isEmail().withMessage('Valid email is required')
    .normalizeEmail()
    .trim(),
  body('phone')
    .optional()
    .trim()
    .matches(/^\+[1-9]\d{1,14}$/).withMessage('Phone must be in E.164 format (e.g., +15551234567)'),
  body('password')
    .notEmpty().withMessage('Password is required'),
  body('confirmPassword')
    .notEmpty().withMessage('Confirm password is required'),
  body('terms')
    .isBoolean().withMessage('Terms must be accepted')
    .custom((value) => value === true).withMessage('You must accept the terms and conditions'),
];

const loginValidator = [
  body('email')
    .isEmail().withMessage('Valid email is required')
    .normalizeEmail()
    .trim(),
  body('password')
    .notEmpty().withMessage('Password is required'),
  body('rememberMe')
    .optional()
    .isBoolean().withMessage('rememberMe must be a boolean'),
];

const forgotPasswordValidator = [
  body('email')
    .isEmail().withMessage('Valid email is required')
    .normalizeEmail()
    .trim(),
];

const resetPasswordValidator = [
  param('token')
    .notEmpty().withMessage('Reset token is required')
    .isLength({ min: 64, max: 64 }).withMessage('Invalid token format'),
  body('password')
    .notEmpty().withMessage('New password is required'),
  body('confirmPassword')
    .notEmpty().withMessage('Confirm password is required')
    .custom((value, { req }) => value === req.body.password).withMessage('Passwords do not match'),
];

const revokeSessionValidator = [
  param('sessionId')
    .optional()
    .isMongoId().withMessage('Invalid session ID'),
];

module.exports = {
  registerValidator,
  loginValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
  revokeSessionValidator,
};