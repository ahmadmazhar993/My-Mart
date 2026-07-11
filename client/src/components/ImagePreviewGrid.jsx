import React from 'react';

const ImagePreviewGrid = ({ images, onCrop, onReplace, onRemove, onMove }) => {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {images.map((item, index) => (
        <div key={item.id} className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="relative h-56 overflow-hidden bg-gray-100">
            <img src={item.src} alt={`Upload ${index + 1}`} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
            {item.status === 'uploading' && (
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center text-white text-sm">
                Uploading {item.progress}%
              </div>
            )}
            {item.status === 'error' && (
              <div className="absolute inset-0 bg-red-500/10 text-red-700 flex items-center justify-center text-sm">Upload failed</div>
            )}
          </div>

          <div className="space-y-2 p-3">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>{item.uploadedPath ? 'Uploaded' : item.file ? 'New image' : 'Existing image'}</span>
              <span>{index + 1}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => onCrop(item.id)} className="btn-secondary text-[11px] py-2">Crop</button>
              <button type="button" onClick={() => onReplace(item.id)} className="btn-secondary text-[11px] py-2">Replace</button>
              <button type="button" onClick={() => onRemove(item.id)} className="btn-danger text-[11px] py-2">Remove</button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onMove(item.id, Math.max(index - 1, 0))}
                  className="btn-secondary text-[11px] py-2"
                  disabled={index === 0}
                >
                  ←
                </button>
                <button
                  type="button"
                  onClick={() => onMove(item.id, Math.min(index + 1, images.length - 1))}
                  className="btn-secondary text-[11px] py-2"
                  disabled={index === images.length - 1}
                >
                  →
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ImagePreviewGrid;
