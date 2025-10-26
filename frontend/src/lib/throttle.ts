/**
 * Utility for client-side throttling to help prevent hitting server rate limits
 */

// Store of timestamps for different endpoint categories
const apiTimestamps = {
  auth: new Map<string, number>(), // Authentication endpoints
  standard: new Map<string, number>(), // Standard API calls
  heavy: new Map<string, number>() // Resource-intensive operations
};

// Minimum wait times between requests (in milliseconds)
const minWaitTimes = {
  auth: 1000, // 1 second between auth requests (reduced from 2000)
  standard: 200, // 0.2 seconds between standard requests (reduced from 500)
  heavy: 2000 // 2 seconds between heavy requests (reduced from 5000)
};

/**
 * Checks if a request should be throttled based on previous request timestamps
 * @param key Unique identifier for the request (e.g., endpoint path)
 * @param category Type of request: 'auth', 'standard', or 'heavy'
 * @returns An object with throttled status and wait time in ms
 */
export function shouldThrottle(
  key: string,
  category: 'auth' | 'standard' | 'heavy' = 'standard'
): { throttled: boolean; waitTime: number } {
  const now = Date.now();
  const timestamps = apiTimestamps[category];
  const minWaitTime = minWaitTimes[category];
  const lastRequestTime = timestamps.get(key) || 0;
  
  const timeSinceLastRequest = now - lastRequestTime;
  
  if (timeSinceLastRequest < minWaitTime) {
    // Request should be throttled
    return { 
      throttled: true, 
      waitTime: minWaitTime - timeSinceLastRequest 
    };
  }
  
  // Update timestamp for this request
  timestamps.set(key, now);
  
  return { throttled: false, waitTime: 0 };
}

/**
 * Creates a throttled version of an async function
 * @param func The async function to throttle
 * @param key Unique identifier for the function (e.g., endpoint path)
 * @param category Type of request: 'auth', 'standard', or 'heavy'
 * @returns A throttled version of the function that will wait if called too frequently
 */
export function createThrottledFunction<T extends (...args: unknown[]) => Promise<unknown>>(
  func: T,
  key: string,
  category: 'auth' | 'standard' | 'heavy' = 'standard'
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  return async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    const { throttled, waitTime } = shouldThrottle(key, category);
    
    if (throttled) {
      // Wait before making the request
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    // Make the request
    return await func(...args) as ReturnType<T>;
  };
}

/**
 * Clears all stored timestamps
 */
export function clearThrottleTimestamps(): void {
  apiTimestamps.auth.clear();
  apiTimestamps.standard.clear();
  apiTimestamps.heavy.clear();
}

/**
 * Gets a summary of current throttling state
 */
export function getThrottlingStatus(): {
  auth: number;
  standard: number;
  heavy: number;
} {
  return {
    auth: apiTimestamps.auth.size,
    standard: apiTimestamps.standard.size,
    heavy: apiTimestamps.heavy.size
  };
}