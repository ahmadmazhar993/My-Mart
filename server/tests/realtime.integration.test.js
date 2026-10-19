/**
 * Live updates (SSE): the right people get each event, the wrong people never do.
 * Runs only against a database whose name contains "scratch" or "test".
 */
process.env.NODE_ENV = 'development';
process.env.DB_NAME = process.env.DB_NAME || 'ahm_mart_scratch';
if (!/scratch|test/i.test(process.env.DB_NAME)) {
  throw new Error(`Refusing to run integration tests against database "${process.env.DB_NAME}"`);
}

jest.mock('../src/email/templates', () => new Proxy({}, { get: () => jest.fn().mockResolvedValue(undefined) }));

const http = require('http');
const { v4: uuid } = require('uuid');
const db = require('../src/db');
const app = require('../src/app');

const PASSWORD = 'Passw0rd!x';
const run = uuid().slice(0, 8);
let server; let base;
const openStreams = [];

const api = async (method, path, { token, body, headers = {} } = {}) => {
  const res = await fetch(`${base}/api/v1${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch { /* empty */ }
  return { status: res.status, body: json };
};
const roleId = async (name) => (await db('accessTemplate').first('accessTemplateID').where({ name })).accessTemplateID;
const makeUser = async (label, roleName) => {
  const email = `${label}.${run}@test.local`;
  const [user] = await db('user').insert({
    firstName: label, lastName: 'Tester', email, password: PASSWORD, isActive: true, isEmailVerified: true, status: 'Active', accessTemplateID: await roleId(roleName),
  }, '*');
  const login = await api('POST', '/auth/login', { body: { email, password: PASSWORD } });
  return { ...user, token: login.body.token };
};
const makeSeller = async (label) => {
  const user = await makeUser(label, 'Seller');
  const [seller] = await db('sellers').insert({ user_id: user.userID, shopName: `${label} Shop ${run}`, status: 'approved', contactPhone: '03001234567' }, '*');
  return { user, seller, token: user.token };
};

/** Opens /events the way a browser does and collects parsed events. */
async function openStream(token, { viaQuery = false } = {}) {
  const controller = new AbortController();
  const res = await fetch(`${base}/api/v1/events${viaQuery ? `?token=${token}` : ''}`, {
    headers: { Accept: 'text/event-stream', ...(viaQuery ? {} : { Authorization: `Bearer ${token}` }) },
    signal: controller.signal,
  });
  const stream = { status: res.status, events: [], close: () => controller.abort() };
  if (res.status !== 200) return stream;
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  (async () => {
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let cut;
        while ((cut = buffer.indexOf('\n\n')) >= 0) {
          const chunk = buffer.slice(0, cut);
          buffer = buffer.slice(cut + 2);
          const line = chunk.split('\n').find((l) => l.startsWith('data:'));
          if (line) stream.events.push(JSON.parse(line.slice(5)));
        }
      }
    } catch { /* aborted */ }
  })();
  openStreams.push(stream);
  const start = Date.now();
  while (!stream.events.some((e) => e.type === 'connected') && Date.now() - start < 3000) await new Promise((r) => { setTimeout(r, 25); });
  return stream;
}

const sleep = (ms) => new Promise((r) => { setTimeout(r, ms); });
const waitFor = async (stream, predicate, ms = 3000) => {
  const start = Date.now();
  while (Date.now() - start < ms) {
    const hit = stream.events.find((e) => e.type === 'event' && predicate(e));
    if (hit) return hit;
    await sleep(40);
  }
  return null;
};
const received = (stream, topic, action) => stream.events.filter((e) => e.type === 'event' && e.topic === topic && (!action || e.action === action));

let admin; let customerA; let customerB; let sellerA; let sellerB; let category;
let sAdmin; let sCustA; let sCustB; let sSellA; let sSellB;

beforeAll(async () => {
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  base = `http://127.0.0.1:${server.address().port}`;
  category = await db('categories').first('*').where({ isActive: true });
  admin = await makeUser('radmin', 'Admin');
  customerA = await makeUser('rcusta', 'Customer');
  customerB = await makeUser('rcustb', 'Customer');
  sellerA = await makeSeller('rsellera');
  sellerB = await makeSeller('rsellerb');
  sAdmin = await openStream(admin.token);
  sCustA = await openStream(customerA.token);
  sCustB = await openStream(customerB.token, { viaQuery: true });
  sSellA = await openStream(sellerA.token);
  sSellB = await openStream(sellerB.token);
});

afterAll(async () => {
  openStreams.forEach((s) => s.close());
  await new Promise((resolve) => server.close(resolve));
  await db.destroy();
});

const createProduct = async (seller, over = {}) => {
  const res = await api('POST', '/seller/products', {
    token: seller.token, body: { name: `Live ${run}-${Math.random().toString(36).slice(2, 6)}`, category_id: category.categoryID, price: 1000, stock_quantity: 20, ...over },
  });
  expect(res.status).toBe(201);
  return res.body.data.id;
};

describe('stream access', () => {
  test('requires authentication (header or ?token=) and rejects bad tokens', async () => {
    expect((await openStream('not-a-token')).status).toBe(401);
    const none = await fetch(`${base}/api/v1/events`, { headers: { Accept: 'text/event-stream' } });
    expect(none.status).toBe(401);
    expect(sCustB.status).toBe(200); // ?token= form used by browsers' EventSource
  });

  test('a user keeps at most 6 streams open (oldest are closed)', async () => {
    const user = await makeUser('rmany', 'Customer');
    const streams = [];
    for (let i = 0; i < 8; i += 1) streams.push(await openStream(user.token));
    const realtime = require('../src/libs/realtime');
    expect(realtime.connectionCount(user.userID)).toBe(6);
    streams.forEach((s) => s.close());
  });
});

describe('orders reach only the people involved', () => {
  let productA; let productB; let orderId;
  beforeAll(async () => {
    productA = await createProduct(sellerA);
    productB = await createProduct(sellerB);
    for (const [seller, id] of [[sellerA, productA], [sellerB, productB]]) {
      await api('POST', `/seller/products/${id}/submit`, { token: seller.token });
      await api('POST', `/sellers/products/${id}/approve`, { token: admin.token });
      await api('POST', `/seller/products/${id}/publish`, { token: seller.token });
    }
  });

  test('placing an order: admin, that seller and that customer are told; others are not', async () => {
    const res = await api('POST', '/orders', { token: customerA.token, body: { shipping_address: '1 Test St, Lahore', payment_method: 'cod', items: [{ product_id: productA, quantity: 1 }] } });
    expect(res.status).toBe(201);
    orderId = res.body.data.id;
    const adminEvent = await waitFor(sAdmin, (e) => e.topic === 'order' && e.id === orderId && e.action === 'created');
    const sellerEvent = await waitFor(sSellA, (e) => e.topic === 'order' && e.id === orderId);
    const customerEvent = await waitFor(sCustA, (e) => e.topic === 'order' && e.id === orderId);
    expect(adminEvent.message).toMatch(/New order/);
    expect(sellerEvent.message).toBe('You have a new order.');
    expect(customerEvent).toBeTruthy();
    await sleep(500);
    expect(received(sSellB, 'order').some((e) => e.id === orderId)).toBe(false); // other seller
    expect(received(sCustB, 'order').some((e) => e.id === orderId)).toBe(false); // other customer
  });

  test('status change: customer gets a readable message, seller too, strangers nothing', async () => {
    const mark = { a: sSellA.events.length, b: sSellB.events.length, c: sCustA.events.length, o: sCustB.events.length };
    expect((await api('PUT', `/orders/${orderId}`, { token: admin.token, body: { status: 'confirmed' } })).status).toBe(200);
    const customerEvent = await waitFor(sCustA, (e) => e.topic === 'order' && e.id === orderId && e.action === 'status');
    expect(customerEvent.message).toMatch(/is now confirmed/);
    const sellerEvent = await waitFor(sSellA, (e) => e.topic === 'order' && e.id === orderId && e.action === 'status');
    expect(sellerEvent.message).toMatch(/is now confirmed/);
    await sleep(500);
    expect(sSellB.events.length).toBe(mark.b);
    expect(sCustB.events.length).toBe(mark.o);
    expect(sSellA.events.length).toBeGreaterThan(mark.a);
    expect(sCustA.events.length).toBeGreaterThan(mark.c);
  });

  test('seller fulfillment updates reach the customer and admin', async () => {
    for (const status of ['processing', 'ready_to_ship', 'shipped']) {
      expect((await api('PUT', `/seller/orders/${orderId}/fulfillment`, { token: sellerA.token, body: { status } })).status).toBe(200);
    }
    const shipped = await waitFor(sCustA, (e) => e.topic === 'order' && e.action === 'fulfillment' && e.message === 'Part of your order has shipped.');
    expect(shipped).toBeTruthy();
    expect(await waitFor(sAdmin, (e) => e.topic === 'order' && e.action === 'fulfillment' && /shipped/.test(e.message || ''))).toBeTruthy();
  });

  test('events never carry customer data, amounts or addresses', async () => {
    const all = [...sAdmin.events, ...sSellA.events, ...sCustA.events].filter((e) => e.type === 'event');
    expect(all.length).toBeGreaterThan(0);
    all.forEach((e) => {
      expect(Object.keys(e).sort()).toEqual(['action', 'at', 'id', 'message', 'topic', 'type']);
      const text = JSON.stringify(e);
      expect(text).not.toContain('Test St');
      expect(text).not.toContain(customerA.email);
    });
  });
});

describe('products, sellers, returns, payouts, commission', () => {
  test('product submission notifies admins only; approval tells that seller only', async () => {
    const id = await createProduct(sellerA);
    const markB = sSellB.events.length; const markC = sCustA.events.length;
    await api('POST', `/seller/products/${id}/submit`, { token: sellerA.token });
    expect((await waitFor(sAdmin, (e) => e.topic === 'product' && e.id === id && e.action === 'submitted')).message).toMatch(/waiting for review/);
    await api('POST', `/sellers/products/${id}/approve`, { token: admin.token });
    expect((await waitFor(sSellA, (e) => e.topic === 'product' && e.id === id && e.action === 'approved')).message).toMatch(/was approved/);
    await sleep(400);
    expect(sSellB.events.length).toBe(markB);
    expect(sCustA.events.length).toBe(markC);
  });

  test('seller application → admin is told; approval/suspension reach the applicant live', async () => {
    const applicant = await makeUser('rapplicant', 'Customer');
    const stream = await openStream(applicant.token); // connected BEFORE having any seller row
    const apply = await api('POST', '/seller/apply', { token: applicant.token, body: { shop_name: `Live Store ${run}`, contact_phone: '03111234567', accept_terms: true } });
    expect(apply.status).toBe(201);
    const sellerId = apply.body.data.id;
    expect((await waitFor(sAdmin, (e) => e.topic === 'seller' && e.id === sellerId && e.action === 'applied')).message).toMatch(/New seller application/);
    expect(await waitFor(stream, (e) => e.topic === 'seller' && e.action === 'applied')).toBeTruthy();

    await api('POST', `/sellers/${sellerId}/approve`, { token: admin.token });
    expect((await waitFor(stream, (e) => e.topic === 'seller' && e.action === 'approve')).message).toMatch(/approved/);
    await api('POST', `/sellers/${sellerId}/suspend`, { token: admin.token, body: { reason: 'live suspension test' } });
    expect((await waitFor(stream, (e) => e.topic === 'seller' && e.action === 'suspend')).message).toMatch(/suspended/);
    expect(received(sSellA, 'seller').some((e) => e.id === sellerId)).toBe(false);
  });

  test('returns: customer, that seller and admins are told; others are not', async () => {
    const productId = await createProduct(sellerA);
    await api('POST', `/seller/products/${productId}/submit`, { token: sellerA.token });
    await api('POST', `/sellers/products/${productId}/approve`, { token: admin.token });
    await api('POST', `/seller/products/${productId}/publish`, { token: sellerA.token });
    const placed = await api('POST', '/orders', { token: customerA.token, body: { shipping_address: '2 Test St, Lahore', payment_method: 'online', items: [{ product_id: productId, quantity: 1 }] } });
    const orderId = placed.body.data.id;
    await api('PUT', `/orders/${orderId}`, { token: admin.token, body: { paymentStatus: 'paid' } });
    await api('PUT', `/orders/${orderId}`, { token: admin.token, body: { status: 'confirmed' } });
    await api('PUT', `/orders/${orderId}`, { token: admin.token, body: { status: 'processing' } });
    await api('PUT', `/orders/${orderId}`, { token: admin.token, body: { status: 'shipped' } });
    await api('PUT', `/orders/${orderId}`, { token: admin.token, body: { status: 'delivered' } });
    const item = await db('order_items').first('orderItemID').where({ order_id: orderId });

    const markB = sSellB.events.length; const markO = sCustB.events.length;
    const ret = await api('POST', '/returns', { token: customerA.token, body: { order_item_id: item.orderItemID, quantity: 1, reason: 'damaged' } });
    const returnId = ret.body.data.id;
    expect((await waitFor(sAdmin, (e) => e.topic === 'return' && e.id === returnId && e.action === 'created')).message).toBe('New return request.');
    expect((await waitFor(sSellA, (e) => e.topic === 'return' && e.id === returnId)).message).toMatch(/requested a return/);
    expect(await waitFor(sCustA, (e) => e.topic === 'return' && e.id === returnId)).toBeTruthy();

    await api('POST', `/admin/returns/${returnId}/approve`, { token: admin.token, body: {} });
    expect((await waitFor(sCustA, (e) => e.topic === 'return' && e.action === 'approved')).message).toMatch(/approved/);
    await api('POST', `/admin/returns/${returnId}/refund`, { token: admin.token, body: { amount: 1000 } });
    expect((await waitFor(sSellA, (e) => e.topic === 'earnings')).action).toBe('refund');
    expect((await waitFor(sCustA, (e) => e.topic === 'return' && e.action === 'refunded')).message).toMatch(/refund/i);
    await sleep(400);
    expect(sSellB.events.length).toBe(markB);
    expect(sCustB.events.length).toBe(markO);
  });

  test('payouts: request → admin; processing → that seller only', async () => {
    const orderProduct = await createProduct(sellerB);
    await api('POST', `/seller/products/${orderProduct}/submit`, { token: sellerB.token });
    await api('POST', `/sellers/products/${orderProduct}/approve`, { token: admin.token });
    await api('POST', `/seller/products/${orderProduct}/publish`, { token: sellerB.token });
    const placed = await api('POST', '/orders', { token: customerA.token, body: { shipping_address: '3 Test St, Lahore', payment_method: 'online', items: [{ product_id: orderProduct, quantity: 2 }] } });
    await api('PUT', `/orders/${placed.body.data.id}`, { token: admin.token, body: { paymentStatus: 'paid' } });
    await api('PUT', `/orders/${placed.body.data.id}`, { token: admin.token, body: { status: 'confirmed' } });
    await api('PUT', `/orders/${placed.body.data.id}`, { token: admin.token, body: { status: 'processing' } });
    await api('PUT', `/orders/${placed.body.data.id}`, { token: admin.token, body: { status: 'shipped' } });
    await api('PUT', `/orders/${placed.body.data.id}`, { token: admin.token, body: { status: 'delivered' } });

    const markA = sSellA.events.length;
    const payout = await api('POST', '/seller/payouts', { token: sellerB.token, headers: { 'Idempotency-Key': `key-${uuid()}` }, body: { amount: 100 } });
    expect(payout.status).toBe(201);
    expect((await waitFor(sAdmin, (e) => e.topic === 'payout' && e.id === payout.body.data.id && e.action === 'requested')).message).toBe('New payout request.');
    await api('POST', `/admin/finance/payouts/${payout.body.data.id}/complete`, { token: admin.token, body: { reference: 'LIVE-REF-1' } });
    expect((await waitFor(sSellB, (e) => e.topic === 'payout' && e.action === 'completed')).message).toBe('Your payout was marked as paid.');
    await sleep(400);
    expect(sSellA.events.length).toBe(markA);
  });

  test('commission rate change reaches every seller and admins, never customers', async () => {
    const markC = sCustA.events.length;
    await api('POST', '/admin/finance/commission', { token: admin.token, body: { rate_percent: 6, note: 'live test' } });
    expect((await waitFor(sSellA, (e) => e.topic === 'commission')).message).toBe('The commission rate is now 6%.');
    expect(await waitFor(sSellB, (e) => e.topic === 'commission')).toBeTruthy();
    expect(await waitFor(sAdmin, (e) => e.topic === 'commission')).toBeTruthy();
    await sleep(400);
    expect(sCustA.events.length).toBe(markC);
    await api('POST', '/admin/finance/commission', { token: admin.token, body: { rate_percent: 5, note: 'restore default' } });
  });

  test('an action by a stranger does not leak: seller B product edits are invisible to seller A', async () => {
    const id = await createProduct(sellerB);
    await api('PUT', `/seller/products/${id}`, { token: sellerB.token, body: { description: 'changed' } });
    expect((await waitFor(sSellB, (e) => e.topic === 'product' && e.id === id && e.action === 'updated'))).toBeTruthy();
    await sleep(400);
    expect(sSellA.events.some((e) => e.id === id)).toBe(false);
    expect(sCustA.events.some((e) => e.id === id)).toBe(false);
  });
});
