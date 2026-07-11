const express = require('express');
const cors = require('cors');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const path = require('path');

const { notFound, genericErrorHandler } = require('./libs/errorHandler');
const requestLogger = require('./libs/requestLogger');
const apiV1Routes = require('./api/v1');

const app = express();

const { EXPRESS_SESSION_SECRET = 'ExpressSessionSecret' } = process.env;

app.set('view engine', 'ejs');
app.set('trust proxy', 1);

app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cors());
app.use(cookieParser());

app.use(session({
  secret: EXPRESS_SESSION_SECRET,
  resave: true,
  saveUninitialized: true
}));

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use(requestLogger);

app.get('/', (req, res) => {
  const { error } = req.query;
  res.json({
    message: error || 'Welcome to AHM-Mart API Server'
  });
});

app.get('/favicon.svg', (req, res) => {
  res.sendFile(path.join(__dirname, '../../client/public/favicon.svg'));
});

app.get('/favicon.ico', (req, res) => {
  res.type('image/svg+xml').sendFile(path.join(__dirname, '../../client/public/favicon.svg'));
});

app.use('/api/v1', apiV1Routes);

app.use(notFound);
app.use(genericErrorHandler);

module.exports = app;
