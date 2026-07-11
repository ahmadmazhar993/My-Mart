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
    return [normalized.uploadedPath || normalized.src || normalized.path || JSON.stringify(normalized)];
  }

  return [String(normalized)];
};

async function listProducts(req, res) {
  try {
    const products = await db('products')
      .select('*')
      .where('isActive', true)
      .orderBy('createdOn', 'desc')
      .limit(Number(req.query.limit) || 100);

    const data = await Promise.all(products.map(async (product) => {
      const [cartItem, orderItem, review] = await Promise.all([
        db('cart_items').where({ product_id: product.productID }).first(),
        db('order_items').where({ product_id: product.productID }).first(),
        db('reviews').where({ product_id: product.productID }).first(),
      ]);

      return {
        ...mapProduct(product),
        can_delete: !(cartItem || orderItem || review),
      };
    }));

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

const productImageDir = path.join(__dirname, '..', '..', '..', '..', 'uploads', 'products');

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
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e6)}${path.extname(file.originalname)}`;
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
        return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: err.message });
      }
      if (req.productImageValidationError) {
        return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: req.productImageValidationError });
      }
      const files = req.files || [];
      if (files.length === 0) {
        return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: 'No images were uploaded.' });
      }

      const oldImagePaths = Array.isArray(req.body.oldImagePath)
        ? req.body.oldImagePath
        : req.body.oldImagePath
          ? [req.body.oldImagePath]
          : [];

      const productName = req.body.name || "product";

      const slug = productName
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

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
    const { id } = req.params;
    const product = await db('products').where({ productID: id }).first();

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

async function createProduct(req, res) {
  try {
    const payload = {
      name: req.body.name,
      description: req.body.description,
      price: req.body.price,
      discountPrice: req.body.discount_price ?? req.body.discountPrice,
      discountPercentage: req.body.discount_percentage ?? req.body.discountPercentage,
      stockQuantity: req.body.stock_quantity ?? req.body.stockQuantity ?? 0,
      seller_id: req.body.seller_id,
      category_id: req.body.category_id,
      sku: req.body.sku,
      imageUrl: req.body.image_url ?? req.body.imageUrl,
      images: req.body.images == null ? null : JSON.stringify(normalizeImagesPayload(req.body.images)),
      isActive: req.body.is_active ?? true,
    };

    const [created] = await db('products').insert(payload, '*');
    return res.status(StatusCodes.CREATED).json({ success: true, data: mapProduct(created) });
  } catch (err) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      message: err.message || 'Failed to create product',
    });
  }
}

async function updateProduct(req, res) {
  try {
    const { id } = req.params;
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
    if (req.body.image_url != null || req.body.imageUrl != null) {
      payload.imageUrl = req.body.image_url ?? req.body.imageUrl;
    }
    if (req.body.is_active != null || req.body.isActive != null) {
      payload.isActive = req.body.is_active ?? req.body.isActive;
    }

    payload.updatedOn = db.fn.now();

    const [updated] = await db('products').where({ productID: id }).update(payload, '*');
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
    const { id } = req.params;

    const [cartItem, orderItem, review] = await Promise.all([
      db('cart_items').where({ product_id: id }).first(),
      db('order_items').where({ product_id: id }).first(),
      db('reviews').where({ product_id: id }).first(),
    ]);

    if (cartItem || orderItem || review) {
      return res.status(StatusCodes.CONFLICT).json({
        success: false,
        message: 'Product is already in use and cannot be deleted.',
      });
    }

    const deleted = await db('products').where({ productID: id }).del();
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
  createProduct,
  updateProduct,
  deleteProduct,
  uploadProductImages,
};
