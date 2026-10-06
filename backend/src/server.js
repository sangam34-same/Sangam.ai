require('dotenv').config();
const app = require('./app');
const { connectDB } = require('./config/db');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 5000;

process.on('uncaughtException', (err) => {
  logger.error({ err: err.message, stack: err.stack }, 'Uncaught exception');
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error({ reason: String(reason) }, 'Unhandled rejection');
  process.exit(1);
});

(async () => {
  try {
    await connectDB();
    const server = app.listen(PORT, () => {
      logger.info({ port: PORT, env: process.env.NODE_ENV }, 'Server started');
    });

    const gracefulShutdown = (signal) => {
      logger.info({ signal }, 'Shutting down gracefully');
      server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });
      setTimeout(() => {
        logger.error('Forced shutdown');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (err) {
    logger.error({ err: err.message, stack: err.stack }, 'Failed to start server');
    process.exit(1);
  }
})();