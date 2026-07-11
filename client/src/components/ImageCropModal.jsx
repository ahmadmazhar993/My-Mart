import React, { useCallback, useEffect, useState } from 'react';
import Cropper from 'react-easy-crop';
import { getCroppedImage } from '../utils/cropImage';

const ImageCropModal = ({ imageSrc, open, onClose, onSave, title = 'Crop Image' }) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) {
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setRotation(0);
      setCroppedAreaPixels(null);
      setError('');
      setSaving(false);
    }
  }, [open]);

  const onCropComplete = useCallback((_, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSave = async () => {
    if (!croppedAreaPixels) {
      setError('Please adjust the crop area before saving.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const blob = await getCroppedImage(imageSrc, croppedAreaPixels, rotation);
      onSave(blob);
    } catch (uploadError) {
      setError('Unable to process the image. Please try again.');
      console.error(uploadError);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-4xl rounded-2xl bg-white shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button type="button" onClick={onClose} className="text-2xl leading-none hover:text-red-500">×</button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_0.6fr] gap-4 p-5">
          <div className="relative min-h-[420px] overflow-hidden rounded-2xl bg-gray-100">
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              rotation={rotation}
              aspect={4 / 5}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onRotationChange={setRotation}
              onCropComplete={onCropComplete}
              cropShape="rect"
              showGrid={false}
            />
          </div>

          <div className="space-y-4">
            <div className="space-y-3 rounded-2xl border border-gray-200 bg-slate-50 p-4">
              <div className="text-sm font-semibold text-gray-700">Edit controls</div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Zoom</label>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.05}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">Rotate</label>
                <input
                  type="range"
                  min={0}
                  max={360}
                  step={1}
                  value={rotation}
                  onChange={(e) => setRotation(Number(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-gray-700 mb-2">Live preview</p>
              <div className="h-56 overflow-hidden rounded-xl bg-black/5">
                <img
                  src={imageSrc}
                  alt="Preview"
                  className="h-full w-full object-contain"
                />
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
            )}

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="btn-primary"
              >
                {saving ? 'Saving...' : 'Save Image'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageCropModal;
