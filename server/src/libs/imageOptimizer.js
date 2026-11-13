const fs = require('fs');
const path = require('path');

// Product photos are shown on small cards and a product page that is at most ~600 CSS px wide, so a
// phone photo of several MB is wasted bandwidth for every visitor. Uploads are shrunk to fit inside
// MAX_DIMENSION px (never enlarged), have their EXIF rotation applied, and are saved as WebP.
const MAX_DIMENSION = 1200;
const WEBP_QUALITY = 82;

// `sharp` is loaded lazily so a server that has not run `npm install` yet keeps working (uploads are
// stored as-is and a warning is logged) instead of failing to start.
let sharpModule;
let sharpChecked = false;
const getSharp = () => {
  if (sharpChecked) return sharpModule;
  sharpChecked = true;
  try {
    // eslint-disable-next-line global-require
    sharpModule = require('sharp');
    // Do not keep uploaded files open in sharp's cache: on Windows that blocks deleting the temp upload.
    sharpModule.cache(false);
  } catch (err) {
    sharpModule = null;
    // eslint-disable-next-line no-console
    console.warn('[imageOptimizer] "sharp" is not installed; product images will be stored without resizing. Run `npm install` in /server.');
  }
  return sharpModule;
};

const removeQuietly = (filePath) => {
  try {
    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch {
    // best effort
  }
};

/**
 * Resize + re-encode an uploaded product image.
 * @param {string} inputPath  absolute path of the uploaded file
 * @param {string} outputBase absolute path WITHOUT extension for the result
 * @returns {Promise<{ filePath: string, optimized: boolean, bytesBefore: number, bytesAfter: number }>}
 * On any failure the original file is kept (renamed to keep its own extension) so an upload never breaks.
 */
async function optimizeProductImage(inputPath, outputBase) {
  const bytesBefore = fs.statSync(inputPath).size;
  const keepOriginal = () => {
    const kept = `${outputBase}${path.extname(inputPath).toLowerCase()}`;
    fs.renameSync(inputPath, kept);
    return { filePath: kept, optimized: false, bytesBefore, bytesAfter: bytesBefore };
  };

  const sharp = getSharp();
  if (!sharp) return keepOriginal();

  const target = `${outputBase}.webp`;
  try {
    await sharp(inputPath)
      .rotate() // apply EXIF orientation, then metadata is dropped on output
      .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY, effort: 4 })
      .toFile(target);
  } catch (err) {
    removeQuietly(target);
    const error = new Error('The image could not be processed. Please upload a valid JPG, PNG or WEBP file.');
    error.cause = err;
    error.isImageError = true;
    throw error;
  }

  const bytesAfter = fs.statSync(target).size;
  // A tiny source can come out larger as WebP; keep whichever is smaller.
  if (bytesAfter >= bytesBefore) {
    removeQuietly(target);
    return keepOriginal();
  }
  removeQuietly(inputPath);
  return { filePath: target, optimized: true, bytesBefore, bytesAfter };
}

module.exports = { optimizeProductImage, MAX_DIMENSION, WEBP_QUALITY };
