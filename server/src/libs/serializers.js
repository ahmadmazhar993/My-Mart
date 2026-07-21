const mapUser = (user) => {
  if (!user) return null;

  return {
    id: user.userID,
    first_name: user.firstName,
    last_name: user.lastName,
    email: user.email,
    phone: user.phoneNumber || '',
    address: user.address || '',
    city: user.city || '',
    postal_code: user.postalCode || '',
    role: (user.role || user.role_type || '').toLowerCase(),
    status: user.status,
    profile_picture: user.profilePicture || null,
  };
};

const parseVariants = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return [];
    }
  }
  return [];
};

const mapProduct = (product) => {
  if (!product) return null;

  return {
    id: product.productID,
    name: product.name,
    description: product.description,
    price: Number(product.price),
    discount_price: product.discountPrice != null ? Number(product.discountPrice) : null,
    discount_percentage: product.discountPercentage,
    stock_quantity: product.stockQuantity,
    seller_id: product.seller_id,
    category_id: product.category_id,
    sku: product.sku,
    rating: Number(product.rating || 0),
    review_count: product.reviewCount || 0,
    image_url: product.imageUrl,
    images: product.images,
    variants: parseVariants(product.variants),
    is_active: product.isActive,
    created_at: product.createdOn,
    updated_at: product.updatedOn,
  };
};

const mapCategory = (category) => {
  if (!category) return null;

  return {
    id: category.categoryID,
    name: category.name,
    description: category.description,
    slug: category.slug,
    parent_id: category.parentId,
    image_url: category.imageUrl,
    display_order: category.displayOrder,
    is_active: category.isActive,
    created_at: category.createdOn,
    updated_at: category.updatedOn,
  };
};

const mapOrder = (order, payment = null) => {
  if (!order) return null;

  const paymentMethod = order.paymentMethod || payment?.paymentMethod || null;
  const metadata = payment?.metadata && typeof payment.metadata === 'object' ? payment.metadata : {};

  return {
    id: order.orderID,
    display_order_id: order.orderCode || order.order_code || null,
    user_id: order.user_id,
    total_price: Number(order.totalPrice),
    tax_amount: Number(order.taxAmount || 0),
    shipping_cost: Number(order.shippingCost || 0),
    discount_amount: Number(order.discountAmount || 0),
    status: order.status,
    payment_status: order.paymentStatus,
    payment_method: paymentMethod,
    payment_transaction_id: payment?.transactionID || null,
    payment_receipt_url: metadata.receipt_url || null,
    payment_receipt_name: metadata.receipt_name || null,
    shipping_address: order.shippingAddress,
    tracking_number: order.trackingNumber,
    shipped_at: order.shippedOn,
    delivered_at: order.deliveredOn,
    created_at: order.createdOn,
    updated_at: order.updatedOn,
    items: order.items || [],
  };
};

const mapCartItem = (item, product = null) => ({
  id: item.cartItemID,
  cart_id: item.cart_id,
  product_id: item.product_id,
  quantity: item.quantity,
  price: Number(item.price),
  product: product ? mapProduct(product) : null,
});

module.exports = {
  mapUser,
  mapProduct,
  mapCategory,
  mapOrder,
  mapCartItem,
};
