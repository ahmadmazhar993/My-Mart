/**
 * Realtime hub (Server-Sent Events).
 *
 * Every signed-in browser tab keeps one stream open (GET /api/v1/events). When something
 * changes, the server publishes a small event to exactly the people allowed to see it:
 *   - admins            : everything
 *   - the affected seller (by seller id and by their user id)
 *   - the affected customer (by user id)
 * Events carry only a topic, an id and an optional short message, never customer data or
 * amounts. The browser reacts by re-fetching through the normal, authorised APIs, so a
 * stream can never reveal more than the REST endpoints already would.
 *
 * The hub is in-process memory. With several server instances behind a load balancer it
 * would need a shared bus (Redis pub/sub or Postgres LISTEN/NOTIFY); see the final report.
 */
const db = require('../db');
const logger = require('../config/winston');

const MAX_STREAMS_PER_USER = 6;
const clients = new Set();

/** Registers a stream. `client`: { res, userId, isAdmin, sellerId }. Returns an unregister function. */
function register(client) {
  const mine = [...clients].filter((c) => c.userId === client.userId);
  // A user with many open tabs keeps the newest streams; the oldest are closed.
  while (mine.length >= MAX_STREAMS_PER_USER) {
    const oldest = mine.shift();
    try { oldest.res.end(); } catch { /* already closed */ }
    clients.delete(oldest);
  }
  clients.add(client);
  return () => clients.delete(client);
}

const send = (client, payload) => {
  try {
    client.res.write(`data: ${JSON.stringify(payload)}\n\n`);
  } catch {
    clients.delete(client);
  }
};

/**
 * audience: { admin?: bool, sellerIds?: string[], userIds?: string[], allSellers?: bool }
 * event   : { topic, id?, action?, messages?: { admin?, seller?, customer? } }
 * `messages` are optional short toast texts; each recipient gets the one for the role it matched as.
 */
function publish(audience, event) {
  const sellerIds = new Set(audience.sellerIds || []);
  const userIds = new Set(audience.userIds || []);
  const messages = event.messages || {};

  clients.forEach((client) => {
    let role = null;
    if (audience.admin && client.isAdmin) role = 'admin';
    else if (client.sellerId && (sellerIds.has(client.sellerId) || audience.allSellers)) role = 'seller';
    else if (userIds.has(client.userId)) role = client.sellerId ? 'seller' : 'customer';
    if (!role) return;
    send(client, {
      type: 'event',
      topic: event.topic,
      id: event.id || null,
      action: event.action || 'updated',
      message: messages[role] || null,
      at: Date.now(),
    });
  });
}

// Fire-and-forget wrapper: a realtime problem must never fail the business operation.
const safely = (label, fn) => {
  Promise.resolve().then(fn).catch((err) => logger.error(`[REALTIME][${label}]::Failed to publish`, err));
};

const sellerUsers = async (sellerIds) => {
  if (!sellerIds.length) return [];
  const rows = await db('sellers').whereIn('sellerID', sellerIds).select('user_id');
  return rows.map((r) => r.user_id);
};

/** An order changed (placed, status, payment, fulfillment). Customer + the sellers on it + admins. */
function emitOrder(orderId, action = 'updated', messages = {}) {
  safely('order', async () => {
    const order = await db('orders').first('user_id', 'orderCode').where({ orderID: orderId });
    if (!order) return;
    const items = await db('order_items').where({ order_id: orderId }).distinct('seller_id');
    const sellerIds = items.map((i) => i.seller_id);
    const code = order.orderCode ? `#${order.orderCode}` : '';
    publish(
      { admin: true, sellerIds, userIds: [order.user_id, ...(await sellerUsers(sellerIds))] },
      {
        topic: 'order',
        id: orderId,
        action,
        messages: {
          admin: messages.admin || null,
          seller: messages.seller || null,
          customer: messages.customer || (action === 'created' ? null : `Order ${code} was updated.`),
        },
      },
    );
  });
}

/**
 * Something about one seller changed. `topic` is e.g. product | inventory | seller | earnings | payout.
 * Seller (by id and user) + admins, optionally an extra customer user.
 */
function emitSeller(sellerId, topic, { id = null, action = 'updated', messages = {}, admin = true, extraUserIds = [] } = {}) {
  safely(topic, async () => {
    const owners = await sellerUsers([sellerId]);
    publish({ admin, sellerIds: [sellerId], userIds: [...owners, ...extraUserIds] }, {
      topic, id, action, messages,
    });
  });
}

/** A return changed. Customer, the seller and admins. */
function emitReturn(returnId, action = 'updated', messages = {}) {
  safely('return', async () => {
    const ret = await db('return_requests').first('user_id', 'seller_id').where({ returnID: returnId });
    if (!ret) return;
    const owners = await sellerUsers([ret.seller_id]);
    publish({ admin: true, sellerIds: [ret.seller_id], userIds: [ret.user_id, ...owners] }, {
      topic: 'return', id: returnId, action, messages,
    });
  });
}

/** Marketplace-wide change every seller (and admins) should see, e.g. the commission rate. */
function emitAllSellers(topic, { action = 'updated', messages = {} } = {}) {
  safely(topic, async () => {
    publish({ admin: true, allSellers: true }, { topic, action, messages });
  });
}

/** Admin-only signal, e.g. a new seller application. */
function emitAdmin(topic, { id = null, action = 'updated', messages = {} } = {}) {
  safely(topic, async () => {
    publish({ admin: true }, { topic, id, action, messages });
  });
}

const connectionCount = (userId) => (userId ? [...clients].filter((c) => c.userId === userId).length : clients.size);

module.exports = {
  register, publish, emitOrder, emitSeller, emitReturn, emitAllSellers, emitAdmin, connectionCount,
};
