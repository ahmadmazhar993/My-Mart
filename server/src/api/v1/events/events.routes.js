const express = require('express');

const router = express.Router();

const db = require('../../../db');
const { isAuthenticated } = require('../auth/auth.service');
const realtime = require('../../../libs/realtime');

/**
 * GET /api/v1/events : one Server-Sent Events stream per browser tab.
 * Authentication is the normal one (cookie / Bearer, or ?token= which EventSource needs).
 * What a stream receives is decided by who the user is, never by anything in the request.
 */
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const role = await db('accessTemplate').first('type').where('accessTemplateID', req.activeUser.accessTemplateID);
    const seller = await db('sellers').first('sellerID').where({ user_id: req.activeUser.userID });

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    const client = {
      res,
      userId: req.activeUser.userID,
      isAdmin: role?.type === 'Admin',
      sellerId: seller?.sellerID || null,
    };
    const unregister = realtime.register(client);
    res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);

    const keepAlive = setInterval(() => res.write(': keepalive\n\n'), 20000);
    req.on('close', () => {
      clearInterval(keepAlive);
      unregister();
    });
  } catch (err) {
    if (!res.headersSent) res.status(500).json({ success: false, message: 'Could not open the live updates stream' });
  }
});

module.exports = router;
