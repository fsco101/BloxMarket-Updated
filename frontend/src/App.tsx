import React, { createContext, useContext, useState, useEffect, Component } from 'react';
import { PostModal } from './components/ui/post-modal';
import type { PostModalPost } from './components/ui/post-modal';
import type { ErrorInfo, ReactNode } from 'react';
import { Sidebar } from './components/Sidebar';
import { AuthPage } from './components/AuthPage';
import { LandingPage } from './components/LandingPage';
import { Dashboard } from './components/Dashboard';
import { TradingHub } from './components/TradingHub';
import { Wishlist } from './components/Wishlist';
import { MiddlemanDirectory } from './components/MiddlemanDirectory';
import { Forums } from './components/Forums';
import { NewUserProfile } from './components/NewUserProfile';
import { ProfileView } from './components/ProfileView';
import { AdminPanel } from './components/AdminPanel';
import { EventsGiveaways } from './components/EventsGiveaways';
import { apiService, setGlobalLoadingManager } from './services/api';
import { MyForumPosts } from './components/user/MyForumPosts';
import { MyTradePosts } from './components/user/MyTradePosts';
import { MyWishlist } from './components/user/MyWishlist';
import { NotificationsPage } from './components/NotificationsPage';
import { Messenger } from './components/Messenger';
import { Toaster } from './components/Toaster';
import { RateLimitListener } from './components/RateLimitListener';
import { GlobalLoadingProvider } from './contexts/GlobalLoadingContext';
import GlobalLoader from './components/GlobalLoader';
import GlobalLoadingSetup from './components/GlobalLoadingSetup';
import { Footer } from './components/ui/footer';
import { Header } from './components/ui/header';

// Error Boundary Component
interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900">
          <div className="text-center p-8">
            <div className="text-red-500 mb-4">
              <svg className="w-16 h-16 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L4.316 15.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
            <p className="text-muted-foreground mb-4">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Theme Context
const ThemeContext = createContext<{
  isDark: boolean;
  toggleTheme: () => void;
}>({
  isDark: false,
  toggleTheme: () => {}
});

export const useTheme = () => useContext(ThemeContext);

// Auth Context
interface User {
  id: string;
  username: string;
  email: string;
  role?: string;
  verified?: boolean;
  [key: string]: unknown;
}

const AuthContext = createContext<{
  user: User | null;
  login: (userData: User, rememberMe?: boolean) => void;
  logout: () => Promise<void>;
  isLoggedIn: boolean;
  isLoading: boolean;
  isLoggingOut: boolean;
}>({
  user: null,
  login: () => {},
  logout: async () => {},
  isLoggedIn: false,
  isLoading: true,
  isLoggingOut: false
});

export const useAuth = () => useContext(AuthContext);

// App Context for navigation
const AppContext = createContext<{
  currentPage: string;
  setCurrentPage: (page: string) => void;
}>({
  currentPage: 'dashboard',
  setCurrentPage: () => {}
});

export const useApp = () => useContext(AppContext);

export default function App() {
  // Load theme preference from localStorage, default to false (light mode)
  const [isDark, setIsDark] = useState(() => {
    const savedTheme = localStorage.getItem('bloxmarket-theme');
    return savedTheme === 'dark';
  });
  const [currentPage, setCurrentPage] = useState('landing');
  const [user, setUser] = useState<User | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // State for rate limit notifications
  const [rateLimitNotification, setRateLimitNotification] = useState<{
    visible: boolean;
    message: string;
    retryAfter: number;
  }>({
    visible: false,
    message: '',
    retryAfter: 0
  });

  useEffect(() => {
    let isAuthInitializing = false;

    const initAuth = async () => {
      // Prevent multiple concurrent auth initializations
      if (isAuthInitializing) {
        console.log('Auth initialization already in progress, skipping...');
        return;
      }
      
      isAuthInitializing = true;

      try {
        // Check both storage types for tokens and user data
        const localToken = localStorage.getItem('bloxmarket-token');
        const sessionToken = sessionStorage.getItem('bloxmarket-token');
        const token = localToken || sessionToken;
        
        const localUser = localStorage.getItem('bloxmarket-user');
        const sessionUser = sessionStorage.getItem('bloxmarket-user');
        const storedUser = localUser || sessionUser;
        
        // Determine which storage to use for later operations
        const isPersistentLogin = !!localToken;

        if (token) {
          // Set token using the appropriate storage type
          apiService.setToken(token, isPersistentLogin);

          if (storedUser) {
            try {
              const u = JSON.parse(storedUser);
              setUser(u);
              setIsLoggedIn(true);
            } catch {
              // Clear from the appropriate storage
              if (isPersistentLogin) {
                localStorage.removeItem('bloxmarket-user');
              } else {
                sessionStorage.removeItem('bloxmarket-user');
              }
            }
          }

          try {
            const me = await apiService.getCurrentUser() as User;
            setUser(me);
            setIsLoggedIn(true);
            setCurrentPage('landing');
            
            // Save to the appropriate storage
            const storage = isPersistentLogin ? localStorage : sessionStorage;
            storage.setItem('bloxmarket-user', JSON.stringify(me));
          } catch (err) {
            // Keep UI; actual auth errors will dispatch 'auth-expired'
            console.warn('Token verify failed:', err);
          }
        } else {
          setCurrentPage('landing');
        }
      } finally {
        setIsLoading(false);
        isAuthInitializing = false;
      }
    };

    const onExpired = () => handleLogout();
    
    // Handle rate limit exceeded events
    const onRateLimitExceeded = (event: Event) => {
      const customEvent = event as CustomEvent<{ retryAfter: number }>;
      const retryAfter = customEvent.detail.retryAfter || 60;
      const minutes = Math.ceil(retryAfter / 60);
      
      setRateLimitNotification({
        visible: true,
        message: `Rate limit exceeded. Please wait ${minutes} minute(s) before trying again.`,
        retryAfter
      });
      
      // Auto-hide notification after retry period
      setTimeout(() => {
        setRateLimitNotification(prev => ({ ...prev, visible: false }));
      }, retryAfter * 1000);
    };
    
    window.addEventListener('auth-expired', onExpired);
    window.addEventListener('rate-limit-exceeded', onRateLimitExceeded);
    
    initAuth();
    
    return () => {
      window.removeEventListener('auth-expired', onExpired);
      window.removeEventListener('rate-limit-exceeded', onRateLimitExceeded);
    };
  }, []);

  // Apply theme class to document element when theme changes
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const handleLogout = () => {
    console.log('Logging out user');
    setUser(null);
    setIsLoggedIn(false);
    setCurrentPage('landing');
    
    // Clear all tokens and user data from both storage types
    localStorage.removeItem('bloxmarket-token');
    localStorage.removeItem('bloxmarket-user');
    localStorage.removeItem('bloxmarket-is-admin');
    
    sessionStorage.removeItem('bloxmarket-token');
    sessionStorage.removeItem('bloxmarket-user');
    sessionStorage.removeItem('bloxmarket-is-admin');
    
    // Use the enhanced clearToken method to clear token from both storage locations
    apiService.clearToken();
  };

  const toggleTheme = () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);
    localStorage.setItem('bloxmarket-theme', newIsDark ? 'dark' : 'light');
  };

  const login = (userData: User, rememberMe: boolean = true) => {
    console.log('User logged in:', userData.username);
    setUser(userData);
    setIsLoggedIn(true);
    setCurrentPage('landing');
    
    // Store user data in the appropriate storage based on remember me preference
    const storage = rememberMe ? localStorage : sessionStorage;
    storage.setItem('bloxmarket-user', JSON.stringify(userData));
    
    // Clean up other storage to avoid conflicts
    const otherStorage = rememberMe ? sessionStorage : localStorage;
    otherStorage.removeItem('bloxmarket-user');
  };

  const logout = async () => {
    setIsLoggingOut(true);
    
    // Add a small delay to show the loading state
    await new Promise(resolve => setTimeout(resolve, 800));
    
    handleLogout();
    setIsLoggingOut(false);
  };

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'trading-hub':
        return <TradingHub />;
      case 'wishlist':
        return <Wishlist />;
      case 'middleman':
        return <MiddlemanDirectory />;
      case 'forums':
        return <Forums />;
      case 'events':
        return <EventsGiveaways />;
      case 'profile':
        return <NewUserProfile />;
      case 'admin':
        // Check if user has admin or moderator role
        if (user?.role === 'admin' || user?.role === 'moderator') {
          return <AdminPanel />;
        } else {
          // Redirect to dashboard if not authorized
          setCurrentPage('dashboard');
          return <Dashboard />;
        }
      case 'my-forum-posts':
        return <MyForumPosts />;
      case 'my-trade-posts':
        return <MyTradePosts />;
      case 'my-wishlist':
        return <MyWishlist />;
      case 'notifications':
        return <NotificationsPage />;
      case 'messenger':
        return <Messenger />;
      default:
        // Handle profile pages with user ID (format: profile-{userId})
        if (currentPage.startsWith('profile-')) {
          return <ProfileView />;
        }
        // Handle messages pages with user ID (format: messages-{userId})
        if (currentPage.startsWith('messages-')) {
          return <Messenger />;
        }
        return <Dashboard />;
    }
  };

  // Show loading screen while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mb-4 shadow-lg animate-pulse">
            <span className="text-white font-bold text-2xl">BM</span>
          </div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <GlobalLoadingProvider>
        <ThemeContext.Provider value={{ isDark, toggleTheme }}>
          <AuthContext.Provider value={{ user, login, logout, isLoggedIn, isLoading, isLoggingOut }}>
            <AppContext.Provider value={{ currentPage, setCurrentPage }}>
              <div className="min-h-screen bg-slate-900 text-foreground flex flex-col">
                <Header />
                <main className="flex-1">
                  {currentPage === 'auth' ? <AuthPage /> : <LandingPage />}
                </main>
                <Footer />
              </div>
              <GlobalLoader />
              <GlobalLoadingSetup />
            </AppContext.Provider>
          </AuthContext.Provider>
        </ThemeContext.Provider>
      </GlobalLoadingProvider>
    );
  }

  return (
    <GlobalLoadingProvider>
      <ThemeContext.Provider value={{ isDark, toggleTheme }}>
        <AuthContext.Provider value={{ user, login, logout, isLoggedIn, isLoading, isLoggingOut }}>
          <AppContext.Provider value={{ currentPage, setCurrentPage }}>
            <div className="min-h-screen bg-slate-900 text-foreground flex flex-col">
              <Header />
              <div className="flex flex-1 overflow-hidden">
                <Sidebar />
                <main className="flex-1 overflow-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800 hover:scrollbar-thumb-slate-500" style={{ marginLeft: 'px', marginTop: '64px' }}>
                  <ErrorBoundary>
                    {renderCurrentPage()}
                  </ErrorBoundary>
                </main>
              </div>
              <Footer />

              {/* Enhanced Toast notifications */}
              <Toaster />
              <RateLimitListener />
              <GlobalLoader />
              <GlobalLoadingSetup />

              {/* Legacy Rate Limit Error Notification */}
              {rateLimitNotification.visible && (
                <div className="fixed bottom-4 right-4 z-50 bg-red-500 text-white p-4 rounded-lg shadow-lg max-w-md">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium">{rateLimitNotification.message}</p>
                    </div>
                    <div className="ml-auto pl-3">
                      <div className="-mx-1.5 -my-1.5">
                        <button
                          type="button"
                          className="inline-flex rounded-md p-1.5 text-white hover:bg-red-600 focus:outline-none"
                          onClick={() => setRateLimitNotification(prev => ({ ...prev, visible: false }))}
                        >
                          <span className="sr-only">Dismiss</span>
                          <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </AppContext.Provider>
        </AuthContext.Provider>
      </ThemeContext.Provider>
    </GlobalLoadingProvider>
  );
}