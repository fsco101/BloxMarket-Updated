/**
 * Enhanced rate limit handling for API requests
 */

// Configuration for different types of requests
interface RateLimitConfig {
  maxRetries: number;  // Maximum number of retry attempts
  baseDelay: number;   // Base delay in ms before retrying
  maxDelay: number;    // Maximum delay in ms for exponential backoff
}

// Different configurations based on request type
const rateLimitConfigs: Record<string, RateLimitConfig> = {
  auth: {
    maxRetries: 1,
    baseDelay: 2000,
    maxDelay: 5000,
  },
  standard: {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
  },
  heavy: {
    maxRetries: 2,
    baseDelay: 3000,
    maxDelay: 15000,
  }
};

// Store endpoints that are currently rate limited
const rateLimitedEndpoints = new Map<string, number>(); // endpoint -> timestamp when can retry

/**
 * Check if an endpoint is currently rate limited
 * @param endpoint The API endpoint
 * @returns Whether the endpoint is rate limited and when it can be retried
 */
export function isRateLimited(endpoint: string): { limited: boolean; retryAfter: number } {
  const now = Date.now();
  const retryTime = rateLimitedEndpoints.get(endpoint);

  if (retryTime && now < retryTime) {
    return { limited: true, retryAfter: Math.ceil((retryTime - now) / 1000) };
  }

  return { limited: false, retryAfter: 0 };
}

/**
 * Mark an endpoint as rate limited based on server response
 * @param endpoint The API endpoint
 * @param retryAfterSeconds Time in seconds before the endpoint can be retried
 */
export function markRateLimited(endpoint: string, retryAfterSeconds: number): void {
  // Default to 60 seconds if no retry-after header
  const waitSeconds = retryAfterSeconds || 60;
  const retryTime = Date.now() + (waitSeconds * 1000);
  
  rateLimitedEndpoints.set(endpoint, retryTime);

  // Remove from rate limited map after the time expires
  setTimeout(() => {
    rateLimitedEndpoints.delete(endpoint);
  }, waitSeconds * 1000);
}

/**
 * Calculate exponential backoff delay
 * @param attempt Current attempt number (0-based)
 * @param config Rate limit config for the request type
 * @returns Delay time in milliseconds
 */
export function calculateBackoffDelay(attempt: number, config: RateLimitConfig): number {
  // Exponential backoff formula: baseDelay * 2^attempt + random jitter
  const exponentialPart = config.baseDelay * Math.pow(2, attempt);
  const jitter = Math.random() * 1000; // Random jitter up to 1 second
  return Math.min(exponentialPart + jitter, config.maxDelay);
}

/**
 * Handle rate-limited requests with exponential backoff
 * @param endpoint The API endpoint
 * @param requestFn Function that makes the actual request
 * @param requestType Type of request (auth, standard, heavy)
 * @returns Promise with the response or throws after max retries
 */
export async function handleRateLimit<T>(
  endpoint: string,
  requestFn: () => Promise<T>,
  requestType: 'auth' | 'standard' | 'heavy' = 'standard'
): Promise<T> {
  const config = rateLimitConfigs[requestType];
  let attempts = 0;
  
  // Check if already rate limited
  const { limited, retryAfter } = isRateLimited(endpoint);
  if (limited) {
    // Notify user of waiting time
    window.dispatchEvent(new CustomEvent('rate-limit-notification', {
      detail: { endpoint, retryAfter, message: `Rate limited. Retrying in ${retryAfter} seconds.` }
    }));
    
    // Wait until the rate limit expires
    await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
  }

  while (attempts <= config.maxRetries) {
    try {
      return await requestFn();
    } catch (error) {
      const err = error as any;
      // Check if error is rate limiting (status 429)
      if (err.message?.includes('Rate limit') || err.status === 429) {
        if (attempts >= config.maxRetries) {
          // We've used all our retries, rethrow the error
          throw error;
        }

        // Parse retry-after from error if available
        let retryAfterSeconds = 0;
        if (err.headers?.get('Retry-After')) {
          retryAfterSeconds = parseInt(err.headers.get('Retry-After'), 10);
        }

        // Calculate delay with exponential backoff
        const delay = retryAfterSeconds * 1000 || calculateBackoffDelay(attempts, config);
        
        // Mark this endpoint as rate limited
        markRateLimited(endpoint, retryAfterSeconds || Math.ceil(delay / 1000));
        
        // Notify user
        window.dispatchEvent(new CustomEvent('rate-limit-notification', {
          detail: { 
            endpoint, 
            retryAfter: Math.ceil(delay / 1000),
            attempt: attempts + 1,
            maxRetries: config.maxRetries,
            message: `Rate limited. Retrying ${attempts + 1}/${config.maxRetries} in ${Math.ceil(delay / 1000)}s...`
          }
        }));
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay));
        attempts++;
      } else {
        // Not a rate limiting error, rethrow
        throw error;
      }
    }
  }

  // This should not be reached due to the error throw above, but TypeScript needs it
  throw new Error('Max retries reached for rate-limited request');
}

/**
 * Get all currently rate-limited endpoints
 * @returns Map of rate-limited endpoints and their retry times
 */
export function getRateLimitedEndpoints(): Map<string, number> {
  return new Map(rateLimitedEndpoints);
}

/**
 * Clear all rate limit information (useful when testing)
 */
export function clearRateLimits(): void {
  rateLimitedEndpoints.clear();
}