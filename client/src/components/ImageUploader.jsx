import React, { useEffect, useRef, useState } from 'react';
import api, { API_BASE, API_VERSION } from '../services/api';
import ImageCropModal from './ImageCropModal';
import ImagePreviewGrid from './ImagePreviewGrid';

const normalizePath = (url) => {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return `${API_BASE.replace(/\/+$/, '')}/${url.replace(/^\/+/, '')}`;
};

const createId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `image-${Date.now()}-${Math.round(Math.random() * 10000)}`;
};

const arraysEqual = (a, b) => {
  if (a.length !== b.length) return false;
  return a.every((value, index) => value === b[index]);
};

const ImageUploader = ({ value = [], onChange, productName }) => {
  const [images, setImages] = useState([]);
  const [activeCropId, setActiveCropId] = useState(null);
  const [cropImageSrc, setCropImageSrc] = useState('');
  const [replaceTargetId, setReplaceTargetId] = useState(null);
  const fileInputRef = useRef(null);
  const onChangeRef = useRef(onChange);
  const lastEmittedPaths = useRef([]);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    const initial = (value || []).map((src) => ({
      id: createId(),
      src: normalizePath(src),
      uploadedPath: src,
      file: null,
      status: 'uploaded',
      progress: 0,
    }));

    setImages((current) => {
      if (current.length === initial.length && current.every((item, index) => (
        item.uploadedPath === initial[index].uploadedPath && item.src === initial[index].src
      ))) {
        return current;
      }
      return initial;
    });
  }, [value]);

  useEffect(() => {
    const uploadedPaths = images
      .filter((item) => item.uploadedPath)
      .map((item) => item.uploadedPath);

    if (!arraysEqual(uploadedPaths, lastEmittedPaths.current)) {
      lastEmittedPaths.current = uploadedPaths;
      onChangeRef.current?.(uploadedPaths);
    }
  }, [images]);

  const updateItem = (id, values) => {
    setImages((current) => current.map((item) => (item.id === id ? { ...item, ...values } : item)));
  };

  const handleFileSelection = async (files) => {
    const fileArray = Array.from(files).map((file) => ({
      id: createId(),
      src: URL.createObjectURL(file),
      uploadedPath: null,
      file,
      status: 'ready',
      progress: 0,
    }));

    setImages((current) => [...current, ...fileArray]);
    if (!activeCropId && fileArray.length > 0) {
      openCropper(fileArray[0].id, fileArray[0].src);
    }
  };

  const openCropper = (id, src) => {
    const item = images.find((image) => image.id === id);
    setActiveCropId(id);
    setCropImageSrc(src || item?.src || '');
  };

  const closeCropper = () => {
    setActiveCropId(null);
    setCropImageSrc('');
    setReplaceTargetId(null);
  };

  const uploadFile = async (file, itemId, oldImagePath = null) => {
    const form = new FormData();
    form.append('images', file);
    form.append('name', productName || 'product');
    if (oldImagePath) {
      form.append('oldImagePath', oldImagePath);
    }

    updateItem(itemId, { status: 'uploading', progress: 0 });

    const response = await api.post('/products/upload-images', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (event) => {
        const progress = Math.round((event.loaded * 100) / Math.max(event.total, 1));
        updateItem(itemId, { progress });
      },
    });

    const uploadedPaths = response.data?.data || [];
    const uploadedPath = uploadedPaths[0] || null;
    if (!uploadedPath) {
      throw new Error('No upload result returned');
    }

    updateItem(itemId, {
      uploadedPath,
      src: normalizePath(uploadedPath),
      file: null,
      status: 'uploaded',
      progress: 100,
    });
  };

  const handleCropSave = async (blob) => {
    const targetId = activeCropId;
    const item = images.find((image) => image.id === targetId);
    if (!item) return;

    const fileName = `${createId()}.jpeg`;
    const file = new File([blob], fileName, { type: 'image/jpeg' });

    try {
      await uploadFile(file, targetId, item.oldImagePath || item.uploadedPath || null);
      updateItem(targetId, { oldImagePath: null });
    } catch (err) {
      updateItem(targetId, { status: 'error' });
      console.error(err);
    } finally {
      closeCropper();
    }
  };

  const handleAddImages = () => {
    fileInputRef.current?.click();
  };

  const handleReplace = (id) => {
    setReplaceTargetId(id);
    fileInputRef.current?.click();
  };

  const handleReplaceSelection = async (file) => {
    if (!replaceTargetId) return;
    const item = images.find((image) => image.id === replaceTargetId);
    if (!item) return;
    const newItem = {
      ...item,
      file,
      src: URL.createObjectURL(file),
      uploadedPath: null,
      status: 'ready',
      progress: 0,
      oldImagePath: item.uploadedPath || item.src || null,
    };
    setImages((current) => current.map((image) => (image.id === replaceTargetId ? newItem : image)));
    openCropper(replaceTargetId, newItem.src);
  };

  const handleFileInputChange = async (event) => {
    const selectedFiles = event.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    if (replaceTargetId) {
      await handleReplaceSelection(selectedFiles[0]);
      setReplaceTargetId(null);
    } else {
      await handleFileSelection(selectedFiles);
    }
    event.target.value = null;
  };

  const handleRemove = (id) => {
    setImages((current) => current.filter((item) => item.id !== id));
  };

  const handleCropRequest = (id) => {
    const item = images.find((image) => image.id === id);
    if (!item) return;
    openCropper(id, item.src);
  };

  const handleMove = (id, nextIndex) => {
    setImages((current) => {
      const currentIndex = current.findIndex((item) => item.id === id);
      if (currentIndex === -1 || nextIndex < 0 || nextIndex >= current.length) return current;
      const nextImages = [...current];
      const [movingItem] = nextImages.splice(currentIndex, 1);
      nextImages.splice(nextIndex, 0, movingItem);
      return nextImages;
    });
  };

  const activeItem = images.find((item) => item.id === activeCropId);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-700">Product Images</h3>
          <p className="text-xs text-gray-500">Upload, crop, replace, remove, and reorder images that appear on the storefront.</p>
        </div>
        <button type="button" onClick={handleAddImages} className="btn-primary px-4 py-2 w-full md:w-auto">
          Upload Images
        </button>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        multiple
        onChange={handleFileInputChange}
      />

      {images.length > 0 ? (
        <ImagePreviewGrid
          images={images}
          onCrop={handleCropRequest}
          onReplace={handleReplace}
          onRemove={handleRemove}
          onMove={handleMove}
        />
      ) : (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-10 text-center text-sm text-gray-500">
          No images uploaded yet. Click Upload Images to choose and crop product photos.
        </div>
      )}

      <ImageCropModal
        open={Boolean(activeItem)}
        imageSrc={cropImageSrc}
        onClose={closeCropper}
        onSave={handleCropSave}
      />
    </div>
  );
};

export default ImageUploader;
