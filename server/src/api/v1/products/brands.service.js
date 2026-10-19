const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { StatusCodes } = require('http-status-codes');
const db = require('../../../db');

const brandLogoDir = path.join(__dirname, '..', '..', '..', '..', 'uploads', 'brands');

const slugify = (value) => String(value || '')
  .toLowerCase()
  .trim()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/(^-|-$)/g, '');

const normalizeName = (value) => String(value ?? '').trim().replace(/\s+/g, ' ').slice(0, 120);

const mapBrand = (row) => ({
  name: row.name,
  slug: row.slug,
  count: Number(row.count) || 0,
  logo_url: row.logoUrl || null,
  description: row.description || null,
  is_featured: Boolean(row.isFeatured),
});

// Unique slug for a brand row (excludeId = the row being edited).
const uniqueSlug = async (name, excludeId = null) => {
  const base = slugify(name) || 'brand';
  let candidate = base;
  let counter = 2;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const query = db('brands').where({ slug: candidate });
    if (excludeId) query.whereNot({ brandID: excludeId });
    // eslint-disable-next-line no-await-in-loop
    const exists = await query.first('brandID');
    if (!exists) return candidate;
    candidate = `${base}-${counter}`;
    counter += 1;
  }
};

// Product counts per brand (active products), merged case-insensitively under the most
// common spelling.
const loadProductBrands = async () => {
  const rows = await db('products')
    .where('isActive', true)
    .whereNotNull('brand')
    .whereRaw("TRIM(brand) <> ''")
    .select('brand')
    .count({ count: '*' })
    .groupBy('brand');

  const merged = new Map();
  rows.forEach((row) => {
    const key = row.brand.toLowerCase();
    const count = Number(row.count) || 0;
    const current = merged.get(key);
    if (!current) {
      merged.set(key, { name: row.brand, count, top: count });
    } else {
      current.count += count;
      if (count > current.top) {
        current.name = row.brand;
        current.top = count;
      }
    }
  });
  return merged;
};

// Brands with active products, enriched with logo/description/featured from the brands table.
// includeEmpty (admin) also returns brands that currently have no products.
const buildList = async ({ includeEmpty }) => {
  const [productBrands, brandRows] = await Promise.all([
    loadProductBrands(),
    db('brands').select('*'),
  ]);
  const byKey = new Map(brandRows.map((row) => [row.name.toLowerCase(), row]));

  const result = [];
  productBrands.forEach((value, key) => {
    const row = byKey.get(key);
    result.push(mapBrand({
      name: row?.name || value.name,
      slug: row?.slug || slugify(value.name),
      count: value.count,
      logoUrl: row?.logoUrl,
      description: row?.description,
      isFeatured: row?.isFeatured,
    }));
  });

  if (includeEmpty) {
    brandRows.forEach((row) => {
      if (!productBrands.has(row.name.toLowerCase())) result.push(mapBrand({ ...row, count: 0 }));
    });
  }

  return result.sort((a, b) => a.name.localeCompare(b.name));
};

const respondList = (includeEmpty) => async (req, res) => {
  try {
    return res.status(StatusCodes.OK).json({ success: true, data: await buildList({ includeEmpty }) });
  } catch (err) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: err.message || 'Failed to load brands',
    });
  }
};

const listBrands = respondList(false);
const listBrandsAdmin = respondList(true);

const logoFilenameFromPath = (logoPath) => {
  const normalized = String(logoPath || '').replace(/\\/g, '/');
  const match = normalized.match(/(?:^|\/)uploads\/brands\/([^/]+)$/);
  return match ? match[1] : null;
};

const deleteLogoFile = (logoPath) => {
  const filename = logoFilenameFromPath(logoPath);
  if (!filename) return;
  const absolute = path.join(brandLogoDir, filename);
  if (fs.existsSync(absolute)) {
    try { fs.unlinkSync(absolute); } catch { /* ignore */ }
  }
};

// Create or update the details of a brand (looked up by name). Renaming also renames the brand
// on every product that uses it.
async function upsertBrand(req, res) {
  try {
    const currentName = normalizeName(req.params.name);
    if (!currentName) {
      return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: 'Brand name is required' });
    }

    const newName = req.body.name !== undefined ? normalizeName(req.body.name) : currentName;
    if (!newName) {
      return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: 'Brand name cannot be empty' });
    }

    let replacedLogo = null;

    const result = await db.transaction(async (trx) => {
      const existing = await trx('brands').whereRaw('LOWER(name) = ?', [currentName.toLowerCase()]).first();

      if (newName.toLowerCase() !== currentName.toLowerCase()) {
        const clash = await trx('brands').whereRaw('LOWER(name) = ?', [newName.toLowerCase()]).first();
        if (clash) {
          const error = new Error(`A brand named "${newName}" already exists`);
          error.status = StatusCodes.CONFLICT;
          throw error;
        }
      }

      const payload = { updatedOn: db.fn.now() };
      if (req.body.description !== undefined) {
        payload.description = String(req.body.description || '').trim().slice(0, 600) || null;
      }
      if (req.body.logo_url !== undefined) {
        payload.logoUrl = String(req.body.logo_url || '').trim().slice(0, 500) || null;
      }
      if (req.body.is_featured !== undefined) payload.isFeatured = Boolean(req.body.is_featured);

      let row;
      if (existing) {
        if (newName !== existing.name) {
          payload.name = newName;
          payload.slug = await uniqueSlug(newName, existing.brandID);
        }
        [row] = await trx('brands').where({ brandID: existing.brandID }).update(payload, '*');
        if (payload.logoUrl !== undefined && existing.logoUrl && existing.logoUrl !== payload.logoUrl) {
          replacedLogo = existing.logoUrl;
        }
      } else {
        [row] = await trx('brands').insert({
          ...payload,
          name: newName,
          slug: await uniqueSlug(newName),
        }, '*');
      }

      if (newName !== currentName) {
        await trx('products').whereRaw('LOWER(brand) = ?', [currentName.toLowerCase()]).update({ brand: newName });
      }
      return row;
    });

    // Only remove the old logo file once the change is committed.
    if (replacedLogo) deleteLogoFile(replacedLogo);

    const count = await db('products')
      .where('isActive', true)
      .whereRaw('LOWER(brand) = ?', [result.name.toLowerCase()])
      .count({ count: '*' })
      .first();

    return res.status(StatusCodes.OK).json({
      success: true,
      data: mapBrand({ ...result, count: Number(count?.count) || 0 }),
    });
  } catch (err) {
    return res.status(err.status || StatusCodes.BAD_REQUEST).json({
      success: false,
      message: err.message || 'Failed to save brand',
    });
  }
}

const logoStorage = multer.diskStorage({
  destination(req, file, callback) {
    if (!fs.existsSync(brandLogoDir)) fs.mkdirSync(brandLogoDir, { recursive: true });
    callback(null, brandLogoDir);
  },
  filename(req, file, callback) {
    const base = slugify(req.body?.name) || 'brand';
    callback(null, `${base}-${Date.now()}${path.extname(file.originalname).toLowerCase()}`);
  },
});

const logoUploader = multer({
  storage: logoStorage,
  fileFilter(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!['.jpg', '.jpeg', '.png', '.webp', '.svg'].includes(ext)) {
      req.logoValidationError = 'Only JPG, PNG, WEBP or SVG images are allowed.';
      return cb(null, false);
    }
    return cb(null, true);
  },
  limits: { fileSize: 2 * 1024 * 1024 },
}).single('logo');

function uploadBrandLogo(req, res) {
  return logoUploader(req, res, (err) => {
    if (err) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: err.code === 'LIMIT_FILE_SIZE' ? 'Logo must be smaller than 2 MB.' : err.message,
      });
    }
    if (req.logoValidationError) {
      return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: req.logoValidationError });
    }
    if (!req.file) {
      return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: 'No logo was uploaded.' });
    }
    return res.status(StatusCodes.OK).json({ success: true, data: `uploads/brands/${req.file.filename}` });
  });
}

module.exports = { listBrands, listBrandsAdmin, upsertBrand, uploadBrandLogo };
