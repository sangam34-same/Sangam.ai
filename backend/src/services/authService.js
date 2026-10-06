const User = require('../models/User');
const { validatePasswordStrength } = require('../models/User');
const { getClientIp, getUserAgent } = require('../utils/request');
const { generateAccessToken, verifyAccessToken } = require('./tokenService');
const { createSession, findValidSession, revokeSession, revokeAllUserSessions, rotateSession, detectTokenReuse, handleTokenReuse } = require('./sessionService');
const { sendPasswordResetEmail, sendPasswordChangeNotification, sendExistingUserNotification } = require('./emailService');
const { rateLimit, password, frontendUrl } = require('../config/env');
const ApiError = require('../utils/ApiError');
const { authEvent } = require('../utils/logger');

async function registerUser(data, req) {
  const { name, businessName, email, phone, password: plainPassword } = data;
  const ip = getClientIp(req);
  const userAgent = getUserAgent(req);

  const cleanEmail = String(email || '').toLowerCase().trim();
  const cleanName = String(name || '').trim();
  const cleanBusinessName = businessName ? String(businessName).trim() : '';
  const cleanPhone = phone ? String(phone).trim() : '';

  if (!cleanName || !cleanEmail || !plainPassword) {
    throw ApiError.badRequest('All required fields must be provided');
  }

  const existingUser = await User.findOne({ email: cleanEmail });
  if (existingUser) {
    authEvent('register_attempt_existing', { email: cleanEmail, ip });
    await sendExistingUserNotification(existingUser, ip, userAgent);
    return { user: null, accessToken: null, refreshToken: null, message: 'If this email is registered, you will receive a notification' };
  }

  const validation = validatePasswordStrength(plainPassword, { name: cleanName, email: cleanEmail, businessName: cleanBusinessName });
  if (!validation.isValid) {
    authEvent('register_password_weak', { email: cleanEmail, ip, errors: validation.errors });
    throw ApiError.badRequest('Password does not meet requirements', validation.errors.map(e => ({ field: 'password', message: e })));
  }

  const user = await User.create({
    name: cleanName,
    businessName: cleanBusinessName,
    email: cleanEmail,
    phone: cleanPhone,
    password: plainPassword,
  });

  const accessToken = generateAccessToken(user);
  const { session, refreshToken } = await createSession(user._id, ip, userAgent);

  user.lastLogin = new Date();
  user.lastLoginIp = ip;
  user.lastLoginUserAgent = userAgent;
  await user.save({ validateBeforeSave: false });

  authEvent('register_success', { userId: user._id, email: cleanEmail, ip });

  return {
    user: user.toJSON(),
    accessToken,
    refreshToken,
    message: 'Registration successful',
  };
}

async function loginUser(data, req) {
  const { email, password: plainPassword, rememberMe } = data;
  const ip = getClientIp(req);
  const userAgent = getUserAgent(req);

  const cleanEmail = String(email || '').toLowerCase().trim();

  if (!cleanEmail || !plainPassword) {
    authEvent('login_failed_missing_credentials', { email: cleanEmail, ip });
    throw ApiError.unauthorized('Invalid credentials');
  }

  const user = await User.findOne({ email: cleanEmail }).select('+password');
  const dummyHash = '$2b$12$dummyhashdummyhashdummyhashdummyhashdummyhashdummyhashdummy';

  if (!user) {
    await user?.comparePassword?.(plainPassword) || (await import('bcryptjs')).default.compare(plainPassword, dummyHash);
    authEvent('login_failed_user_not_found', { email: cleanEmail, ip });
    throw ApiError.unauthorized('Invalid credentials');
  }

  if (user.isLocked) {
    authEvent('login_failed_account_locked', { userId: user._id, email: cleanEmail, ip });
    throw ApiError.forbidden('Account temporarily locked due to failed attempts');
  }

  const isMatch = await user.comparePassword(plainPassword);

  if (!isMatch) {
    await user.incrementFailedLogins();
    authEvent('login_failed_wrong_password', { userId: user._id, email: cleanEmail, ip, attempts: user.failedLoginAttempts });

    if (user.failedLoginAttempts >= rateLimit.accountLockThreshold) {
      authEvent('login_account_locked', { userId: user._id, email: cleanEmail, ip });
    }

    throw ApiError.unauthorized('Invalid credentials');
  }

  await user.resetFailedLogins();

  const accessToken = generateAccessToken(user);
  const expiresInDays = rememberMe ? 30 : 7;
  const { session, refreshToken } = await createSession(user._id, ip, userAgent, expiresInDays);

  user.lastLogin = new Date();
  user.lastLoginIp = ip;
  user.lastLoginUserAgent = userAgent;
  await user.save({ validateBeforeSave: false });

  authEvent('login_success', { userId: user._id, email: cleanEmail, ip });

  return {
    user: user.toJSON(),
    accessToken,
    refreshToken,
    message: 'Login successful',
  };
}

async function logoutUser(userId, refreshToken, req) {
  const ip = getClientIp(req);

  if (refreshToken) {
    await revokeSessionByToken(refreshToken, 'logout');
    authEvent('logout_success', { userId, ip });
  } else {
    authEvent('logout_success', { userId, ip });
  }

  return { message: 'Logged out successfully' };
}

async function getMe(userId) {
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('User not found');
  return user.toJSON();
}

async function refreshAccessToken(session, refreshToken, req) {
  const ip = getClientIp(req);
  const userAgent = getUserAgent(req);

  const reuseDetected = await detectTokenReuse(refreshToken);
  if (reuseDetected) {
    await handleTokenReuse(session.userId);
    authEvent('token_reuse_detected', { userId: session.userId, ip });
    throw ApiError.unauthorized('Token reuse detected, all sessions revoked');
  }

  const user = await User.findById(session.userId);
  if (!user) throw ApiError.notFound('User not found');

  const { session: newSession, refreshToken: newRefreshToken } = await rotateSession(session, ip, userAgent);
  const accessToken = generateAccessToken(user);

  authEvent('token_refresh', { userId: session.userId, oldSessionId: session._id, newSessionId: newSession._id, ip });

  return {
    accessToken,
    refreshToken: newRefreshToken,
    message: 'Token refreshed',
  };
}

async function forgotPassword(email, req) {
  const ip = getClientIp(req);
  const cleanEmail = String(email || '').toLowerCase().trim();

  if (!cleanEmail) {
    authEvent('forgot_password_missing_email', { ip });
    return { message: 'If this email is registered, a reset link will be sent' };
  }

  const user = await User.findOne({ email: cleanEmail });

  if (!user) {
    authEvent('forgot_password_user_not_found', { email: cleanEmail, ip });
    return { message: 'If this email is registered, a reset link will be sent' };
  }

  const resetTokenPlain = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  authEvent('forgot_password_token_created', { userId: user._id, email: cleanEmail, ip });

  await sendPasswordResetEmail(user, resetTokenPlain, frontendUrl);

  return { message: 'If this email is registered, a reset link will be sent' };
}

async function resetPassword(token, newPassword, req) {
  const ip = getClientIp(req);

  if (!token || !newPassword) {
    throw ApiError.badRequest('Token and new password are required');
  }

  const crypto = require('crypto');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  const user = await User.findOne({
    passwordResetToken: tokenHash,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!user) {
    authEvent('reset_password_invalid_token', { ip });
    throw ApiError.badRequest('Invalid or expired reset token');
  }

  const validation = validatePasswordStrength(newPassword, { name: user.name, email: user.email, businessName: user.businessName });
  if (!validation.isValid) {
    throw ApiError.badRequest('Password does not meet requirements', validation.errors.map(e => ({ field: 'password', message: e })));
  }

  user.password = newPassword;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  await revokeAllUserSessions(user._id, 'password_change');

  authEvent('reset_password_success', { userId: user._id, email: user.email, ip });

  await sendPasswordChangeNotification(user, ip, req.headers['user-agent'] || 'unknown');

  return { message: 'Password reset successful' };
}

async function revokeAllSessions(userId, reason = 'user_request', req) {
  const ip = getClientIp(req);
  const count = await revokeAllUserSessions(userId, reason);
  authEvent('sessions_revoked', { userId, count, reason, ip });
  return { revokedCount: count };
}

async function revokeSessionByToken(refreshToken, reason = 'logout') {
  const crypto = require('crypto');
  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  const session = await (await import('../models/Session')).default.findOne({ refreshTokenHash: tokenHash, revokedAt: null });
  if (session) {
    await revokeSession(session._id, reason);
    return true;
  }
  return false;
}

module.exports = {
  registerUser,
  loginUser,
  logoutUser,
  getMe,
  refreshAccessToken,
  forgotPassword,
  resetPassword,
  revokeAllSessions,
  revokeSessionByToken,
};