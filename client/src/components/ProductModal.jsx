import React, { useEffect, useState, useRef } from "react";
import api from "../services/api";
import { parseProductImages } from "../utils/product";
import ImageCropModal from "./ImageCropModal";
import ImageUploader from "./ImageUploader";

const createEmptyVariant = () => ({
    name: "",
    label: "",
    price: "",
    purchase_price: "",
    discount_price: "",
    discount_percentage: "",
    stock_quantity: "",
    sku: "",
    image: "",
});

const initialForm = {
    name: "",
    sku: "",
    price: "",
    purchase_price: "",
    discount_price: "",
    stock_quantity: "",
    category_id: "",
    images: [],
    description: "",
    variants: [],
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
    const [variantCropIndex, setVariantCropIndex] = useState(null);
    const [variantCropImageSrc, setVariantCropImageSrc] = useState('');
    const [variantCropFile, setVariantCropFile] = useState(null);
    const [pendingVariantIndex, setPendingVariantIndex] = useState(null);
    const fileInputRefs = useRef({});

    useEffect(() => {
        if (product) {
            const existingImages = parseProductImages(product);
            const parsedVariants = Array.isArray(product.variants)
                ? product.variants.map((variant) => ({
                    name: variant?.name || "",
                    label: variant?.label || variant?.name || "",
                    price: variant?.price ?? "",
                    purchase_price: variant?.purchase_price ?? variant?.purchasePrice ?? "",
                    discount_price: variant?.discount_price ?? "",
                    discount_percentage: variant?.discount_percentage ?? "",
                    stock_quantity: variant?.stock_quantity ?? "",
                    sku: variant?.sku || "",
                    image: variant?.image || variant?.image_url || variant?.imageUrl || "",
                }))
                : [];

            setForm({
                name: product.name || "",
                sku: product.sku || "",
                price: product.price || "",
                purchase_price: product.purchase_price ?? product.purchasePrice ?? "",
                discount_price: product.discount_price || "",
                stock_quantity: product.stock_quantity || "",
                category_id: product.category_id || "",
                images: existingImages.length
                    ? existingImages
                    : product.image_url
                        ? [product.image_url]
                        : [],
                description: product.description || "",
                variants: parsedVariants.length ? parsedVariants : [],
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
        const normalizedVariants = (form.variants || [])
            .map((variant) => ({
                name: String(variant.name || variant.label || "").trim(),
                label: String(variant.label || variant.name || "").trim(),
                price: variant.price === "" ? null : Number(variant.price),
                purchase_price: variant.purchase_price === "" ? null : Number(variant.purchase_price),
                discount_price: variant.discount_price === "" ? null : Number(variant.discount_price),
                discount_percentage: variant.discount_percentage === "" ? null : Number(variant.discount_percentage),
                stock_quantity: variant.stock_quantity === "" ? null : Number(variant.stock_quantity),
                sku: String(variant.sku || "").trim(),
                image: String(variant.image || "").trim(),
            }))
            .filter((variant) => variant.name || variant.label || variant.sku || variant.price != null || variant.discount_price != null || variant.discount_percentage != null || variant.stock_quantity != null);

        // client validation: purchase_price must be non-negative when provided
        for (const v of normalizedVariants) {
            if (v.purchase_price != null && Number(v.purchase_price) < 0) {
                alert('Variant purchase price must be a non-negative number');
                return;
            }
        }

        onSubmit({ ...form, variants: normalizedVariants }, product?.id);
    };

    const handleVariantChange = (index, field, value) => {
        setForm((prev) => ({
            ...prev,
            variants: prev.variants.map((variant, variantIndex) => (
                variantIndex === index ? { ...variant, [field]: value } : variant
            )),
        }));
    };

    const handleVariantImageUpload = async (index, file) => {
        if (!file) return;

        const formData = new FormData();
        formData.append('images', file);
        formData.append('name', form.name || 'variant');

        try {
            const response = await api.post('/products/upload-images', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            const uploadedPath = response.data?.data?.[0] || null;
            if (uploadedPath) {
                handleVariantChange(index, 'image', uploadedPath);
            }
        } catch (err) {
            console.error('Variant image upload failed', err);
        }
    };

    const openVariantCropper = (index, file) => {
        if (!file) return;
        setPendingVariantIndex(index);
        setVariantCropIndex(index);
        setVariantCropFile(file);
        setVariantCropImageSrc(URL.createObjectURL(file));
    };

    const closeVariantCropper = () => {
        if (variantCropImageSrc?.startsWith('blob:')) {
            URL.revokeObjectURL(variantCropImageSrc);
        }
        setVariantCropIndex(null);
        setVariantCropImageSrc('');
        setVariantCropFile(null);
        setPendingVariantIndex(null);
    };

    const handleVariantCropSave = async (blob) => {
        if (variantCropIndex == null || !variantCropFile) return;

        const fileName = `${Date.now()}-${variantCropIndex + 1}.jpeg`;
        const croppedFile = new File([blob], fileName, { type: 'image/jpeg' });

        try {
            await handleVariantImageUpload(variantCropIndex, croppedFile);
        } finally {
            closeVariantCropper();
        }
    };

    const triggerVariantImagePicker = (index) => {
        setPendingVariantIndex(index);
        fileInputRefs.current[index]?.click();
    };

    const addVariant = () => {
        setForm((prev) => ({
            ...prev,
            variants: [...prev.variants, createEmptyVariant()],
        }));
    };

    const removeVariant = (index) => {
        setForm((prev) => ({
            ...prev,
            variants: prev.variants.filter((_, variantIndex) => variantIndex !== index),
        }));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">

                {/* Header */}
                <div className="flex items-center justify-between border-b px-6 py-4 shrink-0">
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
                <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">

                    <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
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
                                Purchase Price (Rs.)
                            </label>
                            <input
                                type="number"
                                name="purchase_price"
                                value={form.purchase_price}
                                onChange={handleChange}
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
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-sm font-medium text-gray-700">
                                    Variants
                                </label>
                                <button
                                    type="button"
                                    onClick={addVariant}
                                    className="text-sm font-semibold text-primary hover:underline"
                                >
                                    + Add Variant
                                </button>
                            </div>
                            <p className="text-xs text-gray-500 mb-3">
                                Add different variants with separate pricing and stock.
                            </p>

                            <div className="space-y-3">
                                {(form.variants || []).map((variant, index) => (
                                    <div key={`variant-${index}`} className="rounded-md border border-gray-200 p-3 bg-gray-50">
                                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-600 mb-1">Name</label>
                                                <input
                                                    value={variant.name}
                                                    onChange={(e) => handleVariantChange(index, 'name', e.target.value)}
                                                    placeholder="Variant Name"
                                                    className="input-field w-full"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-600 mb-1">Label</label>
                                                <input
                                                    value={variant.label}
                                                    onChange={(e) => handleVariantChange(index, 'label', e.target.value)}
                                                    placeholder="Variant Label"
                                                    className="input-field w-full"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-600 mb-1">Price</label>
                                                <input
                                                    type="number"
                                                    value={variant.price}
                                                    onChange={(e) => handleVariantChange(index, 'price', e.target.value)}
                                                    placeholder="Price"
                                                    className="input-field w-full"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-600 mb-1">Purchase Price</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={variant.purchase_price}
                                                    onChange={(e) => handleVariantChange(index, 'purchase_price', e.target.value)}
                                                    placeholder="Purchase price"
                                                    className="input-field w-full"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-600 mb-1">Discount</label>
                                                <input
                                                    type="number"
                                                    value={variant.discount_price}
                                                    onChange={(e) => handleVariantChange(index, 'discount_price', e.target.value)}
                                                    placeholder="Discount price"
                                                    className="input-field w-full"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-600 mb-1">Stock</label>
                                                <input
                                                    type="number"
                                                    value={variant.stock_quantity}
                                                    onChange={(e) => handleVariantChange(index, 'stock_quantity', e.target.value)}
                                                    placeholder="Stock"
                                                    className="input-field w-full"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-600 mb-1">SKU</label>
                                                <input
                                                    value={variant.sku}
                                                    onChange={(e) => handleVariantChange(index, 'sku', e.target.value)}
                                                    placeholder="SKU"
                                                    className="input-field w-full"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-600 mb-1">Variant Image</label>
                                                <input
                                                    ref={(element) => {
                                                        fileInputRefs.current[index] = element;
                                                    }}
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) {
                                                            openVariantCropper(pendingVariantIndex ?? index, file);
                                                            e.target.value = null;
                                                        }
                                                    }}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => triggerVariantImagePicker(index)}
                                                    className="btn-secondary w-full text-sm"
                                                >
                                                    {variant.image ? 'Change Image' : 'Upload Image'}
                                                </button>
                                                {variant.image ? (
                                                    <div className="mt-2 text-xs text-gray-600 break-all">{variant.image}</div>
                                                ) : null}
                                            </div>
                                            <div className="flex items-end">
                                                <button
                                                    type="button"
                                                    onClick={() => removeVariant(index)}
                                                    className="text-red-600 text-sm font-semibold whitespace-nowrap"
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
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

                    <ImageCropModal
                        open={variantCropIndex != null}
                        imageSrc={variantCropImageSrc}
                        onClose={closeVariantCropper}
                        onSave={handleVariantCropSave}
                        title="Crop Variant Image"
                    />

                    <div className="border-t px-6 py-4 flex justify-end gap-3 shrink-0 bg-white">

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