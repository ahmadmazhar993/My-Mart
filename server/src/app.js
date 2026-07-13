const express = require('express');
const cors = require('cors');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const path = require('path');

const { notFound, genericErrorHandler } = require('./libs/errorHandler');
const requestLogger = require('./libs/requestLogger');
const apiV1Routes = require('./api/v1');
const { isAuthenticated } = require('./api/v1/auth/auth.service');
const orderEvents = require('./libs/orderEvents');

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

app.get('/api/v1/orders/events', isAuthenticated, (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.flushHeaders?.();

  const sendEvent = (payload) => {
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  sendEvent({ type: 'connected' });

  const keepAlive = setInterval(() => {
    res.write(': keepalive\n\n');
  }, 15000);

  const onOrderUpdated = (payload) => sendEvent(payload || { type: 'orders-updated' });
  orderEvents.on('orders-updated', onOrderUpdated);

  req.on('close', () => {
    clearInterval(keepAlive);
    orderEvents.off('orders-updated', onOrderUpdated);
  });
});

app.use('/api/v1', apiV1Routes);

app.use(notFound);
app.use(genericErrorHandler);

module.exports = app;
