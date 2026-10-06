const crypto = require('crypto');

function generateRandomBytes(bytes = 32) {
  return crypto.randomBytes(bytes);
}

function generateRandomHex(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

function generateOpaqueToken(bytes = 64) {
  return crypto.randomBytes(bytes).toString('hex');
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function hashPassword(password, saltRounds = 12) {
  const bcrypt = require('bcryptjs');
  return bcrypt.hash(password, saltRounds);
}

function comparePassword(password, hash) {
  const bcrypt = require('bcryptjs');
  return bcrypt.compare(password, hash);
}

function generateJwtId() {
  return crypto.randomUUID();
}

function constantTimeCompare(a, b) {
  if (a.length !== b.length) {
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

module.exports = {
  generateRandomBytes,
  generateRandomHex,
  generateOpaqueToken,
  hashToken,
  hashPassword,
  comparePassword,
  generateJwtId,
  constantTimeCompare,
};