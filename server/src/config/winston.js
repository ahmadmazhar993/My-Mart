require('dotenv').config();
const {
  format, createLogger, transports
} = require('winston');

const { combine, timestamp, prettyPrint } = format;
const path = require('path');
const fs = require('fs');

const { LOG_DIR = 'logs', NODE_APP_INSTANCE = '' } = process.env;

// Create logs folder
if (!fs.existsSync(path.resolve(LOG_DIR))) {
  fs.mkdirSync(path.resolve(LOG_DIR));
}

// define the custom settings for each transport (file, console)
const options = {
  errorFile: {
    level: 'error',
    filename: path.join(__dirname, '../../', LOG_DIR, `/${NODE_APP_INSTANCE !== '' ? `${NODE_APP_INSTANCE}-` : ''}error.log`),
    handleExceptions: true,
    json: true,
    maxsize: 5242880, // 5MB
    maxFiles: 30,
    colorize: false
  },
  combineFile: {
    filename: path.join(__dirname, '../../', LOG_DIR, `/${NODE_APP_INSTANCE !== '' ? `${NODE_APP_INSTANCE}-` : ''}combine.log`),
    handleExceptions: true,
    json: true,
    maxsize: 5242880, // 5MB
    maxFiles: 30,
    colorize: true
  }
};

// instantiate a new Winston Logger with the settings defined above
const logger = createLogger({
  // levels: config.syslog.levels,
  format: combine(
    timestamp(),
    prettyPrint()
  ),
  transports: [
    new transports.File(options.errorFile),
    new transports.File(options.combineFile),
    new transports.Console()
  ],
  exitOnError: false, // do not exit on handled exceptions
});

// create a stream object with a 'write' function that will be used by `morgan`
logger.stream = {
  write(message) {
    logger.info(message);
  },
};

module.exports = logger;
