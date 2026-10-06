function getEnv(key, defaultValue = undefined) {
  const value = process.env[key];
  if (value === undefined || value === '') {
    if (defaultValue !== undefined) return defaultValue;
    if (process.env.NODE_ENV === 'test') return `test-${key}`;
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function getEnvInt(key, defaultValue) {
  const value = getEnv(key, String(defaultValue));
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) throw new Error(`Invalid integer for ${key}: ${value}`);
  return parsed;
}

function getEnvBool(key, defaultValue = false) {
  const value = getEnv(key, String(defaultValue)).toLowerCase();
  return value === 'true' || value === '1';
}

const isProduction = getEnvBool('NODE_ENV') === true || process.env.NODE_ENV === 'production';
const isDevelopment = !isProduction;
const isTest = process.env.NODE_ENV === 'test';

module.exports = {
  getEnv,
  getEnvInt,
  getEnvBool,
  isProduction,
  isDevelopment,
  isTest,
  port: getEnvInt('PORT', 5000),
  mongoUri: getEnv('MONGO_URI', isTest ? 'mongodb://localhost:27017/test' : undefined),
  jwt: {
    accessSecret: getEnv('JWT_ACCESS_SECRET', isTest ? 'test-access-secret-min-32-chars-long' : undefined),
    refreshSecret: getEnv('JWT_REFRESH_SECRET', isTest ? 'test-refresh-secret-min-32-chars-long' : undefined),
    accessExpire: getEnv('JWT_ACCESS_EXPIRE', '15m'),
    refreshExpire: getEnv('JWT_REFRESH_EXPIRE', '7d'),
    issuer: getEnv('JWT_ISSUER', 'sangam.ai'),
    audience: getEnv('JWT_AUDIENCE', 'sangam.ai'),
  },
  cookie: {
    secret: getEnv('COOKIE_SECRET', isTest ? 'test-cookie-secret-min-32-chars-long' : undefined),
  },
  frontendUrl: getEnv('FRONTEND_URL', 'http://localhost:5173'),
  rateLimit: {
    windowMs: getEnvInt('RATE_LIMIT_WINDOW_MS', 900000),
    maxRequests: getEnvInt('RATE_LIMIT_MAX_REQUESTS', 100),
    authMax: getEnvInt('AUTH_RATE_LIMIT_MAX', 5),
    accountLockThreshold: getEnvInt('ACCOUNT_LOCK_THRESHOLD', 10),
    accountLockDurationMs: getEnvInt('ACCOUNT_LOCK_DURATION_MS', 1800000),
    resetRateLimitMax: getEnvInt('RESET_RATE_LIMIT_MAX', 3),
    resetRateLimitWindowMs: getEnvInt('RESET_RATE_LIMIT_WINDOW_MS', 3600000),
  },
  password: {
    bcryptSaltRounds: getEnvInt('BCRYPT_SALT_ROUNDS', 12),
    minLength: getEnvInt('MIN_PASSWORD_LENGTH', 12),
    accountLockThreshold: getEnvInt('ACCOUNT_LOCK_THRESHOLD', 10),
    resetToken: {
      expireMs: getEnvInt('RESET_TOKEN_EXPIRE_MS', 900000),
    },
  },
  resetToken: {
    expireMs: getEnvInt('RESET_TOKEN_EXPIRE_MS', 900000),
    rateLimitMax: getEnvInt('RESET_RATE_LIMIT_MAX', 3),
    rateLimitWindowMs: getEnvInt('RESET_RATE_LIMIT_WINDOW_MS', 3600000),
  },
  email: {
    host: getEnv('EMAIL_HOST', isTest ? 'localhost' : undefined),
    port: getEnvInt('EMAIL_PORT', 587),
    user: getEnv('EMAIL_USER', isTest ? 'test@example.com' : undefined),
    password: getEnv('EMAIL_PASSWORD', isTest ? 'test-password' : undefined),
    from: getEnv('EMAIL_FROM', 'noreply@sangam.ai'),
  },
  redis: {
    url: getEnv('REDIS_URL', 'redis://localhost:6379'),
  },
  logLevel: getEnv('LOG_LEVEL', 'info'),
};