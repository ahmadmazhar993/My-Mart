const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { StatusCodes } = require('http-status-codes');
const db = require('../../../db');
const { mapOrder } = require('../../../libs/serializers');
const logger = require('../../../config/winston');
const { createUniqueOrderReferenceCode } = require('../../../libs/orderCode');
const { sendOrderConfirmationEmail, sendOrderStatusEmail } = require('../../../email/templates');
const orderEvents = require('../../../libs/orderEvents');

const ORDER_STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
const PAYMENT_METHODS = ['cod', 'online'];
const PAYMENT_STATUSES = ['unpaid', 'paid', 'refunded'];

const paymentProofDir = path.join(__dirname, '..', '..', '..', '..', 'uploads', 'payments');
if (!fs.existsSync(paymentProofDir)) {
  fs.mkdirSync(paymentProofDir, { recursive: true });
}

const paymentProofStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, paymentProofDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '.jpg');
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, uniqueName);
  },
});

const isValidTransactionReference = (value) => {
  if (!value) return true;
  return /^[A-Za-z0-9._ -]{3,50}$/.test(value);
};

const isValidSenderAccount = (value) => {
  if (!value) return true;
  return /^[0-9 -]{4,20}$/.test(value);
};

const uploadPaymentProofMiddleware = (req, res, next) => {
  const upload = multer({
    storage: paymentProofStorage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];
      cb(null, allowed.includes(file.mimetype));
    },
  }).single('receipt');

  upload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(StatusCodes.PAYLOAD_TOO_LARGE).json({
          success: false,
          message: 'Receipt file must be 5MB or smaller.',
        });
      }

      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: err.message || 'Failed to upload receipt',
      });
    }

    if (err) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: err.message || 'Failed to upload receipt',
      });
    }

    next();
  });
};

async function listOrders(req, res) {
  try {
    let query = db('orders')
      .leftJoin('user as u', 'orders.user_id', 'u.userID')
      .select(
        'orders.*',
        db.raw(`u."firstName" || ' ' || u."lastName" as "userName"`)
      )
      .orderBy('orders.createdOn', 'desc')
      .limit(100);

    const roleRow = await db('accessTemplate')
      .first('type')
      .where('accessTemplateID', req.activeUser.accessTemplateID);

    if (roleRow?.type !== 'Admin') {
      query = query.where('orders.user_id', req.activeUser.userID);
    }

    const orders = await query;
    const orderIds = orders.map((order) => order.orderID);
    const payments = orderIds.length
      ? await db('payments').whereIn('order_id', orderIds)
      : [];
    const paymentByOrder = payments.reduce((acc, payment) => {
      acc[payment.order_id] = payment;
      return acc;
    }, {});
    return res.status(StatusCodes.OK).json({
      message: 'Orders retrieved successfully',
      success: true,
      data: orders.map((order) => ({
        ...mapOrder(order, paymentByOrder[order.orderID]),
        userName: order.userName,
      })),
    });
  } catch (err) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: err.message || 'Failed to load orders',
    });
  }
}

async function getOrderById(req, res) {
  try {
    const { id } = req.params;
    const order = await db('orders').where({ orderID: id }).first();

    if (!order) {
      return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: 'Order not found' });
    }

    const roleRow = await db('accessTemplate')
      .first('type')
      .where('accessTemplateID', req.activeUser.accessTemplateID);

    if (roleRow?.type !== 'Admin' && order.user_id !== req.activeUser.userID) {
      return res.status(StatusCodes.FORBIDDEN).json({ success: false, message: 'Access denied' });
    }

    const items = await db('order_items')
      .select('order_items.*', 'products.name as product_name', 'products.imageUrl')
      .leftJoin('products', 'products.productID', 'order_items.product_id')
      .where('order_items.order_id', order.orderID);

    const payment = await db('payments').where({ order_id: order.orderID }).first();
    const mappedOrder = mapOrder(order, payment);
    mappedOrder.items = items.map((item) => ({
      id: item.orderItemID,
      product_id: item.product_id,
      product_name: item.product_name,
      image_url: item.imageUrl,
      quantity: item.quantity,
      unit_price: Number(item.unitPrice),
      total_price: Number(item.totalPrice),
    }));

    return res.status(StatusCodes.OK).json({ success: true, data: mappedOrder });
  } catch (err) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: err.message || 'Failed to load order',
    });
  }
}

async function createOrder(req, res) {
  const {
    shipping_address,
    shipping_cost = 0,
    payment_method = 'cod',
    items,
    payment_details = {},
  } = req.body;

  if (payment_details?.transaction_id && !isValidTransactionReference(payment_details.transaction_id)) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      message: 'Transaction ID / Reference Number must be 3-50 characters and contain only letters, numbers, spaces, dots, underscores, or hyphens.',
    });
  }

  if (payment_details?.sender_account_number && !isValidSenderAccount(payment_details.sender_account_number)) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      message: 'Sender Account Number must be 4-20 characters and may only contain digits, spaces, or hyphens.',
    });
  }

  const userId = req.activeUser.userID;
  const normalizedPaymentMethod = PAYMENT_METHODS.includes(payment_method) ? payment_method : 'cod';
  const initialPaymentStatus = 'unpaid';
  const initialPaymentState = 'pending';

  if (!shipping_address || !items?.length) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      message: 'shipping_address and items are required',
    });
  }

  try {
    const result = await db.transaction(async (trx) => {
      let subtotal = 0;
      const lineItems = [];

      for (const item of items) {
        const product = await trx('products').where({ productID: item.product_id }).first();
        if (!product) {
          throw new Error(`Product ${item.product_id} not found`);
        }
        if (product.stockQuantity < item.quantity) {
          throw new Error(`Insufficient stock for ${product.name}`);
        }

        const unitPrice = Number(product.discountPrice ?? product.price);
        const lineTotal = unitPrice * item.quantity;
        subtotal += lineTotal;

        lineItems.push({
          product_id: product.productID,
          seller_id: product.seller_id,
          quantity: item.quantity,
          unitPrice,
          totalPrice: lineTotal,
        });
      }

      const shipping = Number(shipping_cost) || 0;
      const totalPrice = subtotal + shipping;
      const orderCode = await createUniqueOrderReferenceCode(trx);

      const [newOrder] = await trx('orders')
        .insert({
          user_id: userId,
          orderCode,
          totalPrice,
          shippingCost: shipping,
          shippingAddress: shipping_address,
          status: 'pending',
          paymentStatus: initialPaymentStatus,
          paymentMethod: normalizedPaymentMethod,
        })
        .returning('*');

      await Promise.all(lineItems.map(async (line) => {
        await trx('order_items').insert({
          order_id: newOrder.orderID,
          product_id: line.product_id,
          seller_id: line.seller_id,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          totalPrice: line.totalPrice,
        });
        await trx('products')
          .where({ productID: line.product_id })
          .decrement('stockQuantity', line.quantity);
      }));

      await trx('payments').insert({
        order_id: newOrder.orderID,
        paymentMethod: normalizedPaymentMethod,
        amount: totalPrice,
        status: initialPaymentState,
        transactionID: payment_details?.transaction_id || null,
        metadata: {
          sender_account_number: payment_details?.sender_account_number || null,
          transaction_id: payment_details?.transaction_id || null,
        },
        processedOn: initialPaymentState === 'completed' ? db.fn.now() : null,
      });

      return newOrder;
    });

    const payment = await db('payments').where({ order_id: result.orderID }).first();

    const user = await db('user').where({ userID: userId }).first();
    const orderItems = await db('order_items')
      .select('order_items.*', 'products.name as product_name')
      .leftJoin('products', 'products.productID', 'order_items.product_id')
      .where('order_items.order_id', result.orderID);

    if (user?.email) {
      sendOrderConfirmationEmail({
        email: user.email,
        firstName: user.firstName || 'Customer',
        orderId: result.orderCode || result.orderID,
        status: result.status,
        paymentMethod: normalizedPaymentMethod,
        shippingAddress: shipping_address,
        items: orderItems,
        subtotal: Number(result.totalPrice) - Number(result.shippingCost || 0),
        shippingCost: Number(result.shippingCost || 0),
        totalPrice: Number(result.totalPrice),
      }).catch((err) => {
        logger.error('[ORDERS][createOrder]::Failed to send confirmation email', err);
      });
    }

    return res.status(StatusCodes.CREATED).json({
      success: true,
      data: mapOrder(result, payment),
    });
  } catch (err) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      message: err.message || 'Failed to create order',
    });
  }
}

async function submitPaymentProof(req, res) {
  try {
    const { id } = req.params;
    const { transaction_id, sender_account_number } = req.body;

    if (transaction_id && !isValidTransactionReference(transaction_id)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Transaction ID / Reference Number must be 3-50 characters and contain only letters, numbers, spaces, dots, underscores, or hyphens.',
      });
    }

    if (sender_account_number && !isValidSenderAccount(sender_account_number)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Sender Account Number must be 4-20 characters and may only contain digits, spaces, or hyphens.',
      });
    }

    if (!req.file) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Receipt file is required',
      });
    }

    const order = await db('orders').where({ orderID: id }).first();
    if (!order) {
      return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: 'Order not found' });
    }

    const roleRow = await db('accessTemplate')
      .first('type')
      .where('accessTemplateID', req.activeUser.accessTemplateID);

    if (roleRow?.type !== 'Admin' && order.user_id !== req.activeUser.userID) {
      return res.status(StatusCodes.FORBIDDEN).json({ success: false, message: 'Access denied' });
    }

    const payment = await db('payments').where({ order_id: id }).first();
    const receiptUrl = `uploads/payments/${req.file.filename}`;
    const metadata = {
      ...(payment?.metadata || {}),
      receipt_url: receiptUrl,
      receipt_name: req.file.originalname,
      transaction_id: transaction_id || payment?.transactionID || null,
      sender_account_number: sender_account_number || null,
      proof_uploaded_at: new Date().toISOString(),
    };

    await db('payments')
      .where({ order_id: id })
      .update({
        transactionID: transaction_id || payment?.transactionID || null,
        metadata,
        updatedOn: db.fn.now(),
      });

    const updatedPayment = await db('payments').where({ order_id: id }).first();
    const updatedOrder = await db('orders').where({ orderID: id }).first();

    return res.status(StatusCodes.OK).json({
      success: true,
      data: mapOrder(updatedOrder, updatedPayment),
    });
  } catch (err) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: err.message || 'Failed to upload payment proof',
    });
  }
}

async function updateOrderStatus(req, res) {
  try {
    const { id } = req.params;
    const { status, paymentStatus } = req.body;

    const normalizedPaymentStatus = PAYMENT_STATUSES.includes(paymentStatus) ? paymentStatus : null;
    const normalizedStatus = ORDER_STATUSES.includes(status) ? status : null;

    if (status && !normalizedStatus) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Invalid order status',
      });
    }

    if (paymentStatus && !normalizedPaymentStatus) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Invalid payment status',
      });
    }

    const order = await db('orders').where({ orderID: id }).first();
    if (!order) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (order.status === 'delivered' && normalizedStatus === 'cancelled') {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'This order has already been delivered and cannot be cancelled.',
      });
    }

    const updatePayload = {
      updatedOn: db.fn.now(),
    };

    if (normalizedStatus) {
      updatePayload.status = normalizedStatus;
    }

    if (normalizedPaymentStatus) {
      updatePayload.paymentStatus = normalizedPaymentStatus;
    }

    if (normalizedPaymentStatus === 'paid') {
      updatePayload.status = 'processing';
    }

    if (normalizedPaymentStatus === 'unpaid' && !normalizedStatus) {
      updatePayload.status = 'pending';
    }

    if (normalizedStatus === 'shipped') {
      updatePayload.shippedOn = db.fn.now();
    }
    if (normalizedStatus === 'delivered') {
      updatePayload.deliveredOn = db.fn.now();
    }

    const [updatedOrder] = await db('orders')
      .where({ orderID: id })
      .update(updatePayload, '*');

    orderEvents.emit('orders-updated', { type: 'orders-updated', orderId: id });

    const paymentUpdate = {};
    if (normalizedPaymentStatus === 'paid') {
      paymentUpdate.status = 'completed';
    } else if (normalizedPaymentStatus === 'unpaid') {
      paymentUpdate.status = 'pending';
    } else if (normalizedPaymentStatus === 'refunded') {
      paymentUpdate.status = 'refunded';
    }

    if (Object.keys(paymentUpdate).length) {
      await db('payments').where({ order_id: id }).update(paymentUpdate);
    }

    const payment = await db('payments').where({ order_id: id }).first();

    const user = await db('user').where({ userID: order.user_id }).first();
    if (user?.email && order.status !== updatePayload.status) {
      sendOrderStatusEmail({
        email: user.email,
        firstName: user.firstName || 'Customer',
        orderId: order.orderCode || id,
        status: updatePayload.status,
        previousStatus: order.status,
      }).catch((err) => {
        logger.error('[ORDERS][updateOrderStatus]::Failed to send status email', err);
      });
    }

    return res.status(StatusCodes.OK).json({
      success: true,
      message: 'Order updated',
      data: mapOrder(updatedOrder, payment),
    });
  } catch (err) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: err.message || 'Failed to update order',
    });
  }
}

module.exports = {
  listOrders,
  getOrderById,
  createOrder,
  updateOrderStatus,
  submitPaymentProof,
  uploadPaymentProofMiddleware,
};
