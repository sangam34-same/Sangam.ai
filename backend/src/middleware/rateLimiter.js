const rateLimit = require('express-rate-limit');
const { rateLimit: rateLimitConfig } = require('../config/env');
const { redactLogData } = require('../utils/redact');

let RedisStore;
try {
  RedisStore = require('rate-limit-redis');
} catch {
  RedisStore = null;
}

function createRateLimiter(options) {
  const store = options.useRedis && RedisStore && process.env.REDIS_URL
    ? new RedisStore({
        sendCommand: (...args) => require('redis').createClient({ url: process.env.REDIS_URL }).sendCommand(args),
      })
    : undefined;

  if (options.useRedis && !store) {
    console.warn('Redis store not available for rate limiting, using in-memory store');
  }

  return rateLimit({
    windowMs: options.windowMs || rateLimitConfig.windowMs,
    max: options.max || rateLimitConfig.maxRequests,
    standardHeaders: true,
    legacyHeaders: false,
    store,
    keyGenerator: options.keyGenerator || ((req) => req.ip),
    skip: options.skip,
    handler: (req, res) => {
      console.warn('Rate limit exceeded', redactLogData({ ip: req.ip, path: req.path }));
      res.status(429).json({
        success: false,
        message: options.message || 'Too many requests, please try again later',
      });
    },
  });
}

const globalLimiter = createRateLimiter({
  windowMs: rateLimitConfig.windowMs,
  max: rateLimitConfig.maxRequests,
  skip: (req) => req.path === '/api/health',
});

const authLimiter = createRateLimiter({
  windowMs: rateLimitConfig.windowMs,
  max: rateLimitConfig.authMax,
  keyGenerator: (req) => `${req.ip}:${req.body?.email || 'unknown'}`,
  message: 'Too many authentication attempts, please try again later',
});

const passwordResetLimiter = createRateLimiter({
  windowMs: rateLimitConfig.resetRateLimitWindowMs,
  max: rateLimitConfig.resetRateLimitMax,
  keyGenerator: (req) => `${req.ip}:${req.body?.email || 'unknown'}`,
  message: 'Too many password reset requests, please try again later',
});

const bodySizeLimiter = (req, res, next) => {
  const contentLength = parseInt(req.headers['content-length'] || '0', 10);
  const maxSize = 10 * 1024;
  if (contentLength > maxSize) {
    console.warn('Request body too large', redactLogData({ ip: req.ip, contentLength, path: req.path }));
    return res.status(413).json({ success: false, message: 'Request body too large' });
  }
  next();
};

const strictSchemaValidation = (allowedFields) => (req, res, next) => {
  const unexpectedFields = Object.keys(req.body).filter((key) => !allowedFields.includes(key));
  if (unexpectedFields.length > 0) {
    console.warn('Unexpected fields in request', redactLogData({ ip: req.ip, unexpectedFields, path: req.path }));
    return res.status(400).json({
      success: false,
      message: 'Invalid request: unexpected fields',
      errors: unexpectedFields.map((f) => ({ field: f, message: 'Unexpected field' })),
    });
  }
  next();
};

module.exports = {
  globalLimiter,
  authLimiter,
  passwordResetLimiter,
  bodySizeLimiter,
  strictSchemaValidation,
  createRateLimiter,
};