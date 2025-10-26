import React from 'react';
import { useGlobalLoading } from '../contexts/GlobalLoadingContext';

const GlobalLoader: React.FC = () => {
  const { loadingState } = useGlobalLoading();

  if (!loadingState.isLoading) {
    return null;
  }

  return (
    <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
         style={{ zIndex: 1050, backgroundColor: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-4 shadow-lg p-5" style={{ maxWidth: '400px', width: '90%' }}>
        <div className="d-flex flex-column align-items-center gap-4">
          {/* Enhanced Bootstrap spinner with gradient */}
          <div className="position-relative">
            <div className="spinner-border text-primary" style={{ width: '4rem', height: '4rem' }} role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <div className="position-absolute top-0 start-0 spinner-border text-primary opacity-25"
                 style={{ width: '4rem', height: '4rem', animationDuration: '1.5s' }}>
            </div>
          </div>

          {/* Loading message with Bootstrap typography */}
          <div className="text-center">
            <h4 className="h5 fw-semibold text-dark mb-3">
              {loadingState.message || 'Loading...'}
            </h4>
            <div className="d-flex justify-content-center gap-1">
              <div className="bg-primary rounded-circle animate-bounce" style={{ width: '8px', height: '8px' }}></div>
              <div className="bg-primary rounded-circle animate-bounce" style={{ width: '8px', height: '8px', animationDelay: '0.1s' }}></div>
              <div className="bg-primary rounded-circle animate-bounce" style={{ width: '8px', height: '8px', animationDelay: '0.2s' }}></div>
            </div>
          </div>

          {/* Bootstrap progress bar with animation */}
          <div className="w-100">
            <div className="progress" style={{ height: '6px' }}>
              <div
                className="progress-bar bg-gradient"
                style={{
                  width: '60%',
                  animation: 'loading-progress 1.5s ease-in-out infinite',
                  background: 'linear-gradient(90deg, #0d6efd 0%, #6610f2 100%)'
                }}
                role="progressbar"
                aria-valuenow={60}
                aria-valuemin={0}
                aria-valuemax={100}
              ></div>
            </div>
          </div>

          {/* Optional loading tip */}
          <div className="text-center">
            <small className="text-muted">Please wait while we process your request...</small>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes loading-progress {
            0% { width: 0%; transform: translateX(-100%); }
            50% { width: 60%; transform: translateX(0%); }
            100% { width: 100%; transform: translateX(100%); }
          }

          .animate-bounce {
            animation: bounce 1.4s ease-in-out infinite both;
          }

          .animate-bounce:nth-child(2) { animation-delay: 0.1s; }
          .animate-bounce:nth-child(3) { animation-delay: 0.2s; }

          @keyframes bounce {
            0%, 20%, 53%, 80%, 100% { transform: translateY(0); }
            40%, 43% { transform: translateY(-8px); }
            70% { transform: translateY(-4px); }
            90% { transform: translateY(-2px); }
          }

          .bg-gradient {
            background: linear-gradient(90deg, #0d6efd 0%, #6610f2 50%, #6f42c1 100%) !important;
          }
        `
      }} />
    </div>
  );
};

export default GlobalLoader;