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
  'passwordHash',
  'passwordResetToken',
  'emailVerificationToken',
]);

const sensitivePatterns = [
  /password/i,
  /token/i,
  /secret/i,
  /key/i,
  /auth/i,
  /credential/i,
];

function isSensitiveKey(key) {
  const lowerKey = key.toLowerCase();
  return sensitiveFields.has(lowerKey) || sensitivePatterns.some((pattern) => pattern.test(key));
}

function maskEmail(email) {
  if (!email || typeof email !== 'string') return email;
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  const maskedLocal = local.length > 2
    ? local[0] + '*'.repeat(local.length - 2) + local[local.length - 1]
    : '***';
  return `${maskedLocal}@${domain}`;
}

function maskIp(ip) {
  if (!ip) return ip;
  const parts = ip.split('.');
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.*.${parts[3]}`;
  }
  return ip;
}

function redactObject(obj, depth = 0) {
  if (depth > 10) return '[Max Depth]';
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map((item) => redactObject(item, depth + 1));

  const redacted = {};
  for (const [key, value] of Object.entries(obj)) {
    if (isSensitiveKey(key)) {
      redacted[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      redacted[key] = redactObject(value, depth + 1);
    } else {
      redacted[key] = value;
    }
  }
  return redacted;
}

function redactLogData(data) {
  const redacted = redactObject(data);
  if (redacted.email) {
    redacted.email = maskEmail(redacted.email);
  }
  if (redacted.ip) {
    redacted.ip = maskIp(redacted.ip);
  }
  return redacted;
}

module.exports = {
  redactObject,
  redactLogData,
  maskEmail,
  maskIp,
  isSensitiveKey,
};