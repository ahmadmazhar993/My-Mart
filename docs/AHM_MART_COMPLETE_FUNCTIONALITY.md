# AHM Mart – Complete Functionality Reference

Audited against the real code, database migrations and APIs on 2026-10-16. Statements below describe what the code does today; anything not built is listed in sections 16 and 19.

## 1. Architecture overview

| Layer | Technology |
|---|---|
| API | Express 4 (CommonJS), Knex 3, PostgreSQL. Module layout `server/src/api/v1/<module>/{routes,service}.js`. Prefix `/api/v1`. |
| Auth | JWT (cookie or `Authorization: Bearer`). Role = `accessTemplate.type` (`Admin`, `Customer`, `Seller`). Middleware: `isAuthenticated`, `isAdmin`, `isApprovedSeller` (loads the `sellers` row, requires `status='approved'`, sets `req.seller`). |
| Client | React 18, Vite, Tailwind 3, React Router 6, Zustand, axios, Chart.js. Three portals in one SPA. |
| Money | `server/src/libs/money.js` – integer cents, half-up rounding. All financial amounts are computed on the server. |
| Ledger | `server/src/libs/ledger.js` + append-only `seller_ledger_entries`. |
| Stock | `server/src/libs/stock.js` – `SELECT … FOR UPDATE`, `stock_movements` audit trail. |
| Live updates | In-process Server-Sent Events hub (`libs/realtime.js`, `/api/v1/events`); browser side uses one leader tab per browser (Web Locks + BroadcastChannel). |
| Delivery rules | `server/src/libs/shipping.js` (tiers + deliverable cities, mirrors `client/src/config/shipping.js`). |
| Status rules | `server/src/libs/orderStatus.js` (transition table + fulfillment→order derivation). |

## 2. Customer portal

Browse/search products (only `isActive` and `approvalStatus='approved'` are public), cart, checkout (COD or online with payment proof), order list/detail with live status, wishlist, reviews (purchasers only), profile/settings, **returns** (`/returns`, request per order item inside the return window, message thread with seller/admin, cancel request), seller application (`/seller/apply`). Order status changes appear without a refresh (SSE) with a toast.

Checkout rules enforced by the server (not the browser):
- Delivery charge is computed from the product subtotal: ≥ Rs. 2000 → 0, ≥ 1000 → 150, ≥ 500 → 250, otherwise 350. A `shipping_cost` sent by a customer is ignored; only an Admin creating an order may override it (non-negative).
- Delivery city must be in `DELIVERY_CITIES` (currently Lahore) for non-admin orders. The city is the last comma-separated part of `shipping_address`.
- Stock is row-locked and decremented inside the order transaction; insufficient stock aborts the whole order.

## 3. Admin dashboard

Pages: Dashboard, Products, Categories, Sales, Orders, Create Order, Users, **Sellers** (list/filter/detail, approve/reject/suspend/reactivate, edit, orders, products), **Product Review** (approve/reject seller products with reason), **Finance** (overview, commission rate + history, per-seller balances, payout requests: complete/reject/fail), **Returns** (settings, approve/reject/refund, messages). All lists support search, filters and pagination against the server and refresh live.

## 4. Seller Center

Pages: Dashboard, Products (draft → submit → admin approval → publish/unpublish; archive when referenced by orders), Inventory (adjust/set with history), Orders (own items only; fulfillment steps), Earnings (balances, transactions, ledger, payout requests), Analytics (range + CSV export), Returns (thread, mark received), Store settings, plus `/seller/apply` onboarding. Status screens for pending / rejected / suspended sellers. Mobile uses a bottom tab bar with a "More" sheet.

## 5. Route map (client)

Public/customer: `/`, `/products`, `/products/:identifier`, `/login`, `/register`, `/seller/apply`, `/forgot-password`, `/reset-password`, `/verify-email`, `/profile`, `/orders`, `/orders/:id`, `/returns`, `/wishlist`, `/reviews`, `/settings`, `/checkout`, `/cart`, `/help`, `/pages/contact`, `/pages/:slug`, `/blog`, `/blog/:slug`.

Admin (`RequireAdmin`): `/admin`, `/admin/products`, `/categories`, `/sales`, `/orders`, `/orders/create`, `/users`, `/sellers`, `/sellers/:id`, `/seller-products`, `/finance`, `/returns`.

Seller (`RequireSeller`): `/seller/dashboard`, `/products`, `/products/new`, `/products/:id/edit`, `/inventory`, `/orders`, `/orders/:id`, `/earnings`, `/analytics`, `/returns`, `/returns/:id`, `/store-settings`.

## 6. Order status definitions and transition rules

`orders.status` is owned by AHM Mart **admins**. It describes the order as a whole.

| Status | Meaning |
|---|---|
| pending | Placed, awaiting admin review/confirmation. |
| confirmed | Admin accepted the order; sellers may begin fulfilment. |
| processing | Being prepared. Set by admin, by payment confirmation on a pending/confirmed order, or automatically when a seller starts work on a confirmed order. |
| shipped | Dispatched. Set by admin, or automatically when **every** item of the order has been shipped by its seller. |
| delivered | Received by the customer. Admin only. Final. COD orders become `paid` on delivery. |
| cancelled | Cancelled; stock returned; seller earnings reversed. |

Allowed transitions (`libs/orderStatus.js`, enforced in `PUT /orders/:id`; anything else → **409** with the list of allowed next states):

```
pending    -> confirmed | cancelled
confirmed  -> processing | cancelled
processing -> shipped | cancelled
shipped    -> delivered | cancelled
delivered  -> (final; cancelling returns 400)
cancelled  -> pending (re-open; stock is taken again and fails if unavailable)
```

Payment status (`orders.paymentStatus`: unpaid / paid / refunded) is a separate field. Marking an order paid moves it to `processing` only when it is currently pending/confirmed and no explicit status was given; it never moves shipped/delivered/cancelled orders backwards. Marking it unpaid no longer rewrites the order status.

## 7. Seller fulfilment sync

`order_items.fulfillmentStatus`: `pending → processing → ready_to_ship → shipped`, per item, with `order_item_status_history`. Sellers act only on their own items, one step at a time, never to delivered/refunded, only while the order is confirmed/processing/shipped and (COD or paid).

| Seller action | Effect on item | Effect on overall order |
|---|---|---|
| processing | item → processing | order `confirmed` → `processing` |
| ready_to_ship | item → ready_to_ship | none (ready ≠ shipped) |
| shipped | item → shipped | `shipped` only when **all** items (all sellers) are shipped |

Derivation runs in the same transaction as the item update, with the order row locked (`syncOrderStatusFromFulfillment`). It only moves forward from confirmed/processing, so admin-owned states (pending, delivered, cancelled) are never overwritten. After commit: realtime event to customer/admin/sellers; customer shipped email when the order becomes shipped.

When an admin sets the order to `shipped`/`delivered`, any item not yet shipped is set to `shipped` (with history rows) so seller views agree.

## 8. Multi-seller behaviour

One order may hold items from several sellers. Each seller sees only their own items and their own subtotal (`GET /seller/orders[/:id]`). Seller A shipping never ships the order while seller B is pending (covered by test). Commission/earnings are calculated per order line, so each seller is credited only for their lines.

## 9. Workflows

- **Checkout:** validate → lock products (sorted order) → check stock/approval → decrement + `stock_movements` → server-side delivery charge → insert order, items (with `originalUnitPrice` snapshot), payment → emails, realtime.
- **Cancel:** transaction restores stock, reverses earnings (`order_cancelled`), emits events.
- **Return:** customer requests per item inside the window (`return_window_days`, default 7, admin-configurable) → seller/admin thread → admin approve/reject → seller marks received → admin refunds → commission on the returned amount is reversed in the ledger. The customer's money refund itself happens outside the system.
- **Payout:** seller requests (idempotency key required) → admin completes / rejects / fails; reject/fail post reversal entries. Nothing is marked paid without an explicit admin action.

## 10. Commission, earnings and payouts

Verified against code and tests:

| Policy | Status |
|---|---|
| Free registration, no subscription, free listings | ✔ no fee anywhere in onboarding/listing code; shown by `GET /seller/fee-policy` |
| Default 5% commission | ✔ `commission_settings.rateBps` (500) |
| Base = original list price before discounts | ✔ `order_items.originalUnitPrice`, `commissionCents` |
| Delivery charge excluded | ✔ only item lines are used |
| Cancelled order → no commission | ✔ reversed/never posted |
| Refund reverses commission | ✔ `reverseItemRefund` / `reverseOrderEarnings` |
| Admin-configurable rate with history | ✔ `POST /admin/finance/commission` (1–50%), applies to **new** orders only; old lines keep their snapshot |
| Decimal-safe | ✔ integer cents, half-up |
| Transactional + auditable | ✔ posted in the same transaction as the status change; append-only ledger (DB trigger blocks update/delete/truncate) |
| Idempotent | ✔ unique `idempotencyKey` per entry; concurrent "mark paid" x4 test posts once |
| Frontend amounts never trusted | ✔ all amounts derived on the server |
| Earnings timing | Posted when the order becomes paid; shown as *pending* until delivered, then *available*. COD is auto-paid on delivery. |

Assumption to confirm: order-level discounts (if any) are funded by the marketplace, so the seller's commission base is the list price.

## 11. Authentication, roles and data isolation

- Seller APIs: `isAuthenticated + isApprovedSeller`; every query filters by `req.seller.sellerID`; `seller_id`/`status`/`role` are never read from request bodies (test "Sneaky" apply).
- Another seller's order/product/return → **404** (not 403) to avoid leaking existence.
- Admin-only: `/sellers/*`, `/admin/*`, category writes, `/reports/sales`, user mutations, order status updates.
- Customers can only read their own orders/returns; `user_id` on order creation is admin-only.
- `AuthInitializer` logs out only on 401/403 (not on network failures).

## 12. Database tables (added by this work)

`stock_movements`, `order_item_status_history`, `commission_settings`, `marketplace_settings`, `seller_ledger_entries`, `payout_requests`, `return_requests`, `return_messages`. Altered: `sellers` (review/suspension/contact fields, unique `user_id`), `products` (`approvalStatus`, `rejectionReason`, `archivedOn`, `stockQuantity >= 0` check), `order_items` (`fulfillmentStatus`, `originalUnitPrice`, commission snapshot columns). Existing: `orders`, `order_items`, `payments`, `products`, `user`, `accessTemplate`, `sellers`, etc.

## 13. API endpoints (generated from the route files)

All under `/api/v1`.

**orders:** `GET /`, `GET /:id`, `POST /`, `POST /checkout`, `POST /:id/payment-proof`, `PUT /:id` (admin status/payment).
**returns (customer):** `POST /upload-evidence`, `POST /`, `GET /mine`, `GET /order/:orderId`, `GET /:id`, `POST /:id/messages`, `POST /:id/cancel`.
**seller:** `GET fee-policy, me, dashboard, profile, categories`; `POST apply, profile/logo`; `PUT profile`; products `GET|POST /products`, `GET|PUT|DELETE /products/:id`, `POST /products/:id/{submit,publish,unpublish}`, `POST /products/upload-images`; inventory `GET /inventory`, `PUT /inventory/:id`, `GET /inventory/:id/movements`; orders `GET /orders`, `GET /orders/:id`, `PUT /orders/:id/fulfillment`; earnings `GET /earnings`, `/earnings/transactions`, `/earnings/ledger`; payouts `GET|POST /payouts`; analytics `GET /analytics`, `/analytics/export.csv`; returns `GET /returns`, `GET /returns/:id`, `POST /returns/:id/messages`, `POST /returns/:id/receive`.
**sellers (admin):** `GET /`, `GET|PUT /:id`, `POST /:id/{approve,reject,suspend,reactivate}`, `GET /:id/orders`, `GET /:id/products`, `GET /products/review`, `POST /products/:productId/{approve,reject}`.
**admin:** finance `GET /finance/{commission,overview,commissions,sellers,sellers/:id,payouts}`, `POST /finance/commission`, `POST /finance/payouts/:id/{complete,reject,fail}`; returns `GET|PUT /returns/settings`, `GET /returns`, `GET /returns/:id`, `POST /returns/:id/{messages,approve,reject,refund}`.
**events:** `GET /events` (SSE). **products, categories, cart, contact, receipts, reports, auth, user:** pre-existing.

## 14. UI consistency changes

Shared seller/admin toolkit (`components/seller/ui.jsx`, `filters.jsx`): one filter-dropdown toolbar with chips and a results line, shared `Select`, pagination, tables that become cards on mobile, confirm dialogs. Mobile bottom navigation for customer/seller/admin (`PortalBottomNav`). Live refresh hooks with stale-response guard. Admin Orders now shows the server's message when a status change is refused.

## 15. Implemented / partial / missing

**Implemented:** seller onboarding and admin approval; product approval workflow; inventory with history; seller orders and fulfilment; derived order status; commission ledger, rates and payouts; returns and refunds ledger effects; analytics; live updates; server-side delivery charge and city checks; transition rules.
**Partial:** the Admin Orders status dropdown still lists all six statuses (the server rejects illegal ones with a clear message instead of hiding them); customer-facing refund of money is manual.
**Missing:** see section 19.

## 16. Files changed and migrations

Migrations: `20261015000001_seller_dashboard_phase1.js`, `20261016000001_seller_finance_returns.js` (run `npm run migrate` in `server`).
This audit round: new `server/src/libs/shipping.js`, `server/src/libs/orderStatus.js`; edited `orders.service.js` (server delivery charge/city, transition table, payment no-regress, item sync), `seller/seller.orders.js` (order lock, derived status, realtime + email), `client/src/pages/admin/AdminOrders.jsx` (server error message), tests (`seller.integration.test.js` new section 8; address/path helpers in `filters`, `finance`, `realtime` tests). Earlier work: see `git status` (seller/admin/returns/events/finance modules, libs, client pages/components).

## 17. Tests actually run (this session)

| Command | Result |
|---|---|
| `cd server && DB_NAME=ahm_mart_scratch npx jest --runInBand --forceExit` | **4 suites, 84/84 tests passed** (seller, finance, filters, realtime; includes the new order-lifecycle section) |
| `cd client && npx vite build` | built successfully |
| Earlier browser runs (headless Chrome via CDP, previous work) | seller UI 51/51 at 1280 and 55/55 at 390/320, cross-portal smoke 38/38, multi-tab 6/6. **Not re-run after this round's changes** (only AdminOrders.jsx's error text changed on the client). |

Not run: client lint (the client ESLint config is a stub and does not work), a payment gateway (none exists), load testing, and 768/1024 viewport re-checks after this round.

## 18. Manual verification checklists

**Order lifecycle:** place a COD order as a customer → admin Orders: try to set Delivered directly (expect refusal message) → Confirmed → seller sees "can fulfil" → seller Processing (order shows Processing) → Ready to ship (still Processing) → Shipped (Shipped only if it is the only seller) → admin Delivered.
**Multi-seller:** order with two sellers' products; ship one seller fully; order must stay Processing; ship the other; order becomes Shipped and the customer gets an email.
**Delivery charge:** cart of Rs. 400 → Rs. 350; Rs. 600 → 250; Rs. 1200 → 150; Rs. 2000+ → free; address city other than Lahore is refused.
**Money:** deliver a paid order → seller Earnings shows 95% of the list price after delivery; change the rate in Admin → Finance and confirm only new orders use it; cancel/refund → reversal entries appear.
**Realtime:** keep customer, seller and admin windows open; change a status in one; others update without a refresh.
**Responsive:** check 320, 375, 390, 430, 768, 1024, 1280 on seller Orders/Products/Earnings and admin Orders/Finance.

## 19. Remaining gaps and business decisions

1. Refund money to customers and seller payout transfers happen outside the system; sellers have no bank details stored, so "complete payout" only records an admin's confirmation.
2. The realtime hub is in-process: with more than one server instance a shared bus (e.g. Redis) is needed.
3. `DELIVERY_CITIES`/tiers exist in both client and server config; change both together (consider serving them from one API).
4. Return window is stored in `marketplace_settings`, while the client `policies.js` constant still says 7 days.
5. Order-level discounts are assumed marketplace-funded (commission on list price) – confirm.
6. Whether admins may skip steps (e.g. processing → delivered for in-store handovers) is a business decision; currently they cannot.
7. The Admin Orders dropdown could be limited to allowed next statuses (server already enforces it).
8. Client ESLint config is broken; Google Fonts CSS is render-blocking.
9. Shipping city detection relies on the address string ending in the city; a structured city field would be more robust.
