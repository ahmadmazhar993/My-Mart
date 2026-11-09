require('dotenv').config();

const app = require('./app');
const logger = require('./config/winston');

const { APP_PORT = 5000, APP_HOST = 'localhost', NODE_ENV = 'development' } = process.env;

// Express 4 does not catch rejected promises from async handlers; log them instead of dying silently.
process.on('unhandledRejection', (reason) => {
  logger.error('[PROCESS]::Unhandled promise rejection', reason);
});

app.listen(APP_PORT, APP_HOST, () => {
  console.log(`Listening: ${NODE_ENV.toUpperCase() === 'production' ? 'https' : 'http'}://${APP_HOST}:${APP_PORT}`);
  return true;
});
