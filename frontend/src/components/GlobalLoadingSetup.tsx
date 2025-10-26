import { useEffect } from 'react';
import { useGlobalLoading } from '../contexts/GlobalLoadingContext';
import { setGlobalLoadingManager } from '../services/api';

const GlobalLoadingSetup: React.FC = () => {
  const { showLoader, hideLoader } = useGlobalLoading();

  useEffect(() => {
    // Set up the global loading manager for the API service
    setGlobalLoadingManager({
      showLoader,
      hideLoader
    });
  }, [showLoader, hideLoader]);

  return null; // This component doesn't render anything
};

export default GlobalLoadingSetup;