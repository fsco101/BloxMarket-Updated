import React, { useState, useEffect } from 'react';
import { useApp, useAuth, useTheme } from '../App';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { 
  Home, 
  ArrowLeftRight, 
  Heart, 
  Shield, 
  MessageSquare, 
  Calendar, 
  User, 
  Settings,
  LogOut,
  Moon,
  Sun,
  ChevronDown,
  Users,
  Flag,
  AlertTriangle,
  UserCheck,
  ShoppingCart,
  BarChart3,
  FileText,
  Package
} from 'lucide-react';
import { NotificationBell } from './NotificationBell';

export function Sidebar() {
  const { currentPage, setCurrentPage } = useApp();
  const { user, logout, isLoading } = useAuth(); // was `loading`
  const { isDark, toggleTheme } = useTheme();
  
  // Simplified admin status check - directly from user object
  const isAdminOrModerator = user?.role === 'admin' || user?.role === 'moderator';

  const adminMenuItems = [
    { id: 'admin', label: 'Dashboard', icon: BarChart3 },
    { id: 'admin-users', label: 'User Management', icon: Users },
    { id: 'admin-middleman', label: 'Middleman Verification', icon: UserCheck },
    { id: 'admin-forum', label: 'Forum Management', icon: MessageSquare },
    { id: 'admin-trades', label: 'Trading Posts', icon: ShoppingCart },
    { id: 'admin-wishlists', label: 'Wishlists', icon: Heart },
    { id: 'admin-events', label: 'Events', icon: Calendar },
    { id: 'admin-flagged', label: 'Flagged Content', icon: AlertTriangle }
  ];

  const menuItems = [
    { id: 'dashboard', label: 'Home', icon: Home },
    { id: 'trading-hub', label: 'Trading Hub', icon: ArrowLeftRight },
    { id: 'wishlist', label: 'Wishlist', icon: Heart },
    { id: 'middleman', label: 'Middleman Directory', icon: Shield },
    { id: 'forums', label: 'Forums', icon: MessageSquare },
    { id: 'events', label: 'Events & Giveaways', icon: Calendar }
  ];

  const profileMenuItems = [
    { id: 'profile', label: 'Profile Overview', icon: User },
    { id: 'my-forum-posts', label: 'My Forum Posts', icon: FileText },
    { id: 'my-trade-posts', label: 'My Trade Posts', icon: Package },
    { id: 'my-wishlist', label: 'My Wishlist', icon: Heart }
  ];

  const handleAdminMenuClick = (itemId: string) => {
    // Set current page to admin for all admin-related pages
    setCurrentPage('admin');
    
    // Communicate with AdminPanel about which section should be active
    if (itemId !== 'admin') {
      // Extract the section name (remove 'admin-' prefix)
      const section = itemId.replace('admin-', '');
      // Dispatch custom event for AdminPanel to listen to
      window.dispatchEvent(new CustomEvent('admin-section-change', { detail: section }));
    } else {
      // Reset to dashboard when clicking main admin item
      window.dispatchEvent(new CustomEvent('admin-section-change', { detail: 'dashboard' }));
    }
  };

  const handleProfileMenuClick = (itemId: string) => {
    setCurrentPage(itemId);
  };

  // Check if current page is a profile-related page
  const isProfilePage = profileMenuItems.some(item => item.id === currentPage);

  const getAvatarUrl = (avatarUrl?: string) => {
    if (!avatarUrl) return '';

    if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) {
      return avatarUrl;
    }

    if (avatarUrl.startsWith('/uploads/') || avatarUrl.startsWith('/api/uploads/')) {
      return `http://localhost:5000${avatarUrl}`;
    }

    return `http://localhost:5000/uploads/avatars/${avatarUrl}`;
  };

  // Debug logging to help identify issues
  useEffect(() => {
    console.log('Sidebar Debug:', {
      user: user,
      userRole: user?.role,
      userObject: JSON.stringify(user, null, 2),
      isAdminOrModerator: isAdminOrModerator,
      loading: isLoading,
      localStorage: {
        token: !!localStorage.getItem('bloxmarket-token'),
        storedUser: !!localStorage.getItem('bloxmarket-user')
      }
    });
  }, [user, isAdminOrModerator, isLoading]);

  return (
    <div className="w-64 sm:w-72 lg:w-80 h-screen bg-light border-end border-secondary flex flex-col flex-shrink-0 shadow-lg animate-fadeInUp transition-all duration-300 ease-in-out position-sticky top-0">
      {/* Subtle background pattern */}
      <div className="position-absolute inset-0 bg-gradient-to-b from-primary/5 to-secondary/5 pointer-events-none animate-pulse-glow"></div>
      <div className="position-absolute inset-0 bg-gradient-to-r from-info/3 to-warning/3 pointer-events-none"></div>
      {/* Header */}
      <div className="relative p-4 sm:p-5 lg:p-6 border-bottom border-secondary flex-shrink-0 bg-gradient-to-br from-primary/10 via-info/5 to-secondary/10">
        <div className="position-absolute inset-0 bg-gradient-to-r from-primary/5 to-info/5 rounded-bottom"></div>
        <div className="relative flex items-center gap-3 sm:gap-4">
          <div className="relative">
            <div className="w-10 h-10 sm:w-11 sm:h-11 lg:w-12 lg:h-12 bg-gradient-to-br from-primary via-info to-secondary rounded-xl flex items-center justify-center shadow-lg ring-2 ring-white dark:ring-gray-800">
              <span className="text-white font-black text-base sm:text-lg tracking-tight">BM</span>
            </div>
            <div className="position-absolute -bottom-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 bg-success rounded-full border-2 border-white dark:border-gray-800 animate-pulse"></div>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-lg sm:text-xl text-dark bg-gradient-to-r from-primary to-info bg-clip-text text-transparent dark:from-blue-400 dark:to-purple-400">
              BloxMarket
            </h2>
            <p className="text-xs text-muted font-medium tracking-wide uppercase">
              Trading Community
            </p>
          </div>
        </div>
      </div>

      {/* User Info */}
      <div className="p-3 sm:p-4 border-bottom border-secondary flex-shrink-0 bg-gradient-to-r from-light/30 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
            <div className="relative">
              <Avatar className="w-9 h-9 sm:w-10 sm:h-10 lg:w-11 lg:h-11 ring-2 ring-secondary shadow-md">
                <AvatarImage src={getAvatarUrl(user?.avatar_url as string)} className="object-cover" />
                <AvatarFallback className="bg-gradient-to-br from-primary to-info text-white font-semibold text-sm">
                  {user?.username?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              {user && (
                <div className="position-absolute -bottom-0.5 -right-0.5 w-3 h-3 sm:w-4 sm:h-4 bg-success rounded-full border-2 border-white dark:border-gray-800 shadow-sm"></div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-dark truncate">
                {user?.username || 'Guest'}
              </p>
              <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5">
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-success rounded-full animate-pulse"></div>
                <span className="text-xs text-muted font-medium">
                  {user ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>
          </div>
          <div className="flex-shrink-0">
            <NotificationBell />
          </div>
        </div>
      </div>

      {/* Navigation - Scrollable */}
      <nav className="flex-1 p-2 sm:p-3 overflow-y-auto">
        <div className="space-y-1.5 sm:space-y-2">
          {menuItems.map(({ id, label, icon: Icon }, index) => (
            <Button
              key={id}
              variant={currentPage === id ? "secondary" : "ghost"}
              className={`w-full justify-start transition-all duration-300 group relative overflow-hidden ${
                currentPage === id
                  ? 'bg-gradient-to-r from-primary to-info text-white shadow-lg border-0 hover:shadow-xl hover:scale-[1.02]'
                  : 'bg-white/80 hover:bg-white border border-secondary/30 hover:border-primary/50 hover:shadow-md text-dark'
              }`}
              style={{ animationDelay: `${index * 50}ms` }}
              onClick={() => setCurrentPage(id)}
            >
              <div className={`absolute inset-0 transition-opacity duration-300 ${
                currentPage === id ? 'bg-gradient-to-r from-primary/20 to-info/20' : 'opacity-0 group-hover:opacity-100 bg-gradient-to-r from-primary/5 to-info/5'
              }`}></div>
              <Icon className={`w-4 h-4 sm:w-5 sm:h-5 mr-3 transition-all duration-300 relative z-10 ${
                currentPage === id ? 'text-white scale-110' : 'text-primary group-hover:scale-110 group-hover:text-info'
              }`} />
              <span className="font-semibold text-sm sm:text-base relative z-10">{label}</span>
              {currentPage === id && (
                <div className="ml-auto w-2 h-2 bg-white rounded-full animate-pulse shadow-sm relative z-10"></div>
              )}
            </Button>
          ))}

          {/* Profile Dropdown Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant={isProfilePage ? "secondary" : "ghost"}
                className={`w-full justify-start transition-all duration-300 group relative overflow-hidden ${
                  isProfilePage
                    ? 'bg-gradient-to-r from-success to-green-500 text-white shadow-lg border-0 hover:shadow-xl hover:scale-[1.02]'
                    : 'bg-white/80 hover:bg-white border border-secondary/30 hover:border-success/50 hover:shadow-md text-dark'
                }`}
              >
                <div className={`absolute inset-0 transition-opacity duration-300 ${
                  isProfilePage ? 'bg-gradient-to-r from-success/20 to-green-500/20' : 'opacity-0 group-hover:opacity-100 bg-gradient-to-r from-success/5 to-green-500/5'
                }`}></div>
                <User className={`w-4 h-4 sm:w-5 sm:h-5 mr-3 transition-all duration-300 relative z-10 ${
                  isProfilePage ? 'text-white scale-110' : 'text-success group-hover:scale-110 group-hover:text-green-600'
                }`} />
                <span className="font-semibold text-sm sm:text-base relative z-10">Profile</span>
                <ChevronDown className={`w-3 h-3 sm:w-4 sm:h-4 ml-auto transition-all duration-300 relative z-10 ${
                  isProfilePage ? 'text-white rotate-180' : 'group-hover:rotate-180'
                }`} />
                {isProfilePage && (
                  <div className="ml-2 w-2 h-2 bg-white rounded-full animate-pulse shadow-sm relative z-10"></div>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 sm:w-64 p-2 bg-white/95 backdrop-blur-sm border border-secondary/50 shadow-xl rounded-xl">
              {profileMenuItems.map(({ id, label, icon: Icon }) => (
                <DropdownMenuItem
                  key={id}
                  onClick={() => handleProfileMenuClick(id)}
                  className={`flex items-center gap-3 cursor-pointer p-3 rounded-lg transition-all duration-200 hover:bg-success/10 hover:shadow-md ${
                    currentPage === id ? 'bg-success/20 text-success shadow-md border border-success/30' : 'text-dark hover:scale-[1.02]'
                  }`}
                >
                  <Icon className={`w-4 h-4 transition-all duration-200 ${
                    currentPage === id ? 'text-success scale-110' : 'text-muted group-hover:scale-105'
                  }`} />
                  <span className="font-medium text-sm sm:text-base">{label}</span>
                  {currentPage === id && (
                    <div className="ml-auto w-2 h-2 bg-success rounded-full animate-pulse"></div>
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Admin Dropdown Menu - Simplified condition */}
          {isAdminOrModerator && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant={currentPage === 'admin' ? "secondary" : "ghost"}
                  className={`w-full justify-start transition-all duration-300 group relative overflow-hidden ${
                    currentPage === 'admin'
                      ? 'bg-gradient-to-r from-warning to-orange-500 text-white shadow-lg border-0 hover:shadow-xl hover:scale-[1.02]'
                      : 'bg-white/80 hover:bg-white border border-secondary/30 hover:border-warning/50 hover:shadow-md text-dark'
                  }`}
                >
                  <div className={`absolute inset-0 transition-opacity duration-300 ${
                    currentPage === 'admin' ? 'bg-gradient-to-r from-warning/20 to-orange-500/20' : 'opacity-0 group-hover:opacity-100 bg-gradient-to-r from-warning/5 to-orange-500/5'
                  }`}></div>
                  <Settings className={`w-4 h-4 sm:w-5 sm:h-5 mr-3 transition-all duration-300 relative z-10 ${
                    currentPage === 'admin' ? 'text-white scale-110' : 'text-warning group-hover:scale-110 group-hover:text-orange-600'
                  }`} />
                  <span className="font-semibold text-sm sm:text-base relative z-10">Admin Panel</span>
                  <ChevronDown className={`w-3 h-3 sm:w-4 sm:h-4 ml-auto transition-all duration-300 relative z-10 ${
                    currentPage === 'admin' ? 'text-white rotate-180' : 'group-hover:rotate-180'
                  }`} />
                  {currentPage === 'admin' && (
                    <div className="ml-2 w-2 h-2 bg-white rounded-full animate-pulse shadow-sm relative z-10"></div>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 sm:w-64 p-2 bg-white/95 backdrop-blur-sm border border-secondary/50 shadow-xl rounded-xl">
                {adminMenuItems.map(({ id, label, icon: Icon }) => (
                  <DropdownMenuItem
                    key={id}
                    onClick={() => handleAdminMenuClick(id)}
                    className={`flex items-center gap-3 cursor-pointer p-3 rounded-lg transition-all duration-200 hover:bg-warning/10 hover:shadow-md ${
                      id === 'admin' && currentPage === 'admin' ? 'bg-warning/20 text-warning shadow-md border border-warning/30' : 'text-dark hover:scale-[1.02]'
                    }`}
                  >
                    <Icon className={`w-4 h-4 transition-all duration-200 ${
                      id === 'admin' && currentPage === 'admin' ? 'text-warning scale-110' : 'text-muted group-hover:scale-105'
                    }`} />
                    <span className="font-medium text-sm sm:text-base">{label}</span>
                    {id === 'admin' && currentPage === 'admin' && (
                      <div className="ml-auto w-2 h-2 bg-warning rounded-full animate-pulse"></div>
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

        </div>
      </nav>

      {/* Footer */}
      <div className="p-3 sm:p-4 border-top border-secondary space-y-3 sm:space-y-4 flex-shrink-0 bg-gradient-to-t from-light/20 to-transparent">
        {/* Theme Toggle */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-white/80 backdrop-blur-sm border border-secondary/30 shadow-md hover:shadow-lg transition-all duration-300">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-warning/20 to-info/20 shadow-sm">
              {isDark ? <Moon className="w-4 h-4 text-info" /> : <Sun className="w-4 h-4 text-warning" />}
            </div>
            <div>
              <span className="text-sm font-semibold text-dark">Dark Mode</span>
              <p className="text-xs text-muted hidden sm:block">
                {isDark ? 'Switch to light' : 'Switch to dark'}
              </p>
            </div>
          </div>
          <Switch
            checked={isDark}
            onCheckedChange={toggleTheme}
            className="form-check-input form-switch"
          />
        </div>

        {/* Logout */}
        <Button
          variant="ghost"
          className="w-full justify-start transition-all duration-300 group relative overflow-hidden bg-white/80 hover:bg-white border border-secondary/30 hover:border-danger/50 hover:shadow-md text-dark"
          onClick={logout}
        >
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-gradient-to-r from-danger/5 to-red-500/5 transition-opacity duration-300"></div>
          <LogOut className="w-4 h-4 sm:w-5 sm:h-5 mr-3 transition-all duration-300 relative z-10 text-danger group-hover:scale-110 group-hover:translate-x-1" />
          <span className="font-semibold text-sm sm:text-base relative z-10">Logout</span>
        </Button>
      </div>
    </div>
  );
}