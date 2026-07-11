const { StatusCodes } = require('http-status-codes');
const db = require('../../../db');
const { mapCategory } = require('../../../libs/serializers');

async function listCategories(req, res) {
  try {
    const categories = await db('categories')
      .select('*')
      .where('isActive', true)
      .orderBy('displayOrder', 'asc');

    const data = await Promise.all(categories.map(async (category) => {
      const linkedProduct = await db('products').where({ category_id: category.categoryID }).first();
      return {
        ...mapCategory(category),
        can_delete: !linkedProduct,
      };
    }));

    return res.status(StatusCodes.OK).json({
      success: true,
      data,
    });
  } catch (err) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: err.message || 'Failed to load categories',
    });
  }
}

async function getCategoryById(req, res) {
  try {
    const { id } = req.params;
    const category = await db('categories').where({ categoryID: id }).first();

    if (!category) {
      return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: 'Category not found' });
    }

    const linkedProduct = await db('products').where({ category_id: category.categoryID }).first();

    return res.status(StatusCodes.OK).json({
      success: true,
      data: {
        ...mapCategory(category),
        can_delete: !linkedProduct,
      },
    });
  } catch (err) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: err.message || 'Failed to load category',
    });
  }
}

async function createCategory(req, res) {
  try {
    const payload = {
      name: req.body.name,
      description: req.body.description,
      slug: req.body.slug,
      imageUrl: req.body.image_url ?? req.body.imageUrl,
      displayOrder: req.body.display_order ?? req.body.displayOrder ?? 0,
      isActive: req.body.is_active ?? true,
    };

    const [created] = await db('categories').insert(payload, '*');
    return res.status(StatusCodes.CREATED).json({ success: true, data: mapCategory(created) });
  } catch (err) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      message: err.message || 'Failed to create category',
    });
  }
}

async function updateCategory(req, res) {
  try {
    const { id } = req.params;
    const payload = { updatedOn: db.fn.now() };

    if (req.body.name != null) payload.name = req.body.name;
    if (req.body.description != null) payload.description = req.body.description;
    if (req.body.slug != null) payload.slug = req.body.slug;
    if (req.body.is_active != null || req.body.isActive != null) {
      payload.isActive = req.body.is_active ?? req.body.isActive;
    }

    const [updated] = await db('categories').where({ categoryID: id }).update(payload, '*');
    if (!updated) {
      return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: 'Category not found' });
    }

    return res.status(StatusCodes.OK).json({ success: true, data: mapCategory(updated) });
  } catch (err) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      message: err.message || 'Failed to update category',
    });
  }
}

async function deleteCategory(req, res) {
  try {
    const { id } = req.params;

    const linkedProducts = await db('products')
      .where({ category_id: id })
      .first();

    if (linkedProducts) {
      return res.status(StatusCodes.CONFLICT).json({
        success: false,
        message: 'Category is already in use by products and cannot be deleted.',
      });
    }

    const deleted = await db('categories').where({ categoryID: id }).del();
    if (!deleted) {
      return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: 'Category not found' });
    }
    return res.status(StatusCodes.OK).json({ success: true, message: 'Category deleted' });
  } catch (err) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      message: err.message || 'Failed to delete category',
    });
  }
}

module.exports = {
  listCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
};
