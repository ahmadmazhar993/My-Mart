const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { StatusCodes } = require('http-status-codes');
const db = require('../../../db');
const { mapProduct } = require('../../../libs/serializers');

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
        price: variant.price == null || variant.price === '' ? null : Number(variant.price),
        discount_price: variant.discount_price == null || variant.discount_price === '' ? null : Number(variant.discount_price),
        discount_percentage: variant.discount_percentage == null || variant.discount_percentage === '' ? null : Number(variant.discount_percentage),
        stock_quantity: variant.stock_quantity == null || variant.stock_quantity === '' ? null : Number(variant.stock_quantity),
        sku: String(variant.sku || '').trim(),
      };
    })
    .filter(Boolean);
};

async function listProducts(req, res) {
  try {
    const products = await db('products')
      .select('*')
      .where('isActive', true)
      .orderBy('createdOn', 'desc')
      .limit(Number(req.query.limit) || 100);

    const data = await Promise.all(
      products.map(async (product) => {
        const [cartItem, orderItem, review] = await Promise.all([
          db('cart_items').where({ product_id: product.productID }).first(),
          db('order_items').where({ product_id: product.productID }).first(),
          db('reviews').where({ product_id: product.productID }).first(),
        ]);

        return {
          ...mapProduct(product),
          can_delete: !(cartItem || orderItem || review),
        };
      })
    );

    return res.status(StatusCodes.OK).json({
      success: true,
      data,
    });
  } catch (err) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: err.message || 'Failed to load products',
    });
  }
}

const productImageDir = path.join(
  __dirname,
  '..',
  '..',
  '..',
  '..',
  'uploads',
  'products'
);

const slugify = (value) => String(value || '')
  .toLowerCase()
  .trim()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/(^-|-$)/g, '');

const isUuid = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''));

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

const resolveProductByIdentifier = async (identifier) => {
  if (!identifier) return null;

  if (isUuid(identifier)) {
    const byId = await db('products').where({ productID: identifier }).first();
    if (byId) return byId;
  }

  const products = await db('products').select('*');
  return products.find((product) => slugify(product.name) === identifier) || null;
};

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

      const productName = req.body.name || 'product';

      const slug = productName
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

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

async function getProductById(req, res) {
  try {
    const { identifier } = req.params;
    const product = await resolveProductByIdentifier(identifier);

    if (!product) {
      return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: 'Product not found' });
    }

    const [cartItem, orderItem, review] = await Promise.all([
      db('cart_items').where({ product_id: product.productID }).first(),
      db('order_items').where({ product_id: product.productID }).first(),
      db('reviews').where({ product_id: product.productID }).first(),
    ]);

    return res.status(StatusCodes.OK).json({
      success: true,
      data: {
        ...mapProduct(product),
        can_delete: !(cartItem || orderItem || review),
      },
    });
  } catch (err) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: err.message || 'Failed to load product',
    });
  }
}

async function getProductReviews(req, res) {
  try {
    const { identifier } = req.params;
    const product = await resolveProductByIdentifier(identifier);

    if (!product) {
      return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: 'Product not found' });
    }

    const reviews = await db('reviews')
      .leftJoin('user', 'reviews.user_id', 'user.userID')
      .select(
        'reviews.reviewID as id',
        'reviews.product_id',
        'reviews.user_id',
        'reviews.rating',
        'reviews.comment',
        'reviews.createdOn',
        'user.email',
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
        userId: review.user_id,
        userName: (
          [review.firstName, review.lastName].filter(Boolean).join(' ')
          || review.email
          || 'Customer'
        ),
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
    const { identifier } = req.params;
    const { rating, comment } = req.body;
    const userId = req.activeUser?.userID;

    if (!userId) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ success: false, message: 'Authentication required' });
    }

    const product = await resolveProductByIdentifier(identifier);

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

    return res.status(StatusCodes.CREATED).json({
      success: true,
      data: {
        id: created.reviewID,
        productId: created.product_id,
        userId: created.user_id,
        userName:
          ([req.activeUser?.firstName, req.activeUser?.lastName].filter(Boolean).join(' ')
            || req.activeUser?.email
            || 'Customer'),
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
      description: req.body.description,
      price: req.body.price,
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
      data: mapProduct(created),
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
    const { identifier } = req.params;
    const product = await resolveProductByIdentifier(identifier);
    if (!product) {
      return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: 'Product not found' });
    }

    const payload = {};

    if (req.body.name != null) payload.name = req.body.name;
    if (req.body.description != null) payload.description = req.body.description;
    if (req.body.price != null) payload.price = req.body.price;
    if (req.body.discount_price != null || req.body.discountPrice != null) {
      payload.discountPrice = req.body.discount_price ?? req.body.discountPrice;
    }
    if (req.body.stock_quantity != null || req.body.stockQuantity != null) {
      payload.stockQuantity = req.body.stock_quantity ?? req.body.stockQuantity;
    }
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

    return res.status(StatusCodes.OK).json({ success: true, data: mapProduct(updated) });
  } catch (err) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      message: err.message || 'Failed to update product',
    });
  }
}

async function deleteProduct(req, res) {
  try {
    const { identifier } = req.params;
    const product = await resolveProductByIdentifier(identifier);
    if (!product) {
      return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: 'Product not found' });
    }

    const [cartItem, orderItem, review] = await Promise.all([
      db('cart_items').where({ product_id: product.productID }).first(),
      db('order_items').where({ product_id: product.productID }).first(),
      db('reviews').where({ product_id: product.productID }).first(),
    ]);

    if (cartItem || orderItem || review) {
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

module.exports = {
  listProducts,
  getProductById,
  getProductReviews,
  createProductReview,
  createProduct,
  updateProduct,
  deleteProduct,
  uploadProductImages,
};
