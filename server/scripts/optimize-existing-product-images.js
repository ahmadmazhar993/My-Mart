#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * One-time clean-up for product photos that were uploaded before resizing existed.
 *
 *   node scripts/optimize-existing-product-images.js            # dry run: shows what would change
 *   node scripts/optimize-existing-product-images.js --write    # does it
 *
 * Safe by design:
 *  - File names and formats are kept (a .jpeg stays a .jpeg), so no database record changes.
 *  - Every file that is replaced is first copied to server/backups/product-images/<timestamp>/.
 *  - A file is only replaced when the result is at least 10% smaller.
 *  - Images already within the size limit and below ~250 KB are left alone.
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { MAX_DIMENSION, WEBP_QUALITY } = require('../src/libs/imageOptimizer');

sharp.cache(false);

const WRITE = process.argv.includes('--write');
const SERVER_ROOT = path.join(__dirname, '..');
const PRODUCTS_DIR = path.join(SERVER_ROOT, 'uploads', 'products');
const SKIP_BELOW_BYTES = 250 * 1024;
const MIN_SAVING = 0.10;

const kb = (bytes) => `${Math.round(bytes / 1024)} KB`;

const encode = (pipeline, ext) => {
  if (ext === '.png') return pipeline.png({ compressionLevel: 9, effort: 7 });
  if (ext === '.webp') return pipeline.webp({ quality: WEBP_QUALITY });
  return pipeline.jpeg({ quality: WEBP_QUALITY, mozjpeg: true });
};

(async () => {
  if (!fs.existsSync(PRODUCTS_DIR)) {
    console.log(`Nothing to do: ${PRODUCTS_DIR} does not exist.`);
    return;
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(SERVER_ROOT, 'backups', 'product-images', stamp);
  const files = fs.readdirSync(PRODUCTS_DIR).filter((f) => /\.(jpe?g|png|webp)$/i.test(f));

  let totalBefore = 0;
  let totalAfter = 0;
  let changed = 0;

  for (const name of files) {
    const filePath = path.join(PRODUCTS_DIR, name);
    const before = fs.statSync(filePath).size;
    totalBefore += before;
    const ext = path.extname(name).toLowerCase();

    try {
      const meta = await sharp(filePath).metadata();
      const oversized = Math.max(meta.width || 0, meta.height || 0) > MAX_DIMENSION;
      if (!oversized && before < SKIP_BELOW_BYTES) {
        totalAfter += before;
        console.log(`skip     ${name}  ${kb(before)} (${meta.width}x${meta.height}, already small)`);
        continue;
      }

      const buffer = await encode(
        sharp(filePath).rotate().resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: 'inside', withoutEnlargement: true }),
        ext,
      ).toBuffer();

      if (buffer.length > before * (1 - MIN_SAVING)) {
        totalAfter += before;
        console.log(`keep     ${name}  ${kb(before)} (re-encode would only reach ${kb(buffer.length)})`);
        continue;
      }

      totalAfter += buffer.length;
      changed += 1;
      console.log(`${WRITE ? 'resized ' : 'would   '} ${name}  ${kb(before)} -> ${kb(buffer.length)}`);

      if (WRITE) {
        fs.mkdirSync(backupDir, { recursive: true });
        fs.copyFileSync(filePath, path.join(backupDir, name));
        fs.writeFileSync(filePath, buffer);
      }
    } catch (err) {
      totalAfter += before;
      console.log(`error    ${name}: ${err.message} (left untouched)`);
    }
  }

  console.log('');
  console.log(`${files.length} images checked, ${changed} ${WRITE ? 'replaced' : 'would be replaced'}.`);
  console.log(`Total: ${kb(totalBefore)} -> ${kb(totalAfter)} (saves ${kb(totalBefore - totalAfter)}).`);
  if (WRITE && changed > 0) console.log(`Originals backed up in: ${backupDir}`);
  if (!WRITE) console.log('Dry run only. Add --write to apply.');
})();
