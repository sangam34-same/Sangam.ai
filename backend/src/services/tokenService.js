const jwt = require('jsonwebtoken');
const { generateJwtId } = require('../utils/crypto');
const { jwt: jwtConfig } = require('../config/env');
const ApiError = require('../utils/ApiError');

function generateAccessToken(user) {
  if (!jwtConfig.accessSecret) {
    throw new Error('JWT_ACCESS_SECRET is not defined');
  }

  return jwt.sign(
    {
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
      jti: generateJwtId(),
    },
    jwtConfig.accessSecret,
    {
      expiresIn: jwtConfig.accessExpire,
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience,
      algorithm: 'HS256',
    }
  );
}

function verifyAccessToken(token) {
  if (!jwtConfig.accessSecret) {
    throw new Error('JWT_ACCESS_SECRET is not defined');
  }

  try {
    return jwt.verify(token, jwtConfig.accessSecret, {
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience,
      algorithms: ['HS256'],
    });
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw ApiError.unauthorized('Token expired');
    }
    if (err.name === 'JsonWebTokenError') {
      throw ApiError.unauthorized('Invalid token');
    }
    throw err;
  }
}

function decodeToken(token) {
  return jwt.decode(token);
}

module.exports = {
  generateAccessToken,
  verifyAccessToken,
  decodeToken,
};