// Zero-setup dev boot: spins up an in-memory MongoDB (mongodb-memory-server,
// already a devDependency) and starts the API against it. Data is ephemeral —
// perfect for trying register/login/dashboard. For persistent data, install
// MongoDB locally and use `npm run dev` with MONGO_URI in .env.
const { MongoMemoryServer } = require('mongodb-memory-server');

(async () => {
  const mongod = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongod.getUri('sangam_ai');
  console.log(`[dev:memory] In-memory MongoDB at ${process.env.MONGO_URI}`);

  const stop = async () => {
    await mongod.stop();
    process.exit(0);
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);

  require('../src/server');
})();
