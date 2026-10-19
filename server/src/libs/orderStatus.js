/**
 * Order status rules (orders.status, controlled by AHM Mart admins) and how seller fulfillment
 * (order_items.fulfillmentStatus, controlled by sellers) feeds back into it.
 *
 *   Admin order : pending -> confirmed -> processing -> shipped -> delivered
 *   Cancellation: allowed from any state except delivered/cancelled; a cancelled order may be
 *                 re-opened to pending.
 *   Seller item : pending -> processing -> ready_to_ship -> shipped   (never delivered / refunded)
 *
 * "Ready to ship" is not "shipped", and "shipped" is not "delivered". The overall order only becomes
 * `shipped` when EVERY item in the order (all sellers) is shipped.
 */
const TRANSITIONS = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: ['pending'],
};

const allowedNext = (status) => TRANSITIONS[status] || [];
const canTransition = (from, to) => from === to || allowedNext(from).includes(to);

// Items that have not been dispatched yet / that a seller has started on.
const STARTED = ['processing', 'ready_to_ship', 'shipped'];

/**
 * Recomputes the overall order status from the seller fulfillment records and applies it inside
 * the caller's transaction. Only ever moves forward (confirmed -> processing -> shipped); an
 * admin-owned status (delivered, cancelled, pending) is never changed from here.
 * Returns { from, to } when it changed something, otherwise null.
 */
async function syncOrderStatusFromFulfillment(trx, orderId) {
  const order = await trx('orders').first('orderID', 'status').where({ orderID: orderId }).forUpdate();
  if (!order || !['confirmed', 'processing'].includes(order.status)) return null;

  const items = await trx('order_items').where({ order_id: orderId }).select('fulfillmentStatus');
  if (items.length === 0) return null;

  const allShipped = items.every((i) => i.fulfillmentStatus === 'shipped');
  const anyStarted = items.some((i) => STARTED.includes(i.fulfillmentStatus));

  let next = null;
  if (allShipped) next = 'shipped';
  else if (anyStarted && order.status === 'confirmed') next = 'processing';
  if (!next || next === order.status) return null;

  const update = { status: next, updatedOn: trx.fn.now() };
  if (next === 'shipped') update.shippedOn = trx.fn.now();
  await trx('orders').where({ orderID: orderId }).update(update);
  return { from: order.status, to: next };
}

module.exports = {
  TRANSITIONS, allowedNext, canTransition, syncOrderStatusFromFulfillment,
};
