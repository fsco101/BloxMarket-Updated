// filepath: c:\BloxMarket\frontend\src\components\ui\GlobalLoader.tsx
import React from 'react';

interface GlobalLoaderProps {
  isLoading: boolean;
  message?: string;
}

export function GlobalLoader({ isLoading, message = 'Loading...' }: GlobalLoaderProps) {
  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg flex flex-col items-center space-y-4">
        {/* Bootstrap spinner with modern animation */}
        <div className="spinner-border text-primary" role="status" style={{ width: '3rem', height: '3rem' }}>
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="text-gray-700 dark:text-gray-300 font-medium">{message}</p>
      </div>
    </div>
  );
}