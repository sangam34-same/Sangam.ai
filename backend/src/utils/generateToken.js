const jwt = require('jsonwebtoken');

function generateToken(id) {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is not defined');
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });
}

function toSafeUser(user) {
  return {
    id: user._id ? user._id.toString() : user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
  };
}

module.exports = { generateToken, toSafeUser };
