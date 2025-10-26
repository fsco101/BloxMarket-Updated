import React from 'react';
import { useGlobalLoading } from '../contexts/GlobalLoadingContext';

const GlobalLoader: React.FC = () => {
  const { loadingState } = useGlobalLoading();

  if (!loadingState.isLoading) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4">
        <div className="flex flex-col items-center space-y-6">
          {/* Modern animated spinner */}
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-200 rounded-full animate-spin border-t-blue-600"></div>
            <div className="absolute inset-0 w-16 h-16 border-4 border-transparent rounded-full animate-ping border-t-blue-400 opacity-20"></div>
          </div>

          {/* Loading text with animation */}
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {loadingState.message || 'Loading...'}
            </h3>
            <div className="flex justify-center space-x-1">
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
          </div>

          {/* Progress indicator */}
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"
              style={{
                width: '60%',
                animation: 'loading-bar 1.5s ease-in-out infinite'
              }}
            ></div>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes loading-bar {
            0% { width: 0%; transform: translateX(-100%); }
            50% { width: 60%; transform: translateX(0%); }
            100% { width: 100%; transform: translateX(100%); }
          }
        `
      }} />
    </div>
  );
};

export default GlobalLoader;