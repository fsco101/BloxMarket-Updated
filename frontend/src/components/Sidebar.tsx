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
    <div className="w-64 sm:w-72 lg:w-80 h-screen bg-gradient-to-b from-sidebar via-sidebar to-sidebar/95 border-r border-sidebar-border/60 flex flex-col flex-shrink-0 shadow-2xl backdrop-blur-sm animate-fadeInUp transition-all duration-300 ease-in-out">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(120,119,198,0.05),transparent_50%)] pointer-events-none animate-pulse-glow"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(168,85,247,0.03),transparent_50%)] pointer-events-none"></div>
      {/* Header */}
      <div className="relative p-4 sm:p-5 lg:p-6 border-b border-sidebar-border/50 flex-shrink-0 bg-gradient-to-br from-blue-600/10 via-purple-600/5 to-indigo-600/10 dark:from-blue-500/20 dark:via-purple-500/10 dark:to-indigo-500/20">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 rounded-b-xl"></div>
        <div className="relative flex items-center gap-3 sm:gap-4">
          <div className="relative">
            <div className="w-10 h-10 sm:w-11 sm:h-11 lg:w-12 lg:h-12 bg-gradient-to-br from-blue-500 via-purple-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg ring-2 ring-white/20 dark:ring-gray-800/50">
              <span className="text-white font-black text-base sm:text-lg tracking-tight">BM</span>
            </div>
            <div className="absolute -bottom-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 bg-green-400 rounded-full border-2 border-white dark:border-gray-800 animate-pulse"></div>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-lg sm:text-xl text-sidebar-foreground bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent dark:from-blue-400 dark:to-purple-400">
              BloxMarket
            </h2>
            <p className="text-xs text-sidebar-foreground/60 font-medium tracking-wide uppercase">
              Trading Community
            </p>
          </div>
        </div>
      </div>

      {/* User Info */}
      <div className="p-3 sm:p-4 border-b border-sidebar-border/50 flex-shrink-0 bg-gradient-to-r from-sidebar-accent/30 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
            <div className="relative">
              <Avatar className="w-9 h-9 sm:w-10 sm:h-10 lg:w-11 lg:h-11 ring-2 ring-sidebar-border/50 shadow-md">
                <AvatarImage src={getAvatarUrl(user?.avatar_url as string)} className="object-cover" />
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold text-sm">
                  {user?.username?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              {user && (
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 sm:w-4 sm:h-4 bg-green-400 rounded-full border-2 border-white dark:border-gray-800 shadow-sm"></div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-sidebar-foreground truncate">
                {user?.username || 'Guest'}
              </p>
              <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5">
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-xs text-sidebar-foreground/70 font-medium">
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
              className={`w-full justify-start h-10 sm:h-11 px-3 sm:px-4 rounded-lg sm:rounded-xl transition-all duration-200 group animate-slideInRight`}
              style={{ animationDelay: `${index * 50}ms` }}
              onClick={() => setCurrentPage(id)}
            >
              <Icon className={`w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3 transition-transform duration-200 ${
                currentPage === id ? 'text-blue-600 dark:text-blue-400' : 'group-hover:scale-110'
              }`} />
              <span className="font-medium text-sm sm:text-base">{label}</span>
              {currentPage === id && (
                <div className="ml-auto w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-500 rounded-full animate-pulse"></div>
              )}
            </Button>
          ))}

          {/* Profile Dropdown Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant={isProfilePage ? "secondary" : "ghost"}
                className={`w-full justify-start h-10 sm:h-11 px-3 sm:px-4 rounded-lg sm:rounded-xl transition-all duration-200 group ${
                  isProfilePage
                    ? 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-sidebar-accent-foreground shadow-md border border-green-500/20 dark:border-green-400/30' 
                    : 'text-sidebar-foreground hover:bg-gradient-to-r hover:from-sidebar-accent/60 hover:to-sidebar-accent/40 hover:text-sidebar-accent-foreground hover:shadow-sm hover:scale-[1.02] active:scale-[0.98]'
                }`}
              >
                <User className={`w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3 transition-transform duration-200 ${
                  isProfilePage ? 'text-green-600 dark:text-green-400' : 'group-hover:scale-110'
                }`} />
                <span className="font-medium text-sm sm:text-base">Profile</span>
                <ChevronDown className={`w-3 h-3 sm:w-4 sm:h-4 ml-auto transition-transform duration-200 ${
                  isProfilePage ? 'text-green-600 dark:text-green-400' : ''
                }`} />
                {isProfilePage && (
                  <div className="ml-1 sm:ml-2 w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-500 rounded-full animate-pulse"></div>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 sm:w-64 p-2 bg-card/95 backdrop-blur-sm border border-border/50 shadow-xl rounded-xl">
              {profileMenuItems.map(({ id, label, icon: Icon }) => (
                <DropdownMenuItem
                  key={id}
                  onClick={() => handleProfileMenuClick(id)}
                  className={`flex items-center gap-2 sm:gap-3 cursor-pointer p-2 sm:p-3 rounded-lg transition-all duration-150 ${
                    currentPage === id 
                      ? 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-foreground shadow-sm' 
                      : 'hover:bg-accent/80 hover:shadow-sm active:scale-95'
                  }`}
                >
                  <Icon className={`w-3 h-3 sm:w-4 sm:h-4 ${currentPage === id ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`} />
                  <span className="font-medium text-sm sm:text-base">{label}</span>
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
                  className={`w-full justify-start h-10 sm:h-11 px-3 sm:px-4 rounded-lg sm:rounded-xl transition-all duration-200 group ${
                    currentPage === 'admin'
                      ? 'bg-gradient-to-r from-orange-500/20 to-red-500/20 text-sidebar-accent-foreground shadow-md border border-orange-500/20 dark:border-orange-400/30' 
                      : 'text-sidebar-foreground hover:bg-gradient-to-r hover:from-sidebar-accent/60 hover:to-sidebar-accent/40 hover:text-sidebar-accent-foreground hover:shadow-sm hover:scale-[1.02] active:scale-[0.98]'
                  }`}
                >
                  <Settings className={`w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3 transition-transform duration-200 ${
                    currentPage === 'admin' ? 'text-orange-600 dark:text-orange-400' : 'group-hover:scale-110'
                  }`} />
                  <span className="font-medium text-sm sm:text-base">Admin Panel</span>
                  <ChevronDown className={`w-3 h-3 sm:w-4 sm:h-4 ml-auto transition-transform duration-200 ${
                    currentPage === 'admin' ? 'text-orange-600 dark:text-orange-400' : ''
                  }`} />
                  {currentPage === 'admin' && (
                    <div className="ml-1 sm:ml-2 w-1.5 h-1.5 sm:w-2 sm:h-2 bg-orange-500 rounded-full animate-pulse"></div>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 sm:w-64 p-2 bg-card/95 backdrop-blur-sm border border-border/50 shadow-xl rounded-xl">
                {adminMenuItems.map(({ id, label, icon: Icon }) => (
                  <DropdownMenuItem
                    key={id}
                    onClick={() => handleAdminMenuClick(id)}
                    className="flex items-center gap-2 sm:gap-3 cursor-pointer p-2 sm:p-3 rounded-lg transition-all duration-150 hover:bg-accent/80 hover:shadow-sm active:scale-95"
                  >
                    <Icon className={`w-3 h-3 sm:w-4 sm:h-4 ${id === 'admin' ? 'text-orange-600 dark:text-orange-400' : 'text-muted-foreground'}`} />
                    <span className="font-medium text-sm sm:text-base">{label}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

        </div>
      </nav>

      {/* Footer */}
      <div className="p-3 sm:p-4 border-t border-sidebar-border/50 space-y-3 sm:space-y-4 flex-shrink-0 bg-gradient-to-t from-sidebar-accent/20 to-transparent">
        {/* Theme Toggle */}
        <div className="flex items-center justify-between p-2 sm:p-3 rounded-lg sm:rounded-xl bg-card/50 border border-border/30 backdrop-blur-sm">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 rounded-lg bg-gradient-to-br from-yellow-400/20 to-orange-400/20 dark:from-blue-400/20 dark:to-purple-400/20">
              {isDark ? <Moon className="w-3 h-3 sm:w-4 sm:h-4 text-blue-400" /> : <Sun className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-500" />}
            </div>
            <div>
              <span className="text-xs sm:text-sm font-medium text-sidebar-foreground">Dark Mode</span>
              <p className="text-xs text-sidebar-foreground/60 hidden sm:block">
                {isDark ? 'Switch to light' : 'Switch to dark'}
              </p>
            </div>
          </div>
          <Switch 
            checked={isDark} 
            onCheckedChange={toggleTheme}
            className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-blue-500 data-[state=checked]:to-purple-600"
          />
        </div>

        {/* Logout */}
        <Button
          variant="ghost"
          className="w-full justify-start h-9 sm:h-11 px-3 sm:px-4 rounded-lg sm:rounded-xl text-sidebar-foreground hover:bg-gradient-to-r hover:from-red-500/20 hover:to-pink-500/20 hover:text-red-600 dark:hover:text-red-400 transition-all duration-200 hover:shadow-md active:scale-95 group"
          onClick={logout}
        >
          <LogOut className="w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3 transition-transform duration-200 group-hover:translate-x-1" />
          <span className="font-medium text-sm sm:text-base">Logout</span>
        </Button>
      </div>
    </div>
  );
}