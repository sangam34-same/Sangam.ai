const asyncHandler = require('../utils/asyncHandler');
const authService = require('../services/authService');
const ApiResponse = require('../utils/ApiResponse');
const { authEvent } = require('../utils/logger');

function setRefreshTokenCookie(res, token, maxAgeDays = 7) {
  const isProduction = process.env.NODE_ENV === 'production';
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    path: '/api/auth',
    maxAge: maxAgeDays * 24 * 60 * 60 * 1000,
    signed: true,
  });
}

function clearRefreshTokenCookie(res) {
  const isProduction = process.env.NODE_ENV === 'production';
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    path: '/api/auth',
    signed: true,
  });
}

const register = asyncHandler(async (req, res) => {
  const result = await authService.registerUser(req.body, req);
  const { user, accessToken, refreshToken, message } = result;

  if (refreshToken) {
    setRefreshTokenCookie(res, refreshToken);
  }

  const statusCode = user ? 201 : 200;
  res.status(statusCode).json(
    ApiResponse.success({ user, accessToken }, message, statusCode)
  );
});

const login = asyncHandler(async (req, res) => {
  const result = await authService.loginUser(req.body, req);
  const { user, accessToken, refreshToken, message } = result;

  const expiresInDays = req.body.rememberMe ? 30 : 7;
  setRefreshTokenCookie(res, refreshToken, expiresInDays);

  res.status(200).json(
    ApiResponse.success({ user, accessToken }, message)
  );
});

const logout = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  const refreshToken = req.signedCookies?.refreshToken;

  await authService.logoutUser(userId, refreshToken, req);
  clearRefreshTokenCookie(res);

  res.status(200).json(
    ApiResponse.success({}, 'Logged out successfully')
  );
});

const getMe = asyncHandler(async (req, res) => {
  const user = await authService.getMe(req.user._id);
  res.status(200).json(
    ApiResponse.success({ user }, 'OK')
  );
});

const refreshToken = asyncHandler(async (req, res) => {
  const { accessToken, refreshToken: newRefreshToken, message } = await authService.refreshAccessToken(
    req.session,
    req.refreshToken,
    req
  );

  setRefreshTokenCookie(res, newRefreshToken);

  res.status(200).json(
    ApiResponse.success({ accessToken }, message)
  );
});

const forgotPassword = asyncHandler(async (req, res) => {
  const result = await authService.forgotPassword(req.body.email, req);
  res.status(200).json(
    ApiResponse.success({}, result.message)
  );
});

const resetPassword = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  await authService.resetPassword(token, password, req);

  res.status(200).json(
    ApiResponse.success({}, 'Password reset successful')
  );
});

const revokeSessions = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const userId = req.user._id;

  if (sessionId) {
    const Session = require('../models/Session');
    const session = await Session.findOne({ _id: sessionId, userId });
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }
    await authService.revokeSessionByToken(session.refreshTokenHash, 'admin_revoke');
    authEvent('session_revoked', { userId, sessionId, ip: req.ip });
    return res.status(200).json({ success: true, data: {}, message: 'Session revoked' });
  }

  const result = await authService.revokeAllSessions(userId, 'user_request', req);
  res.status(200).json(
    ApiResponse.success({ revokedCount: result.revokedCount }, 'All sessions revoked')
  );
});

module.exports = {
  register,
  login,
  logout,
  getMe,
  refreshToken,
  forgotPassword,
  resetPassword,
  revokeSessions,
};