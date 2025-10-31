/**
 * Utility for client-side throttling to help prevent hitting server rate limits
 */

// Store of timestamps for different endpoint categories
const apiTimestamps = {
  auth: new Map<string, number>(), // Authentication endpoints
  standard: new Map<string, number>(), // Standard API calls
  heavy: new Map<string, number>() // Resource-intensive operations
};

// Request queues for different categories to prevent simultaneous requests
const requestQueues = {
  auth: Promise.resolve(),
  standard: Promise.resolve(),
  heavy: Promise.resolve()
};

// Minimum wait times between requests (in milliseconds) - increased for safety
const minWaitTimes = {
  auth: 3000, // 3 seconds between auth requests (increased)
  standard: 1000, // 1 second between standard requests (increased)
  heavy: 8000 // 8 seconds between heavy requests (increased)
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
 * Queues a request to ensure it doesn't run simultaneously with other requests in the same category
 * @param category Type of request: 'auth', 'standard', or 'heavy'
 * @param requestFn Function that makes the request
 * @returns Promise that resolves with the request result
 */
export async function queueRequest<T>(
  category: 'auth' | 'standard' | 'heavy',
  requestFn: () => Promise<T>
): Promise<T> {
  // Wait for any previous requests in this category to complete
  await requestQueues[category];
  
  // Execute the request and update the queue
  const result = await requestFn();
  
  // Update the queue to resolve immediately for the next request
  requestQueues[category] = Promise.resolve();
  
  return result;
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
    
    // Queue the request to prevent simultaneous execution
    return queueRequest(category, () => func(...args) as Promise<ReturnType<T>>);
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
  queueStatus: {
    auth: boolean;
    standard: boolean;
    heavy: boolean;
  };
} {
  return {
    auth: apiTimestamps.auth.size,
    standard: apiTimestamps.standard.size,
    heavy: apiTimestamps.heavy.size,
    queueStatus: {
      auth: requestQueues.auth !== Promise.resolve(),
      standard: requestQueues.standard !== Promise.resolve(),
      heavy: requestQueues.heavy !== Promise.resolve()
    }
  };
}