/**
 * Filters, search and pagination on every seller list endpoint: they must filter correctly,
 * combine, paginate with correct totals, and never leak another seller's data.
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

let admin; let customer; let category; let A; let B;
const idsA = {}; const idsB = {};

const publish = async (seller, over) => {
  const created = await api('POST', '/seller/products', {
    token: seller.token, body: { category_id: category.categoryID, price: 1000, stock_quantity: 20, ...over },
  });
  expect(created.status).toBe(201);
  const id = created.body.data.id;
  await api('POST', `/seller/products/${id}/submit`, { token: seller.token });
  await api('POST', `/sellers/products/${id}/approve`, { token: admin.token });
  await api('POST', `/seller/products/${id}/publish`, { token: seller.token });
  return id;
};
const place = async (items) => {
  const res = await api('POST', '/orders', { token: customer.token, body: { shipping_address: '1 Test St, Lahore', payment_method: 'online', items } });
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

beforeAll(async () => {
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  base = `http://127.0.0.1:${server.address().port}`;
  category = await db('categories').first('*').where({ isActive: true });
  admin = await makeUser('gadmin', 'Admin');
  customer = await makeUser('gcustomer', 'Customer');
  A = await makeSeller('gsellera');
  B = await makeSeller('gsellerb');

  // Seller A: 4 distinct products. Seller B: 1 product with a unique name.
  idsA.cheap = await publish(A, { name: `Alpha Lamp ${run}`, price: 100, stock_quantity: 50 });
  idsA.low = await publish(A, { name: `Alpha Mug ${run}`, price: 300, stock_quantity: 3 });
  idsA.out = await publish(A, { name: `Beta Pen ${run}`, price: 200, stock_quantity: 0 });
  const draft = await api('POST', '/seller/products', { token: A.token, body: { name: `Gamma Draft ${run}`, category_id: category.categoryID, price: 500, stock_quantity: 9 } });
  idsA.draft = draft.body.data.id;
  idsB.secret = await publish(B, { name: `Zeta Secret ${run}`, price: 777, stock_quantity: 40 });
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
  await db.destroy();
});

const list = async (path, token = A.token) => (await api('GET', path, { token })).body;
const names = (body) => body.data.map((p) => p.name);

describe('products list: search, filters, combinations, sorting, pagination', () => {
  test('search matches the seller\'s own products only', async () => {
    expect(names(await list(`/seller/products?search=Alpha&limit=50`)).sort()).toEqual([`Alpha Lamp ${run}`, `Alpha Mug ${run}`]);
    expect((await list(`/seller/products?search=Zeta`)).data).toHaveLength(0); // seller B's product
    expect((await list(`/seller/products?search=Zeta`, B.token)).data).toHaveLength(1);
    expect((await list(`/seller/products?search=%25`)).data).toHaveLength(0); // LIKE wildcard is literal
  });

  test('status, stock and sort filters work alone and together', async () => {
    expect(names(await list('/seller/products?status=draft'))).toEqual([`Gamma Draft ${run}`]);
    expect(names(await list(`/seller/products?stock=out&search=${run}`))).toEqual([`Beta Pen ${run}`]);
    expect(names(await list(`/seller/products?stock=low&search=${run}`))).toEqual([`Alpha Mug ${run}`]);
    expect(names(await list(`/seller/products?stock=in&status=published&search=Alpha`))).toEqual([`Alpha Lamp ${run}`]);
    expect((await list(`/seller/products?stock=out&status=draft`)).data).toHaveLength(0); // combination narrows
    const byPriceAsc = await list(`/seller/products?sort=price&order=asc&search=${run}`);
    expect(byPriceAsc.data.map((p) => p.price)).toEqual([...byPriceAsc.data.map((p) => p.price)].sort((x, y) => x - y));
    const byPriceDesc = await list(`/seller/products?sort=price&order=desc&search=${run}`);
    expect(byPriceDesc.data[0].price).toBeGreaterThanOrEqual(byPriceDesc.data[byPriceDesc.data.length - 1].price);
  });

  test('category filter and unknown values', async () => {
    const all = await list(`/seller/products?search=${run}&limit=50`);
    expect((await list(`/seller/products?category_id=${category.categoryID}&search=${run}&limit=50`)).pagination.total).toBe(all.pagination.total);
    expect((await list(`/seller/products?category_id=${uuid()}&search=${run}`)).data).toHaveLength(0);
    // junk values are ignored rather than breaking the query
    expect((await list(`/seller/products?status=hacked&stock=nope&sort=drop&order=sideways&search=${run}`)).pagination.total).toBe(all.pagination.total);
  });

  test('pagination totals stay correct under filters and clearing restores everything', async () => {
    const first = await list(`/seller/products?search=${run}&limit=2&page=1`);
    const second = await list(`/seller/products?search=${run}&limit=2&page=2`);
    expect(first.pagination).toMatchObject({ total: 4, totalPages: 2, hasNextPage: true, hasPrevPage: false });
    expect(second.pagination).toMatchObject({ page: 2, hasNextPage: false, hasPrevPage: true });
    const seen = new Set([...first.data, ...second.data].map((p) => p.id));
    expect(seen.size).toBe(4); // no repeats or gaps across pages
    const filtered = await list(`/seller/products?search=${run}&stock=low&limit=2&page=1`);
    expect(filtered.pagination.total).toBe(1);
    expect((await list(`/seller/products?search=${run}&limit=50`)).pagination.total).toBe(4); // cleared
  });

  test('another seller\'s filters never reveal these products', async () => {
    const theirs = await list(`/seller/products?search=Alpha&limit=50`, B.token);
    expect(theirs.data).toHaveLength(0);
    expect((await list('/seller/products?status=draft', B.token)).data).toHaveLength(0);
  });
});

describe('inventory filters', () => {
  test('search + stock level, isolated per seller', async () => {
    expect(names(await list(`/seller/inventory?search=${run}&stock=out`))).toEqual([`Beta Pen ${run}`]);
    expect(names(await list(`/seller/inventory?search=${run}&stock=low`))).toEqual([`Alpha Mug ${run}`]);
    expect((await list(`/seller/inventory?search=Zeta`)).data).toHaveLength(0);
    expect((await list(`/seller/inventory?search=Zeta`, B.token)).data).toHaveLength(1);
    expect((await list(`/seller/inventory?search=${run}&limit=50`)).pagination.total).toBe(4);
  });
});

describe('orders filters', () => {
  let orderA; let orderB; let mixed;
  beforeAll(async () => {
    orderA = await place([{ product_id: idsA.cheap, quantity: 1 }]);
    orderB = await place([{ product_id: idsB.secret, quantity: 1 }]);
    mixed = await place([{ product_id: idsA.low, quantity: 1 }, { product_id: idsB.secret, quantity: 2 }]);
    await setOrder(orderA, { status: 'confirmed' });
    await setOrder(mixed, { status: 'confirmed' });
    await setOrder(mixed, { paymentStatus: 'paid' });
  });
  const code = async (id) => (await db('orders').first('orderCode').where({ orderID: id })).orderCode;

  test('search by order number only returns the seller\'s own orders', async () => {
    expect((await list(`/seller/orders?search=${await code(orderA)}`)).data.map((o) => o.id)).toEqual([orderA]);
    expect((await list(`/seller/orders?search=${await code(orderB)}`)).data).toHaveLength(0); // B-only order
    expect((await list(`/seller/orders?search=${await code(orderB)}`, B.token)).data.map((o) => o.id)).toEqual([orderB]);
    const mixedForA = (await list(`/seller/orders?search=${await code(mixed)}`)).data[0];
    expect(mixedForA.units).toBe(1); // A's line only
    expect(mixedForA.seller_subtotal).toBe(300);
  });

  test('status, fulfillment and date filters combine', async () => {
    const confirmed = await list('/seller/orders?status=confirmed&limit=50');
    expect(confirmed.data.every((o) => o.order_status === 'confirmed')).toBe(true);
    expect(confirmed.data.map((o) => o.id)).toEqual(expect.arrayContaining([orderA]));
    const today = new Date().toISOString().slice(0, 10);
    const dated = await list(`/seller/orders?status=confirmed&from=${today}&to=${today}&limit=50`);
    expect(dated.pagination.total).toBe(confirmed.pagination.total);
    expect((await list('/seller/orders?from=2000-01-01&to=2000-01-02')).data).toHaveLength(0);
    expect((await list('/seller/orders?status=cancelled&limit=50')).data.map((o) => o.id)).not.toContain(orderA);
    expect((await list('/seller/orders?fulfillment=shipped')).data.every((o) => o.fulfillment_status === 'shipped')).toBe(true);
    // invalid dates are ignored instead of erroring
    expect((await api('GET', '/seller/orders?from=not-a-date', { token: A.token })).status).toBe(200);
  });
});

describe('earnings filters', () => {
  let paidOrder;
  beforeAll(async () => {
    paidOrder = await place([{ product_id: idsA.cheap, quantity: 2 }]);
    await setOrder(paidOrder, { paymentStatus: 'paid' });
    await setOrder(paidOrder, { status: 'delivered' });
  });

  test('order breakdown: search and order-status filters, no leakage', async () => {
    const code = (await db('orders').first('orderCode').where({ orderID: paidOrder })).orderCode;
    const hit = await list(`/seller/earnings/transactions?search=${code}`);
    expect(hit.data).toHaveLength(1);
    expect(hit.data[0]).toMatchObject({ order_code: code, quantity: 2, order_status: 'delivered' });
    expect((await list(`/seller/earnings/transactions?search=${code}`, B.token)).data).toHaveLength(0);
    const delivered = await list('/seller/earnings/transactions?status=delivered&limit=50');
    expect(delivered.data.every((t) => t.order_status === 'delivered')).toBe(true);
    expect((await list('/seller/earnings/transactions?status=cancelled&search=' + code)).data).toHaveLength(0);
    expect((await list('/seller/earnings/transactions?from=2000-01-01&to=2000-01-02')).data).toHaveLength(0);
  });

  test('ledger: type and date filters', async () => {
    const commission = await list('/seller/earnings/ledger?type=sale_commission&limit=50');
    expect(commission.data.length).toBeGreaterThan(0);
    expect(commission.data.every((e) => e.type === 'sale_commission')).toBe(true);
    const all = await list('/seller/earnings/ledger?limit=100');
    expect(all.pagination.total).toBeGreaterThan(commission.pagination.total);
    expect((await list('/seller/earnings/ledger?type=bogus&limit=100')).pagination.total).toBe(all.pagination.total);
    expect((await list('/seller/earnings/ledger?from=2000-01-01&to=2000-01-02')).data).toHaveLength(0);
    const bLedger = await list('/seller/earnings/ledger?limit=100', B.token);
    const aIds = new Set(all.data.map((e) => e.id));
    expect(bLedger.data.some((e) => aIds.has(e.id))).toBe(false);
  });

  test('payouts: status/date filters with pagination, isolated per seller', async () => {
    const key = () => `key-${uuid()}`;
    const p1 = await api('POST', '/seller/payouts', { token: A.token, headers: { 'Idempotency-Key': key() }, body: { amount: 50 } });
    const p2 = await api('POST', '/seller/payouts', { token: A.token, headers: { 'Idempotency-Key': key() }, body: { amount: 60 } });
    expect([p1.status, p2.status]).toEqual([201, 201]);
    await api('POST', `/admin/finance/payouts/${p2.body.data.id}/reject`, { token: admin.token, body: { reason: 'testing filters' } });

    const requested = await list('/seller/payouts?status=requested');
    expect(requested.data.map((p) => p.id)).toEqual([p1.body.data.id]);
    expect((await list('/seller/payouts?status=rejected')).data.map((p) => p.id)).toEqual([p2.body.data.id]);
    expect((await list('/seller/payouts?limit=1&page=2')).pagination).toMatchObject({ total: 2, page: 2, hasNextPage: false });
    expect((await list('/seller/payouts?from=2000-01-01&to=2000-01-02')).data).toHaveLength(0);
    expect((await list('/seller/payouts', B.token)).data).toHaveLength(0);
  });
});

describe('returns filters and access', () => {
  test('status + search filters and isolation', async () => {
    const orderId = await place([{ product_id: idsA.cheap, quantity: 1 }]);
    await setOrder(orderId, { paymentStatus: 'paid' });
    await setOrder(orderId, { status: 'delivered' });
    const item = await db('order_items').first('orderItemID').where({ order_id: orderId });
    const ret = await api('POST', '/returns', { token: customer.token, body: { order_item_id: item.orderItemID, quantity: 1, reason: 'other' } });
    expect(ret.status).toBe(201);
    const code = (await db('orders').first('orderCode').where({ orderID: orderId })).orderCode;
    expect((await list(`/seller/returns?search=${code}`)).data.map((r) => r.id)).toEqual([ret.body.data.id]);
    expect((await list('/seller/returns?status=requested&limit=50')).data.map((r) => r.id)).toContain(ret.body.data.id);
    expect((await list('/seller/returns?status=refunded')).data.map((r) => r.id)).not.toContain(ret.body.data.id);
    expect((await list(`/seller/returns?search=${code}`, B.token)).data).toHaveLength(0);
  });
});

describe('access control on filtered endpoints', () => {
  test('unauthenticated and customer requests are rejected, whatever the filters', async () => {
    for (const path of ['/seller/products?search=a', '/seller/inventory?stock=low', '/seller/orders?status=confirmed', '/seller/returns?status=requested',
      '/seller/earnings/transactions?status=delivered', '/seller/earnings/ledger?type=payout', '/seller/payouts?status=requested', '/seller/analytics?from=2020-01-01']) {
      expect((await api('GET', path)).status).toBe(401);
      expect((await api('GET', path, { token: customer.token })).status).toBe(403);
      expect((await api('GET', path, { token: admin.token })).status).toBe(403); // admins use /admin/* endpoints
    }
  });
});
