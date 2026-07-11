import React from 'react';
import { BrowserRouter } from "react-router-dom";
import ReactDOM from 'react-dom/client';
import App from './App';
import AuthInitializer from './components/AuthInitializer';
import ScrollToTop from './components/ScrollToTop';
import ToastProvider from './components/ToastProvider';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
      <BrowserRouter>
      <ToastProvider>
        <AuthInitializer>
          <ScrollToTop />
          <App />
        </AuthInitializer>
      </ToastProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
