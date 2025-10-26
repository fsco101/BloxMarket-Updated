import React, { useEffect, useState } from 'react';
import { AlertCircle, X, Clock, RefreshCw } from 'lucide-react';
import { 
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "./ui/toast";
import { useToast } from "./ui/use-toast";

interface RateLimitToastProps {
  className?: string;
}

export function RateLimitToast({ className }: RateLimitToastProps) {
  const { toast } = useToast();
  const [rateLimitedEndpoints, setRateLimitedEndpoints] = useState<Map<string, number>>(new Map());
  
  // Handle rate limit events
  useEffect(() => {
    const handleRateLimit = (event: CustomEvent<{ 
      endpoint: string; 
      retryAfter: number; 
      attempt?: number;
      maxRetries?: number;
      message: string;
    }>) => {
      const { endpoint, retryAfter, attempt, maxRetries, message } = event.detail;
      
      // Update our state with this rate limited endpoint
      setRateLimitedEndpoints(prev => {
        const newMap = new Map(prev);
        newMap.set(endpoint, Date.now() + (retryAfter * 1000));
        return newMap;
      });
      
      // Show toast notification
      toast({
        title: "API Rate Limited",
        description: message || `Rate limited. Retrying in ${retryAfter} seconds.`,
        variant: "destructive",
        duration: 5000,
      });
    };

    // Listen for rate limit events from the API service
    window.addEventListener('rate-limit-notification' as any, handleRateLimit);
    window.addEventListener('rate-limit-exceeded' as any, handleRateLimit);
    
    return () => {
      window.removeEventListener('rate-limit-notification' as any, handleRateLimit);
      window.removeEventListener('rate-limit-exceeded' as any, handleRateLimit);
    };
  }, [toast]);
  
  // Cleanup expired rate limits
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      let changed = false;
      
      setRateLimitedEndpoints(prev => {
        const newMap = new Map(prev);
        for (const [endpoint, expiry] of newMap.entries()) {
          if (now > expiry) {
            newMap.delete(endpoint);
            changed = true;
          }
        }
        return changed ? newMap : prev;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);

  return null; // The actual toasts are rendered by the Toast component from the Toast Provider
}

export function RateLimitToastProvider({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <RateLimitToast />
      {children}
      <ToastViewport />
    </ToastProvider>
  );
}