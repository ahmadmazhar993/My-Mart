const express = require('express');
const cors = require('cors');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const path = require('path');

const { notFound, genericErrorHandler, hideDatabaseErrors } = require('./libs/errorHandler');
const requestLogger = require('./libs/requestLogger');
const apiV1Routes = require('./api/v1');
const { isAuthenticated } = require('./api/v1/auth/auth.service');
const orderEvents = require('./libs/orderEvents');
const db = require('./db');
const { sitemapHandler } = require('./libs/sitemap');

const app = express();

const {
  EXPRESS_SESSION_SECRET = 'ExpressSessionSecret',
  APP_VERSION = '1.0.0',
  NODE_ENV = 'development',
  CLIENT_URL,
} = process.env;
const isProduction = NODE_ENV.toLowerCase() === 'production';

if (isProduction && (!CLIENT_URL || EXPRESS_SESSION_SECRET === 'ExpressSessionSecret')) {
  throw new Error('CLIENT_URL and EXPRESS_SESSION_SECRET must be set in production');
}

// CLIENT_URL may hold several comma-separated origins. Without it (development only)
// any origin is reflected so local tools keep working.
const allowedOrigins = (CLIENT_URL || '')
  .split(',')
  .map((origin) => origin.trim().replace(/\/+$/, ''))
  .filter(Boolean);

const isAdminUser = async (user) => {
  const role = await db('accessTemplate')
    .first('type')
    .where('accessTemplateID', user.accessTemplateID);
  return role?.type === 'Admin';
};
app.locals.appVersion = APP_VERSION;

app.set('view engine', 'ejs');
app.set('trust proxy', 1);

app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cors({
  origin: allowedOrigins.length ? allowedOrigins : !isProduction,
  credentials: true,
}));
app.use(cookieParser());

app.use(session({
  secret: EXPRESS_SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', secure: isProduction },
}));

// Payment proofs are private: only the order owner or an admin may open them.
app.get('/uploads/payments/:file', isAuthenticated, async (req, res, next) => {
  try {
    const file = path.basename(req.params.file);
    const payment = await db('payments')
      .whereRaw("metadata->>'receipt_url' = ?", [`uploads/payments/${file}`])
      .first('order_id');
    if (!payment) return res.status(404).json({ success: false, message: 'File not found' });

    if (!(await isAdminUser(req.activeUser))) {
      const order = await db('orders').where({ orderID: payment.order_id }).first('user_id');
      if (!order || order.user_id !== req.activeUser.userID) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    }
    return res.sendFile(path.join(__dirname, '../uploads/payments', file));
  } catch (err) {
    return next(err);
  }
});

app.use('/uploads', express.static(path.join(__dirname, '../uploads'), { dotfiles: 'deny' }));
app.use(requestLogger);
app.use(hideDatabaseErrors);

app.get('/', (req, res) => {
  const { error } = req.query;
  res.json({
    message: error || 'Welcome to AHM-Mart API Server'
  });
});

// Authoritative sitemap (Nginx proxies exactly /sitemap.xml here). Replaces client/public/sitemap.xml.
app.get('/sitemap.xml', sitemapHandler);

app.get('/api/v1/app-version', (req, res) => {
  res.json({
    success: true,
    version: app.locals.appVersion,
    appVersion: app.locals.appVersion,
  });
});

app.get('/favicon.svg', (req, res) => {
  res.sendFile(path.join(__dirname, '../../client/public/favicon.svg'));
});

app.get('/favicon.ico', (req, res) => {
  res.type('image/svg+xml').sendFile(path.join(__dirname, '../../client/public/favicon.svg'));
});

// Serve common client public assets (logo) so server-rendered receipts can reference them
app.get('/logo.png', (req, res) => {
  res.sendFile(path.join(__dirname, '../../client/public/logo.png'));
});

app.get('/api/v1/orders/events', isAuthenticated, async (req, res) => {
  const viewerIsAdmin = await isAdminUser(req.activeUser).catch(() => false);

  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  const { origin } = req.headers;
  if (origin && (allowedOrigins.length ? allowedOrigins.includes(origin) : !isProduction)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  res.flushHeaders?.();

  const sendEvent = (payload) => {
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  sendEvent({ type: 'connected' });

  const keepAlive = setInterval(() => {
    res.write(': keepalive\n\n');
  }, 15000);

  // Customers only hear about their own orders; admins hear about all of them.
  const onOrderUpdated = (payload) => {
    if (!viewerIsAdmin && payload?.userId !== req.activeUser.userID) return;
    sendEvent({ type: 'orders-updated', orderId: payload?.orderId });
  };
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
