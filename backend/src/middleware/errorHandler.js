const { isProduction, isTest } = require('../config/env');
const { redactLogData } = require('../utils/redact');
const ApiError = require('../utils/ApiError');
const uuid = require('uuid');
const { v4: uuidv4 } = uuid;

function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Server error';
  let errors = err.errors || undefined;

  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue)[0];
    message = `${field} already exists`;
  }

  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((e) => e.message)
      .join(', ');
    errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
  }

  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Not authorized, token failed';
  }

  if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid resource ID';
  }

  if (err.message?.includes('CORS')) {
    statusCode = 403;
    message = 'CORS policy violation';
  }

  const correlationId = req.correlationId || req.headers['x-correlation-id'] || uuidv4();

  console.error('Request error', redactLogData({
    correlationId,
    ip: req.ip,
    path: req.path,
    method: req.method,
    statusCode,
    message,
    stack: isProduction || isTest ? undefined : err.stack,
  }));

  const response = {
    success: false,
    message,
    ...(errors && { errors }),
    ...(isProduction ? {} : { correlationId }),
  };

  res.status(statusCode).json(response);
}

module.exports = errorHandler;