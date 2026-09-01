const { StatusCodes } = require('http-status-codes');
const db = require('../../../db');
const { mapOrder } = require('../../../libs/serializers');

async function getReceiptByOrderId(req, res) {
  try {
    const { id } = req.params;

    const order = await db('orders').where({ orderID: id }).first();
    if (!order) return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: 'Order not found' });

    const receipt = await db('receipts').where({ order_id: order.orderID }).first();

    let items = await db('order_items')
      .select('order_items.*', 'products.name as product_name', 'products.images')
      .leftJoin('products', 'products.productID', 'order_items.product_id')
      .where('order_items.order_id', order.orderID);

    const payment = await db('payments').where({ order_id: order.orderID }).first();

    const mappedOrder = mapOrder(order, payment);
    mappedOrder.items = items.map((item) => ({
      id: item.orderItemID,
      product_id: item.product_id,
      product_name: item.product_name,
      image_url: item.images?.[0] || null,
      quantity: item.quantity,
      variant_name: item.variant_name || null,
      variant_label: item.variant_label || item.variant_name || null,
      variant_sku: item.variant_sku || null,
      unit_price: Number(item.unitPrice),
      total_price: Number(item.totalPrice),
    }));

    const payload = {
      success: true,
      data: {
        order: mappedOrder,
        receipt: receipt || null,
      },
    };

    return res.status(StatusCodes.OK).json(payload);
  } catch (err) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: err.message || 'Failed to load receipt' });
  }
}

async function getPublicReceiptByInvoice(req, res) {
  try {
    const { invoice } = req.params;
    if (!invoice) return res.status(StatusCodes.BAD_REQUEST).send('Invoice is required');

    const receipt = await db('receipts').where({ invoice_number: invoice }).first();
    if (!receipt) return res.status(StatusCodes.NOT_FOUND).send('Receipt not found');

    const order = await db('orders').where({ orderID: receipt.order_id }).first();
    if (!order) return res.status(StatusCodes.NOT_FOUND).send('Order not found');

    const items = await db('order_items')
      .select('order_items.*', 'products.name as product_name')
      .leftJoin('products', 'products.productID', 'order_items.product_id')
      .where('order_items.order_id', order.orderID);

    const payment = await db('payments').where({ order_id: order.orderID }).first();

    // Branded HTML receipt for public access (printable)
    const base = (process.env.CLIENT_BASE_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
    // Prefer a logo URL saved with the receipt data; otherwise use the client's public logo.
    // Common client public filenames: /logo192.png (Vite/CRA), /logo.png
    const logoPath = (receipt.data && receipt.data.logoUrl) || '/logo.png';
    const logoUrl = logoPath.indexOf('http') === 0 ? logoPath : `${base}${logoPath.startsWith('/') ? '' : '/'}${logoPath}`;
    const fmt = (v) => (Number(v || 0)).toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    console.log('Rendering receipt for invoice:', invoice, 'logoUrl:', logoUrl, 'receipt:', receipt);
    const html = `<!doctype html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width,initial-scale=1">
      <title>Receipt ${invoice}</title>
      <style>
        @media print { body { -webkit-print-color-adjust: exact; } }
        body { font-family: Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; color:#111; padding:24px; background:#fff }
        .container { max-width:800px; margin:0 auto; border:1px solid #E5E7EB; border-radius:12px; overflow:hidden }
        .topbar{ height:6px; background:linear-gradient(90deg,#4F46E5,#7C3AED) }
        .section{ padding:22px 28px }
        .header{ display:flex; justify-content:space-between; align-items:flex-start }
        .brand{ display:flex; gap:14px; align-items:center }
        .brand img{ width:64px; height:64px; object-fit:contain; border-radius:8px }
        .brand .meta{ font-weight:700; font-size:18px }
        .meta-sub{ color:#6B7280; font-size:13px; margin-top:4px }
        .right-meta{ text-align:right; min-width:180px }
        .muted{ color:#6B7280; font-size:12px }
        table{ width:100%; border-collapse:collapse; margin-top:18px }
        th{ text-align:left; color:#9CA3AF; font-size:12px; text-transform:uppercase; padding-bottom:10px }
        td{ padding:12px 0; border-bottom:1px solid #F3F4F6 }
        .totals{ width:280px; background:#F9FAFB; border:1px solid #F3F4F6; border-radius:10px; padding:14px }
        .totals .row{ display:flex; justify-content:space-between; margin-bottom:8px }
        .qr{ padding:10px; background:#fff; border:1px solid #E5E7EB; border-radius:10px }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="topbar"></div>
        <div class="section">
          <div class="header">
            <div class="brand">
              <img src="${logoUrl}" alt="logo" />
              <div>
                <div class="meta">${(receipt.data && receipt.data.brandName) || 'AHM Mart'}</div>
                <div class="meta-sub">${(receipt.data && receipt.data.address) || 'AHM Mart (Pvt.) Ltd., Near Lahore General Hospital, Ismail Nagar, Lahore, Pakistan'}</div>
                <div class="meta-sub">${(receipt.data && receipt.data.phone) || '+92 323 881 8508'} • ${(receipt.data && receipt.data.email) || 'support@ahmmart.store'}</div>
              </div>
            </div>

            <div class="right-meta">
              <div style="display:inline-block;background:#EEF2FF;color:#4F46E5;padding:6px 12px;border-radius:999px;font-weight:700;text-transform:uppercase;font-size:11px">Receipt</div>
              <div style="margin-top:10px">
                <div class="muted">Invoice</div>
                <div style="font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis">${invoice}</div>
                <div class="muted" style="margin-top:8px">Order</div>
                <div style="font-weight:700; white-space:nowrap">${order.orderCode || order.orderID}</div>
                <div class="muted" style="margin-top:8px">${new Date(order.createdOn || order.created_at || Date.now()).toLocaleString()}</div>
              </div>
            </div>
          </div>

          <table>
            <thead>
              <tr><th>SKU</th><th>Product</th><th>Qty</th><th style="text-align:right">Unit</th><th style="text-align:right">Total</th></tr>
            </thead>
            <tbody>
              ${items.map(it => `<tr><td style="color:#6B7280">${it.variant_sku || it.product_id}</td><td style="font-weight:600">${it.product_name}</td><td>${it.quantity}</td><td style="text-align:right">${fmt(it.unitPrice)}</td><td style="text-align:right;font-weight:700">${fmt(it.totalPrice)}</td></tr>`).join('')}
            </tbody>
          </table>

          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-top:20px">
            <div style="width:220px;">
              <!-- optional notes -->
            </div>
            <div class="totals">
              <div class="row"><div class="muted">Subtotal</div><div>${fmt(order.totalPrice - (order.shippingCost||0))}</div></div>
              <div class="row"><div class="muted">Shipping</div><div>${fmt(order.shippingCost||0)}</div></div>
              <div style="border-top:1px dashed #D1D5DB;padding-top:10px;margin-top:8px;font-weight:700;display:flex;justify-content:space-between"> <div>Grand Total</div><div style="color:#4F46E5">${fmt(order.totalPrice)}</div></div>
              <div style="margin-top:8px;font-size:13px;color:#6B7280">${(order.paymentMethod || order.payment_method || '—').toUpperCase()} • ${(order.paymentStatus || order.payment_status || '—')}</div>
            </div>
          </div>
        </div>

        <div style="display:flex;justify-content:space-between;align-items:center;padding:18px 28px;border-top:1px solid #F3F4F6;background:#fff">
          <div>
            <div style="font-weight:700">Thank you for shopping with us!</div>
            <div class="muted" style="margin-top:6px">Returns accepted within 7 days · Support: ${(receipt.data && receipt.data.email) || 'support@ahmmart.store'}</div>
          </div>
          <div class="qr">
            <img src="${logoUrl}" alt="logo" style="width:64px;height:64px;object-fit:contain;border-radius:8px" />
          </div>
        </div>
      </div>
    </body>
    </html>`;

    return res.status(StatusCodes.OK).send(html);
  } catch (err) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).send(err.message || 'Failed to render receipt');
  }
}

module.exports = { getReceiptByOrderId, getPublicReceiptByInvoice };

