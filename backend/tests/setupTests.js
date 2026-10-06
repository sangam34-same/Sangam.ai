const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { connectDB } = require('../src/config/db');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  process.env.MONGO_URI = uri;
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