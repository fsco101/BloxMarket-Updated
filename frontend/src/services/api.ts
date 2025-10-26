const API_BASE_URL = 'http://localhost:5000/api';
import { shouldThrottle } from '../lib/throttle';
import { handleRateLimit, isRateLimited } from '../lib/rateLimitHandler';

// Global loading manager - will be set by the context
let globalLoadingManager: {
  showLoader: (id: string, message?: string) => void;
  hideLoader: (id: string) => void;
} | null = null;

export const setGlobalLoadingManager = (manager: {
  showLoader: (id: string, message?: string) => void;
  hideLoader: (id: string) => void;
}) => {
  globalLoadingManager = manager;
};

class ApiService {
  private token: string | null;
  private verifyingOnce = false;

  constructor() {
    // Try to get the token from either localStorage or sessionStorage
    this.token = localStorage.getItem('bloxmarket-token') || sessionStorage.getItem('bloxmarket-token');
    console.log('ApiService initialized with token:', this.token ? 'present' : 'missing');
  }

  private async verifyTokenSilently(currentToken: string) {
    if (this.verifyingOnce) return false;
    this.verifyingOnce = true;
    try {
      const resp = await fetch(`${API_BASE_URL}/auth/me`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${currentToken}` }
      });
      return resp.ok;
    } catch {
      return false;
    } finally {
      this.verifyingOnce = false;
    }
  }

  // Track pending requests to prevent duplicates
  private pendingRequests = new Map<string, Promise<any>>();

  // Determine request category based on endpoint
  private getRequestCategory(endpoint: string): 'auth' | 'standard' | 'heavy' {
    if (endpoint.startsWith('/auth')) {
      return 'auth';
    }
    
    // Identify resource-heavy operations
    if (
      endpoint.includes('/upload') || 
      endpoint.includes('/images') ||
      endpoint.includes('/admin/datatables') ||
      endpoint.includes('/export/csv')
    ) {
      return 'heavy';
    }
    
    return 'standard';
  }

  async request(endpoint: string, options: RequestInit = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    // Check both storage types for the token
    const currentToken = localStorage.getItem('bloxmarket-token') || 
                          sessionStorage.getItem('bloxmarket-token') || 
                          this.token || null;

    const config: RequestInit = {
      // Important: spread options first so our merged headers don't get overwritten by options.headers
      ...options,
      headers: {
        ...(!(options.body instanceof FormData) && { 'Content-Type': 'application/json' }),
        ...(currentToken && { Authorization: `Bearer ${currentToken}` }),
        ...(options.headers || {}),
      },
    };

    // Create a request key for deduplication (for GET requests only)
    const isGetRequest = !options.method || options.method === 'GET';
    const requestKey = isGetRequest ? `${options.method || 'GET'}-${endpoint}` : null;
    
    // Return existing promise for duplicate GET requests
    if (isGetRequest && requestKey && this.pendingRequests.has(requestKey)) {
      return this.pendingRequests.get(requestKey);
    }
    
    // Apply client-side throttling
    const requestCategory = this.getRequestCategory(endpoint);
    const { throttled, waitTime } = shouldThrottle(endpoint, requestCategory);
    
    if (throttled && waitTime > 0) {
      // Wait before making the request to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    // Generate unique request ID for global loading
    const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const loadingMessage = this.getLoadingMessage(endpoint, options.method);

    // Show global loader
    if (globalLoadingManager) {
      globalLoadingManager.showLoader(requestId, loadingMessage);
    }

    // Use the rate limit handler to handle retries and exponential backoff
    const makeRequest = async () => {
      const response = await fetch(url, config);
      const contentType = response.headers.get('content-type') || '';
      const data = contentType.includes('application/json') ? await response.json() : { error: await response.text() };

      if (!response.ok) {
        // Create enhanced error object to carry response data
        const enhancedError: any = new Error(data?.error || 'API request failed');
        enhancedError.status = response.status;
        enhancedError.data = data;
        enhancedError.headers = response.headers;
        
        if (response.status === 401) {
          const errMsg = typeof data?.error === 'string' ? data.error : '';
          const isAuthError =
            errMsg === 'Access denied. No token provided.' ||
            errMsg === 'Token expired' ||
            errMsg === 'Invalid token' ||
            errMsg === 'Token verification failed' ||
            errMsg === 'User not found';

          if (isAuthError) {
            // Verify once to avoid false positives during navigation
            const ok = currentToken ? await this.verifyTokenSilently(currentToken) : false;
            if (!ok) {
              this.clearToken();
              window.dispatchEvent(new CustomEvent('auth-expired'));
              throw new Error('Session expired. Please log in again.');
            }
            // Token is valid; treat as access error for this endpoint
            throw new Error(data?.error || 'Access denied');
          }
        }
        
        if (response.status === 403) {
          const errMsg = typeof data?.error === 'string' ? data.error : '';
          if (errMsg === 'Account is banned' || errMsg === 'Account is deactivated') {
            this.clearToken();
            window.dispatchEvent(new CustomEvent('auth-expired'));
          }
          // Do NOT logout on 'Admin access required'
        }
        
        throw enhancedError;
      }

      return data;
    };

    const executeRequest = async () => {
      try {
        // Use our rate limiting handler with exponential backoff for requests
        return await handleRateLimit(endpoint, makeRequest, requestCategory);
      } catch (error) {
        console.error('API request error:', error);
        throw error;
      } finally {
        // Clean up pending request reference
        if (requestKey) {
          this.pendingRequests.delete(requestKey);
        }
        // Hide global loader
        if (globalLoadingManager) {
          globalLoadingManager.hideLoader(requestId);
        }
      }
    };
    
    const requestPromise = executeRequest();
    
    // Store the promise for GET requests to deduplicate
    if (isGetRequest && requestKey) {
      this.pendingRequests.set(requestKey, requestPromise);
      
      // Set a timeout to clean up the pending request
      setTimeout(() => {
        if (this.pendingRequests.get(requestKey) === requestPromise) {
          this.pendingRequests.delete(requestKey);
        }
      }, 30000); // 30 second timeout
    }
    
    return requestPromise;
  }

  private getLoadingMessage(endpoint: string, method?: string): string {
    const methodStr = method || 'GET';

    // Authentication
    if (endpoint.includes('/auth/login')) return 'Signing you in...';
    if (endpoint.includes('/auth/register')) return 'Creating your account...';
    if (endpoint.includes('/auth/me')) return 'Loading your profile...';

    // Trades
    if (endpoint.includes('/trades') && methodStr === 'GET') return 'Loading trades...';
    if (endpoint.includes('/trades') && methodStr === 'POST') return 'Creating trade...';
    if (endpoint.includes('/trades') && methodStr === 'PATCH') return 'Updating trade...';
    if (endpoint.includes('/trades') && methodStr === 'DELETE') return 'Deleting trade...';

    // Forums
    if (endpoint.includes('/forum') && methodStr === 'GET') return 'Loading forum posts...';
    if (endpoint.includes('/forum') && methodStr === 'POST') return 'Posting to forum...';
    if (endpoint.includes('/forum') && methodStr === 'PUT') return 'Updating post...';
    if (endpoint.includes('/forum') && methodStr === 'DELETE') return 'Deleting post...';

    // Events
    if (endpoint.includes('/events') && methodStr === 'GET') return 'Loading events...';
    if (endpoint.includes('/events') && methodStr === 'POST') return 'Creating event...';
    if (endpoint.includes('/events') && methodStr === 'PUT') return 'Updating event...';
    if (endpoint.includes('/events') && methodStr === 'DELETE') return 'Deleting event...';

    // Wishlists
    if (endpoint.includes('/wishlists') && methodStr === 'GET') return 'Loading wishlists...';
    if (endpoint.includes('/wishlists') && methodStr === 'POST') return 'Adding to wishlist...';
    if (endpoint.includes('/wishlists') && methodStr === 'PUT') return 'Updating wishlist...';
    if (endpoint.includes('/wishlists') && methodStr === 'DELETE') return 'Removing from wishlist...';

    // Admin operations
    if (endpoint.includes('/admin')) return 'Loading admin data...';

    // Reports
    if (endpoint.includes('/reports') && methodStr === 'POST') return 'Submitting report...';
    if (endpoint.includes('/reports') && methodStr === 'GET') return 'Loading reports...';

    // Notifications
    if (endpoint.includes('/notifications')) return 'Loading notifications...';

    // Vouches
    if (endpoint.includes('/vouches')) return 'Processing vouch...';

    // Default
    return 'Loading...';
  }

  // Auth methods
  async login(credentials: { username: string; password: string }, rememberMe: boolean = true) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    if (data?.token) {
      // Use the rememberMe parameter to determine storage type
      this.setToken(data.token, rememberMe);
      
      // Store user data in the same storage type
      const storage = rememberMe ? localStorage : sessionStorage;
      storage.setItem('bloxmarket-user', JSON.stringify(data.user));
      
      // Clean up the other storage to avoid conflicts
      const otherStorage = rememberMe ? sessionStorage : localStorage;
      otherStorage.removeItem('bloxmarket-user');
    }
    return data;
  }

  async register(userData: {
    username: string;
    email: string;
    password: string;
    robloxUsername?: string;
    messengerLink?: string;
  }) {
    const data = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    if (data?.token) {
      // For new registrations, default to persistent login (rememberMe = true)
      this.setToken(data.token, true);
      localStorage.setItem('bloxmarket-user', JSON.stringify(data.user));
    }
    return data;
  }

  async sendEmailVerification(email: string) {
    return this.request('/auth/send-email-verification', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async verifyEmailCode(email: string, code: string) {
    return this.request('/auth/verify-email-code', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    });
  }

  // Keep using the protected route that hits backend middleware auth.js
  async getCurrentUser() {
    return this.request('/auth/me', { method: 'GET' });
  }

  async logout() {
    await this.request('/auth/logout', {
      method: 'POST',
    });
    this.clearToken();
  }

  async logoutAll() {
    await this.request('/auth/logout-all', {
      method: 'POST',
    });
    this.clearToken();
  }

  // Note: User methods are defined at the end of the class

  // Trade methods
  async getTrades(params?: { page?: number; limit?: number; status?: string }) {
    const queryString = params ? new URLSearchParams(
      Object.entries(params).reduce((acc, [key, value]) => {
        if (value !== undefined) acc[key] = value.toString();
        return acc;
      }, {} as Record<string, string>)
    ).toString() : '';
    return this.request(`/trades?${queryString}`);
  }

  async getTrade(tradeId: string) {
    return this.request(`/trades/${tradeId}`);
  }

  async createTrade(tradeData: {
    itemOffered: string;
    itemRequested?: string;
    description?: string;
  }, images?: File[]) {
    console.log('Creating trade:', tradeData);
    
    const formData = new FormData();
    formData.append('itemOffered', tradeData.itemOffered);
    if (tradeData.itemRequested) {
      formData.append('itemRequested', tradeData.itemRequested);
    }
    if (tradeData.description) {
      formData.append('description', tradeData.description);
    }
    
    // Add images if provided
    if (images && images.length > 0) {
      images.forEach((image) => {
        formData.append('images', image);
      });
    }
    
    const token = localStorage.getItem('bloxmarket-token');
    const response = await fetch(`${API_BASE_URL}/trades`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to create trade');
    }
    
    return await response.json();
  }

  async uploadTradeImages(images: File[]) {
    const formData = new FormData();
    images.forEach((image) => {
      formData.append('images', image);
    });

    return this.request('/trades/upload-images', {
      method: 'POST',
      body: formData,
      headers: {
        // Remove Content-Type header to let browser set it with boundary for FormData
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
      },
    });
  }

  async deleteTradeImage(filename: string) {
    return this.request(`/trades/${filename}`, {
      method: 'DELETE',
    });
  }

  async updateTrade(
    tradeId: string,
    tradeData: { itemOffered: string; itemRequested?: string; description?: string }
  ) {
    // Send JSON; backend updateTrade expects camelCase fields
    return this.request(`/trades/${tradeId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        itemOffered: tradeData.itemOffered,
        itemRequested: tradeData.itemRequested,
        description: tradeData.description,
      }),
    });
  }

  async updateTradeStatus(tradeId: string, status: string) {
    console.log('Updating trade status:', tradeId, status);
    
    const token = localStorage.getItem('bloxmarket-token');
    const response = await fetch(`${API_BASE_URL}/trades/${tradeId}/status`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to update trade status');
    }
    
    return await response.json();
  }

  async deleteTrade(tradeId: string) {
    console.log('Deleting trade:', tradeId);
    
    const token = localStorage.getItem('bloxmarket-token');
    const response = await fetch(`${API_BASE_URL}/trades/${tradeId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to delete trade');
    }
    
    return await response.json();
  }

  async getUserTrades(userId: string) {
    console.log('Fetching trades for user:', userId);
    
    const token = localStorage.getItem('bloxmarket-token');
    const response = await fetch(`${API_BASE_URL}/trades/user/${userId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Get user trades error:', response.status, errorData);
      throw new Error(errorData.error || `Failed to fetch user trades: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('User trades data:', data);
    
    // Handle different response formats
    if (data.trades && Array.isArray(data.trades)) {
      return data.trades;
    } else if (Array.isArray(data)) {
      return data;
    } else if (data.data && Array.isArray(data.data)) {
      return data.data;
    }
    
    return [];
  }

  // Forum methods
  async getForumPosts(params?: { page?: number; limit?: number; category?: string }) {
    const queryString = params ? new URLSearchParams(
      Object.entries(params).reduce((acc, [key, value]) => {
        if (value !== undefined) acc[key] = value.toString();
        return acc;
      }, {} as Record<string, string>)
    ).toString() : '';
    return this.request(`/forum/posts?${queryString}`);
  }

  // Get single forum post with comments - FIXED
  async getForumPost(postId: string) {
    console.log('Fetching forum post:', postId); // Debug log
    
    const response = await fetch(`${API_BASE_URL}/forum/posts/${postId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.token || localStorage.getItem('bloxmarket-token')}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Get forum post error:', response.status, errorData);
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Forum post data:', data); // Debug log
    return data;
  }

  async createForumPost(postData: {
    title: string;
    content: string;
    category?: string;
  }, images?: File[]) {
    if (images && images.length > 0) {
      // Create FormData for image uploads
      const formData = new FormData();
      formData.append('title', postData.title);
      formData.append('content', postData.content);
      if (postData.category) {
        formData.append('category', postData.category);
      }
      
      // Add images to FormData
      images.forEach((image) => {
        formData.append('images', image);
      });
      
      return this.request('/forum/posts', {
        method: 'POST',
        body: formData,
      });
    } else {
      // No images, use regular JSON request
      return this.request('/forum/posts', {
        method: 'POST',
        body: JSON.stringify(postData),
      });
    }
  }

  async updateForumPost(postId: string, postData: {
    title: string;
    content: string;
    category?: string;
  }, images?: File[]) {
    if (images && images.length > 0) {
      // Create FormData for image uploads
      const formData = new FormData();
      formData.append('title', postData.title);
      formData.append('content', postData.content);
      if (postData.category) {
        formData.append('category', postData.category);
      }
      
      // Add images to FormData
      images.forEach((image) => {
        formData.append('images', image);
      });
      
      return this.request(`/forum/posts/${postId}`, {
        method: 'PUT',
        body: formData,
      });
    } else {
      // No images, use regular JSON request
      return this.request(`/forum/posts/${postId}`, {
        method: 'PUT',
        body: JSON.stringify(postData),
      });
    }
  }

  async deleteForumPost(postId: string) {
    return this.request(`/forum/posts/${postId}`, {
      method: 'DELETE',
    });
  }

  async getForumComments(postId: string) {
    console.log('Fetching forum comments for:', postId);
    
    const response = await fetch(`${API_BASE_URL}/forum/posts/${postId}/comments`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.token || localStorage.getItem('bloxmarket-token')}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Get forum comments error:', response.status, errorData);
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Forum comments data:', data);
    return data;
  }

  async getForumVotes(postId: string) {
    console.log('Fetching forum votes for:', postId);
    
    const response = await fetch(`${API_BASE_URL}/forum/posts/${postId}/votes`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.token || localStorage.getItem('bloxmarket-token')}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Get forum votes error:', response.status, errorData);
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Forum votes data:', data);
    return data;
  }

  // Add forum comment - FIXED
  async addForumComment(postId: string, content: string) {
    console.log('Adding comment:', { postId, content }); // Debug log
    
    const response = await fetch(`${API_BASE_URL}/forum/posts/${postId}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token || localStorage.getItem('bloxmarket-token')}`
      },
      body: JSON.stringify({ content })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Add comment error:', response.status, errorData);
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Comment response:', data); // Debug log
    return data;
  }

  // Forum voting - FIXED
  async voteForumPost(postId: string, voteType: 'up' | 'down') {
    console.log('Voting on post:', { postId, voteType }); // Debug log
    
    const response = await fetch(`${API_BASE_URL}/forum/posts/${postId}/vote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token || localStorage.getItem('bloxmarket-token')}`
      },
      body: JSON.stringify({ voteType })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Vote error:', response.status, errorData);
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Vote response:', data); // Debug log
    return data;
  }

  // Event methods
  async getEvents() {
    return this.request('/events');
  }

  async getEvent(eventId: string) {
    return this.request(`/events/${eventId}`);
  }

  async createEvent(eventData: {
    title: string;
    description: string;
    type: 'giveaway' | 'competition' | 'event';
    startDate: string;
    endDate: string;
    prizes?: string[];
    requirements?: string[];
    maxParticipants?: number;
  }, images?: File[]) {
    console.log('Creating event:', { eventData, imagesCount: images?.length || 0 });
    
    const formData = new FormData();
    
    // Add event data
    Object.entries(eventData).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          // Handle arrays (prizes, requirements)
          formData.append(key, value.join(', '));
        } else {
          formData.append(key, value.toString());
        }
      }
    });
    
    // Add images
    if (images && images.length > 0) {
      images.forEach(image => {
        formData.append('images', image);
      });
    }
    
    const response = await fetch(`${API_BASE_URL}/events`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token || localStorage.getItem('bloxmarket-token')}`
        // Don't set Content-Type - let browser set it for FormData
      },
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Create event error:', response.status, errorData);
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Create event response:', data);
    return data;
  }

  async updateEvent(eventId: string, eventData: {
    title: string;
    description: string;
    type: 'giveaway' | 'competition' | 'event';
    startDate: string;
    endDate: string;
    prizes?: string[];
    requirements?: string[];
    maxParticipants?: number;
  }, images?: File[], removeImages?: string[]) {
    console.log('Updating event:', { eventId, eventData, imagesCount: images?.length || 0, removeImages });
    
    const formData = new FormData();
    
    // Add event data
    Object.entries(eventData).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          formData.append(key, value.join(', '));
        } else {
          formData.append(key, value.toString());
        }
      }
    });
    
    // Add images to remove
    if (removeImages && removeImages.length > 0) {
      removeImages.forEach(filename => {
        formData.append('removeImages', filename);
      });
    }
    
    // Add new images
    if (images && images.length > 0) {
      images.forEach(image => {
        formData.append('images', image);
      });
    }
    
    const response = await fetch(`${API_BASE_URL}/events/${eventId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${this.token || localStorage.getItem('bloxmarket-token')}`
      },
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Update event error:', response.status, errorData);
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Update event response:', data);
    return data;
  }

  async deleteEvent(eventId: string) {
    return this.request(`/events/${eventId}`, {
      method: 'DELETE'
    });
  }

  // Update the deleteEvent method to use the admin endpoint
  async deleteEventAdmin(eventId: string) {
    return await this.request(`/admin/datatables/events/${eventId}`, {
      method: 'DELETE'
    });
  }

  async joinEvent(eventId: string) {
    return this.request(`/events/${eventId}/join`, {
      method: 'POST',
    });
  }

  async leaveEvent(eventId: string) {
    return this.request(`/events/${eventId}/leave`, {
      method: 'POST',
    });
  }

  // User profile methods
  // getCurrentUser() is already defined above

  async getUserProfile(userId: string) {
    return this.request(`/users/${userId}`);
  }

  async updateProfile(profileData: {
    username?: string;
    robloxUsername?: string;
    bio?: string;
    discordUsername?: string;
    messengerLink?: string;
    website?: string;
    location?: string;
    currentPassword?: string;
    newPassword?: string;
  }) {
    return this.request('/users/me', {
      method: 'PATCH',
      body: JSON.stringify(profileData),
    });
  }

  async uploadAvatar(avatarFile: File) {
    const formData = new FormData();
    formData.append('avatar', avatarFile);
    
    return this.request('/users/avatar', {
      method: 'POST',
      body: formData,
    });
  }

  async searchUsers(query: string, limit?: number) {
    const params = limit ? `?limit=${limit}` : '';
    return this.request(`/users/search/${encodeURIComponent(query)}${params}`);
  }

  async getUserWishlist(userId: string) {
    return this.request(`/users/${userId}/wishlist`);
  }

  async addToWishlist(itemName: string) {
    return this.request('/users/wishlist', {
      method: 'POST',
      body: JSON.stringify({ itemName }),
    });
  }

  async removeFromWishlist(wishlistId: string) {
    return this.request(`/users/wishlist/${wishlistId}`, {
      method: 'DELETE',
    });
  }

  // Admin methods
  async getAdminStats() {
    return this.request('/admin/stats');
  }
    async getAdminAnalytics(days: number = 7) {
    return this.request(`/admin/analytics?days=${days}`);
  }

  async getUsers(params: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    status?: string;
  }) {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.search) queryParams.append('search', params.search);
    if (params.role) queryParams.append('role', params.role);
    if (params.status) queryParams.append('status', params.status);

    return this.request(`/admin/users?${queryParams.toString()}`);
  }

  async updateUserRole(userId: string, role: string) {
    return this.request(`/admin/users/${userId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role })
    });
  }

  async banUser(userId: string, action: 'ban' | 'unban', reason?: string) {
    return this.request(`/admin/users/${userId}/ban`, {
      method: 'PATCH',
      body: JSON.stringify({ action, reason })
    });
  }

  async updateUserStatus(userId: string, action: 'activate' | 'deactivate', reason?: string) {
    return this.request(`/admin/users/${userId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ action, reason })
    });
  }

  // Verification/Middleman Routes
  async getVerificationRequests() {
    return this.request('/verification/applications');
  }

  async approveVerification(userId: string) {
    return this.request(`/verification/applications/${userId}/review`, {
      method: 'POST',
      body: JSON.stringify({ action: 'approve' })
    });
  }

  async rejectVerification(userId: string, reason?: string) {
    return this.request(`/verification/applications/${userId}/review`, {
      method: 'POST',
      body: JSON.stringify({ action: 'reject', reason })
    });
  }

  async getMiddlemen() {
    return this.request('/verification/middlemen');
  }

  async getApplicationStatus() {
    return this.request('/verification/my-application');
  }

  async applyForMiddleman(applicationData: {
    experience: string;
    availability: string;
    why_middleman: string;
    referral_codes?: string;
    external_links?: string;
    preferred_trade_types?: string;
  }, documents?: File[]) {
    try {
      console.log('Preparing application with documents:', documents?.length || 0);
      
      const formData = new FormData();
      
      // Add application data
      Object.entries(applicationData).forEach(([key, value]) => {
        if (value) {
          console.log(`Adding field ${key}`);
          formData.append(key, value);
        }
      });
      
      // Add documents if provided
      if (documents && documents.length > 0) {
        documents.forEach((doc) => {
          console.log(`Adding document: ${doc.name} (${doc.size} bytes)`);
          formData.append('documents', doc);
        });
        
        // Additional logging to check formData contents
        console.log('FormData entries:');
        for (const [key, value] of formData.entries()) {
          console.log(`- ${key}: ${value instanceof File ? `File: ${value.name}` : value}`);
        }
      }
      
      // Direct fetch implementation to better handle FormData
      const url = `${API_BASE_URL}/verification/apply`;
      const token = this.token || localStorage.getItem('bloxmarket-token');
      
      console.log('Submitting to:', url);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
          // Don't set Content-Type for FormData
        },
        body: formData
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Application submission failed:', response.status, errorText);
        let errorMessage = 'Failed to submit application';
        
        try {
          const errorData = JSON.parse(errorText);
          if (errorData && errorData.error) {
            errorMessage = errorData.error;
          }
        } catch {
          // If we can't parse JSON, use the raw text if it exists
          if (errorText) {
            errorMessage = errorText;
          }
        }
        
        throw new Error(errorMessage);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error in applyForMiddleman:', error);
      throw error;
    }
  }
  
  async uploadFaceImages(faceImages: File[]) {
    try {
      console.log('Uploading face images:', faceImages.length);
      
      const formData = new FormData();
      
      // Add face images
      faceImages.forEach((image, index) => {
        console.log(`Adding face image ${index + 1}: ${image.name} (${image.size} bytes)`);
        formData.append('faceImages', image);
      });
      
      // Direct fetch implementation for face uploads
      const url = `${API_BASE_URL}/verification/upload-face`;
      const token = this.token || localStorage.getItem('bloxmarket-token');
      
      console.log('Uploading face images to:', url);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Face upload failed:', response.status, errorText);
        let errorMessage = 'Failed to upload face images';
        
        try {
          const errorData = JSON.parse(errorText);
          if (errorData && errorData.error) {
            errorMessage = errorData.error;
          }
        } catch {
          if (errorText) {
            errorMessage = errorText;
          }
        }
        
        throw new Error(errorMessage);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error in uploadFaceImages:', error);
      throw error;
    }
  }
  
  async getDocumentUrl(documentId: string) {
    return `${API_BASE_URL}/verification/documents/${documentId}`;
  }

  // Utility methods
  setToken(token: string, rememberMe: boolean = true) {
    this.token = token;
    
    // Store in the appropriate storage based on remember me preference
    if (rememberMe) {
      localStorage.setItem('bloxmarket-token', token);
      // Clean up any token in session storage to avoid confusion
      sessionStorage.removeItem('bloxmarket-token');
    } else {
      sessionStorage.setItem('bloxmarket-token', token);
      // Clean up any token in local storage to avoid confusion
      localStorage.removeItem('bloxmarket-token');
    }
    
    console.log(`Token set in ApiService (${rememberMe ? 'persistent' : 'session'} storage)`);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('bloxmarket-token');
    sessionStorage.removeItem('bloxmarket-token');
    console.log('Token cleared from ApiService');
  }

  isAuthenticated(): boolean {
    return !!(this.token || localStorage.getItem('bloxmarket-token'));
  }

  // Get trade comments
  async getTradeComments(tradeId: string) {
    console.log('Fetching trade comments:', tradeId);
    
    const response = await fetch(`${API_BASE_URL}/trades/${tradeId}/comments`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.token || localStorage.getItem('bloxmarket-token')}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Get trade comments error:', response.status, errorData);
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Trade comments data:', data);
    return data;
  }

  // Add trade comment
  async addTradeComment(tradeId: string, content: string) {
    console.log('Adding trade comment:', { tradeId, content });
    
    const response = await fetch(`${API_BASE_URL}/trades/${tradeId}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token || localStorage.getItem('bloxmarket-token')}`
      },
      body: JSON.stringify({ content })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Add trade comment error:', response.status, errorData);
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Trade comment response:', data);
    return data;
  }

  // Get trade votes
  async getTradeVotes(tradeId: string) {
    console.log('Fetching trade votes:', tradeId);
    
    const response = await fetch(`${API_BASE_URL}/trades/${tradeId}/votes`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.token || localStorage.getItem('bloxmarket-token')}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Get trade votes error:', response.status, errorData);
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Trade votes data:', data);
    return data;
  }

  // Vote on trade post
  async voteTradePost(tradeId: string, voteType: 'up' | 'down') {
    console.log('Voting on trade:', { tradeId, voteType });
    
    const response = await fetch(`${API_BASE_URL}/trades/${tradeId}/vote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token || localStorage.getItem('bloxmarket-token')}`
      },
      body: JSON.stringify({ voteType })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Vote trade error:', response.status, errorData);
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Trade vote response:', data);
    return data;
  }

  // Event voting methods
  async getEventVotes(eventId: string) {
    console.log('Fetching event votes:', eventId);
    
    const response = await fetch(`${API_BASE_URL}/events/${eventId}/votes`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.token || localStorage.getItem('bloxmarket-token')}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Get event votes error:', response.status, errorData);
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Event votes data:', data);
    return data;
  }

  async voteEvent(eventId: string, voteType: 'up' | 'down') {
    console.log('Voting on event:', { eventId, voteType });
    
    const response = await fetch(`${API_BASE_URL}/events/${eventId}/vote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token || localStorage.getItem('bloxmarket-token')}`
      },
      body: JSON.stringify({ voteType })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Vote event error:', response.status, errorData);
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Event vote response:', data);
    return data;
  }

  // Event comment methods
  async getEventComments(eventId: string) {
    console.log('Fetching event comments:', eventId);
    
    const response = await fetch(`${API_BASE_URL}/events/${eventId}/comments`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.token || localStorage.getItem('bloxmarket-token')}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Get event comments error:', response.status, errorData);
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Event comments data:', data);
    return data;
  }

  async addEventComment(eventId: string, content: string) {
    console.log('Adding event comment:', { eventId, content });
    
    const response = await fetch(`${API_BASE_URL}/events/${eventId}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token || localStorage.getItem('bloxmarket-token')}`
      },
      body: JSON.stringify({ content })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Add event comment error:', response.status, errorData);
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Event comment response:', data);
    return data;
  }

  async getUserTradeHistory(userId: string) {
    console.log('Fetching trade history for user:', userId);
    
    try {
      const token = localStorage.getItem('bloxmarket-token');
      const response = await fetch(`${API_BASE_URL}/trades/user/${userId}/history`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        // Handle 404 specifically for missing routes
        if (response.status === 404) {
          console.warn('Trade history endpoint not implemented yet, returning empty array');
          return [];
        }
        
        const errorData = await response.json().catch(() => ({}));
        console.error('Get user trade history error:', response.status, errorData);
        throw new Error(errorData.error || `Failed to fetch user trade history: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('User trade history data:', data);
      
      // Handle different response formats
      if (data.trades && Array.isArray(data.trades)) {
        return data.trades;
      } else if (Array.isArray(data)) {
        return data;
      } else if (data.data && Array.isArray(data.data)) {
        return data.data;
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching user trade history:', error);
      // Return empty array instead of throwing for missing endpoints
      if (error instanceof Error && (error.message.includes('Route not found') || error.message.includes('404'))) {
        console.warn('Trade history endpoint not available, returning empty data');
        return [];
      }
      throw error;
    }
  }

  async getUserForumPosts(userId: string) {
    console.log('Fetching forum posts for user:', userId);
    
    try {
      const token = localStorage.getItem('bloxmarket-token');
      const response = await fetch(`${API_BASE_URL}/forum/user/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        // Handle 404 specifically for missing routes
        if (response.status === 404) {
          console.warn('User forum posts endpoint not implemented yet, returning empty array');
          return [];
        }
        
        const errorData = await response.json().catch(() => ({}));
        console.error('Get user forum posts error:', response.status, errorData);
        throw new Error(errorData.error || `Failed to fetch user forum posts: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('User forum posts data:', data);
      
      // Handle different response formats
      if (data.posts && Array.isArray(data.posts)) {
        return data.posts;
      } else if (Array.isArray(data)) {
        return data;
      } else if (data.data && Array.isArray(data.data)) {
        return data.data;
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching user forum posts:', error);
      // Return empty array instead of throwing for missing endpoints
      if (error instanceof Error && (error.message.includes('Route not found') || error.message.includes('404'))) {
        console.warn('User forum posts endpoint not available, returning empty data');
        return [];
      }
      throw error;
    }
  }

  // Fetch all forum posts (for fallback filtering) - Replacing the duplicate method
  async getAllForumPosts(params: { page?: number; limit?: number; search?: string; category?: string } = {}) {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') qs.append(k, String(v));
    });
    const endpoint = `/forum/posts${qs.toString() ? `?${qs.toString()}` : ''}`;
    const data = await this.request(endpoint, { method: 'GET' });
    if (Array.isArray(data)) return data;
    if (Array.isArray((data as Record<string, unknown>)?.posts)) return (data as Record<string, unknown[]>).posts;
    if (Array.isArray((data as Record<string, unknown>)?.data)) return (data as Record<string, unknown[]>).data;
    return [];
  }

  // Events Management (Admin DataTables) - Add these methods before the closing brace of the class
  async getEventsDataTable(params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    type?: string;
    sortBy?: string;
    sortOrder?: string;
  }) {
    const queryParams = new URLSearchParams();
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          queryParams.append(key, String(value));
        }
      });
    }
    
    const response = await this.request(`/admin/datatables/events?${queryParams.toString()}`);
    return response;
  }

  async getEventDetailsAdmin(eventId: string) {
    const response = await this.request(`/admin/datatables/events/${eventId}`);
    return response.event;
  }

  async bulkDeleteEvents(eventIds: string[]) {
    return await this.request('/admin/datatables/events/bulk/delete', {
      method: 'POST',
      body: JSON.stringify({ eventIds })
    });
  }

  async getEventStatistics() {
    return await this.request('/admin/datatables/events/statistics');
  }

  async exportEventsCSV(status?: string, type?: string) {
    const queryParams = new URLSearchParams();
    if (status) queryParams.append('status', status);
    if (type) queryParams.append('type', type);
    
    const queryString = queryParams.toString();
    const token = localStorage.getItem('bloxmarket-token');
    
    const response = await fetch(
      `${API_BASE_URL}/admin/datatables/events/export/csv${queryString ? '?' + queryString : ''}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        },
      }
    );
    
    if (!response.ok) {
      throw new Error('Failed to export events');
    }
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `events-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  // Forum Management (Admin DataTables)
  async getForumPostsDataTable(params?: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    sortBy?: string;
    sortOrder?: string;
  }) {
    const queryParams = new URLSearchParams();
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          queryParams.append(key, String(value));
        }
      });
    }
    
    const response = await this.request(`/admin/datatables/forum?${queryParams.toString()}`);
    return response;
  }

  async getForumPostDetailsAdmin(postId: string) {
    const response = await this.request(`/admin/datatables/forum/${postId}`);
    return response.post;
  }

  async deleteForumPostAdmin(postId: string) {
    return await this.request(`/admin/datatables/forum/${postId}`, {
      method: 'DELETE'
    });
  }

  async bulkDeleteForumPosts(postIds: string[]) {
    return await this.request('/admin/datatables/forum/bulk/delete', {
      method: 'POST',
      body: JSON.stringify({ postIds })
    });
  }

  async getForumStatistics() {
    return await this.request('/admin/datatables/forum/statistics');
  }

  async exportForumPostsCSV(category?: string) {
    const queryParams = category ? `?category=${category}` : '';
    const token = localStorage.getItem('bloxmarket-token');
    
    const response = await fetch(
      `${API_BASE_URL}/admin/datatables/forum/export/csv${queryParams}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        },
      }
    );
    
    if (!response.ok) {
      throw new Error('Failed to export forum posts');
    }
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `forum-posts-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  // Trading Post Management (Admin DataTables) - Add before closing brace
  async getTradingPostsDataTable(params?: {
    page?: number;
    limit?: number;
    search?: string;
    type?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: string;
  }) {
    const queryParams = new URLSearchParams();
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          queryParams.append(key, String(value));
        }
      });
    }
    
    const response = await this.request(`/admin/datatables/trading-posts?${queryParams.toString()}`);
    return response;
  }

  async getTradingPostDetailsAdmin(postId: string) {
    const response = await this.request(`/admin/datatables/trading-posts/${postId}`);
    return response.post;
  }

  async deleteTradingPostAdmin(postId: string) {
    return await this.request(`/admin/datatables/trading-posts/${postId}`, {
      method: 'DELETE'
    });
  }

  async moderateTradingPost(postId: string, action: string, reason?: string) {
    return await this.request(`/admin/datatables/trading-posts/${postId}/moderate`, {
      method: 'PATCH',
      body: JSON.stringify({ action, reason })
    });
  }

  async bulkDeleteTradingPosts(postIds: string[]) {
    return await this.request('/admin/datatables/trading-posts/bulk/delete', {
      method: 'POST',
      body: JSON.stringify({ postIds })
    });
  }

  async getTradingPostStatistics() {
    return await this.request('/admin/datatables/trading-posts/statistics');
  }

  async exportTradingPostsCSV(status?: string, type?: string) {
    const queryParams = new URLSearchParams();
    if (status) queryParams.append('status', status);
    if (type) queryParams.append('type', type);
    
    const queryString = queryParams.toString();
    const token = localStorage.getItem('bloxmarket-token');
    
    const response = await fetch(
      `${API_BASE_URL}/admin/datatables/trading-posts/export/csv${queryString ? '?' + queryString : ''}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        },
      }
    );
    
    if (!response.ok) {
      throw new Error('Failed to export trading posts');
    }
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trading-posts-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  // Wishlist endpoints
  async getWishlists(params?: Record<string, string | number>) {
    const queryString = params 
      ? '?' + Object.entries(params)
          .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
          .join('&')
      : '';
    
    return this.request(`/wishlists${queryString}`);
  }

  async getWishlistById(wishlistId: string) {
    return this.request(`/wishlists/${wishlistId}`);
  }

  async createWishlist(data: {
    item_name: string;
    description: string;
    max_price: string;
    category: string;
    priority: 'high' | 'medium' | 'low';
  }) {
    // Add token check
    const token = localStorage.getItem('token');
    console.log('Creating wishlist with token:', token ? 'Token exists' : 'No token');
    
    return this.request('/wishlists', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateWishlist(wishlistId: string, data: {
    item_name: string;
    description: string;
    max_price: string;
    category: string;
    priority: 'high' | 'medium' | 'low';
  }) {
    return this.request(`/wishlists/${wishlistId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async deleteWishlist(wishlistId: string) {
    return this.request(`/wishlists/${wishlistId}`, {
      method: 'DELETE'
    });
  }

  // Wishlist comments
  async getWishlistComments(wishlistId: string) {
    try {
      console.log('Fetching comments for wishlist:', wishlistId);
      const response = await this.request(`/wishlists/${wishlistId}/comments`);
      console.log('Comment fetch response:', response);
      return response;
    } catch (error) {
      console.error('Error in getWishlistComments:', error);
      throw error;
    }
  }

  async addWishlistComment(wishlistId: string, content: string) {
    try {
      console.log('Adding comment to wishlist:', wishlistId, 'Content:', content);
      const token = localStorage.getItem('bloxmarket-token');
      console.log('Using token:', token ? 'Present' : 'Missing');
      
      const response = await this.request(`/wishlists/${wishlistId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content })
      });
      
      console.log('Comment add response:', response);
      return response;
    } catch (error) {
      console.error('Error in addWishlistComment:', error);
      throw error;
    }
  }

  // Wishlist votes
  async getWishlistVotes(wishlistId: string) {
    return this.request(`/wishlists/${wishlistId}/votes`);
  }

  async voteWishlist(wishlistId: string, voteType: 'up' | 'down') {
    return this.request(`/wishlists/${wishlistId}/vote`, {
      method: 'POST',
      body: JSON.stringify({ voteType })
    });
  }

  // Wishlist images
  async createWishlistWithImages(data: {
    item_name: string;
    description: string;
    max_price: string;
    category: string;
    priority: 'high' | 'medium' | 'low';
  }, images?: File[]) {
    const formData = new FormData();
    
    // Add wishlist data
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, value.toString());
      }
    });
    
    // Add images
    if (images && images.length > 0) {
      images.forEach(image => {
        formData.append('images', image);
      });
    }
    
    return this.request('/wishlists', {
      method: 'POST',
      body: formData,
    });
  }

  async uploadWishlistImages(wishlistId: string, images: File[]) {
    const formData = new FormData();
    images.forEach(image => {
      formData.append('images', image);
    });
    
    return this.request(`/wishlists/${wishlistId}/images`, {
      method: 'POST',
      body: formData,
    });
  }

  async deleteWishlistImage(wishlistId: string, filename: string) {
    return this.request(`/wishlists/${wishlistId}/images/${filename}`, {
      method: 'DELETE'
    });
  }

  // Admin Wishlist Datatable endpoints
  async getWishlistsAdmin(params?: Record<string, string | number>) {
    const queryString = params 
      ? `?${new URLSearchParams(params as Record<string, string>).toString()}` 
      : '';
    return this.request(`/admin/datatables/wishlists${queryString}`);
  }

  async getWishlistStatistics() {
    return this.request('/admin/datatables/wishlists/stats/overview');
  }

  async moderateWishlist(wishlistId: string, action: string, reason?: string) {
    return this.request(`/admin/datatables/wishlists/${wishlistId}/moderate`, {
      method: 'PATCH',
      body: JSON.stringify({ action, reason })
    });
  }

  async deleteWishlistAdmin(wishlistId: string) {
    return this.request(`/admin/datatables/wishlists/${wishlistId}`, {
      method: 'DELETE'
    });
  }

  async bulkDeleteWishlists(wishlistIds: string[]) {
    return this.request('/admin/datatables/wishlists/bulk-delete', {
      method: 'POST',
      body: JSON.stringify({ wishlistIds })
    });
  }

  async exportWishlistsCSV(params?: Record<string, string>) {
    const queryString = params 
      ? `?${new URLSearchParams(params).toString()}` 
      : '';
    return this.request(`/admin/datatables/wishlists/export/csv${queryString}`, {
      method: 'GET',
      headers: {
        'Accept': 'text/csv'
      }
    });
  }

  // Report methods
  async createReport(reportData: {
    post_id: string;
    post_type: 'trade' | 'forum' | 'event' | 'wishlist' | 'user';
    reason: string;
    type?: 'Scamming' | 'Harassment' | 'Inappropriate Content' | 'Spam' | 'Impersonation' | 'Other';
  }) {
    return this.request('/reports', {
      method: 'POST',
      body: JSON.stringify(reportData)
    });
  }

  async getReports(params?: {
    page?: number;
    limit?: number;
    status?: string;
    post_type?: string;
  }) {
    const queryParams = new URLSearchParams();
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          queryParams.append(key, String(value));
        }
      });
    }
    
    const response = await this.request(`/reports?${queryParams.toString()}`);
    return response;
  }

  async updateReportStatus(reportId: string, status: 'pending' | 'reviewed' | 'resolved', reviewNotes?: string) {
    return this.request(`/reports/${reportId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({
        status,
        review_notes: reviewNotes
      })
    });
  }

  async deleteReport(reportId: string) {
    return this.request(`/reports/${reportId}`, {
      method: 'DELETE'
    });
  }

  async getReportStats() {
    return this.request('/reports/stats/overview');
  }

  // Reports datatable methods
  async getReportsDataTable(params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    type?: string;
    post_type?: string;
    sortBy?: string;
    sortOrder?: string;
  }) {
    const queryParams = new URLSearchParams();
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          queryParams.append(key, String(value));
        }
      });
    }
    
    const response = await this.request(`/admin/datatables/reports?${queryParams.toString()}`);
    return response;
  }

  async updateReportStatusAdmin(reportId: string, status: 'pending' | 'reviewed' | 'resolved', reviewNotes?: string) {
    return await this.request(`/admin/datatables/reports/${reportId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({
        status,
        review_notes: reviewNotes
      })
    });
  }

  async deleteReportAdmin(reportId: string) {
    return await this.request(`/admin/datatables/reports/${reportId}`, {
      method: 'DELETE'
    });
  }

  async bulkUpdateReportStatus(reportIds: string[], status: 'pending' | 'reviewed' | 'resolved', reviewNotes?: string) {
    return await this.request('/admin/datatables/reports/bulk/status', {
      method: 'POST',
      body: JSON.stringify({ reportIds, status, review_notes: reviewNotes })
    });
  }

  async getReportsStats() {
    return await this.request('/admin/datatables/reports/stats');
  }

  async exportReportsCSV(filters?: Record<string, string>) {
    const queryString = filters 
      ? `?${new URLSearchParams(filters).toString()}` 
      : '';
    return this.request(`/admin/datatables/reports/export/csv${queryString}`, {
      method: 'GET',
      headers: {
        'Accept': 'text/csv'
      }
    });
  }

  // Reports penalty methods
  async issueUserPenalty(userId: string, penaltyType: 'warning' | 'suspension' | 'ban' | 'deactivation', reason: string, duration?: number) {
    return await this.request(`/admin/datatables/users/${userId}/penalty`, {
      method: 'POST',
      body: JSON.stringify({
        type: penaltyType,
        reason,
        ...(duration && { duration })
      })
    });
  }

  async banUserAdmin(userId: string, action: 'ban' | 'unban', reason?: string) {
    return await this.request(`/admin/datatables/users/${userId}/ban`, {
      method: 'POST',
      body: JSON.stringify({ action, reason })
    });
  }

  async updateUserStatusAdmin(userId: string, action: 'activate' | 'deactivate', reason?: string) {
    return await this.request(`/admin/datatables/users/${userId}/status`, {
      method: 'POST',
      body: JSON.stringify({ action, reason })
    });
  }

  // Reports post deletion methods
  async deleteReportedPost(postType: string, postId: string) {
    const endpoints = {
      trade: `/admin/datatables/trading-posts/${postId}`,
      forum: `/admin/datatables/forum/${postId}`,
      event: `/admin/datatables/events/${postId}`,
      wishlist: `/admin/datatables/wishlists/${postId}`
    };

    const endpoint = endpoints[postType as keyof typeof endpoints];
    if (!endpoint) {
      throw new Error(`Unsupported post type: ${postType}`);
    }

    return await this.request(endpoint, {
      method: 'DELETE'
    });
  }

  // Vouch methods
  async vouchForTrade(tradeId: string) {
    return this.request(`/vouches/trade/${tradeId}`, {
      method: 'POST'
    });
  }

  async unvouchForTrade(tradeId: string) {
    return this.request(`/vouches/trade/${tradeId}`, {
      method: 'DELETE'
    });
  }

  async getTradeVouches(tradeId: string) {
    return this.request(`/vouches/trade/${tradeId}`);
  }

  async hasUserVouchedForTrade(tradeId: string) {
    return this.request(`/vouches/trade/${tradeId}/check`);
  }

  // Middleman vouch methods
  async vouchForMiddleman(middlemanId: string, rating: number, comment?: string) {
    return this.request(`/verification/middlemen/${middlemanId}/vouch`, {
      method: 'POST',
      body: JSON.stringify({ rating, comment })
    });
  }

  async unvouchForMiddleman(middlemanId: string) {
    return this.request(`/verification/middlemen/${middlemanId}/vouch`, {
      method: 'DELETE'
    });
  }

  async getMiddlemanVouches(middlemanId: string) {
    return this.request(`/verification/middlemen/${middlemanId}/vouches`);
  }

  async hasUserVouchedForMiddleman(middlemanId: string) {
    return this.request(`/verification/middlemen/${middlemanId}/vouch-status`);
  }

  // Notification methods
  async getNotifications(params?: { page?: number; limit?: number; unreadOnly?: boolean }) {
    const queryParams = new URLSearchParams();
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && (typeof value !== 'string' || value !== '')) {
          queryParams.append(key, String(value));
        }
      });
    }
    
    return this.request(`/notifications?${queryParams.toString()}`);
  }

  async markNotificationAsRead(notificationId: string) {
    return this.request(`/notifications/${notificationId}/read`, {
      method: 'PATCH'
    });
  }

  async markAllNotificationsAsRead() {
    return this.request('/notifications/read-all', {
      method: 'PATCH'
    });
  }

  async getUnreadNotificationCount() {
    return this.request('/notifications/unread/count');
  }

  async deleteNotification(notificationId: string) {
    return this.request(`/notifications/${notificationId}`, {
      method: 'DELETE'
    });
  }

  // Middleman Verification DataTable methods
  async getMiddlemanVerificationDataTable(params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: string;
  }) {
    const queryParams = new URLSearchParams();

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          queryParams.append(key, String(value));
        }
      });
    }

    const response = await this.request(`/admin/datatables/verification?${queryParams.toString()}`);
    return response;
  }

  async approveMiddlemanApplication(applicationId: string) {
    return await this.request(`/admin/datatables/verification/${applicationId}/approve`, {
      method: 'PUT'
    });
  }

  async rejectMiddlemanApplication(applicationId: string, reason: string) {
    return await this.request(`/admin/datatables/verification/${applicationId}/reject`, {
      method: 'PUT',
      body: JSON.stringify({ reason })
    });
  }

  async getMiddlemanApplicationDetails(applicationId: string) {
    const response = await this.request(`/admin/datatables/verification/${applicationId}`);
    return response.application;
  }

  async bulkUpdateMiddlemanApplications(applicationIds: string[], action: 'approve' | 'reject', reason?: string) {
    return await this.request('/admin/datatables/verification/bulk', {
      method: 'POST',
      body: JSON.stringify({ applicationIds, action, reason })
    });
  }

  async exportMiddlemanVerificationCSV(status?: string) {
    const queryParams = new URLSearchParams();
    if (status) queryParams.append('status', status);

    const queryString = queryParams.toString();
    const token = localStorage.getItem('bloxmarket-token');

    const response = await fetch(
      `${API_BASE_URL}/admin/datatables/verification/export${queryString ? '?' + queryString : ''}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to export middleman verification data');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `middleman-verification-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }
}

export const apiService = new ApiService();