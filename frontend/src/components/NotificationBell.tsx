import { useState, useEffect } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { ScrollArea } from './ui/scroll-area';
import { apiService } from '../services/api';
import { useAuth, useApp } from '../App';

interface BackendNotification {
  _id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  createdAt: string;
  sender?: {
    username: string;
  };
}

interface Notification {
  _id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  sender?: {
    username: string;
  };
}

export function NotificationBell() {
  const { user } = useAuth();
  const { setCurrentPage } = useApp();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [previousUnreadCount, setPreviousUnreadCount] = useState(0);

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Fetch unread count on mount and when user changes
  useEffect(() => {
    if (user) {
      fetchUnreadCount();
      
      // Set up polling for new notifications every 30 seconds
      const pollInterval = setInterval(fetchUnreadCount, 30000);
      
      // Listen for custom events when notifications are created
      const handleNotificationUpdate = () => {
        fetchUnreadCount();
        if (dropdownOpen) {
          fetchNotifications();
        }
      };
      
      window.addEventListener('notification-created', handleNotificationUpdate);
      
      return () => {
        clearInterval(pollInterval);
        window.removeEventListener('notification-created', handleNotificationUpdate);
      };
    }
  }, [user, dropdownOpen]);

  // Show browser notification when unread count increases
  useEffect(() => {
    if (unreadCount > previousUnreadCount && previousUnreadCount > 0) {
      showBrowserNotification(unreadCount - previousUnreadCount);
    }
    setPreviousUnreadCount(unreadCount);
  }, [unreadCount, previousUnreadCount]);

  // Fetch notifications when dropdown opens
  useEffect(() => {
    if (dropdownOpen && user) {
      fetchNotifications();
    }
  }, [dropdownOpen, user]);

  const fetchUnreadCount = async () => {
    try {
      const response = await apiService.getUnreadNotificationCount();
      setUnreadCount(response.unreadCount || 0);
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  };

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const response = await apiService.getNotifications({ limit: 10 });
      // Transform snake_case to camelCase
      const transformedNotifications: Notification[] = (response.notifications || []).map((notif: BackendNotification) => ({
        _id: notif._id,
        type: notif.type,
        title: notif.title,
        message: notif.message,
        isRead: notif.is_read,
        createdAt: notif.createdAt,
        sender: notif.sender
      }));
      setNotifications(transformedNotifications);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await apiService.markNotificationAsRead(notificationId);
      // Update local state
      setNotifications(prev =>
        prev.map(notif =>
          notif._id === notificationId ? { ...notif, isRead: true } : notif
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await apiService.markAllNotificationsAsRead();
      setNotifications(prev => prev.map(notif => ({ ...notif, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'forum_comment':
      case 'trade_comment':
      case 'event_comment':
      case 'wishlist_comment':
        return '💬';
      case 'forum_upvote':
      case 'trade_upvote':
      case 'event_upvote':
      case 'wishlist_upvote':
        return '👍';
      case 'forum_downvote':
      case 'trade_downvote':
      case 'event_downvote':
      case 'wishlist_downvote':
        return '👎';
      case 'trade_vouch':
      case 'middleman_vouch':
        return '⭐';
      case 'admin_warning':
      case 'admin_ban':
      case 'admin_unban':
      case 'admin_suspension':
      case 'admin_deactivation':
      case 'admin_activation':
      case 'admin_post_deleted':
        return '⚠️';
      case 'admin_role_changed':
        return '👑';
      case 'admin_event_created':
        return '🎉';
      case 'system_announcement':
        return '📢';
      default:
        return '🔔';
    }
  };

  const showBrowserNotification = (newNotificationCount: number) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification('BloxMarket', {
        body: `You have ${newNotificationCount} new notification${newNotificationCount > 1 ? 's' : ''}`,
        icon: '/favicon.ico', // You can add a favicon or notification icon
        tag: 'bloxmarket-notification' // Prevents duplicate notifications
      });

      // Auto-close after 5 seconds
      setTimeout(() => {
        notification.close();
      }, 5000);

      // Click handler to focus window
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    }
  };

  if (!user) return null;

  return (
    <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`relative h-9 w-9 p-0 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${
            unreadCount > 0 
              ? 'text-orange-500 animate-pulse' 
              : 'text-sidebar-foreground'
          }`}
        >
          <Bell className={`h-4 w-4 ${unreadCount > 0 ? 'animate-bounce' : ''}`} />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs animate-ping"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between p-2">
          <h3 className="font-semibold text-sm">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="text-xs h-6 px-2"
            >
              <CheckCheck className="h-3 w-3 mr-1" />
              Mark all read
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />
        <ScrollArea className="h-96 max-h-96 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Loading...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No notifications yet
            </div>
          ) : (
            notifications.map((notification) => (
              <DropdownMenuItem
                key={notification._id}
                className={`flex flex-col items-start p-3 cursor-pointer ${
                  !notification.isRead ? 'bg-accent/50' : ''
                }`}
                onClick={() => !notification.isRead && markAsRead(notification._id)}
              >
                <div className="flex items-start gap-2 w-full">
                  <span className="text-lg">{getNotificationIcon(notification.type)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm truncate">
                        {notification.title}
                      </p>
                      {!notification.isRead && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatTimeAgo(notification.createdAt)}
                    </p>
                  </div>
                </div>
              </DropdownMenuItem>
            ))
          )}
        </ScrollArea>
        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="p-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs"
                onClick={() => {
                  setCurrentPage('notifications');
                  setDropdownOpen(false);
                }}
              >
                View all notifications
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}