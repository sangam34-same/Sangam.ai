const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const User = require('../models/User');
const { verifyAccessToken } = require('../services/tokenService');
const { findValidSession } = require('../services/sessionService');
const { authEvent } = require('../utils/logger');

const protect = asyncHandler(async (req, res, next) => {
  let token;
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) token = header.split(' ')[1];

  if (!token) {
    authEvent('auth_token_missing', { ip: req.ip, path: req.path });
    throw ApiError.unauthorized('Not authorized, no token');
  }

  try {
    const decoded = verifyAccessToken(token);

    const user = await User.findById(decoded.sub);
    if (!user) {
      authEvent('auth_user_not_found', { ip: req.ip, userId: decoded.sub });
      throw ApiError.unauthorized('Not authorized, user not found');
    }

    if (user.isLocked) {
      authEvent('auth_account_locked', { ip: req.ip, userId: user._id });
      throw ApiError.forbidden('Account temporarily locked');
    }

    req.user = user;
    req.tokenPayload = decoded;
    next();
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err.name === 'TokenExpiredError') {
      authEvent('auth_token_expired', { ip: req.ip, path: req.path });
      throw ApiError.unauthorized('Token expired');
    }
    authEvent('auth_token_invalid', { ip: req.ip, error: err.message });
    throw ApiError.unauthorized('Not authorized, token failed');
  }
});

const optionalAuth = asyncHandler(async (req, res, next) => {
  let token;
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) token = header.split(' ')[1];

  if (!token) return next();

  try {
    const decoded = verifyAccessToken(token);

    const user = await User.findById(decoded.sub);
    if (user && !user.isLocked) {
      req.user = user;
      req.tokenPayload = decoded;
    }
  } catch {
    // Ignore errors for optional auth
  }
  next();
});

const verifyRefreshToken = asyncHandler(async (req, res, next) => {
  const refreshToken = req.signedCookies?.refreshToken;

  if (!refreshToken) {
    authEvent('refresh_token_missing', { ip: req.ip, path: req.path });
    throw ApiError.unauthorized('Not authorized, no refresh token');
  }

  const session = await findValidSession(refreshToken);

  if (!session) {
    authEvent('refresh_token_not_found', { ip: req.ip });
    throw ApiError.unauthorized('Not authorized, invalid refresh token');
  }

  const user = await User.findById(session.userId);
  if (!user) {
    authEvent('refresh_user_not_found', { ip: req.ip, userId: session.userId });
    throw ApiError.unauthorized('Not authorized, user not found');
  }

  if (user.isLocked) {
    authEvent('refresh_account_locked', { ip: req.ip, userId: user._id });
    throw ApiError.forbidden('Account temporarily locked');
  }

  req.user = user;
  req.session = session;
  req.refreshToken = refreshToken;
  next();
});

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) {
    return next(ApiError.unauthorized('Not authorized'));
  }
  if (!roles.includes(req.user.role)) {
    authEvent('auth_insufficient_role', { ip: req.ip, userId: req.user._id, role: req.user.role, required: roles });
    return next(ApiError.forbidden('Forbidden'));
  }
  next();
};

module.exports = { protect, optionalAuth, verifyRefreshToken, requireRole };