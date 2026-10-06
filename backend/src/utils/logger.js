const pino = require('pino');
const { isProduction, isTest } = require('../config/env');

const sensitiveFields = new Set([
  'password',
  'confirmPassword',
  'newPassword',
  'currentPassword',
  'token',
  'accessToken',
  'refreshToken',
  'resetToken',
  'authorization',
  'cookie',
  'set-cookie',
  'x-csrf-token',
]);

const sensitivePatterns = [
  /password/i,
  /token/i,
  /secret/i,
  /key/i,
  /auth/i,
  /credential/i,
];

function redactObject(obj, depth = 0) {
  if (depth > 10) return '[Max Depth]';
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(item => redactObject(item, depth + 1));

  const redacted = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    const isSensitive = sensitiveFields.has(lowerKey) ||
      sensitivePatterns.some(pattern => pattern.test(key));

    if (isSensitive) {
      redacted[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      redacted[key] = redactObject(value, depth + 1);
    } else {
      redacted[key] = value;
    }
  }
  return redacted;
}

function maskEmail(email) {
  if (!email || typeof email !== 'string') return email;
  const [local, domain] = email.split('@');
  if (!domain) return email;
  const maskedLocal = local.length > 2
    ? local[0] + '*'.repeat(local.length - 2) + local[local.length - 1]
    : '***';
  return `${maskedLocal}@${domain}`;
}

function createLogger() {
  const transport = isTest || isProduction
    ? undefined
    : {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      };

  const logger = pino({
    level: process.env.LOG_LEVEL || 'info',
    transport,
    formatters: {
      bindings: (bindings) => ({
        ...bindings,
        pid: undefined,
        hostname: undefined,
      }),
    },
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'req.body.password',
        'req.body.confirmPassword',
        'req.body.newPassword',
        'req.body.currentPassword',
        'req.body.token',
        'req.body.refreshToken',
        'req.body.resetToken',
        'res.headers["set-cookie"]',
        '*.password',
        '*.token',
        '*.secret',
        '*.key',
      ],
      censor: '[REDACTED]',
    },
  });

  return {
    logger,
    info: (obj, msg) => logger.info(redactObject(obj), msg),
    warn: (obj, msg) => logger.warn(redactObject(obj), msg),
    error: (obj, msg) => logger.error(redactObject(obj), msg),
    debug: (obj, msg) => logger.debug(redactObject(obj), msg),
    authEvent: (event, data) => {
      const logData = {
        event,
        timestamp: new Date().toISOString(),
        ...data,
        email: data.email ? maskEmail(data.email) : undefined,
      };
      logger.info(logData, `Auth event: ${event}`);
    },
  };
}

module.exports = createLogger();