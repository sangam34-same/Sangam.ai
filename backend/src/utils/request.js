function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
         req.headers['x-real-ip'] ||
         req.socket?.remoteAddress ||
         req.ip ||
         'unknown';
}

function getUserAgent(req) {
  return req.headers['user-agent'] || 'unknown';
}

module.exports = { getClientIp, getUserAgent };