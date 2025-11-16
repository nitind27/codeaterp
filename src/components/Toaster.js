'use client';

import { Toaster as HotToaster } from 'react-hot-toast';

export default function Toaster() {
  return (
    <HotToaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: '#373c42',
          color: '#e0e1e1',
          border: '1px solid #47494d',
          borderRadius: '8px',
          padding: '12px 16px',
        },
        success: {
          iconTheme: {
            primary: '#00b3c6',
            secondary: '#e0e1e1',
          },
          style: {
            borderLeft: '4px solid #00b3c6',
          },
        },
        error: {
          iconTheme: {
            primary: '#ef4444',
            secondary: '#e0e1e1',
          },
          style: {
            borderLeft: '4px solid #ef4444',
          },
        },
      }}
    />
  );
}

