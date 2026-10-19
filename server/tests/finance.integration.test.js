/**
 * Integration tests: commission, ledger, payouts, returns, analytics.
 * Same safety rule as the seller tests: refuses to run unless DB name contains "scratch" or "test".
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
const ledger = require('../src/libs/ledger');
const { toCents, fromCents, commissionCents } = require('../src/libs/money');
const { csvCell } = require('../src/api/v1/seller/seller.analytics');

const PASSWORD = 'Passw0rd!x';
const run = uuid().slice(0, 8);
let server;
let base;

const api = async (method, path, { token, body, headers = {}, raw = false } = {}) => {
  const res = await fetch(`${base}/api/v1${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json', Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (raw) return { status: res.status, text: await res.text(), headers: res.headers };
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

let category; let admin; let customer; let A; let B;

const publishedProduct = async (seller, over = {}) => {
  const created = await api('POST', '/seller/products', {
    token: seller.token,
    body: {
      name: `Item ${run}-${Math.random().toString(36).slice(2, 7)}`, category_id: category.categoryID, price: 1000, stock_quantity: 50, ...over,
    },
  });
  expect(created.status).toBe(201);
  const id = created.body.data.id;
  await api('POST', `/seller/products/${id}/submit`, { token: seller.token });
  await api('POST', `/sellers/products/${id}/approve`, { token: admin.token });
  await api('POST', `/seller/products/${id}/publish`, { token: seller.token });
  return id;
};

const order = async (items, { method = 'online', shipping = 0, user = customer } = {}) => {
  const res = await api('POST', '/orders', {
    token: user.token, body: { shipping_address: '1 Test Street, Lahore', payment_method: method, shipping_cost: shipping, items },
  });
  expect(res.status).toBe(201);
  return res.body.data.id;
};
// Walks the legal admin path (pending > confirmed > processing > shipped > delivered) to reach a status.
const PATH = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];
const setOrder = async (id, body) => {
  if (body.status && PATH.includes(body.status)) {
    const cur = (await db('orders').first('status').where({ orderID: id })).status;
    const from = PATH.indexOf(cur);
    const to = PATH.indexOf(body.status);
    if (from >= 0 && to > from + 1) {
      for (const step of PATH.slice(from + 1, to)) await api('PUT', `/orders/${id}`, { token: admin.token, body: { status: step } });
    }
  }
  return api('PUT', `/orders/${id}`, { token: admin.token, body });
};
const entries = (orderId, extra = {}) => db('seller_ledger_entries').where({ order_id: orderId, ...extra }).orderBy('createdOn').orderBy('entryType');
const sum = (rows, type) => rows.filter((r) => r.entryType === type).reduce((s, r) => s + toCents(r.amount), 0);
const cleanSellerOrderFlow = async (orderId) => {
  await setOrder(orderId, { paymentStatus: 'paid' });
  await setOrder(orderId, { status: 'delivered' });
};

beforeAll(async () => {
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  base = `http://127.0.0.1:${server.address().port}`;
  category = await db('categories').first('*').where({ isActive: true });
  admin = await makeUser('fadmin', 'Admin');
  customer = await makeUser('fcustomer', 'Customer');
  A = await makeSeller('fsellera');
  B = await makeSeller('fsellerb');
});

afterAll(async () => {
  // Leave the marketplace on the default rate for other suites.
  await db('commission_settings').insert({ rateBps: 500, note: 'test cleanup' });
  await new Promise((resolve) => server.close(resolve));
  await db.destroy();
});

describe('money helpers (decimal safety)', () => {
  test('integer cents avoid float drift', () => {
    expect(toCents('0.1') + toCents('0.2')).toBe(30);
    expect(fromCents(toCents('1234.5'))).toBe('1234.50');
    expect(fromCents(-5)).toBe('-0.05');
  });
  test('commission rounds half up on exact cents', () => {
    expect(commissionCents(toCents('99.99'), 500)).toBe(500); // 4.9995 -> 5.00
    expect(commissionCents(toCents('2000'), 500)).toBe(10000); // Rs. 100.00
    expect(commissionCents(toCents('0.10'), 500)).toBe(1); // 0.005 -> 0.01
  });
  test('missing or invalid commission configuration is an error, never 0%', async () => {
    const stub = (row) => {
      const chain = {
        where: () => chain, orderBy: () => chain, first: async () => row, fn: { now: () => 'now' },
      };
      const fn = () => chain;
      fn.fn = chain.fn;
      return fn;
    };
    await expect(ledger.getCurrentRate(stub(undefined))).rejects.toThrow(/not configured/);
    await expect(ledger.getCurrentRate(stub({ rateBps: 0 }))).rejects.toThrow(/not configured/);
    await expect(ledger.getCurrentRate(stub({ rateBps: null }))).rejects.toThrow(/not configured/);
    await expect(ledger.getCurrentRate(stub({ rateBps: 500 }))).resolves.toMatchObject({ rateBps: 500 });
  });
  test('CSV cells neutralise spreadsheet formulas', () => {
    expect(csvCell('=HYPERLINK("x")')).toBe('"\'=HYPERLINK(""x"")"');
    expect(csvCell('+1')).toBe("'+1");
    expect(csvCell('plain, text')).toBe('"plain, text"');
  });
});

describe('commission policy', () => {
  test('default rate is 5% and the public policy reflects the live configuration', async () => {
    const policy = await api('GET', '/seller/fee-policy');
    expect(policy.status).toBe(200);
    expect(policy.body.data).toMatchObject({
      commission_percent: 5, registration_fee: 0, monthly_fee: 0, listing_fee: 0, delivery_charges_in_commission: false,
    });
    const first = await db('commission_settings').orderBy('createdOn', 'asc').first();
    expect(first.rateBps).toBe(500);
  });

  test('worked example: Rs.2000 original, Rs.1800 discounted, Rs.200 delivery -> commission Rs.100', async () => {
    const id = await publishedProduct(A, { price: 2000, discount_price: 1800 });
    const orderId = await order([{ product_id: id, quantity: 1 }], { shipping: 200 });

    // unpaid order: nothing payable
    expect(await entries(orderId)).toHaveLength(0);
    await setOrder(orderId, { status: 'confirmed' });
    expect(await entries(orderId)).toHaveLength(0);

    await setOrder(orderId, { paymentStatus: 'paid' });
    const rows = await entries(orderId);
    expect(rows).toHaveLength(2);
    const credit = rows.find((r) => r.entryType === 'sale_earnings_credit');
    const fee = rows.find((r) => r.entryType === 'sale_commission');
    expect(Number(credit.amount)).toBe(1800); // discounted amount, delivery excluded
    expect(Number(fee.commissionBase)).toBe(2000); // original price before discount
    expect(fee.commissionRateBps).toBe(500);
    expect(Number(fee.amount)).toBe(-100);
    // seller proceeds before other adjustments: 1800 - 100 = 1700
    expect(sum(rows, 'sale_earnings_credit') + sum(rows, 'sale_commission')).toBe(170000);
  });

  test('decimal precision: Rs.33.33 x 3', async () => {
    const id = await publishedProduct(A, { price: 33.33 });
    const orderId = await order([{ product_id: id, quantity: 3 }]);
    await setOrder(orderId, { paymentStatus: 'paid' });
    const rows = await entries(orderId);
    expect(Number(rows.find((r) => r.entryType === 'sale_earnings_credit').amount)).toBe(99.99);
    expect(Number(rows.find((r) => r.entryType === 'sale_commission').amount)).toBe(-5); // 4.9995 half-up
  });

  test('multiple products and sellers are posted per line and per seller', async () => {
    const pa = await publishedProduct(A, { price: 1000 });
    const pb = await publishedProduct(B, { price: 500, discount_price: 400 });
    const orderId = await order([{ product_id: pa, quantity: 2 }, { product_id: pb, quantity: 3 }], { shipping: 150 });
    await setOrder(orderId, { paymentStatus: 'paid' });
    const rows = await entries(orderId);
    const forA = rows.filter((r) => r.seller_id === A.seller.sellerID);
    const forB = rows.filter((r) => r.seller_id === B.seller.sellerID);
    expect(sum(forA, 'sale_earnings_credit')).toBe(200000);
    expect(sum(forA, 'sale_commission')).toBe(-10000); // 5% of 2000
    expect(sum(forB, 'sale_earnings_credit')).toBe(120000); // 3 x 400
    expect(sum(forB, 'sale_commission')).toBe(-7500); // 5% of 3 x 500 original
  });

  test('order-level discount amounts do not change commission or proceeds (marketplace-funded assumption)', async () => {
    const id = await publishedProduct(A, { price: 1000 });
    const orderId = await order([{ product_id: id, quantity: 1 }]);
    await db('orders').where({ orderID: orderId }).update({ discountAmount: 300 });
    await setOrder(orderId, { paymentStatus: 'paid' });
    const rows = await entries(orderId);
    expect(sum(rows, 'sale_earnings_credit')).toBe(100000);
    expect(sum(rows, 'sale_commission')).toBe(-5000);
  });

  test('cancelled orders end with zero commission; unpaid cancelled orders never post', async () => {
    const id = await publishedProduct(A, { price: 800 });
    const unpaid = await order([{ product_id: id, quantity: 1 }]);
    await setOrder(unpaid, { status: 'cancelled' });
    expect(await entries(unpaid)).toHaveLength(0);

    const paid = await order([{ product_id: id, quantity: 1 }]);
    await setOrder(paid, { paymentStatus: 'paid' });
    await setOrder(paid, { status: 'cancelled' });
    const rows = await entries(paid);
    expect(rows.reduce((s, r) => s + toCents(r.amount), 0)).toBe(0); // fully reversed, history kept
    expect(rows.length).toBe(4);
    expect(sum(rows, 'commission_reversal')).toBe(4000);
    // cancelling again is a no-op
    await setOrder(paid, { status: 'cancelled' });
    expect((await entries(paid)).length).toBe(4);
  });

  test('COD becomes commission-eligible only when marked delivered (which records payment)', async () => {
    const id = await publishedProduct(A, { price: 1500 });
    const orderId = await order([{ product_id: id, quantity: 1 }], { method: 'cod' });
    await setOrder(orderId, { status: 'confirmed' });
    await setOrder(orderId, { status: 'shipped' });
    expect(await entries(orderId)).toHaveLength(0);
    await setOrder(orderId, { status: 'delivered' });
    expect((await db('orders').first('paymentStatus').where({ orderID: orderId })).paymentStatus).toBe('paid');
    const rows = await entries(orderId);
    expect(sum(rows, 'sale_commission')).toBe(-7500);
  });

  test('duplicate events and retries never double-post', async () => {
    const id = await publishedProduct(A, { price: 1000 });
    const orderId = await order([{ product_id: id, quantity: 1 }]);
    await Promise.all([1, 2, 3, 4].map(() => setOrder(orderId, { paymentStatus: 'paid' })));
    expect((await entries(orderId)).length).toBe(2);
    // direct re-run of the posting routine (e.g. a retried webhook) is also a no-op
    await db.transaction((trx) => ledger.postOrderEarnings(trx, orderId));
    await db.transaction((trx) => ledger.postOrderEarnings(trx, orderId));
    expect((await entries(orderId)).length).toBe(2);
  });

  test('ledger rows cannot be edited or deleted', async () => {
    const row = await db('seller_ledger_entries').first('ledgerEntryID');
    await expect(db('seller_ledger_entries').where({ ledgerEntryID: row.ledgerEntryID }).update({ amount: 1 })).rejects.toThrow(/append-only/);
    await expect(db('seller_ledger_entries').where({ ledgerEntryID: row.ledgerEntryID }).del()).rejects.toThrow(/append-only/);
  });
});

describe('admin commission settings', () => {
  test('only admins change the rate; input is validated; history keeps who/when', async () => {
    expect((await api('POST', '/admin/finance/commission', { token: A.token, body: { rate_percent: 1 } })).status).toBe(403);
    expect((await api('POST', '/admin/finance/commission', { token: customer.token, body: { rate_percent: 1 } })).status).toBe(403);
    expect((await api('POST', '/admin/finance/commission', { body: { rate_percent: 1 } })).status).toBe(401);
    for (const bad of [0, -1, 51, 'abc', 5.555, null]) {
      expect((await api('POST', '/admin/finance/commission', { token: admin.token, body: { rate_percent: bad } })).status).toBe(400);
    }
    const ok = await api('POST', '/admin/finance/commission', { token: admin.token, body: { rate_percent: 10, note: 'test change' } });
    expect(ok.status).toBe(201);
    const settings = await api('GET', '/admin/finance/commission', { token: admin.token });
    expect(settings.body.data.current.rate_percent).toBe(10);
    expect(settings.body.data.history[0]).toMatchObject({ rate_percent: 10, note: 'test change' });
    expect(settings.body.data.history[0].set_by).toContain('fadmin');
    expect((await api('GET', '/admin/finance/commission', { token: A.token })).status).toBe(403);
  });

  test('a new rate applies only to later postings; earlier entries keep their rate', async () => {
    // rate is 10% now (previous test). Earlier entries were posted at 5%.
    const id = await publishedProduct(A, { price: 1000 });
    const orderId = await order([{ product_id: id, quantity: 1 }]);
    await setOrder(orderId, { paymentStatus: 'paid' });
    const fee = (await entries(orderId)).find((r) => r.entryType === 'sale_commission');
    expect(fee.commissionRateBps).toBe(1000);
    expect(Number(fee.amount)).toBe(-100);
    const old = await db('seller_ledger_entries').where({ entryType: 'sale_commission' }).whereNot({ order_id: orderId }).distinct('commissionRateBps');
    expect(old.map((r) => r.commissionRateBps)).toContain(500);

    // reversing the 10% sale reverses exactly what was charged
    await setOrder(orderId, { status: 'cancelled' });
    expect((await entries(orderId)).reduce((s, r) => s + toCents(r.amount), 0)).toBe(0);

    const policy = await api('GET', '/seller/fee-policy');
    expect(policy.body.data.commission_percent).toBe(10);
    await api('POST', '/admin/finance/commission', { token: admin.token, body: { rate_percent: 5, note: 'restore default' } });
    expect((await api('GET', '/seller/fee-policy')).body.data.commission_percent).toBe(5);
  });
});

describe('returns and refunds', () => {
  let productId; let orderId; let itemId; let retId;

  test('customer can only return delivered items they own', async () => {
    productId = await publishedProduct(A, { price: 1000 });
    orderId = await order([{ product_id: productId, quantity: 3 }]);
    itemId = (await db('order_items').first('orderItemID').where({ order_id: orderId })).orderItemID;
    await setOrder(orderId, { paymentStatus: 'paid' });

    const early = await api('POST', '/returns', { token: customer.token, body: { order_item_id: itemId, quantity: 1, reason: 'damaged' } });
    expect(early.status).toBe(409); // not delivered yet

    await setOrder(orderId, { status: 'delivered' });
    const stranger = await makeUser('fstranger', 'Customer');
    expect((await api('POST', '/returns', { token: stranger.token, body: { order_item_id: itemId, quantity: 1, reason: 'damaged' } })).status).toBe(404);
    expect((await api('POST', '/returns', { token: customer.token, body: { order_item_id: itemId, quantity: 9, reason: 'damaged' } })).status).toBe(409);
    expect((await api('POST', '/returns', { token: customer.token, body: { order_item_id: itemId, quantity: 1, reason: 'bogus' } })).status).toBe(400);

    const ok = await api('POST', '/returns', { token: customer.token, body: { order_item_id: itemId, quantity: 1, reason: 'damaged', details: 'Screen cracked' } });
    expect(ok.status).toBe(201);
    retId = ok.body.data.id;
    expect((await api('GET', `/returns/${retId}`, { token: stranger.token })).status).toBe(404);
  });

  test('return window is enforced', async () => {
    const pid = await publishedProduct(A, { price: 500 });
    const oid = await order([{ product_id: pid, quantity: 1 }]);
    await setOrder(oid, { paymentStatus: 'paid' });
    await setOrder(oid, { status: 'delivered' });
    await db('orders').where({ orderID: oid }).update({ deliveredOn: new Date(Date.now() - 30 * 86400000) });
    const item = await db('order_items').first('orderItemID').where({ order_id: oid });
    const late = await api('POST', '/returns', { token: customer.token, body: { order_item_id: item.orderItemID, quantity: 1, reason: 'other' } });
    expect(late.status).toBe(409);
    expect(late.body.message).toMatch(/return window/);
  });

  test('sellers see only their own returns and cannot decide or refund', async () => {
    const own = await api('GET', '/seller/returns', { token: A.token });
    expect(own.body.data.map((r) => r.id)).toContain(retId);
    expect(JSON.stringify(own.body)).not.toContain(customer.email);
    const other = await api('GET', '/seller/returns', { token: B.token });
    expect(other.body.data.map((r) => r.id)).not.toContain(retId);
    expect((await api('GET', `/seller/returns/${retId}`, { token: B.token })).status).toBe(404);
    expect((await api('POST', `/seller/returns/${retId}/messages`, { token: B.token, body: { body: 'hello there' } })).status).toBe(404);

    expect((await api('POST', `/admin/returns/${retId}/approve`, { token: A.token })).status).toBe(403);
    expect((await api('POST', `/admin/returns/${retId}/refund`, { token: A.token, body: { amount: 1000 } })).status).toBe(403);
    expect((await api('POST', `/admin/returns/${retId}/refund`, { token: customer.token, body: { amount: 1000 } })).status).toBe(403);
    // not approved yet: seller cannot mark received, admin cannot refund
    expect((await api('POST', `/seller/returns/${retId}/receive`, { token: A.token, body: { note: 'got it' } })).status).toBe(409);
    expect((await api('POST', `/admin/returns/${retId}/refund`, { token: admin.token, body: { amount: 1000 } })).status).toBe(409);
    expect((await api('POST', `/seller/returns/${retId}/messages`, { token: A.token, body: { body: 'Please send photos' } })).status).toBe(201);
  });

  test('partial refund reverses commission proportionally, then the remainder exactly', async () => {
    expect((await api('POST', `/admin/returns/${retId}/approve`, { token: admin.token, body: { note: 'ok' } })).status).toBe(200);
    expect((await api('POST', `/seller/returns/${retId}/receive`, { token: A.token, body: { note: 'Cracked, as reported' } })).status).toBe(200);

    expect((await api('POST', `/admin/returns/${retId}/refund`, { token: admin.token, body: { amount: 1500 } })).status).toBe(409); // > 1 x 1000
    const refund = await api('POST', `/admin/returns/${retId}/refund`, { token: admin.token, body: { amount: 1000 } });
    expect(refund.status).toBe(200);
    expect(refund.body.data.earnings_adjusted).toBe(true);
    // idempotent: a second refund attempt is refused
    expect((await api('POST', `/admin/returns/${retId}/refund`, { token: admin.token, body: { amount: 1000 } })).status).toBe(409);

    let rows = await entries(orderId);
    expect(sum(rows, 'sale_earnings_credit')).toBe(300000);
    expect(sum(rows, 'refund_adjustment')).toBe(-100000);
    expect(sum(rows, 'sale_commission')).toBe(-15000); // 5% of 3000
    expect(sum(rows, 'commission_reversal')).toBe(5000); // proportional: 1/3 of 150

    // return the other two units
    const second = await api('POST', '/returns', { token: customer.token, body: { order_item_id: itemId, quantity: 2, reason: 'defective' } });
    expect(second.status).toBe(201);
    const sid = second.body.data.id;
    await api('POST', `/admin/returns/${sid}/approve`, { token: admin.token, body: {} });
    expect((await api('POST', `/admin/returns/${sid}/refund`, { token: admin.token, body: { amount: 2000 } })).status).toBe(200);
    rows = await entries(orderId);
    expect(sum(rows, 'sale_earnings_credit') + sum(rows, 'refund_adjustment')).toBe(0);
    expect(sum(rows, 'sale_commission') + sum(rows, 'commission_reversal')).toBe(0); // no rounding residue
    // nothing left to return
    expect((await api('POST', '/returns', { token: customer.token, body: { order_item_id: itemId, quantity: 1, reason: 'other' } })).status).toBe(409);
  });

  test('customer can cancel only an unreviewed return; rejections need a reason', async () => {
    const pid = await publishedProduct(A, { price: 700 });
    const oid = await order([{ product_id: pid, quantity: 2 }]);
    await cleanSellerOrderFlow(oid);
    const item = await db('order_items').first('orderItemID').where({ order_id: oid });
    const created = await api('POST', '/returns', { token: customer.token, body: { order_item_id: item.orderItemID, quantity: 1, reason: 'other' } });
    const id = created.body.data.id;
    expect((await api('POST', `/admin/returns/${id}/reject`, { token: admin.token, body: {} })).status).toBe(400);
    expect((await api('POST', `/admin/returns/${id}/reject`, { token: admin.token, body: { note: 'Outside policy' } })).status).toBe(200);
    expect((await api('POST', `/returns/${id}/cancel`, { token: customer.token })).status).toBe(409);
    const mine = await api('GET', '/returns/mine', { token: customer.token });
    expect(mine.body.data.find((r) => r.id === id).status).toBe('rejected');
    // rejected returns release the quantity
    expect((await api('POST', '/returns', { token: customer.token, body: { order_item_id: item.orderItemID, quantity: 2, reason: 'other' } })).status).toBe(201);
  });

  test('a full order refund reverses all earnings', async () => {
    const pid = await publishedProduct(B, { price: 1200 });
    const oid = await order([{ product_id: pid, quantity: 1 }]);
    await setOrder(oid, { paymentStatus: 'paid' });
    await setOrder(oid, { paymentStatus: 'refunded' });
    const rows = await entries(oid);
    expect(rows.reduce((s, r) => s + toCents(r.amount), 0)).toBe(0);
    expect(rows.some((r) => r.reason === 'order_refunded')).toBe(true);
  });
});

describe('earnings, isolation and payouts', () => {
  test('seller earnings view matches the ledger and exposes only their own data', async () => {
    const res = await api('GET', '/seller/earnings', { token: A.token });
    expect(res.status).toBe(200);
    const b = res.body.data.balances;
    const rows = await db('seller_ledger_entries').where({ seller_id: A.seller.sellerID });
    const net = rows.filter((r) => ['sale_earnings_credit', 'sale_commission', 'commission_reversal', 'refund_adjustment'].includes(r.entryType))
      .reduce((s, r) => s + toCents(r.amount), 0);
    expect(toCents(b.net_earnings)).toBe(net);
    expect(toCents(b.gross_product_sales - b.refunds - b.cancellations - b.commission_charged)).toBe(net);

    const aTx = await api('GET', '/seller/earnings/transactions?limit=100', { token: A.token });
    const bTx = await api('GET', '/seller/earnings/transactions?limit=100', { token: B.token });
    const aOrders = new Set(aTx.body.data.map((t) => t.order_id));
    bTx.body.data.forEach((t) => {
      const mixed = aOrders.has(t.order_id);
      if (mixed) expect(t.product).not.toBeNull();
    });
    // each line explains itself
    const line = aTx.body.data.find((t) => t.commission > 0);
    expect(line).toMatchObject({ commission_rate_percent: expect.any(Number) });
    expect(line.original_unit_price).toBeGreaterThanOrEqual(line.unit_price);

    const ledgerA = await api('GET', '/seller/earnings/ledger?limit=100', { token: A.token });
    const ids = new Set(ledgerA.body.data.map((e) => e.id));
    const foreign = await db('seller_ledger_entries').where({ seller_id: B.seller.sellerID }).first('ledgerEntryID');
    expect(ids.has(foreign.ledgerEntryID)).toBe(false);

    expect((await api('GET', '/seller/earnings', { token: customer.token })).status).toBe(403);
    expect((await api('GET', '/seller/earnings')).status).toBe(401);
  });

  test('pending vs available: earnings become available only after delivery', async () => {
    const S = await makeSeller('fsellerc');
    const pid = await publishedProduct(S, { price: 1000 });
    const oid = await order([{ product_id: pid, quantity: 1 }]);
    await setOrder(oid, { paymentStatus: 'paid' });
    let b = (await api('GET', '/seller/earnings', { token: S.token })).body.data.balances;
    expect(b).toMatchObject({ pending_earnings: 950, available_for_payout: 0 });
    await setOrder(oid, { status: 'delivered' });
    b = (await api('GET', '/seller/earnings', { token: S.token })).body.data.balances;
    expect(b).toMatchObject({ pending_earnings: 0, available_for_payout: 950, net_earnings: 950 });
  });

  describe('payouts', () => {
    let S; let payoutId;
    const key = () => `key-${uuid()}`;
    beforeAll(async () => {
      S = await makeSeller('fsellerd');
      const pid = await publishedProduct(S, { price: 1000 });
      const oid = await order([{ product_id: pid, quantity: 2 }]); // net 1900
      await cleanSellerOrderFlow(oid);
    });

    test('validation, balance limits and idempotency', async () => {
      expect((await api('POST', '/seller/payouts', { token: S.token, body: { amount: 100 } })).status).toBe(400); // no key
      expect((await api('POST', '/seller/payouts', { token: S.token, headers: { 'Idempotency-Key': key() }, body: { amount: -5 } })).status).toBe(400);
      expect((await api('POST', '/seller/payouts', { token: S.token, headers: { 'Idempotency-Key': key() }, body: { amount: 1.234 } })).status).toBe(400);
      expect((await api('POST', '/seller/payouts', { token: S.token, headers: { 'Idempotency-Key': key() }, body: { amount: 5000 } })).status).toBe(409);
      expect((await api('POST', '/seller/payouts', { token: customer.token, headers: { 'Idempotency-Key': key() }, body: { amount: 10 } })).status).toBe(403);

      const k = key();
      const first = await api('POST', '/seller/payouts', { token: S.token, headers: { 'Idempotency-Key': k }, body: { amount: 500 } });
      expect(first.status).toBe(201);
      payoutId = first.body.data.id;
      const replay = await api('POST', '/seller/payouts', { token: S.token, headers: { 'Idempotency-Key': k }, body: { amount: 500 } });
      expect(replay.status).toBe(200);
      expect(replay.body.data.id).toBe(payoutId);
      expect((await api('POST', '/seller/payouts', { token: S.token, headers: { 'Idempotency-Key': k }, body: { amount: 600 } })).status).toBe(409);
      expect(await db('payout_requests').where({ seller_id: S.seller.sellerID }).count({ n: '*' }).first()).toMatchObject({ n: '1' });

      const b = (await api('GET', '/seller/earnings', { token: S.token })).body.data.balances;
      expect(b).toMatchObject({ available_for_payout: 1400, payout_requested: 500, paid_out: 0 });
    });

    test('a request is not a completed payment; only an admin can complete, reject or fail it', async () => {
      expect((await api('POST', `/admin/finance/payouts/${payoutId}/complete`, { token: S.token, body: { reference: 'REF123' } })).status).toBe(403);
      expect((await api('POST', `/admin/finance/payouts/${payoutId}/complete`, { token: admin.token, body: {} })).status).toBe(400);
      const list = await api('GET', '/seller/payouts', { token: S.token });
      expect(list.body.data[0]).toMatchObject({ status: 'requested', reference: null });

      const done = await api('POST', `/admin/finance/payouts/${payoutId}/complete`, { token: admin.token, body: { reference: 'BANK-REF-123' } });
      expect(done.status).toBe(200);
      expect(done.body.data.status).toBe('completed');
      expect((await api('POST', `/admin/finance/payouts/${payoutId}/reject`, { token: admin.token, body: { reason: 'too late now' } })).status).toBe(409);
      let b = (await api('GET', '/seller/earnings', { token: S.token })).body.data.balances;
      expect(b).toMatchObject({ paid_out: 500, payout_requested: 0, available_for_payout: 1400 });

      // the transfer bounced: failure returns the money via a reversal entry
      expect((await api('POST', `/admin/finance/payouts/${payoutId}/fail`, { token: admin.token, body: { reason: 'Bank returned the transfer' } })).status).toBe(200);
      b = (await api('GET', '/seller/earnings', { token: S.token })).body.data.balances;
      expect(b).toMatchObject({ paid_out: 0, available_for_payout: 1900 });
      const types = (await db('seller_ledger_entries').where({ payout_id: payoutId })).map((r) => r.entryType).sort();
      expect(types).toEqual(['payout', 'payout_reversal']);
    });

    test('rejecting a request restores the balance; another seller cannot see or touch it', async () => {
      const first = await api('POST', '/seller/payouts', { token: S.token, headers: { 'Idempotency-Key': key() }, body: { amount: 1000 } });
      const id = first.body.data.id;
      const other = await makeSeller('fsellere');
      expect((await api('GET', '/seller/payouts', { token: other.token })).body.data).toHaveLength(0);
      expect((await api('POST', `/admin/finance/payouts/${id}/reject`, { token: other.token, body: { reason: 'not mine' } })).status).toBe(403);
      expect((await api('POST', `/admin/finance/payouts/${id}/reject`, { token: admin.token, body: { reason: 'Details incomplete' } })).status).toBe(200);
      const b = (await api('GET', '/seller/earnings', { token: S.token })).body.data.balances;
      expect(b.available_for_payout).toBe(1900);
    });

    test('concurrent payout requests can never overdraw the balance', async () => {
      const results = await Promise.all(Array.from({ length: 8 }, () => api('POST', '/seller/payouts', {
        token: S.token, headers: { 'Idempotency-Key': key() }, body: { amount: 600 },
      })));
      expect(results.filter((r) => r.status === 201)).toHaveLength(3); // 1900 / 600
      const b = (await api('GET', '/seller/earnings', { token: S.token })).body.data.balances;
      expect(b.available_balance).toBeGreaterThanOrEqual(0);
      expect(b.available_balance).toBe(100);
    });
  });

  test('admin finance views are admin-only and show balances', async () => {
    for (const path of ['/admin/finance/overview', '/admin/finance/sellers', '/admin/finance/commissions', '/admin/finance/payouts']) {
      expect((await api('GET', path, { token: A.token })).status).toBe(403);
      expect((await api('GET', path, { token: customer.token })).status).toBe(403);
      expect((await api('GET', path)).status).toBe(401);
      expect((await api('GET', path, { token: admin.token })).status).toBe(200);
    }
    const sellers = await api('GET', '/admin/finance/sellers?limit=100', { token: admin.token });
    const row = sellers.body.data.find((s) => s.id === A.seller.sellerID);
    const mine = (await api('GET', '/seller/earnings', { token: A.token })).body.data.balances;
    expect(row.net_earnings).toBe(mine.net_earnings);
    for (const group of ['day', 'seller', 'order']) {
      const report = await api('GET', `/admin/finance/commissions?group=${group}`, { token: admin.token });
      expect(report.status).toBe(200);
      expect(report.body.data.length).toBeGreaterThan(0);
    }
    const detail = await api('GET', `/admin/finance/sellers/${A.seller.sellerID}`, { token: admin.token });
    expect(detail.body.data.ledger.length).toBeGreaterThan(0);
  });
});

describe('dashboard earnings come from the ledger', () => {
  test('fees, net, pending and available equal direct ledger sums', async () => {
    const dash = (await api('GET', '/seller/dashboard?from=2020-01-01', { token: A.token })).body.data;
    const earn = ['sale_earnings_credit', 'sale_commission', 'commission_reversal', 'refund_adjustment'];
    const rows = await db('seller_ledger_entries as l').leftJoin('orders as o', 'o.orderID', 'l.order_id').where('l.seller_id', A.seller.sellerID).select('l.entryType', 'l.amount', 'o.status');
    const net = rows.filter((r) => earn.includes(r.entryType)).reduce((s, r) => s + toCents(r.amount), 0);
    const fees = -rows.filter((r) => ['sale_commission', 'commission_reversal'].includes(r.entryType)).reduce((s, r) => s + toCents(r.amount), 0);
    const pending = rows.filter((r) => earn.includes(r.entryType) && r.status !== 'delivered').reduce((s, r) => s + toCents(r.amount), 0);
    expect(toCents(dash.earnings.net_earnings)).toBe(net);
    expect(toCents(dash.earnings.fees)).toBe(fees);
    expect(toCents(dash.earnings.pending_earnings)).toBe(pending);
    expect(dash.earnings.available_balance).toBeGreaterThanOrEqual(0);
  });
});

describe('analytics and export', () => {
  test('totals match the database and compare with the previous period', async () => {
    const res = await api('GET', '/seller/analytics?from=2020-01-01', { token: A.token });
    expect(res.status).toBe(200);
    const d = res.body.data;
    const sql = await db('order_items as oi').join('orders as o', 'o.orderID', 'oi.order_id')
      .where('oi.seller_id', A.seller.sellerID).whereNot('o.status', 'cancelled')
      .sum({ g: 'oi.totalPrice' }).count({ n: db.raw('distinct o."orderID"') }).first();
    expect(d.totals.gross_sales).toBeCloseTo(Number(sql.g), 2);
    expect(d.totals.orders).toBe(Number(sql.n));
    expect(d.totals.net_sales).toBeCloseTo(d.totals.gross_sales - d.totals.refunds, 2);
    expect(d.series.reduce((s, r) => s + r.gross, 0)).toBeCloseTo(d.totals.gross_sales, 2);
    expect(d.products.reduce((s, r) => s + r.gross, 0)).toBeCloseTo(d.totals.gross_sales, 2);
    expect(d.totals.refunds).toBeGreaterThan(0); // the return refunds above
    expect(d.status_breakdown.length).toBeGreaterThan(0);

    const week = await api('GET', '/seller/analytics?from=2020-01-01&granularity=month', { token: A.token });
    expect(week.body.data.range.granularity).toBe('month');
    const today = new Date().toISOString().slice(0, 10);
    const cmp = await api('GET', `/seller/analytics?from=${today}&to=${today}`, { token: A.token });
    expect(cmp.body.data.comparison.range.to < today).toBe(true);
    expect(cmp.body.data.comparison.sufficient_data).toBe(false); // nothing yesterday: no misleading %
    expect((await api('GET', '/seller/analytics', { token: customer.token })).status).toBe(403);
  });

  test('CSV export contains only the seller\'s rows and neutralises formulas', async () => {
    const pid = await publishedProduct(B, { name: `=SUM(1+1) ${run}`, price: 100 });
    const oid = await order([{ product_id: pid, quantity: 1 }]);
    await setOrder(oid, { paymentStatus: 'paid' });
    const csvB = await api('GET', '/seller/analytics/export.csv?from=2020-01-01', { token: B.token, raw: true });
    expect(csvB.status).toBe(200);
    expect(csvB.headers.get('content-type')).toMatch(/text\/csv/);
    expect(csvB.headers.get('content-disposition')).toMatch(/attachment/);
    expect(csvB.text).toContain(`'=SUM(1+1) ${run}`);
    expect(csvB.text).not.toMatch(/,=SUM/);
    const csvA = await api('GET', '/seller/analytics/export.csv?from=2020-01-01', { token: A.token, raw: true });
    expect(csvA.text).not.toContain(`SUM(1+1) ${run}`);
    expect((await api('GET', '/seller/analytics/export.csv', { token: customer.token, raw: true })).status).toBe(403);
  });
});

describe('seller notification preferences', () => {
  test('sellers can toggle their own preferences', async () => {
    const off = await api('PUT', '/seller/profile', { token: A.token, body: { notify_new_order: false, notify_payouts: false } });
    expect(off.status).toBe(200);
    expect(off.body.data.notifications).toEqual({ new_order: false, returns: true, payouts: false });
    expect((await api('PUT', '/seller/profile', { token: A.token, body: { notify_returns: 'yes' } })).status).toBe(400);
    await api('PUT', '/seller/profile', { token: A.token, body: { notify_new_order: true, notify_payouts: true } });
  });
});
