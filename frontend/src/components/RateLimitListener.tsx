import React, { useEffect } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { useToast } from './ui/use-toast';

export function RateLimitListener() {
  const { toast } = useToast();
  
  useEffect(() => {
    // Function to handle rate limit notifications
    const handleRateLimitNotification = (event: Event) => {
      const customEvent = event as CustomEvent<{
        endpoint: string;
        retryAfter: number;
        attempt?: number;
        maxRetries?: number;
        message?: string;
      }>;
      
      const { retryAfter, attempt, maxRetries, message, endpoint } = customEvent.detail;
      
      // Format a readable endpoint name
      const endpointName = endpoint.split('/').pop() || 'API';
      
      // Create a descriptive message based on available information
      const description = message || 
        (attempt && maxRetries 
          ? `Rate limit hit. Retry ${attempt}/${maxRetries} in ${retryAfter}s...`
          : `Rate limited. Please wait ${retryAfter} seconds before trying again.`);
      
      // Display toast with relevant information
      toast({
        title: `Rate Limited: ${endpointName}`,
        description,
        variant: "destructive",
        duration: Math.min(retryAfter * 1000, 10000), // Show for retry duration or max 10 seconds
      });
    };

    // Listen for rate limit events
    window.addEventListener('rate-limit-notification', handleRateLimitNotification as EventListener);
    window.addEventListener('rate-limit-exceeded', handleRateLimitNotification as EventListener);
    
    return () => {
      window.removeEventListener('rate-limit-notification', handleRateLimitNotification as EventListener);
      window.removeEventListener('rate-limit-exceeded', handleRateLimitNotification as EventListener);
    };
  }, [toast]);

  // This component doesn't render anything visible
  return null;
}