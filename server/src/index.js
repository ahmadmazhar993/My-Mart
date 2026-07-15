require('dotenv').config();

const app = require('./app');

const { APP_PORT = 5000, APP_HOST = 'localhost', NODE_ENV = 'development' } = process.env;

app.listen(APP_PORT, APP_HOST, () => {
  console.log(`Listening: ${NODE_ENV.toUpperCase() === 'production' ? 'https' : 'http'}://${APP_HOST}:${APP_PORT}`);
  return true;
});
