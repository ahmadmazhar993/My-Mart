import React, { useEffect, useState } from "react";
import { parseProductImages } from "../utils/product";
import ImageUploader from "./ImageUploader";

const initialForm = {
    name: "",
    sku: "",
    price: "",
    discount_price: "",
    stock_quantity: "",
    category_id: "",
    images: [],
    description: "",
};

const ProductModal = ({
    isOpen,
    onClose,
    onSubmit,
    product = null,
    categories = [],
    saving = false,
}) => {
    const [form, setForm] = useState(initialForm);

    useEffect(() => {
        if (product) {
            const existingImages = parseProductImages(product);
            setForm({
                name: product.name || "",
                sku: product.sku || "",
                price: product.price || "",
                discount_price: product.discount_price || "",
                stock_quantity: product.stock_quantity || "",
                category_id: product.category_id || "",
                images: existingImages.length
                    ? existingImages
                    : product.image_url
                        ? [product.image_url]
                        : [],
                description: product.description || "",
            });
        } else {
            setForm(initialForm);
        }
    }, [product, isOpen]);

    const handleChange = (e) => {
        const { name, value } = e.target;

        setForm((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(form, product?.id);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">

                {/* Header */}
                <div className="flex items-center justify-between border-b px-6 py-4">
                    <h2 className="text-xl font-semibold">
                        {product ? "Edit Product" : "Add Product"}
                    </h2>

                    <button
                        onClick={onClose}
                        className="text-2xl leading-none hover:text-red-500"
                    >
                        ×
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit}>


                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Product Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                name="name"
                                value={form.name}
                                onChange={handleChange}
                                required
                                placeholder="Enter product name"
                                className="input-field w-full"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                SKU
                            </label>
                            <input
                                name="sku"
                                value={form.sku}
                                onChange={handleChange}
                                placeholder="Enter SKU"
                                className="input-field w-full"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Price (Rs.) <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                name="price"
                                value={form.price}
                                onChange={handleChange}
                                required
                                placeholder="0.00"
                                className="input-field w-full"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Discount Price
                            </label>
                            <input
                                type="number"
                                name="discount_price"
                                value={form.discount_price}
                                onChange={handleChange}
                                placeholder="0.00"
                                className="input-field w-full"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Stock Quantity <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                name="stock_quantity"
                                value={form.stock_quantity}
                                onChange={handleChange}
                                required
                                placeholder="Enter stock quantity"
                                className="input-field w-full"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Category <span className="text-red-500">*</span>
                            </label>
                            <select
                                name="category_id"
                                value={form.category_id}
                                onChange={handleChange}
                                required
                                className="input-field w-full"
                            >
                                <option value="">Select Category</option>

                                {categories.map((category) => (
                                    <option key={category.id} value={category.id}>
                                        {category.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="lg:col-span-3">
                            <ImageUploader
                                value={form.images}
                                productName={form.name}
                                onChange={(images) => setForm((prev) => ({ ...prev, images }))}
                            />
                        </div>

                        <div className="lg:col-span-3">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Description
                            </label>
                            <textarea
                                rows={4}
                                name="description"
                                value={form.description}
                                onChange={handleChange}
                                placeholder="Enter product description"
                                className="input-field w-full resize-none"
                            />
                        </div>

                    </div>

                    {/* Footer */}

                    <div className="border-t px-6 py-4 flex justify-end gap-3">

                        <button
                            type="button"
                            onClick={onClose}
                            className="btn-secondary"
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            disabled={saving}
                            className="btn-primary"
                        >
                            {saving
                                ? "Saving..."
                                : product
                                    ? "Update Product"
                                    : "Add Product"}
                        </button>

                    </div>

                </form>

            </div>
        </div>
    );
};

export default ProductModal;