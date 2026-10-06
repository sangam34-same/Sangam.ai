const mongoose = require('mongoose');

// Singleton connection holder
let cachedPromise = null;

function getConnectionStatus() {
  return mongoose.connection.readyState;
}

async function connectDB() {
  if (cachedPromise) return cachedPromise;

  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error('MONGO_URI is not defined in .env');

  cachedPromise = mongoose.connect(uri, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  });

  mongoose.connection.on('connected', () => console.log('MongoDB connected'));
  mongoose.connection.on('error', (err) => console.error('MongoDB error:', err.message));
  mongoose.connection.on('disconnected', () => console.warn('MongoDB disconnected'));

  try {
    await cachedPromise;
    return cachedPromise;
  } catch (err) {
    cachedPromise = null; // allow retry on next call
    console.error('MongoDB initial connection failed:', err.message);
    process.exit(1);
  }
}

module.exports = { connectDB, getConnectionStatus };
