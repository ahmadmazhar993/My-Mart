import React from 'react';

const SoldOutBanner = ({ position = 'center', className = '' }) => {
  if (position === 'ribbon') {
    return (
      <div className={`absolute top-2 left-0 -rotate-12 transform origin-left px-3 py-1 bg-red-600 text-white text-xs font-bold ${className}`}>
        Sold Out
      </div>
    );
  }

  return (
    <div className={`absolute inset-0 flex items-center justify-center bg-black/50 text-white text-lg font-bold pointer-events-none ${className}`}>
      Sold Out
    </div>
  );
};

export default SoldOutBanner;
