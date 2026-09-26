import React from 'react';
import { Link } from 'react-router-dom';

const MinimalHeader = () => (
  <header className="border-b border-gray-100 bg-white">
    <div className="container-main flex items-center justify-center py-4">
      <Link to="/" className="flex items-center gap-2">
        <img src="/logo.png" alt="AHM Mart Logo" className="h-10 w-10" />
        <span className="text-2xl font-extrabold tracking-tight">
          <span className="text-dark">AHM</span>
          <span className="text-primary"> Mart</span>
        </span>
      </Link>
    </div>
  </header>
);

export default MinimalHeader;