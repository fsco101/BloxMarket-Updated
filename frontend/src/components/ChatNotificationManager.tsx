import { useEffect, useState, useCallback } from 'react';
import { useChatNotifications } from '../hooks/useChatNotifications';
import { useAuth, useApp } from '../App';
import { toast } from 'sonner';

export function ChatNotificationManager() {
  const { user } = useAuth();
  const { currentPage } = useApp();
  const { totalUnreadCount } = useChatNotifications();
  const [previousUnreadCount, setPreviousUnreadCount] = useState(0);

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const showBrowserNotification = useCallback((newMessageCount: number) => {
    // Only show notifications if the user is not currently on the messenger page
    const shouldShowNotification = currentPage !== 'messenger';
    
    if (shouldShowNotification) {
      // Play notification sound (if available)
      try {
        const audio = new Audio('/notification-sound.mp3');
        audio.volume = 0.3; // Set volume to 30%
        audio.play().catch(() => {
          // Fallback to browser's default notification sound or ignore if not available
          console.log('Notification sound could not be played');
        });
      } catch {
        // Ignore audio errors
      }

      // Show toast notification (always visible even if browser notifications are disabled)
      toast.info(`💬 ${newMessageCount} new message${newMessageCount > 1 ? 's' : ''} received!`, {
        duration: 4000,
        position: 'top-right',
        action: {
          label: 'View',
          onClick: () => {
            window.dispatchEvent(new CustomEvent('navigate-to-messenger'));
          }
        }
      });
    }

    // Show browser notification if permission is granted and user is not on messenger page
    if ('Notification' in window && Notification.permission === 'granted' && user && shouldShowNotification) {
      const notification = new Notification('BloxMarket - New Message', {
        body: `You have ${newMessageCount} new message${newMessageCount > 1 ? 's' : ''}`,
        icon: '/favicon.ico',
        tag: 'bloxmarket-chat-notification',
        badge: '/favicon.ico',
        silent: false
      });

      // Auto-close after 5 seconds
      setTimeout(() => {
        notification.close();
      }, 5000);

      // Click handler to focus window and navigate to messenger
      notification.onclick = () => {
        window.focus();
        // Dispatch custom event to navigate to messenger
        window.dispatchEvent(new CustomEvent('navigate-to-messenger'));
        notification.close();
      };
    }
  }, [user, currentPage]);

  // Show browser notification when unread count increases
  useEffect(() => {
    if (totalUnreadCount > previousUnreadCount && previousUnreadCount > 0) {
      const newMessageCount = totalUnreadCount - previousUnreadCount;
      showBrowserNotification(newMessageCount);
    }
    setPreviousUnreadCount(totalUnreadCount);
  }, [totalUnreadCount, previousUnreadCount, showBrowserNotification]);

  // This component doesn't render anything, it just handles notifications
  return null;
}