import { useState, useEffect, useCallback } from 'react';
import { Trash2, CheckCheck, Bell, ArrowLeft } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { apiService } from '../services/api';
import { useAuth } from '../App';

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

export function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([]);

  const notificationsPerPage = 20;

  useEffect(() => {
    if (user) {
      fetchNotifications();
      fetchUnreadCount();
    }
  }, [user, currentPage]);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiService.getNotifications({
        page: currentPage,
        limit: notificationsPerPage
      });

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
      setTotalPages(Math.ceil((response.total || 0) / notificationsPerPage));
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, notificationsPerPage]);

  useEffect(() => {
    if (user) {
      fetchNotifications();
      fetchUnreadCount();
    }
  }, [user, fetchNotifications]);

  const fetchUnreadCount = async () => {
    try {
      const response = await apiService.getUnreadNotificationCount();
      setUnreadCount(response.unreadCount || 0);
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
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

  const deleteNotification = async (notificationId: string) => {
    try {
      await apiService.deleteNotification(notificationId);
      setNotifications(prev => prev.filter(notif => notif._id !== notificationId));
      // Update unread count if the deleted notification was unread
      const deletedNotif = notifications.find(n => n._id === notificationId);
      if (deletedNotif && !deletedNotif.isRead) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const deleteSelectedNotifications = async () => {
    if (selectedNotifications.length === 0) return;

    try {
      await Promise.all(selectedNotifications.map(id => apiService.deleteNotification(id)));
      setNotifications(prev => prev.filter(notif => !selectedNotifications.includes(notif._id)));
      // Update unread count
      const deletedUnreadCount = notifications.filter(n => selectedNotifications.includes(n._id) && !n.isRead).length;
      setUnreadCount(prev => Math.max(0, prev - deletedUnreadCount));
      setSelectedNotifications([]);
    } catch (error) {
      console.error('Failed to delete selected notifications:', error);
    }
  };

  const toggleNotificationSelection = (notificationId: string) => {
    setSelectedNotifications(prev =>
      prev.includes(notificationId)
        ? prev.filter(id => id !== notificationId)
        : [...prev, notificationId]
    );
  };

  const selectAllNotifications = () => {
    if (selectedNotifications.length === notifications.length) {
      setSelectedNotifications([]);
    } else {
      setSelectedNotifications(notifications.map(n => n._id));
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
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

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <Bell className="h-6 w-6 text-orange-500" />
              <h1 className="text-2xl font-bold">Notifications</h1>
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {unreadCount} unread
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {selectedNotifications.length > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={deleteSelectedNotifications}
                className="flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Delete Selected ({selectedNotifications.length})
              </Button>
            )}
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={markAllAsRead}
                className="flex items-center gap-2"
              >
                <CheckCheck className="h-4 w-4" />
                Mark All Read
              </Button>
            )}
          </div>
        </div>

        {/* Bulk Actions */}
        {notifications.length > 0 && (
          <Card className="mb-4">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedNotifications.length === notifications.length && notifications.length > 0}
                      onChange={selectAllNotifications}
                      className="rounded"
                    />
                    Select All
                  </label>
                  <span className="text-sm text-muted-foreground">
                    {selectedNotifications.length} of {notifications.length} selected
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Notifications List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>All Notifications</span>
              <span className="text-sm font-normal text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px]">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center text-muted-foreground">
                    Loading notifications...
                  </div>
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center text-muted-foreground">
                    <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">No notifications yet</p>
                    <p className="text-sm">You'll see notifications here when you receive them.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {notifications.map((notification) => (
                    <div
                      key={notification._id}
                      className={`flex items-start gap-4 p-4 rounded-lg border transition-colors ${
                        !notification.isRead
                          ? 'bg-accent/50 border-accent'
                          : 'bg-background border-border hover:bg-accent/20'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedNotifications.includes(notification._id)}
                        onChange={() => toggleNotificationSelection(notification._id)}
                        className="mt-1 rounded"
                      />

                      <span className="text-2xl flex-shrink-0">{getNotificationIcon(notification.type)}</span>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-sm truncate">
                              {notification.title}
                            </h3>
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {notification.message}
                            </p>
                            <p className="text-xs text-muted-foreground mt-2">
                              {formatTimeAgo(notification.createdAt)}
                              {notification.sender && (
                                <span className="ml-2">• from {notification.sender.username}</span>
                              )}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            {!notification.isRead && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full" />
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => markAsRead(notification._id)}
                              disabled={notification.isRead}
                              className="h-8 w-8 p-0"
                            >
                              <CheckCheck className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteNotification(notification._id)}
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6 pt-4 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                    if (pageNum > totalPages) return null;

                    return (
                      <Button
                        key={pageNum}
                        variant={pageNum === currentPage ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className="w-8 h-8 p-0"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}