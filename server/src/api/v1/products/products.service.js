const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { StatusCodes } = require('http-status-codes');
const db = require('../../../db');
const { mapProduct, mapProductAdmin } = require('../../../libs/serializers');

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const slugify = (value) => String(value || '')
  .toLowerCase()
  .trim()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/(^-|-$)/g, '');

const isUuid = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''));

// Escape LIKE wildcards so a search for "100%" or "a_b" is treated literally.
const escapeLike = (value) => String(value).replace(/[\\%_]/g, (char) => `\\${char}`);

// Builds a unique slug. Pass excludeId when updating so a product doesn't
// collide with itself.
const generateUniqueSlug = async (name, excludeId = null) => {
  const base = slugify(name) || 'product';
  let candidate = base;
  let counter = 2;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const query = db('products').where({ slug: candidate });
    if (excludeId) query.whereNot({ productID: excludeId });

    // eslint-disable-next-line no-await-in-loop
    const exists = await query.first('productID');
    if (!exists) return candidate;

    candidate = `${base}-${counter}`;
    counter += 1;
  }
};

const normalizeImagesPayload = (images) => {
  if (images == null) return null;

  let normalized = images;
  if (typeof normalized === 'string') {
    try {
      normalized = JSON.parse(normalized);
    } catch {
      return [normalized];
    }
  }

  if (Array.isArray(normalized)) {
    return normalized
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object') {
          return item.uploadedPath || item.src || item.path || null;
        }
        return String(item);
      })
      .filter(Boolean);
  }

  if (normalized && typeof normalized === 'object') {
    return [
      normalized.uploadedPath
      || normalized.src
      || normalized.path
      || JSON.stringify(normalized),
    ];
  }

  return [String(normalized)];
};

const toNumberOrNull = (value) => (value == null || value === '' ? null : Number(value));

const normalizeVariantsPayload = (variants) => {
  if (variants == null) return null;

  let normalized = variants;
  if (typeof normalized === 'string') {
    try {
      normalized = JSON.parse(normalized);
    } catch {
      return [];
    }
  }

  if (!Array.isArray(normalized)) {
    return [];
  }

  return normalized
    .map((variant) => {
      if (!variant || typeof variant !== 'object') return null;
      const name = String(variant.name || variant.label || '').trim();
      if (!name) return null;

      return {
        name,
        label: String(variant.label || variant.name || '').trim() || name,
        price: toNumberOrNull(variant.price),
        discount_price: toNumberOrNull(variant.discount_price),
        purchase_price: toNumberOrNull(variant.purchase_price ?? variant.purchasePrice),
        discount_percentage: toNumberOrNull(variant.discount_percentage),
        stock_quantity: toNumberOrNull(variant.stock_quantity),
        sku: String(variant.sku || '').trim(),
        image: String(variant.image || variant.image_url || variant.imageUrl || '').trim(),
      };
    })
    .filter(Boolean);
};

const resolveFallbackUuid = async (value, table, column, options = {}) => {
  if (value != null && value !== '' && isUuid(value)) {
    return String(value);
  }

  if (value != null && value !== '') {
    const normalized = String(value).trim();
    const row = await db(table)
      .first(`${column} as id`)
      .where(function (builder) {
        if (Array.isArray(options.matchBy) && options.matchBy.length > 0) {
          options.matchBy.forEach((field, index) => {
            if (index === 0) {
              builder.whereRaw(`LOWER("${field}") = ?`, [normalized.toLowerCase()]);
            } else {
              builder.orWhereRaw(`LOWER("${field}") = ?`, [normalized.toLowerCase()]);
            }
          });
        }
        builder.orWhere(column, normalized);
        if (options.where) {
          Object.entries(options.where).forEach(([field, fieldValue]) => {
            builder.andWhere(field, fieldValue);
          });
        }
      })
      .orderByRaw('1');

    if (row?.id) {
      return String(row.id);
    }
  }

  const fallbackRow = await db(table)
    .first(`${column} as id`)
    .where(options.where || {})
    .orderByRaw('1');

  return fallbackRow?.id ? String(fallbackRow.id) : null;
};

// Finds a product by UUID or slug using indexed lookups (no full-table scan).
// Public callers only see active products; admin callers pass includeInactive.
const resolveProductByIdentifier = async (identifier, { includeInactive = false } = {}) => {
  if (!identifier) return null;

  const value = String(identifier).trim();
  const base = db('products');
  if (!includeInactive) base.where('isActive', true);

  if (isUuid(value)) {
    const byId = await base.clone().where({ productID: value }).first();
    if (byId) return byId;
  }

  const bySlug = await base.clone().where({ slug: value.toLowerCase() }).first();
  return bySlug || null;
};

const getUsageFlags = async (productID) => {
  const [cartItem, orderItem, review] = await Promise.all([
    db('cart_items').where({ product_id: productID }).first(),
    db('order_items').where({ product_id: productID }).first(),
    db('reviews').where({ product_id: productID }).first(),
  ]);
  return { inUse: Boolean(cartItem || orderItem || review) };
};

/* -------------------------------------------------------------------------- */
/* Listing (public + admin share one builder)                                 */
/* -------------------------------------------------------------------------- */

async function buildProductList(req, res, { admin }) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 25));
    const offset = (page - 1) * limit;
    const search = String(req.query.search || '').trim();
    const forOrder = req.query.forOrder === 'true';
    const categoryId = req.query.category_id;
    const saleOnly = req.query.sale === 'true';
    const priceRange = req.query.priceRange || 'all';
    // Optional sort: popular | price-asc | price-desc | rating. Omitted = newest first (legacy/admin).
    const sort = String(req.query.sort || '').trim();

    const baseQuery = db('products').where('isActive', true);

    if (search) {
      // Case-insensitive, wildcard-safe, matches name or SKU.
      const pattern = `%${escapeLike(search)}%`;
      baseQuery.where((builder) => {
        builder.whereRaw('name ILIKE ?', [pattern])
          .orWhereRaw('sku ILIKE ?', [pattern]);
      });
    }

    if (categoryId) {
      baseQuery.where('category_id', categoryId);
    }

    if (saleOnly) {
      baseQuery.whereNotNull('discountPrice');
    }

    if (priceRange === 'under-500') {
      baseQuery.where((builder) => {
        builder.whereRaw('("discountPrice" IS NOT NULL AND CAST("discountPrice" AS NUMERIC) < ?)', [500])
          .orWhereRaw('("discountPrice" IS NULL AND CAST("price" AS NUMERIC) < ?)', [500]);
      });
    } else if (priceRange === '500-2000') {
      baseQuery.where((builder) => {
        builder.whereRaw('("discountPrice" IS NOT NULL AND CAST("discountPrice" AS NUMERIC) BETWEEN ? AND ?)', [500, 2000])
          .orWhereRaw('("discountPrice" IS NULL AND CAST("price" AS NUMERIC) BETWEEN ? AND ?)', [500, 2000]);
      });
    } else if (priceRange === 'over-2000') {
      baseQuery.where((builder) => {
        builder.whereRaw('("discountPrice" IS NOT NULL AND CAST("discountPrice" AS NUMERIC) > ?)', [2000])
          .orWhereRaw('("discountPrice" IS NULL AND CAST("price" AS NUMERIC) > ?)', [2000]);
      });
    }

    const countQuery = baseQuery.clone();
    const totalResult = await countQuery.count({ total: '*' }).first();
    const effectivePrice = 'COALESCE(CAST("discountPrice" AS NUMERIC), CAST("price" AS NUMERIC))';
    const listQuery = baseQuery.clone().select('*');

    switch (sort) {
      case 'popular':
        // Best sellers: units sold in non-cancelled orders.
        listQuery
          .select(db.raw(
            '(SELECT COALESCE(SUM(oi.quantity), 0) FROM order_items oi JOIN orders o ON o."orderID" = oi.order_id WHERE oi.product_id = products."productID" AND o.status <> ?) AS "unitsSold"',
            ['cancelled']
          ))
          .orderByRaw('"unitsSold" DESC')
          .orderBy('createdOn', 'desc');
        break;
      case 'price-asc':
        listQuery.orderByRaw(`${effectivePrice} ASC`).orderBy('createdOn', 'desc');
        break;
      case 'price-desc':
        listQuery.orderByRaw(`${effectivePrice} DESC`).orderBy('createdOn', 'desc');
        break;
      case 'rating':
        listQuery.orderBy('rating', 'desc').orderBy('reviewCount', 'desc').orderBy('createdOn', 'desc');
        break;
      default:
        listQuery.orderBy('createdOn', 'desc');
    }

    // productID as a final tie-breaker keeps pages stable (no repeats/gaps across pages).
    const products = await listQuery
      .orderBy('productID', 'asc')
      .limit(limit)
      .offset(offset);

    const mapper = admin ? mapProductAdmin : mapProduct;

    // can_delete is an admin-only flag; skip its 3 queries/product for the public.
    const data = (forOrder || !admin)
      ? products.map(mapper)
      : await Promise.all(
        products.map(async (product) => {
          const { inUse } = await getUsageFlags(product.productID);
          return { ...mapper(product), can_delete: !inUse };
        })
      );

    const total = Number(totalResult?.total || 0);
    const totalPages = Math.max(1, Math.ceil(total / limit));

    return res.status(StatusCodes.OK).json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (err) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: err.message || 'Failed to load products',
    });
  }
}

const listProducts = (req, res) => buildProductList(req, res, { admin: false });
const listProductsAdmin = (req, res) => buildProductList(req, res, { admin: true });

/* -------------------------------------------------------------------------- */
/* Image upload                                                               */
/* -------------------------------------------------------------------------- */

const productImageDir = path.join(
  __dirname,
  '..',
  '..',
  '..',
  '..',
  'uploads',
  'products'
);

const getProductImageFilename = (imagePath) => {
  if (!imagePath) return null;
  const normalized = String(imagePath).replace(/\\/g, '/');
  const match = normalized.match(/(?:^|\/)uploads\/products\/([^/]+)$/);
  return match ? match[1] : null;
};

const deleteProductImageFile = (imagePath) => {
  const filename = getProductImageFilename(imagePath);
  if (!filename) return;

  const absolutePath = path.join(productImageDir, filename);
  if (fs.existsSync(absolutePath)) {
    try {
      fs.unlinkSync(absolutePath);
    } catch {
      // Ignore failures when removing the old image file
    }
  }
};

const productImageStorage = multer.diskStorage({
  destination(req, file, callback) {
    if (!fs.existsSync(productImageDir)) {
      fs.mkdirSync(productImageDir, { recursive: true });
    }
    callback(null, productImageDir);
  },
  filename(req, file, callback) {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e6)}${path.extname(
      file.originalname
    )}`;
    callback(null, uniqueName);
  },
});

const productImageFilter = (req, file, cb) => {
  const fileExtension = path.extname(file.originalname).toLowerCase();
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
  if (!allowedExtensions.includes(fileExtension)) {
    req.productImageValidationError = 'Only JPG, JPEG, PNG, or WEBP images are allowed.';
    return cb(null, false);
  }
  return cb(null, true);
};

const productImageUploader = multer({
  storage: productImageStorage,
  fileFilter: productImageFilter,
  limits: { fileSize: 6 * 1024 * 1024 },
}).array('images', 10);

async function uploadProductImages(req, res) {
  try {
    return productImageUploader(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: err.code === 'LIMIT_FILE_SIZE'
            ? 'Each image must be smaller than 6 MB.'
            : err.message,
        });
      }
      if (err) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: err.message,
        });
      }
      if (req.productImageValidationError) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: req.productImageValidationError,
        });
      }
      const files = req.files || [];
      if (files.length === 0) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: 'No images were uploaded.',
        });
      }

      let oldImagePaths = [];
      if (Array.isArray(req.body.oldImagePath)) {
        oldImagePaths = req.body.oldImagePath;
      } else if (req.body.oldImagePath) {
        oldImagePaths = [req.body.oldImagePath];
      }

      const slug = slugify(req.body.name || 'product') || 'product';
      const renamedPaths = [];

      files.forEach((file, index) => {
        const extension = path.extname(file.filename);
        const newFilename = `${slug}-${Date.now()}-${index + 1}${extension}`;

        const oldPath = path.join(productImageDir, file.filename);
        const newPath = path.join(productImageDir, newFilename);

        fs.renameSync(oldPath, newPath);
        renamedPaths.push(`uploads/products/${newFilename}`);
      });

      oldImagePaths.forEach(deleteProductImageFile);

      return res.status(StatusCodes.OK).json({ success: true, data: renamedPaths });
    });
  } catch (err) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: err.message || 'Failed to upload images' });
  }
}

/* -------------------------------------------------------------------------- */
/* Single product (public + admin)                                            */
/* -------------------------------------------------------------------------- */

async function buildGetProduct(req, res, { admin }) {
  try {
    const product = await resolveProductByIdentifier(req.params.identifier, {
      includeInactive: admin,
    });

    if (!product) {
      return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: 'Product not found' });
    }

    if (!admin) {
      return res.status(StatusCodes.OK).json({ success: true, data: mapProduct(product) });
    }

    const { inUse } = await getUsageFlags(product.productID);

    return res.status(StatusCodes.OK).json({
      success: true,
      data: { ...mapProductAdmin(product), can_delete: !inUse },
    });
  } catch (err) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: err.message || 'Failed to load product',
    });
  }
}

const getProductById = (req, res) => buildGetProduct(req, res, { admin: false });
const getProductByIdAdmin = (req, res) => buildGetProduct(req, res, { admin: true });

/* -------------------------------------------------------------------------- */
/* Reviews                                                                    */
/* -------------------------------------------------------------------------- */

async function getProductReviews(req, res) {
  try {
    const product = await resolveProductByIdentifier(req.params.identifier);

    if (!product) {
      return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: 'Product not found' });
    }

    const reviews = await db('reviews')
      .leftJoin('user', 'reviews.user_id', 'user.userID')
      .select(
        'reviews.reviewID as id',
        'reviews.product_id',
        'reviews.rating',
        'reviews.comment',
        'reviews.createdOn',
        'user.firstName',
        'user.lastName'
      )
      .where('reviews.product_id', product.productID)
      .orderBy('reviews.createdOn', 'desc');

    return res.status(StatusCodes.OK).json({
      success: true,
      data: reviews.map((review) => ({
        id: review.id,
        productId: review.product_id,
        // First name + last initial only. No email, no user id.
        userName: [
          review.firstName,
          review.lastName?.[0] && `${review.lastName[0]}.`,
        ].filter(Boolean).join(' ') || 'Customer',
        rating: Number(review.rating),
        comment: review.comment,
        createdAt: review.createdOn,
      })),
    });
  } catch (err) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: err.message || 'Failed to load product reviews',
    });
  }
}

async function createProductReview(req, res) {
  try {
    const { rating, comment } = req.body;
    const userId = req.activeUser?.userID;

    if (!userId) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ success: false, message: 'Authentication required' });
    }

    const product = await resolveProductByIdentifier(req.params.identifier);

    if (!product) {
      return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: 'Product not found' });
    }

    const normalizedRating = Number(rating);
    if (!Number.isInteger(normalizedRating) || normalizedRating < 1 || normalizedRating > 5) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Rating must be between 1 and 5.',
      });
    }

    const existingReview = await db('reviews').where({ product_id: product.productID, user_id: userId }).first();
    if (existingReview) {
      return res.status(StatusCodes.CONFLICT).json({ success: false, message: 'You have already reviewed this product.' });
    }

    const purchasedOrder = await db('orders as o')
      .join('order_items as oi', 'oi.order_id', 'o.orderID')
      .where('o.user_id', userId)
      .where('oi.product_id', product.productID)
      .orderBy('o.createdOn', 'desc')
      .first('o.orderID as orderID');

    if (!purchasedOrder) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'You can only review products you have purchased.',
      });
    }

    const [created] = await db('reviews').insert(
      {
        product_id: product.productID,
        user_id: userId,
        order_id: purchasedOrder.orderID,
        rating: normalizedRating,
        comment: comment?.trim() || null,
        verifiedPurchase: true,
      },
      ['reviewID', 'product_id', 'user_id', 'order_id', 'rating', 'comment', 'createdOn']
    );

    const allReviews = await db('reviews').where({ product_id: product.productID });
    const reviewCount = allReviews.length;
    const averageRating = reviewCount
      ? Number(
        (
          allReviews.reduce((total, item) => total + Number(item.rating), 0)
          / reviewCount
        ).toFixed(2)
      )
      : 0;

    await db('products').where({ productID: product.productID }).update({
      rating: averageRating,
      reviewCount,
      updatedOn: db.fn.now(),
    });

    const firstName = req.activeUser?.firstName;
    const lastInitial = req.activeUser?.lastName?.[0];

    return res.status(StatusCodes.CREATED).json({
      success: true,
      data: {
        id: created.reviewID,
        productId: created.product_id,
        userName: [firstName, lastInitial && `${lastInitial}.`].filter(Boolean).join(' ') || 'Customer',
        rating: Number(created.rating),
        comment: created.comment,
        createdAt: created.createdOn,
      },
    });
  } catch (err) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      message: err.message || 'Failed to submit review',
    });
  }
}

/* -------------------------------------------------------------------------- */
/* Admin: create / update / delete                                            */
/* -------------------------------------------------------------------------- */

async function createProduct(req, res) {
  try {
    const categoryId = await resolveFallbackUuid(
      req.body.category_id,
      'categories',
      'categoryID',
      { matchBy: ['name', 'slug'], where: { isActive: true } }
    );
    const sellerId = await resolveFallbackUuid(
      req.body.seller_id,
      'sellers',
      'sellerID',
      { where: {} }
    );

    const payload = {
      name: req.body.name,
      slug: await generateUniqueSlug(req.body.name),
      description: req.body.description,
      price: req.body.price,
      purchasePrice: req.body.purchase_price ?? req.body.purchasePrice,
      discountPrice: req.body.discount_price ?? req.body.discountPrice,
      discountPercentage: req.body.discount_percentage ?? req.body.discountPercentage,
      stockQuantity: req.body.stock_quantity ?? req.body.stockQuantity ?? 0,
      seller_id: sellerId,
      category_id: categoryId,
      sku: req.body.sku,
      imageUrl: req.body.image_url ?? req.body.imageUrl,
      images: req.body.images == null
        ? null : JSON.stringify(normalizeImagesPayload(req.body.images)),
      variants: req.body.variants == null
        ? null : JSON.stringify(normalizeVariantsPayload(req.body.variants)),
      isActive: req.body.is_active ?? true,
    };

    const [created] = await db('products').insert(payload, '*');
    return res.status(StatusCodes.CREATED).json({
      success: true,
      data: mapProductAdmin(created),
    });
  } catch (err) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      message: err.message || 'Failed to create product',
    });
  }
}

async function updateProduct(req, res) {
  try {
    const product = await resolveProductByIdentifier(req.params.identifier, {
      includeInactive: true,
    });
    if (!product) {
      return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: 'Product not found' });
    }

    const payload = {};

    if (req.body.name != null) {
      payload.name = req.body.name;
      // Keep the slug in sync with the name (matches the old name-based URLs).
      if (req.body.name !== product.name) {
        payload.slug = await generateUniqueSlug(req.body.name, product.productID);
      }
    }
    if (req.body.description != null) payload.description = req.body.description;
    if (req.body.price != null) payload.price = req.body.price;
    if (req.body.purchase_price != null || req.body.purchasePrice != null) {
      payload.purchasePrice = req.body.purchase_price ?? req.body.purchasePrice;
    }
    if (req.body.discount_price != null || req.body.discountPrice != null) {
      payload.discountPrice = req.body.discount_price ?? req.body.discountPrice;
    }
    if (req.body.discount_percentage != null || req.body.discountPercentage != null) {
      payload.discountPercentage = req.body.discount_percentage ?? req.body.discountPercentage;
    }
    if (req.body.stock_quantity != null || req.body.stockQuantity != null) {
      payload.stockQuantity = req.body.stock_quantity ?? req.body.stockQuantity;
    }
    if (req.body.sku != null) payload.sku = req.body.sku;
    if (req.body.images != null) {
      payload.images = JSON.stringify(normalizeImagesPayload(req.body.images));
    }
    if (req.body.variants != null) {
      payload.variants = JSON.stringify(normalizeVariantsPayload(req.body.variants));
    }
    if (req.body.image_url != null || req.body.imageUrl != null) {
      payload.imageUrl = req.body.image_url ?? req.body.imageUrl;
    }
    if (req.body.is_active != null || req.body.isActive != null) {
      payload.isActive = req.body.is_active ?? req.body.isActive;
    }

    if (req.body.category_id != null) {
      payload.category_id = await resolveFallbackUuid(
        req.body.category_id,
        'categories',
        'categoryID',
        { matchBy: ['name', 'slug'], where: { isActive: true } }
      );
    }

    if (req.body.seller_id != null) {
      payload.seller_id = await resolveFallbackUuid(req.body.seller_id, 'sellers', 'sellerID');
    }

    payload.updatedOn = db.fn.now();

    const [updated] = await db('products').where({ productID: product.productID }).update(payload, '*');
    if (!updated) {
      return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: 'Product not found' });
    }

    return res.status(StatusCodes.OK).json({ success: true, data: mapProductAdmin(updated) });
  } catch (err) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      message: err.message || 'Failed to update product',
    });
  }
}

async function deleteProduct(req, res) {
  try {
    const product = await resolveProductByIdentifier(req.params.identifier, {
      includeInactive: true,
    });
    if (!product) {
      return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: 'Product not found' });
    }

    const { inUse } = await getUsageFlags(product.productID);

    if (inUse) {
      return res.status(StatusCodes.CONFLICT).json({
        success: false,
        message: 'Product is already in use and cannot be deleted.',
      });
    }

    const deleted = await db('products').where({ productID: product.productID }).del();
    if (!deleted) {
      return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: 'Product not found' });
    }
    return res.status(StatusCodes.OK).json({ success: true, message: 'Product deleted' });
  } catch (err) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      message: err.message || 'Failed to delete product',
    });
  }
}

async function checkProductPurchased(req, res) {
  try {
    const product = await resolveProductByIdentifier(req.params.identifier);
    if (!product) {
      return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: 'Product not found' });
    }

    const userId = req.activeUser?.userID;
    if (!userId) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ success: false, message: 'Authentication required' });
    }

    const purchased = await db('orders as o')
      .join('order_items as oi', 'oi.order_id', 'o.orderID')
      .where('o.user_id', userId)
      .andWhere('oi.product_id', product.productID)
      .first();

    return res.status(StatusCodes.OK).json({ success: true, data: { purchased: Boolean(purchased) } });
  } catch (err) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: err.message || 'Failed to check purchase status' });
  }
}

/* -------------------------------------------------------------------------- */
/* Google Merchant feed                                                       */
/* -------------------------------------------------------------------------- */

const escapeXml = (value) => {
  if (value === null || value === undefined) return '';

  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};

const getAbsoluteUrl = (value) => {
  if (!value) return null;

  const url = String(value).trim();

  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  return `https://ahmmart.store/${url.replace(/^\/+/, '')}`;
};

// Tobacco products are kept on AHM Mart but excluded from Google Merchant.
const TOBACCO_KEYWORDS = [
  'cigarette',
  'cigarettes',
  'cigar',
  'cigars',
  'tobacco',
  'snus',
  'hookah tobacco',
  'rolling tobacco',
  'pipe tobacco',
  'dunhill',
];

const isTobaccoProduct = (name = '') => {
  const normalizedName = String(name).toLowerCase().trim();
  return TOBACCO_KEYWORDS.some((keyword) => normalizedName.includes(keyword));
};

const parseImages = (images, productName) => {
  if (Array.isArray(images)) return images;
  if (typeof images === 'string') {
    try {
      const parsed = JSON.parse(images);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      console.log(`Google Feed: Invalid images JSON for: ${productName}`);
    }
  }
  return [];
};

const googleProductFeed = async (req, res) => {
  try {
    const products = await db('products')
      .where('isActive', true)
      .select('*')
      .orderBy('createdOn', 'desc');

    const items = products
      .map((product) => {
        if (isTobaccoProduct(product.name)) {
          console.log(`Google Feed: Skipping tobacco product: ${product.name}`);
          return '';
        }

        const description = product.description || product.name;

        // Use discounted price when available
        const finalPrice = product.discountPrice != null
          ? Number(product.discountPrice)
          : Number(product.price);

        if (!Number.isFinite(finalPrice) || finalPrice <= 0) {
          console.log(`Google Feed: Skipping product with invalid price: ${product.name}`);
          return '';
        }

        const availability = Number(product.stockQuantity || 0) > 0
          ? 'in_stock'
          : 'out_of_stock';

        const productUrl = `https://ahmmart.store/products/${product.slug || slugify(product.name)}`;

        const imageUrls = parseImages(product.images, product.name)
          .filter(Boolean)
          .map((image) => getAbsoluteUrl(image))
          .filter(Boolean);

        const imageUrl = imageUrls[0];

        if (!imageUrl) {
          console.log(`Google Feed: Skipping product without image: ${product.name}`);
          return '';
        }

        const additionalImages = imageUrls
          .slice(1)
          .map((url) => `<g:additional_image_link>${escapeXml(url)}</g:additional_image_link>`)
          .join('');

        return `
    <item>
      <g:id>${escapeXml(product.productID)}</g:id>
      <g:title>${escapeXml(product.name)}</g:title>
      <g:description>${escapeXml(description)}</g:description>
      <g:link>${escapeXml(productUrl)}</g:link>
      <g:image_link>${escapeXml(imageUrl)}</g:image_link>
      ${additionalImages}
      <g:availability>${availability}</g:availability>
      <g:condition>new</g:condition>
      <g:price>${finalPrice.toFixed(2)} PKR</g:price>
      ${product.sku ? `<g:mpn>${escapeXml(product.sku)}</g:mpn>` : ''}
    </item>`;
      })
      .filter(Boolean)
      .join('');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:g="http://base.google.com/ns/1.0">

  <channel>
    <title>AHM Mart</title>
    <link>https://ahmmart.store</link>
    <description>Products available from AHM Mart</description>
    ${items}
  </channel>

</rss>`;

    return res
      .status(StatusCodes.OK)
      .type('application/xml')
      .send(xml);
  } catch (err) {
    console.error('Google product feed error:', err);

    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .type('application/xml')
      .send(`<?xml version="1.0" encoding="UTF-8"?>
<error>${escapeXml(err.message || 'Failed to generate product feed')}</error>`);
  }
};

module.exports = {
  listProducts,
  listProductsAdmin,
  getProductById,
  getProductByIdAdmin,
  getProductReviews,
  checkProductPurchased,
  createProductReview,
  createProduct,
  updateProduct,
  deleteProduct,
  uploadProductImages,
  googleProductFeed,
};
