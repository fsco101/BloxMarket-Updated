import React, { createContext, useContext, useState, ReactNode } from 'react';

interface LoadingState {
  isLoading: boolean;
  message?: string;
  requests: Set<string>;
}

interface GlobalLoadingContextType {
  loadingState: LoadingState;
  showLoader: (id: string, message?: string) => void;
  hideLoader: (id: string) => void;
  isLoading: boolean;
}

const GlobalLoadingContext = createContext<GlobalLoadingContextType | undefined>(undefined);

export const useGlobalLoading = () => {
  const context = useContext(GlobalLoadingContext);
  if (!context) {
    throw new Error('useGlobalLoading must be used within a GlobalLoadingProvider');
  }
  return context;
};

interface GlobalLoadingProviderProps {
  children: ReactNode;
}

export const GlobalLoadingProvider: React.FC<GlobalLoadingProviderProps> = ({ children }) => {
  const [loadingState, setLoadingState] = useState<LoadingState>({
    isLoading: false,
    message: '',
    requests: new Set()
  });

  const showLoader = (id: string, message?: string) => {
    setLoadingState(prev => {
      const newRequests = new Set(prev.requests);
      newRequests.add(id);
      return {
        isLoading: newRequests.size > 0,
        message: message || prev.message,
        requests: newRequests
      };
    });
  };

  const hideLoader = (id: string) => {
    setLoadingState(prev => {
      const newRequests = new Set(prev.requests);
      newRequests.delete(id);
      return {
        isLoading: newRequests.size > 0,
        message: newRequests.size > 0 ? prev.message : '',
        requests: newRequests
      };
    });
  };

  const value: GlobalLoadingContextType = {
    loadingState,
    showLoader,
    hideLoader,
    isLoading: loadingState.isLoading
  };

  return (
    <GlobalLoadingContext.Provider value={value}>
      {children}
    </GlobalLoadingContext.Provider>
  );
};