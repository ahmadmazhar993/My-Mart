const { StatusCodes } = require('http-status-codes');
const db = require('../../../db');
const { generateUniqueSlug } = require('../products/products.service');
const {
  LOW_STOCK_THRESHOLD, isUuid, escapeLike, parsePagination, buildPagination,
  sendError, sendValidationError, sendServerError, audit, toInt, toMoney,
} = require('./seller.shared');
const { parseVariants } = require('../../../libs/stock');
const realtime = require('../../../libs/realtime');

const IMAGE_PATH = /^uploads\/products\/[A-Za-z0-9._-]+$/;
const MAX_IMAGES = 10;
const MAX_STOCK = 1000000;

/* -------------------------------------------------------------------------- */
/* Mapping                                                                    */
/* -------------------------------------------------------------------------- */

const SELECT_COLUMNS = [
  'products.*',
  'categories.name as categoryName',
  db.raw(
    '(SELECT COALESCE(SUM(oi.quantity), 0) FROM order_items oi JOIN orders o ON o."orderID" = oi.order_id WHERE oi.product_id = products."productID" AND o.status <> \'cancelled\') AS "unitsSold"'
  ),
];

const mapSellerProduct = (row) => ({
  id: row.productID,
  name: row.name,
  slug: row.slug,
  sku: row.sku,
  description: row.description,
  category_id: row.category_id,
  category_name: row.categoryName || null,
  price: Number(row.price),
  discount_price: row.discountPrice != null ? Number(row.discountPrice) : null,
  stock_quantity: Number(row.stockQuantity || 0),
  image_url: row.imageUrl,
  images: Array.isArray(row.images) ? row.images : [],
  variants: parseVariants(row.variants),
  approval_status: row.archivedOn ? 'archived' : row.approvalStatus,
  rejection_reason: row.approvalStatus === 'rejected' ? row.rejectionReason : null,
  is_active: row.isActive,
  units_sold: Number(row.unitsSold || 0),
  created_at: row.createdOn,
  updated_at: row.updatedOn,
});

const ownedProduct = (sellerID, productID) => db('products')
  .leftJoin('categories', 'categories.categoryID', 'products.category_id')
  .select(SELECT_COLUMNS)
  .where('products.seller_id', sellerID)
  .where('products.productID', productID)
  .first();

/* -------------------------------------------------------------------------- */
/* Validation                                                                 */
/* -------------------------------------------------------------------------- */

const normalizeVariants = (input, errors) => {
  if (!Array.isArray(input)) {
    errors.variants = 'Variants must be a list.';
    return null;
  }
  if (input.length > 30) {
    errors.variants = 'A product can have at most 30 variants.';
    return null;
  }
  const result = [];
  const seen = new Set();
  input.forEach((variant, index) => {
    const label = `Variant ${index + 1}`;
    const name = String(variant?.name || variant?.label || '').trim();
    if (!name || name.length > 80) {
      errors.variants = `${label}: name is required (max 80 characters).`;
      return;
    }
    if (seen.has(name.toLowerCase())) {
      errors.variants = `${label}: duplicate variant name "${name}".`;
      return;
    }
    seen.add(name.toLowerCase());
    const price = toMoney(variant.price);
    const discount = toMoney(variant.discount_price);
    const stock = variant.stock_quantity == null || variant.stock_quantity === '' ? null : toInt(variant.stock_quantity);
    if (price != null && (Number.isNaN(price) || price <= 0)) errors.variants = `${label}: price must be greater than 0.`;
    if (discount != null && (Number.isNaN(discount) || discount < 0 || (price != null && discount >= price))) {
      errors.variants = `${label}: discount price must be lower than the price.`;
    }
    if (variant.stock_quantity != null && variant.stock_quantity !== '' && (stock == null || stock < 0 || stock > MAX_STOCK)) {
      errors.variants = `${label}: stock must be a whole number of 0 or more.`;
    }
    const image = String(variant.image || '').trim();
    if (image && !IMAGE_PATH.test(image)) errors.variants = `${label}: invalid image.`;
    result.push({
      name,
      label: String(variant.label || name).trim().slice(0, 80),
      price,
      discount_price: discount,
      stock_quantity: stock,
      sku: String(variant.sku || '').trim().slice(0, 100),
      image,
    });
  });
  return result;
};

/**
 * Whitelist + validate product input. Only the fields listed here can ever
 * reach the database (no seller_id, approvalStatus, isActive, ratings, ...).
 * `partial` skips required checks for fields that were not sent.
 */
const validateProductInput = (body, { partial }) => {
  const errors = {};
  const values = {};
  const has = (key) => Object.prototype.hasOwnProperty.call(body, key);

  if (!partial || has('name')) {
    const name = String(body.name || '').trim();
    if (name.length < 3 || name.length > 200) errors.name = 'Product name must be 3 to 200 characters.';
    else values.name = name;
  }
  if (has('description')) {
    const description = String(body.description || '').trim();
    if (description.length > 5000) errors.description = 'Description must be 5000 characters or fewer.';
    else values.description = description || null;
  }
  if (!partial || has('category_id')) {
    if (!isUuid(body.category_id)) errors.category_id = 'Please choose a category.';
    else values.category_id = body.category_id;
  }
  let price;
  if (!partial || has('price')) {
    price = toMoney(body.price);
    if (price == null || Number.isNaN(price) || price <= 0 || price > 100000000) errors.price = 'Price must be greater than 0.';
    else values.price = price;
  }
  if (has('discount_price')) {
    const discount = toMoney(body.discount_price);
    if (discount == null) {
      values.discountPrice = null;
      values.discountPercentage = null;
    } else if (Number.isNaN(discount) || discount < 0) {
      errors.discount_price = 'Discount price is invalid.';
    } else {
      values.discountPrice = discount;
    }
  }
  if (has('sku')) {
    const sku = String(body.sku || '').trim();
    if (sku.length > 100 || (sku && !/^[A-Za-z0-9._\-/ ]+$/.test(sku))) errors.sku = 'SKU may only contain letters, numbers, spaces and . _ - /';
    else values.sku = sku || null;
  }
  if (!partial && has('stock_quantity')) {
    const stock = toInt(body.stock_quantity);
    if (stock == null || stock < 0 || stock > MAX_STOCK) errors.stock_quantity = 'Stock must be a whole number of 0 or more.';
    else values.stockQuantity = stock;
  }
  if (has('images')) {
    const images = body.images;
    if (!Array.isArray(images) || images.length > MAX_IMAGES || !images.every((img) => typeof img === 'string' && IMAGE_PATH.test(img))) {
      errors.images = `Images must be uploaded files (max ${MAX_IMAGES}).`;
    } else {
      values.images = JSON.stringify(images);
      values.imageUrl = images[0] || null;
    }
  }
  if (has('variants')) {
    const variants = normalizeVariants(body.variants, errors);
    if (variants) values.variants = JSON.stringify(variants);
  }

  // Cross-field: discount must undercut the price actually being saved.
  if (values.discountPrice != null && !errors.discount_price) {
    const effectivePrice = values.price ?? (partial ? body.__existingPrice : undefined);
    if (effectivePrice != null && values.discountPrice >= effectivePrice) {
      errors.discount_price = 'Discount price must be lower than the price.';
    } else if (effectivePrice != null) {
      values.discountPercentage = Math.round((1 - values.discountPrice / effectivePrice) * 100);
    }
  }

  return { errors, values };
};

const CONTENT_KEYS = ['name', 'description', 'category_id', 'price', 'discountPrice', 'images', 'variants'];

const stripVariantStock = (value) => JSON.stringify(parseVariants(value).map(({ stock_quantity: _s, ...rest }) => rest));

// Has anything the customer would see/pay changed? (Stock is not content.)
const contentChanged = (existing, values) => CONTENT_KEYS.some((key) => {
  if (!(key in values)) return false;
  if (key === 'variants') return stripVariantStock(values.variants) !== stripVariantStock(existing.variants);
  if (key === 'images') return values.images !== JSON.stringify(existing.images || []);
  if (key === 'price' || key === 'discountPrice') {
    return Number(values[key] ?? -1) !== Number(existing[key] ?? -1);
  }
  return String(values[key] ?? '') !== String(existing[key] ?? '');
});

const handleWriteError = (res, scope, err) => {
  if (err?.code === '23505') {
    return sendError(res, StatusCodes.CONFLICT, 'That SKU is already used by another product.');
  }
  return sendServerError(res, scope, err);
};

const categoryExists = async (categoryId) => Boolean(
  await db('categories').first('categoryID').where({ categoryID: categoryId, isActive: true })
);

/* -------------------------------------------------------------------------- */
/* Handlers                                                                   */
/* -------------------------------------------------------------------------- */

const SORTS = {
  updated: 'products.updatedOn',
  created: 'products.createdOn',
  name: 'products.name',
  price: 'products.price',
  stock: 'products.stockQuantity',
  sales: 'unitsSold',
};

async function listProducts(req, res) {
  try {
    const sellerID = req.seller.sellerID;
    const pg = parsePagination(req.query);
    const search = String(req.query.search || '').trim();
    const { status, stock, category_id: categoryId } = req.query;

    const base = db('products').where('products.seller_id', sellerID);

    if (status === 'archived') base.whereNotNull('products.archivedOn');
    else base.whereNull('products.archivedOn');

    if (['draft', 'pending_review', 'approved', 'rejected'].includes(status)) {
      base.where('products.approvalStatus', status);
    } else if (status === 'published') {
      base.where({ 'products.approvalStatus': 'approved', 'products.isActive': true });
    } else if (status === 'unpublished') {
      base.where({ 'products.approvalStatus': 'approved', 'products.isActive': false });
    }

    if (stock === 'out') base.where('products.stockQuantity', '<=', 0);
    else if (stock === 'low') base.whereBetween('products.stockQuantity', [1, LOW_STOCK_THRESHOLD]);
    else if (stock === 'in') base.where('products.stockQuantity', '>', LOW_STOCK_THRESHOLD);

    if (isUuid(categoryId)) base.where('products.category_id', categoryId);

    if (search) {
      const pattern = `%${escapeLike(search)}%`;
      base.where((builder) => builder
        .whereRaw('products.name ILIKE ?', [pattern])
        .orWhereRaw('products.sku ILIKE ?', [pattern]));
    }

    const totalRow = await base.clone().count({ total: '*' }).first();
    const sortColumn = SORTS[req.query.sort] || SORTS.updated;
    const direction = req.query.order === 'asc' ? 'asc' : 'desc';

    const rows = await base.clone()
      .leftJoin('categories', 'categories.categoryID', 'products.category_id')
      .select(SELECT_COLUMNS)
      .orderByRaw(`${sortColumn.includes('.') ? `"${sortColumn.split('.')[0]}"."${sortColumn.split('.')[1]}"` : `"${sortColumn}"`} ${direction}`)
      .orderBy('products.productID', 'asc')
      .limit(pg.limit)
      .offset(pg.offset);

    return res.json({
      success: true,
      data: rows.map(mapSellerProduct),
      pagination: buildPagination(pg, Number(totalRow.total)),
      meta: { lowStockThreshold: LOW_STOCK_THRESHOLD },
    });
  } catch (err) {
    return sendServerError(res, 'listProducts', err);
  }
}

async function getProduct(req, res) {
  try {
    if (!isUuid(req.params.id)) return sendError(res, StatusCodes.NOT_FOUND, 'Product not found');
    const row = await ownedProduct(req.seller.sellerID, req.params.id);
    if (!row) return sendError(res, StatusCodes.NOT_FOUND, 'Product not found');
    return res.json({ success: true, data: mapSellerProduct(row) });
  } catch (err) {
    return sendServerError(res, 'getProduct', err);
  }
}

async function createProduct(req, res) {
  try {
    const body = req.body || {};
    const { errors, values } = validateProductInput(body, { partial: false });
    if (Object.keys(errors).length) return sendValidationError(res, errors);
    if (!(await categoryExists(values.category_id))) {
      return sendError(res, StatusCodes.BAD_REQUEST, 'That category is not available.', { errors: { category_id: 'That category is not available.' } });
    }

    const submit = body.submit === true;
    const productID = await db.transaction(async (trx) => {
      const slug = await generateUniqueSlug(values.name);
      const [created] = await trx('products').insert({
        ...values,
        stockQuantity: values.stockQuantity ?? 0,
        slug,
        seller_id: req.seller.sellerID,
        approvalStatus: submit ? 'pending_review' : 'draft',
        submittedOn: submit ? trx.fn.now() : null,
        isActive: false,
      }, 'productID');
      const id = created.productID || created;
      if ((values.stockQuantity ?? 0) > 0) {
        await trx('stock_movements').insert({
          product_id: id,
          delta: values.stockQuantity,
          quantityBefore: 0,
          quantityAfter: values.stockQuantity,
          reason: 'initial_stock',
          actor_user_id: req.activeUser.userID,
        });
      }
      return id;
    });

    await audit({
      entity: 'SellerProduct', targetID: productID, action: 'Create', description: `Created product "${values.name}"`, userID: req.activeUser.userID, data: { submitted: submit },
    });
    realtime.emitSeller(req.seller.sellerID, 'product', {
      id: productID,
      action: submit ? 'submitted' : 'created',
      messages: submit ? { admin: 'A product is waiting for review.' } : {},
    });
    const row = await ownedProduct(req.seller.sellerID, productID);
    return res.status(StatusCodes.CREATED).json({ success: true, data: mapSellerProduct(row) });
  } catch (err) {
    return handleWriteError(res, 'createProduct', err);
  }
}

async function updateProduct(req, res) {
  try {
    if (!isUuid(req.params.id)) return sendError(res, StatusCodes.NOT_FOUND, 'Product not found');
    const existing = await db('products').first('*').where({ productID: req.params.id, seller_id: req.seller.sellerID });
    if (!existing) return sendError(res, StatusCodes.NOT_FOUND, 'Product not found');
    if (existing.archivedOn) return sendError(res, StatusCodes.CONFLICT, 'Archived products cannot be edited.');

    const body = { ...(req.body || {}), __existingPrice: Number(existing.price) };
    const { errors, values } = validateProductInput(body, { partial: true });
    // A price change without a new discount must still keep the old discount valid.
    if (values.price != null && !('discountPrice' in values) && existing.discountPrice != null
      && Number(existing.discountPrice) >= values.price) {
      errors.price = 'Price must be higher than the current discount price.';
    }
    if (Object.keys(errors).length) return sendValidationError(res, errors);
    if (values.category_id && !(await categoryExists(values.category_id))) {
      return sendError(res, StatusCodes.BAD_REQUEST, 'That category is not available.', { errors: { category_id: 'That category is not available.' } });
    }

    // Live variant stock is owned by checkout and Inventory; an edit form holding a
    // stale number must not overwrite it. Only brand-new variants take a supplied stock.
    if (values.variants) {
      const current = parseVariants(existing.variants);
      values.variants = JSON.stringify(JSON.parse(values.variants).map((variant) => {
        const prev = current.find((c) => c.name === variant.name);
        return prev && prev.stock_quantity != null ? { ...variant, stock_quantity: prev.stock_quantity } : variant;
      }));
    }

    const update = { ...values, updatedOn: db.fn.now() };
    let backToReview = false;
    if (existing.approvalStatus === 'approved' && contentChanged(existing, values)) {
      // Customer-visible changes to a live product must be re-approved.
      update.approvalStatus = 'pending_review';
      update.submittedOn = db.fn.now();
      update.isActive = false;
      backToReview = true;
    }
    if (values.name && values.name !== existing.name) {
      update.slug = await generateUniqueSlug(values.name, existing.productID);
    }

    await db('products').where({ productID: existing.productID, seller_id: req.seller.sellerID }).update(update);
    await audit({
      entity: 'SellerProduct', targetID: existing.productID, action: 'Update', description: `Updated product "${values.name || existing.name}"`, userID: req.activeUser.userID, data: { backToReview },
    });
    realtime.emitSeller(req.seller.sellerID, 'product', {
      id: existing.productID,
      action: backToReview ? 'submitted' : 'updated',
      messages: backToReview ? { admin: 'A product was edited and needs review again.' } : {},
    });
    const row = await ownedProduct(req.seller.sellerID, existing.productID);
    return res.json({
      success: true,
      data: mapSellerProduct(row),
      message: backToReview ? 'Saved. Because customer-facing details changed, the product was sent back for review and is hidden until approved.' : 'Product updated.',
    });
  } catch (err) {
    return handleWriteError(res, 'updateProduct', err);
  }
}

async function changeState(req, res, { allowedFrom, apply, action, description, conflictMessage }) {
  try {
    if (!isUuid(req.params.id)) return sendError(res, StatusCodes.NOT_FOUND, 'Product not found');
    const existing = await db('products').first('*').where({ productID: req.params.id, seller_id: req.seller.sellerID });
    if (!existing) return sendError(res, StatusCodes.NOT_FOUND, 'Product not found');
    if (existing.archivedOn || !allowedFrom(existing)) return sendError(res, StatusCodes.CONFLICT, conflictMessage);

    await db('products')
      .where({ productID: existing.productID, seller_id: req.seller.sellerID })
      .update({ ...apply, updatedOn: db.fn.now() });
    await audit({
      entity: 'SellerProduct', targetID: existing.productID, action, description: `${description} "${existing.name}"`, userID: req.activeUser.userID,
    });
    realtime.emitSeller(req.seller.sellerID, 'product', {
      id: existing.productID,
      action: { Submit: 'submitted', Publish: 'published', Unpublish: 'unpublished' }[action] || action.toLowerCase(),
      messages: action === 'Submit' ? { admin: 'A product is waiting for review.' } : {},
    });
    const row = await ownedProduct(req.seller.sellerID, existing.productID);
    return res.json({ success: true, data: mapSellerProduct(row) });
  } catch (err) {
    return sendServerError(res, action, err);
  }
}

const submitProduct = (req, res) => changeState(req, res, {
  allowedFrom: (p) => ['draft', 'rejected'].includes(p.approvalStatus),
  apply: {
    approvalStatus: 'pending_review', submittedOn: db.fn.now(), rejectionReason: null, isActive: false,
  },
  action: 'Submit',
  description: 'Submitted for review',
  conflictMessage: 'Only draft or rejected products can be submitted for review.',
});

const publishProduct = (req, res) => changeState(req, res, {
  allowedFrom: (p) => p.approvalStatus === 'approved',
  apply: { isActive: true },
  action: 'Publish',
  description: 'Published',
  conflictMessage: 'Only approved products can be published.',
});

const unpublishProduct = (req, res) => changeState(req, res, {
  allowedFrom: (p) => p.approvalStatus === 'approved',
  apply: { isActive: false },
  action: 'Unpublish',
  description: 'Unpublished',
  conflictMessage: 'Only approved products can be unpublished.',
});

async function deleteProduct(req, res) {
  try {
    if (!isUuid(req.params.id)) return sendError(res, StatusCodes.NOT_FOUND, 'Product not found');
    const existing = await db('products').first('*').where({ productID: req.params.id, seller_id: req.seller.sellerID });
    if (!existing) return sendError(res, StatusCodes.NOT_FOUND, 'Product not found');

    const [orderItem, cartItem, review] = await Promise.all([
      db('order_items').first('orderItemID').where({ product_id: existing.productID }),
      db('cart_items').first('cartItemID').where({ product_id: existing.productID }),
      db('reviews').first('reviewID').where({ product_id: existing.productID }),
    ]);

    // Anything tied to history is archived (kept, hidden) rather than deleted.
    if (orderItem || cartItem || review) {
      await db('products')
        .where({ productID: existing.productID, seller_id: req.seller.sellerID })
        .update({ archivedOn: db.fn.now(), isActive: false, updatedOn: db.fn.now() });
      await audit({
        entity: 'SellerProduct', targetID: existing.productID, action: 'Archive', description: `Archived product "${existing.name}"`, userID: req.activeUser.userID,
      });
      realtime.emitSeller(req.seller.sellerID, 'product', { id: existing.productID, action: 'archived' });
      return res.json({ success: true, archived: true, message: 'This product has order history, so it was archived instead of deleted.' });
    }

    await db('products').where({ productID: existing.productID, seller_id: req.seller.sellerID }).del();
    await audit({
      entity: 'SellerProduct', targetID: existing.productID, action: 'Delete', description: `Deleted product "${existing.name}"`, userID: req.activeUser.userID,
    });
    realtime.emitSeller(req.seller.sellerID, 'product', { id: existing.productID, action: 'deleted' });
    return res.json({ success: true, archived: false, message: 'Product deleted.' });
  } catch (err) {
    return sendServerError(res, 'deleteProduct', err);
  }
}

function uploadImages(req, res) {
  return res.json({ success: true, data: req.uploadedPaths });
}

async function listCategories(req, res) {
  try {
    const rows = await db('categories').select('categoryID', 'name', 'parentId').where({ isActive: true }).orderBy('name');
    return res.json({
      success: true,
      data: rows.map((row) => ({ id: row.categoryID, name: row.name, parent_id: row.parentId })),
    });
  } catch (err) {
    return sendServerError(res, 'listCategories', err);
  }
}

module.exports = {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  submitProduct,
  publishProduct,
  unpublishProduct,
  deleteProduct,
  uploadImages,
  listCategories,
  mapSellerProduct,
};
