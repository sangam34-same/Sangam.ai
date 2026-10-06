const { frontendUrl, isProduction } = require('./env');

function corsOptions() {
  const allowedOrigins = [
    frontendUrl,
    'http://localhost:5173',
    'http://127.0.0.1:5173',
  ].filter(Boolean);

  return {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Correlation-ID'],
    exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset', 'X-Correlation-ID'],
    maxAge: 86400,
  };
}

module.exports = { corsOptions };