import { useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useApp, useAuth } from '../App';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Badge } from './ui/badge';
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
  ChevronDown,
  Users,
  AlertTriangle,
  UserCheck,
  ShoppingCart,
  BarChart3,
  FileText,
  Package,
  MessageCircle,
  Sun,
  Moon
} from 'lucide-react';
import { NotificationBell } from './NotificationBell';
import { Switch } from './ui/switch';
import { useChatNotifications } from '../hooks/useChatNotifications';

export function Sidebar() {
  const { currentPage, setCurrentPage } = useApp();
  const { user, logout, isLoading } = useAuth(); // was `loading`
  const { totalUnreadCount } = useChatNotifications();
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
    { id: 'messenger', label: 'Messages', icon: MessageCircle },
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
    
    // Use setTimeout to ensure the AdminPanel component is mounted before dispatching the event
    setTimeout(() => {
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
    }, 0);
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
      isAdminOrModerator: isAdminOrModerator,
      loading: isLoading,
      totalUnreadCount: totalUnreadCount,
      totalUnreadCountType: typeof totalUnreadCount,
      totalUnreadCountIsZero: totalUnreadCount === 0,
      totalUnreadCountGreaterThanZero: totalUnreadCount > 0,
    });
  }, [user, isAdminOrModerator, isLoading, totalUnreadCount]);

  return (
    // Sticky sidebar container - stays in document flow but sticks to viewport top when scrolling
    // Uses position: sticky with top: 0 for modern, clean sticky behavior
    // Width is consistent across all screen sizes for better layout predictability
    <div className="sticky top-0 w-64 h-screen bg-background border-r border-border flex flex-col flex-shrink-0 shadow-lg z-20">
      {/* 
        Sticky Positioning Explanation:
        - position: sticky keeps the sidebar in the normal document flow
        - top: 0 makes it stick to the top of the viewport when scrolling
        - h-screen ensures it takes full viewport height
        - flex-shrink-0 prevents the sidebar from shrinking in flex layouts
        - z-20 ensures it stays above content but below modals/overlays
      */}


      {/* User Profile Section - Fixed height with consistent spacing */}
      <div className="p-4 border-b border-border flex-shrink-0 bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="relative">
              <Avatar className="w-10 h-10 ring-2 ring-border shadow-md">
                <AvatarImage src={getAvatarUrl(user?.avatar_url as string)} className="object-cover" />
                <AvatarFallback className="bg-gradient-to-br from-primary to-primary text-primary-foreground font-semibold text-sm">
                  {user?.username?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              {user && (
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-background shadow-sm"></div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-foreground truncate">
                {user?.username || 'Guest'}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-xs text-muted-foreground font-medium">
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

      {/* Navigation Menu - Scrollable content area */}
      <nav className="flex-1 p-3 overflow-y-auto">
        {/* 
          Scrollable Navigation:
          - flex-1 takes all available space between header and footer
          - overflow-y-auto enables vertical scrolling when content exceeds height
          - Consistent padding for clean spacing
        */}
        <div className="space-y-2">
          {menuItems.map(({ id, label, icon: Icon }, index) => (
            <Button
              key={id}
              variant={currentPage === id ? "secondary" : "ghost"}
              className={`w-full justify-start transition-smooth group relative overflow-hidden hover-lift click-scale ${
                currentPage === id
                  ? 'bg-gradient-to-r from-primary to-info text-white shadow-lg border-0 hover:shadow-xl hover:scale-[1.02] animate-scaleIn'
                  : 'bg-card hover:bg-accent border border-border hover:border-primary/50 hover:shadow-md text-foreground hover-glow'
              } ${
                id === 'messenger' && totalUnreadCount > 0 && currentPage !== 'messenger'
                  ? 'animate-pulse border-blue-500/50 shadow-blue-500/25 shadow-lg hover-scale'
                  : ''
              }`}
              style={{ animationDelay: `${index * 50}ms` }}
              onClick={() => setCurrentPage(id)}
            >
              <div className={`absolute inset-0 transition-all duration-300 ${
                currentPage === id ? 'bg-gradient-to-r from-primary/20 to-info/20 opacity-100' : 'opacity-0 group-hover:opacity-100 bg-gradient-to-r from-primary/5 to-info/5'
              }`}></div>
              <Icon className={`w-5 h-5 mr-3 transition-spring relative z-10 ${
                currentPage === id ? 'text-white scale-110 animate-glow' : 'text-primary group-hover:scale-110 group-hover:text-info group-hover:animate-wiggle'
              } ${
                id === 'messenger' && totalUnreadCount > 0 && currentPage !== 'messenger'
                  ? 'animate-heartbeat text-blue-500'
                  : ''
              }`} />
              <span className="font-semibold text-sm relative z-10 transition-smooth">{label}</span>
              
              {/* Enhanced unread count badge for Messages */}
              {id === 'messenger' && totalUnreadCount > 0 && (
                <Badge 
                  variant="destructive"
                  className="ml-auto h-5 w-5 flex items-center justify-center p-0 text-xs relative z-10 animate-bounceIn hover-scale"
                >
                  {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
                </Badge>
              )}
              
              {currentPage === id && (
                <div className="ml-auto w-2 h-2 bg-primary rounded-full animate-pulse-glow shadow-sm relative z-10"></div>
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
                    : 'bg-card hover:bg-accent border border-border hover:border-success/50 hover:shadow-md text-foreground'
                }`}
              >
                <div className={`absolute inset-0 transition-opacity duration-300 ${
                  isProfilePage ? 'bg-gradient-to-r from-success/20 to-green-500/20' : 'opacity-0 group-hover:opacity-100 bg-gradient-to-r from-success/5 to-green-500/5'
                }`}></div>
                <User className={`w-5 h-5 mr-3 transition-all duration-300 relative z-10 ${
                  isProfilePage ? 'text-white scale-110' : 'text-success group-hover:scale-110 group-hover:text-green-600'
                }`} />
                <span className="font-semibold text-sm relative z-10">Profile</span>
                <ChevronDown className={`w-4 h-4 ml-auto transition-all duration-300 relative z-10 ${
                  isProfilePage ? 'text-white rotate-180' : 'group-hover:rotate-180'
                }`} />
                {isProfilePage && (
                  <div className="ml-2 w-2 h-2 bg-success rounded-full animate-pulse shadow-sm relative z-10"></div>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              {profileMenuItems.map(({ id, label, icon: Icon }) => (
                <DropdownMenuItem
                  key={id}
                  onClick={() => handleProfileMenuClick(id)}
                  className={`${
                    currentPage === id ? 'bg-accent text-accent-foreground shadow-md' : ''
                  }`}
                >
                  <Icon className={`w-4 h-4 ${
                    currentPage === id ? 'text-success scale-110' : 'text-muted-foreground'
                  }`} />
                  <span className="font-medium text-sm">{label}</span>
                  {currentPage === id && (
                    <div className="ml-auto w-2 h-2 bg-success rounded-full animate-pulse"></div>
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Admin Dropdown Menu - Clean condition check */}
          {isAdminOrModerator && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant={currentPage === 'admin' ? "secondary" : "ghost"}
                  className={`w-full justify-start transition-all duration-300 group relative overflow-hidden ${
                    currentPage === 'admin'
                      ? 'bg-gradient-to-r from-warning to-orange-500 text-white shadow-lg border-0 hover:shadow-xl hover:scale-[1.02]'
                      : 'bg-card hover:bg-accent border border-border hover:border-warning/50 hover:shadow-md text-foreground'
                  }`}
                >
                  <div className={`absolute inset-0 transition-opacity duration-300 ${
                    currentPage === 'admin' ? 'bg-gradient-to-r from-warning/20 to-orange-500/20' : 'opacity-0 group-hover:opacity-100 bg-gradient-to-r from-warning/5 to-orange-500/5'
                  }`}></div>
                  <Settings className={`w-5 h-5 mr-3 transition-all duration-300 relative z-10 ${
                    currentPage === 'admin' ? 'text-white scale-110' : 'text-warning group-hover:scale-110 group-hover:text-orange-600'
                  }`} />
                  <span className="font-semibold text-sm relative z-10">Admin Panel</span>
                  <ChevronDown className={`w-4 h-4 ml-auto transition-all duration-300 relative z-10 ${
                    currentPage === 'admin' ? 'text-white rotate-180' : 'group-hover:rotate-180'
                  }`} />
                  {currentPage === 'admin' && (
                    <div className="ml-2 w-2 h-2 bg-warning rounded-full animate-pulse shadow-sm relative z-10"></div>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                {adminMenuItems.map(({ id, label, icon: Icon }) => (
                  <DropdownMenuItem
                    key={id}
                    onClick={() => handleAdminMenuClick(id)}
                    className={`${
                      id === 'admin' && currentPage === 'admin' ? 'bg-accent text-accent-foreground shadow-md' : ''
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${
                      id === 'admin' && currentPage === 'admin' ? 'text-warning scale-110' : 'text-muted-foreground'
                    }`} />
                    <span className="font-medium text-sm">{label}</span>
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

      {/* Sidebar Footer - Fixed height bottom section */}
  <div className="p-4 border-t border-border space-y-4 flex-shrink-0 bg-muted/10">
        {/* 
          Footer Section:
          - flex-shrink-0 prevents this section from compressing
          - Fixed spacing for consistent layout
          - Always visible at bottom of sidebar
        */}
        
        {/* Enhanced Theme Toggle Block
        <div className="flex items-center justify-between p-3 rounded-xl bg-card backdrop-blur-sm border border-border shadow-md hover:shadow-lg transition-spring group hover-lift">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted flex items-center justify-center shadow-sm transition-spring group-hover:bg-accent hover-scale">
              {isDark ? <Moon className="w-4 h-4 text-info transition-spring group-hover:animate-wiggle" /> : <Sun className="w-4 h-4 text-warning transition-spring group-hover:animate-wiggle" />}
            </div>
            <div>
              <span className="text-sm font-semibold text-foreground transition-smooth">{isDark ? 'Dark Mode' : 'Light Mode'}</span>
              <p className="text-xs text-muted-foreground transition-smooth">
                {isDark ? 'Switch to light' : 'Switch to dark'}
              </p>
            </div>
          </div>
          <Switch
            checked={isDark}
            onCheckedChange={toggleTheme}
            aria-label={isDark ? 'Enable light mode' : 'Enable dark mode'}
            className="transition-spring hover-scale"
          />
        </div> */}

        {/* Enhanced Logout Button */}
        <Button
          variant="ghost"
          className="w-full justify-start transition-spring group relative overflow-hidden bg-card hover:bg-accent border border-border hover:border-destructive/50 hover:shadow-md text-foreground hover-lift click-scale"
          onClick={logout}
        >
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-gradient-to-r from-red-500/5 to-red-600/5 transition-all duration-300"></div>
          <LogOut className="w-5 h-5 mr-3 transition-spring relative z-10 text-red-500 group-hover:scale-110 group-hover:translate-x-1 group-hover:animate-wiggle" />
          <span className="font-semibold text-sm relative z-10 transition-smooth">Logout</span>
        </Button>
      </div>
    </div>
  );
}