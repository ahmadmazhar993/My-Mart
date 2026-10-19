const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const { StatusCodes } = require('http-status-codes');
const { sendError } = require('./seller.shared');

const uploadsRoot = path.join(__dirname, '..', '..', '..', '..', 'uploads');

const ALLOWED = {
  '.jpg': ['image/jpeg'],
  '.jpeg': ['image/jpeg'],
  '.png': ['image/png'],
  '.webp': ['image/webp'],
};

// Signature check so a renamed script/HTML file cannot pass as an image.
const hasImageSignature = (filePath) => {
  const fd = fs.openSync(filePath, 'r');
  try {
    const head = Buffer.alloc(12);
    fs.readSync(fd, head, 0, 12, 0);
    const isJpeg = head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;
    const isPng = head.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    const isWebp = head.subarray(0, 4).toString('ascii') === 'RIFF' && head.subarray(8, 12).toString('ascii') === 'WEBP';
    return isJpeg || isPng || isWebp;
  } finally {
    fs.closeSync(fd);
  }
};

const safeUnlink = (filePath) => {
  try {
    fs.unlinkSync(filePath);
  } catch {
    // best effort
  }
};

/**
 * Express handler factory. Files land in uploads/<dirName>/ under random,
 * server-generated names (the client filename is never used) and are removed
 * again if the content is not really an image.
 * On success `req.uploadedPaths` holds web paths like "uploads/products/x.jpg".
 */
const imageUpload = ({
  dirName, field, maxCount = 1, maxSizeMb = 6,
}) => {
  const dir = path.join(uploadsRoot, dirName);
  const uploader = multer({
    storage: multer.diskStorage({
      destination(req, file, cb) {
        fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
      },
      filename(req, file, cb) {
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`);
      },
    }),
    fileFilter(req, file, cb) {
      const ext = path.extname(file.originalname).toLowerCase();
      if (!ALLOWED[ext] || !ALLOWED[ext].includes(file.mimetype)) {
        req.imageValidationError = 'Only JPG, PNG, or WEBP images are allowed.';
        return cb(null, false);
      }
      return cb(null, true);
    },
    limits: { fileSize: maxSizeMb * 1024 * 1024, files: maxCount },
  });
  const middleware = maxCount > 1 ? uploader.array(field, maxCount) : uploader.single(field);

  return (req, res, next) => middleware(req, res, (err) => {
    const files = req.files || (req.file ? [req.file] : []);
    const discard = () => files.forEach((file) => safeUnlink(file.path));

    if (err instanceof multer.MulterError) {
      discard();
      return sendError(res, StatusCodes.BAD_REQUEST, err.code === 'LIMIT_FILE_SIZE'
        ? `Each image must be smaller than ${maxSizeMb} MB.`
        : err.message);
    }
    if (err) {
      discard();
      return sendError(res, StatusCodes.BAD_REQUEST, err.message);
    }
    if (req.imageValidationError) {
      discard();
      return sendError(res, StatusCodes.BAD_REQUEST, req.imageValidationError);
    }
    if (files.length === 0) {
      return sendError(res, StatusCodes.BAD_REQUEST, 'No image was uploaded.');
    }
    if (files.some((file) => !hasImageSignature(file.path))) {
      discard();
      return sendError(res, StatusCodes.BAD_REQUEST, 'One of the files is not a valid image.');
    }
    req.uploadedPaths = files.map((file) => `uploads/${dirName}/${file.filename}`);
    return next();
  });
};

module.exports = { imageUpload };
