/**
 * Integration tests for the seller dashboard (phase 1). They run the real app
 * against a real Postgres database, so they REFUSE to run unless the database
 * name contains "scratch" or "test". Prepare one with:
 *   createdb ahm_mart_scratch && DB_NAME=ahm_mart_scratch npm run migrate && DB_NAME=ahm_mart_scratch npm run seed
 *   DB_NAME=ahm_mart_scratch npm test
 */
process.env.NODE_ENV = 'development'; // knexfile only defines development/production
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
let server;
let base;

const api = async (method, path, { token, body } = {}) => {
  const res = await fetch(`${base}/api/v1${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch { /* empty body */ }
  return { status: res.status, body: json };
};

const roleId = async (name) => (await db('accessTemplate').first('accessTemplateID').where({ name })).accessTemplateID;

const makeUser = async (label, roleName) => {
  const email = `${label}.${run}@test.local`;
  const [user] = await db('user').insert({
    firstName: label, lastName: 'Tester', email, password: PASSWORD, isActive: true, isEmailVerified: true, status: 'Active', accessTemplateID: await roleId(roleName),
  }, '*');
  const login = await api('POST', '/auth/login', { body: { email, password: PASSWORD } });
  if (!login.body?.token) throw new Error(`login failed for ${label}: ${JSON.stringify(login.body)}`);
  return { ...user, token: login.body.token };
};

const makeApprovedSeller = async (label) => {
  const user = await makeUser(label, 'Seller');
  const [seller] = await db('sellers').insert({ user_id: user.userID, shopName: `${label} Shop ${run}`, status: 'approved', contactPhone: '03001234567' }, '*');
  return { user, seller, token: user.token };
};

let category;
let admin; let customer; let A; let B;

const validProduct = (over = {}) => ({
  name: `Widget ${run}-${Math.random().toString(36).slice(2, 7)}`, description: 'A widget', category_id: category.categoryID, price: 1000, stock_quantity: 10, ...over,
});

// Creates a product for a seller and walks it through approval so it is purchasable.
const publishedProduct = async (seller, admin_, over = {}) => {
  const created = await api('POST', '/seller/products', { token: seller.token, body: validProduct(over) });
  expect(created.status).toBe(201);
  const id = created.body.data.id;
  expect((await api('POST', `/seller/products/${id}/submit`, { token: seller.token })).status).toBe(200);
  expect((await api('POST', `/sellers/products/${id}/approve`, { token: admin_.token })).status).toBe(200);
  expect((await api('POST', `/seller/products/${id}/publish`, { token: seller.token })).status).toBe(200);
  return id;
};

const checkout = (user, items) => api('POST', '/orders', {
  token: user.token, body: { shipping_address: '1 Test Street, Lahore', payment_method: 'cod', items },
});

const stockOf = async (id) => (await db('products').first('stockQuantity').where({ productID: id })).stockQuantity;

beforeAll(async () => {
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  base = `http://127.0.0.1:${server.address().port}`;

  category = await db('categories').first('*').where({ isActive: true });
  admin = await makeUser('admin', 'Admin');
  customer = await makeUser('customer', 'Customer');
  A = await makeApprovedSeller('sellera');
  B = await makeApprovedSeller('sellerb');
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
  await db.destroy();
});

describe('1-2. access control', () => {
  test('unauthenticated visitor is rejected from seller APIs', async () => {
    const res = await api('GET', '/seller/dashboard');
    expect(res.status).toBe(401);
  });

  test('customer cannot use seller APIs', async () => {
    expect((await api('GET', '/seller/dashboard', { token: customer.token })).status).toBe(403);
    expect((await api('GET', '/seller/products', { token: customer.token })).status).toBe(403);
    expect((await api('POST', '/seller/products', { token: customer.token, body: validProduct() })).status).toBe(403);
  });

  test('8. non-admins cannot approve sellers, review products or read admin data', async () => {
    const target = A.seller.sellerID;
    expect((await api('POST', `/sellers/${target}/approve`, { token: customer.token })).status).toBe(403);
    expect((await api('POST', `/sellers/${target}/suspend`, { token: A.token, body: { reason: 'nope nope' } })).status).toBe(403);
    expect((await api('GET', '/sellers', { token: A.token })).status).toBe(403);
    expect((await api('GET', '/sellers')).status).toBe(401);
    expect((await api('GET', '/reports/sales', { token: A.token })).status).toBe(403);
    expect((await api('GET', '/user', { token: customer.token })).status).toBe(403);
    expect((await api('PUT', '/orders/' + uuid(), { token: A.token, body: { paymentStatus: 'refunded' } })).status).toBe(403);
  });

  test('categories can no longer be created anonymously', async () => {
    expect((await api('POST', '/categories', { body: { name: 'hack' } })).status).toBe(401);
  });
});

describe('3. onboarding and pending sellers', () => {
  let applicant;
  test('customer applies and stays pending with no seller privileges', async () => {
    applicant = await makeUser('applicant', 'Customer');
    const bad = await api('POST', '/seller/apply', { token: applicant.token, body: { shop_name: 'x' } });
    expect(bad.status).toBe(400);

    const ok = await api('POST', '/seller/apply', {
      token: applicant.token,
      body: { shop_name: `Applicant Store ${run}`, contact_phone: '03111234567', accept_terms: true },
    });
    expect(ok.status).toBe(201);
    expect(ok.body.data.status).toBe('pending');

    const again = await api('POST', '/seller/apply', {
      token: applicant.token, body: { shop_name: `Another ${run}`, contact_phone: '03111234567', accept_terms: true },
    });
    expect(again.status).toBe(409);

    const me = await api('GET', '/seller/me', { token: applicant.token });
    expect(me.body.data.status).toBe('pending');
    const role = await db('accessTemplate').first('type').where('accessTemplateID', (await db('user').first('accessTemplateID').where({ userID: applicant.userID })).accessTemplateID);
    expect(role.type).toBe('Customer');
  });

  test('pending seller cannot create or publish products', async () => {
    expect((await api('POST', '/seller/products', { token: applicant.token, body: validProduct() })).status).toBe(403);
    expect((await api('GET', '/seller/orders', { token: applicant.token })).status).toBe(403);
  });

  test('role is not changed by sending role-like fields', async () => {
    await api('POST', '/seller/apply', { token: customer.token, body: { shop_name: `Sneaky ${run}`, contact_phone: '03111234567', accept_terms: true, status: 'approved', role: 'Admin' } });
    const row = await db('sellers').first('status').where({ user_id: customer.userID });
    expect(row.status).toBe('pending');
    await db('sellers').where({ user_id: customer.userID }).del();
  });

  test('admin approval promotes the applicant; rejection needs a reason', async () => {
    const sellerRow = await db('sellers').first('sellerID').where({ user_id: applicant.userID });
    expect((await api('POST', `/sellers/${sellerRow.sellerID}/reject`, { token: admin.token, body: {} })).status).toBe(400);
    const approved = await api('POST', `/sellers/${sellerRow.sellerID}/approve`, { token: admin.token });
    expect(approved.status).toBe(200);
    expect((await api('GET', '/seller/dashboard', { token: applicant.token })).status).toBe(200);
    // a second review of the same application is refused
    expect((await api('POST', `/sellers/${sellerRow.sellerID}/approve`, { token: admin.token })).status).toBe(409);
  });

  test('suspended seller loses access and storefront products are hidden', async () => {
    const S = await makeApprovedSeller('suspendme');
    const productId = await publishedProduct(S, admin);
    expect((await api('POST', `/sellers/${S.seller.sellerID}/suspend`, { token: admin.token, body: { reason: 'policy violation' } })).status).toBe(200);
    const res = await api('GET', '/seller/dashboard', { token: S.token });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('seller_suspended');
    expect((await db('products').first('isActive').where({ productID: productId })).isActive).toBe(false);
  });
});

describe('4-5. product management and ownership', () => {
  test('approved seller creates and edits own product; it is hidden until approved', async () => {
    const created = await api('POST', '/seller/products', { token: A.token, body: validProduct({ seller_id: B.seller.sellerID, approvalStatus: 'approved', isActive: true }) });
    expect(created.status).toBe(201);
    const p = created.body.data;
    expect(p.approval_status).toBe('draft');
    expect(p.is_active).toBe(false);
    const row = await db('products').first('seller_id').where({ productID: p.id });
    expect(row.seller_id).toBe(A.seller.sellerID); // body seller_id ignored

    const pub = await api('GET', `/products/${p.slug}`);
    expect(pub.status).toBe(404);

    const edited = await api('PUT', `/seller/products/${p.id}`, { token: A.token, body: { name: `Renamed ${run}`, price: 1200 } });
    expect(edited.status).toBe(200);
    expect(edited.body.data.price).toBe(1200);

    expect((await api('POST', `/seller/products/${p.id}/publish`, { token: A.token })).status).toBe(409);
    expect((await api('POST', `/seller/products/${p.id}/submit`, { token: A.token })).status).toBe(200);

    const rej = await api('POST', `/sellers/products/${p.id}/reject`, { token: admin.token, body: { reason: 'Blurry photos' } });
    expect(rej.status).toBe(200);
    const afterReject = await api('GET', `/seller/products/${p.id}`, { token: A.token });
    expect(afterReject.body.data.approval_status).toBe('rejected');
    expect(afterReject.body.data.rejection_reason).toBe('Blurry photos');

    // edit + resubmit, then approve and publish
    expect((await api('POST', `/seller/products/${p.id}/submit`, { token: A.token })).status).toBe(200);
    expect((await api('POST', `/sellers/products/${p.id}/approve`, { token: admin.token })).status).toBe(200);
    expect((await api('POST', `/seller/products/${p.id}/publish`, { token: A.token })).status).toBe(200);
    expect((await api('GET', `/products/${afterReject.body.data.slug}`)).status).toBe(200);

    // editing customer-facing details of a live product sends it back to review
    const live = await api('PUT', `/seller/products/${p.id}`, { token: A.token, body: { price: 900 } });
    expect(live.body.data.approval_status).toBe('pending_review');
    expect(live.body.data.is_active).toBe(false);
    expect((await api('GET', `/products/${afterReject.body.data.slug}`)).status).toBe(404);
  });

  test('validation rejects bad input', async () => {
    const bad = await api('POST', '/seller/products', { token: A.token, body: validProduct({ price: -5, name: 'x' }) });
    expect(bad.status).toBe(400);
    const badDiscount = await api('POST', '/seller/products', { token: A.token, body: validProduct({ price: 100, discount_price: 150 }) });
    expect(badDiscount.status).toBe(400);
    const badStock = await api('POST', '/seller/products', { token: A.token, body: validProduct({ stock_quantity: -1 }) });
    expect(badStock.status).toBe(400);
  });

  test('5. a seller cannot read or modify another seller\'s product', async () => {
    const created = await api('POST', '/seller/products', { token: B.token, body: validProduct() });
    const id = created.body.data.id;
    expect((await api('GET', `/seller/products/${id}`, { token: A.token })).status).toBe(404);
    expect((await api('PUT', `/seller/products/${id}`, { token: A.token, body: { name: 'hijacked' } })).status).toBe(404);
    expect((await api('POST', `/seller/products/${id}/submit`, { token: A.token })).status).toBe(404);
    expect((await api('DELETE', `/seller/products/${id}`, { token: A.token })).status).toBe(404);
    expect((await api('PUT', `/seller/inventory/${id}`, { token: A.token, body: { mode: 'set', quantity: 999 } })).status).toBe(404);
    expect((await api('GET', `/seller/inventory/${id}/movements`, { token: A.token })).status).toBe(404);
    const list = await api('GET', '/seller/products?limit=100', { token: A.token });
    expect(list.body.data.some((p) => p.id === id)).toBe(false);
    expect((await db('products').first('name').where({ productID: id })).name).not.toBe('hijacked');
  });

  test('products with order history are archived, not deleted', async () => {
    const id = await publishedProduct(A, admin);
    expect((await checkout(customer, [{ product_id: id, quantity: 1 }])).status).toBe(201);
    const del = await api('DELETE', `/seller/products/${id}`, { token: A.token });
    expect(del.body.archived).toBe(true);
    expect(await db('products').first('productID').where({ productID: id })).toBeTruthy();
    expect((await api('PUT', `/seller/products/${id}`, { token: A.token, body: { name: 'edit archived' } })).status).toBe(409);

    const fresh = await api('POST', '/seller/products', { token: A.token, body: validProduct() });
    const gone = await api('DELETE', `/seller/products/${fresh.body.data.id}`, { token: A.token });
    expect(gone.body.archived).toBe(false);
  });
});

describe('6. seller order isolation and fulfillment', () => {
  let pA; let pB; let orderId;
  test('a mixed order shows each seller only their own items', async () => {
    pA = await publishedProduct(A, admin, { price: 500 });
    pB = await publishedProduct(B, admin, { price: 700 });
    const placed = await checkout(customer, [{ product_id: pA, quantity: 2 }, { product_id: pB, quantity: 1 }]);
    expect(placed.status).toBe(201);
    orderId = placed.body.data.id;

    const forA = await api('GET', `/seller/orders/${orderId}`, { token: A.token });
    expect(forA.status).toBe(200);
    expect(forA.body.data.items).toHaveLength(1);
    expect(forA.body.data.items[0].product_id).toBe(pA);
    expect(forA.body.data.seller_subtotal).toBe(1000);
    expect(JSON.stringify(forA.body.data)).not.toContain(pB);
    expect(JSON.stringify(forA.body.data)).not.toContain(customer.email);

    const forB = await api('GET', `/seller/orders/${orderId}`, { token: B.token });
    expect(forB.body.data.items).toHaveLength(1);
    expect(forB.body.data.seller_subtotal).toBe(700);

    const outsider = await makeApprovedSeller('outsider');
    expect((await api('GET', `/seller/orders/${orderId}`, { token: outsider.token })).status).toBe(404);
    expect((await api('PUT', `/seller/orders/${orderId}/fulfillment`, { token: outsider.token, body: { status: 'processing' } })).status).toBe(404);
    const list = await api('GET', '/seller/orders', { token: outsider.token });
    expect(list.body.data).toHaveLength(0);
  });

  test('fulfillment waits for admin confirmation, then moves step by step; never delivered/refunded', async () => {
    const early = await api('PUT', `/seller/orders/${orderId}/fulfillment`, { token: A.token, body: { status: 'processing' } });
    expect(early.status).toBe(409);

    expect((await api('PUT', `/orders/${orderId}`, { token: admin.token, body: { status: 'confirmed' } })).status).toBe(200);

    expect((await api('PUT', `/seller/orders/${orderId}/fulfillment`, { token: A.token, body: { status: 'delivered' } })).status).toBe(400);
    expect((await api('PUT', `/seller/orders/${orderId}/fulfillment`, { token: A.token, body: { status: 'refunded' } })).status).toBe(400);
    expect((await api('PUT', `/seller/orders/${orderId}/fulfillment`, { token: A.token, body: { status: 'shipped' } })).status).toBe(409); // cannot skip steps

    for (const status of ['processing', 'ready_to_ship', 'shipped']) {
      const step = await api('PUT', `/seller/orders/${orderId}/fulfillment`, { token: A.token, body: { status } });
      expect(step.status).toBe(200);
    }
    // Seller A's progress did not touch seller B's line.
    const forB = await api('GET', `/seller/orders/${orderId}`, { token: B.token });
    expect(forB.body.data.items[0].fulfillment_status).toBe('pending');
    const forA = await api('GET', `/seller/orders/${orderId}`, { token: A.token });
    expect(forA.body.data.items[0].fulfillment_status).toBe('shipped');
    expect(forA.body.data.history.length).toBe(3);
    // Seller A dispatched but seller B has not: the order is processing, never shipped.
    expect((await db('orders').first('status').where({ orderID: orderId })).status).toBe('processing');
  });
});

describe('7. stock safety', () => {
  test('inventory updates never go negative', async () => {
    const id = await publishedProduct(A, admin, { stock_quantity: 5 });
    expect((await api('PUT', `/seller/inventory/${id}`, { token: A.token, body: { mode: 'adjust', quantity: -6 } })).status).toBe(409);
    expect((await api('PUT', `/seller/inventory/${id}`, { token: A.token, body: { mode: 'set', quantity: -1 } })).status).toBe(400);
    expect((await api('PUT', `/seller/inventory/${id}`, { token: A.token, body: { mode: 'adjust', quantity: 'abc' } })).status).toBe(400);
    const ok = await api('PUT', `/seller/inventory/${id}`, { token: A.token, body: { mode: 'adjust', quantity: -5, note: 'damaged' } });
    expect(ok.status).toBe(200);
    expect(ok.body.data.stock_quantity).toBe(0);
    expect(ok.body.data.state).toBe('out');
    const moves = await api('GET', `/seller/inventory/${id}/movements`, { token: A.token });
    expect(moves.body.data[0]).toMatchObject({ delta: -5, quantity_after: 0, reason: 'seller_adjustment' });
  });

  test('concurrent checkouts cannot oversell', async () => {
    const id = await publishedProduct(A, admin, { stock_quantity: 3 });
    const results = await Promise.all(Array.from({ length: 8 }, () => checkout(customer, [{ product_id: id, quantity: 1 }])));
    const ok = results.filter((r) => r.status === 201).length;
    expect(ok).toBe(3);
    expect(await stockOf(id)).toBe(0);
  });

  test('checkout racing a seller stock edit stays consistent', async () => {
    const id = await publishedProduct(A, admin, { stock_quantity: 4 });
    await Promise.all([
      ...Array.from({ length: 3 }, () => checkout(customer, [{ product_id: id, quantity: 1 }])),
      api('PUT', `/seller/inventory/${id}`, { token: A.token, body: { mode: 'adjust', quantity: -2 } }),
    ]);
    expect(await stockOf(id)).toBeGreaterThanOrEqual(0);
    const sum = await db('stock_movements').sum({ s: 'delta' }).where({ product_id: id }).first();
    expect(Number(sum.s)).toBe(await stockOf(id)); // ledger matches reality
  });

  test('unpublished / draft products cannot be bought', async () => {
    const created = await api('POST', '/seller/products', { token: A.token, body: validProduct() });
    const res = await checkout(customer, [{ product_id: created.body.data.id, quantity: 1 }]);
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/not available/);
  });

  test('cancelling an order returns stock; reopening takes it again', async () => {
    const id = await publishedProduct(A, admin, { stock_quantity: 5 });
    const placed = await checkout(customer, [{ product_id: id, quantity: 2 }]);
    expect(await stockOf(id)).toBe(3);
    expect((await api('PUT', `/orders/${placed.body.data.id}`, { token: admin.token, body: { status: 'cancelled' } })).status).toBe(200);
    expect(await stockOf(id)).toBe(5);
    // cancelling twice must not double-restock
    await api('PUT', `/orders/${placed.body.data.id}`, { token: admin.token, body: { status: 'cancelled' } });
    expect(await stockOf(id)).toBe(5);
    expect((await api('PUT', `/orders/${placed.body.data.id}`, { token: admin.token, body: { status: 'pending' } })).status).toBe(200);
    expect(await stockOf(id)).toBe(3);
  });
});

describe('9. dashboard metrics match the database', () => {
  test('totals, orders and top products equal direct SQL', async () => {
    const dash = await api('GET', '/seller/dashboard?from=2020-01-01', { token: A.token });
    expect(dash.status).toBe(200);
    const d = dash.body.data;

    const sql = await db('order_items as oi').join('orders as o', 'o.orderID', 'oi.order_id')
      .where('oi.seller_id', A.seller.sellerID)
      .whereNot('o.status', 'cancelled')
      .whereNot('o.paymentStatus', 'refunded')
      .sum({ gross: 'oi.totalPrice' })
      .first();
    expect(d.totals.period_sales).toBeCloseTo(Number(sql.gross || 0), 2);
    expect(d.totals.total_sales).toBeCloseTo(Number(sql.gross || 0), 2);

    const orders = await db('order_items as oi').join('orders as o', 'o.orderID', 'oi.order_id')
      .where('oi.seller_id', A.seller.sellerID).whereNot('o.status', 'cancelled')
      .countDistinct({ n: 'o.orderID' }).first();
    expect(d.totals.orders).toBe(Number(orders.n));

    const seriesTotal = d.series.reduce((s, row) => s + row.sales, 0);
    expect(seriesTotal).toBeCloseTo(Number(sql.gross || 0), 2);

    const products = await db('products').where({ seller_id: A.seller.sellerID }).whereNull('archivedOn').count({ n: '*' }).first();
    expect(d.products.total).toBe(Number(products.n));

    // earnings come from the ledger, which has no entries until orders are paid
    expect(typeof d.earnings.fees).toBe('number');
    expect(d.earnings.fees).toBeGreaterThanOrEqual(0);
    // seller B's sales must not leak into A's numbers
    const bGross = await db('order_items').where({ seller_id: B.seller.sellerID }).sum({ g: 'totalPrice' }).first();
    expect(Number(bGross.g || 0)).toBeGreaterThan(0);
    expect(d.totals.total_sales).not.toBeCloseTo(Number(sql.gross || 0) + Number(bGross.g || 0), 2);
  });
});

describe('10. existing customer flows keep working', () => {
  test('admin-created catalogue products are still public and purchasable', async () => {
    const seed = await db('products').first('productID', 'slug', 'stockQuantity').where({ isActive: true, approvalStatus: 'approved' }).where('stockQuantity', '>', 1);
    expect(seed).toBeTruthy();
    expect((await api("GET", `/products/${seed.productID}`)).status).toBe(200);
    const list = await api('GET', '/products?limit=5');
    expect(list.status).toBe(200);
    expect(list.body.data.length).toBeGreaterThan(0);
    const order = await checkout(customer, [{ product_id: seed.productID, quantity: 1 }]);
    expect(order.status).toBe(201);
    expect((await api('GET', '/orders', { token: customer.token })).status).toBe(200);
  });
});

describe('8. order lifecycle, fulfillment sync and server-side delivery', () => {
  const put = (id, token, body) => api('PUT', `/orders/${id}`, { token, body });
  const fulfil = (id, seller, status) => api('PUT', `/seller/orders/${id}/fulfillment`, { token: seller.token, body: { status } });
  const statusOf = async (id) => (await db('orders').first('status').where({ orderID: id })).status;
  let pA; let pB;

  beforeAll(async () => {
    pA = await publishedProduct(A, admin, { price: 400, stock_quantity: 50 });
    pB = await publishedProduct(B, admin, { price: 300, stock_quantity: 50 });
  });

  const place = async (items) => (await checkout(customer, items)).body.data.id;

  test('delivery charge is computed by the server and the city is validated', async () => {
    const forged = await api('POST', '/orders', { token: customer.token, body: { shipping_address: '1 St, Lahore', payment_method: 'cod', shipping_cost: 0, items: [{ product_id: pA, quantity: 1 }] } });
    expect(forged.status).toBe(201);
    expect(Number(forged.body.data.shipping_cost ?? forged.body.data.shippingCost)).toBe(350); // Rs.400 subtotal -> top tier
    const wrongCity = await api('POST', '/orders', { token: customer.token, body: { shipping_address: '1 St, Karachi', payment_method: 'cod', items: [{ product_id: pA, quantity: 1 }] } });
    expect(wrongCity.status).toBe(400);
  });

  test('admin transitions follow the table; role restrictions hold', async () => {
    const id = await place([{ product_id: pA, quantity: 1 }]);
    expect((await put(id, customer.token, { status: 'confirmed' })).status).toBe(403);
    expect((await put(id, A.token, { status: 'confirmed' })).status).toBe(403);
    const skip = await put(id, admin.token, { status: 'delivered' });
    expect(skip.status).toBe(409);
    expect(skip.body.allowed).toEqual(['confirmed', 'cancelled']);
    for (const s of ['confirmed', 'processing', 'shipped', 'delivered']) expect((await put(id, admin.token, { status: s })).status).toBe(200);
    expect((await put(id, admin.token, { status: 'cancelled' })).status).toBe(400); // delivered is final
  });

  test('payment changes never move a shipped order backwards', async () => {
    const id = await place([{ product_id: pA, quantity: 1 }]);
    for (const s of ['confirmed', 'processing', 'shipped']) await put(id, admin.token, { status: s });
    await put(id, admin.token, { paymentStatus: 'paid' });
    await put(id, admin.token, { paymentStatus: 'unpaid' });
    expect(await statusOf(id)).toBe('shipped');
  });

  test('multi-seller: order is shipped only when every seller has shipped', async () => {
    const id = await place([{ product_id: pA, quantity: 1 }, { product_id: pB, quantity: 1 }]);
    await put(id, admin.token, { status: 'confirmed' });
    await fulfil(id, A, 'processing');
    expect(await statusOf(id)).toBe('processing'); // derived from seller activity
    await fulfil(id, A, 'ready_to_ship');
    await fulfil(id, A, 'shipped');
    expect(await statusOf(id)).toBe('processing'); // B has not shipped
    await fulfil(id, B, 'processing');
    await fulfil(id, B, 'ready_to_ship');
    expect(await statusOf(id)).toBe('processing'); // ready to ship != shipped
    await fulfil(id, B, 'shipped');
    expect(await statusOf(id)).toBe('shipped');
    expect((await put(id, admin.token, { status: 'delivered' })).status).toBe(200);
  });

  test('admin marking shipped syncs the seller items; cancel restores stock', async () => {
    const before = await stockOf(pA);
    const id = await place([{ product_id: pA, quantity: 2 }]);
    expect(await stockOf(pA)).toBe(before - 2);
    for (const s of ['confirmed', 'processing', 'shipped']) await put(id, admin.token, { status: s });
    const items = await db('order_items').where({ order_id: id }).select('fulfillmentStatus');
    expect(items.every((i) => i.fulfillmentStatus === 'shipped')).toBe(true);
    const other = await place([{ product_id: pA, quantity: 1 }]);
    await put(other, admin.token, { status: 'cancelled' });
    expect(await stockOf(pA)).toBe(before - 2);
    expect((await fulfil(other, A, 'processing')).status).toBe(409); // cancelled orders cannot be fulfilled
  });
});
