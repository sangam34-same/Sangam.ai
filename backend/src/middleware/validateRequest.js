const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');
const { redactLogData } = require('../utils/redact');

function validateRequest(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((e) => ({
      field: e.path,
      message: e.msg,
    }));
    console.warn('Validation failed', redactLogData({ ip: req.ip, path: req.path, errors: formattedErrors }));
    throw ApiError.badRequest('Validation failed', formattedErrors);
  }
  next();
}

module.exports = validateRequest;