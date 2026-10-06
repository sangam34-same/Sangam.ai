require('dotenv').config({ path: '.env.test' });

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  process.env.MONGO_URI = uri;
  process.env.JWT_ACCESS_SECRET = 'test-access-secret-min-32-chars-long';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-min-32-chars-long';
  process.env.COOKIE_SECRET = 'test-cookie-secret-min-32-chars-long';
  process.env.NODE_ENV = 'test';
  process.env.FRONTEND_URL = 'http://localhost:5173';
  process.env.BCRYPT_SALT_ROUNDS = '4';
  process.env.JWT_ACCESS_EXPIRE = '15m';
  process.env.JWT_REFRESH_EXPIRE = '7d';
  process.env.JWT_ISSUER = 'sangam.ai';
  process.env.JWT_AUDIENCE = 'sangam.ai';
  process.env.RATE_LIMIT_WINDOW_MS = '900000';
  process.env.RATE_LIMIT_MAX_REQUESTS = '100';
  process.env.AUTH_RATE_LIMIT_MAX = '5';
  process.env.ACCOUNT_LOCK_THRESHOLD = '10';
  process.env.ACCOUNT_LOCK_DURATION_MS = '1800000';
  process.env.MIN_PASSWORD_LENGTH = '12';
  process.env.RESET_TOKEN_EXPIRE_MS = '900000';
  process.env.RESET_RATE_LIMIT_MAX = '3';
  process.env.RESET_RATE_LIMIT_WINDOW_MS = '3600000';
  process.env.LOG_LEVEL = 'silent';

  const { connectDB } = require('../src/config/db');
  await connectDB();
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongoServer.stop();
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
});

global.testUtils = {
  createUser: async (overrides = {}) => {
    const User = require('../src/models/User');
    const user = await User.create({
      name: 'Test User',
      email: 'test@example.com',
      password: 'SecurePass123!',
      ...overrides,
    });
    return user;
  },
  generateToken: (userId) => {
    const jwt = require('jsonwebtoken');
    return jwt.sign(
      { sub: userId.toString(), email: 'test@example.com', role: 'user', jti: 'test-jti' },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: '15m', issuer: 'sangam.ai', audience: 'sangam.ai', algorithm: 'HS256' }
    );
  },
};