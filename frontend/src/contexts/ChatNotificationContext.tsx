import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../App';
import { apiService } from '../services/api';
import { socketService } from '../services/socket';
import { ChatNotificationContext, type ChatNotificationContextType } from './ChatNotificationContextTypes';

interface UnreadCountResponse {
  totalUnreadCount: number;
  chatCount: number;
}

interface WebSocketNotificationData {
  increment?: number;
  chatId?: string;
  userId?: string;
}

interface ChatNotificationProviderProps {
  children: React.ReactNode;
}

export const ChatNotificationProvider: React.FC<ChatNotificationProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);

  const refreshUnreadCount = useCallback(async () => {
    if (!user) {
      setTotalUnreadCount(0);
      return;
    }

    try {
      const response = await apiService.getTotalUnreadChatCount() as UnreadCountResponse;
      setTotalUnreadCount(response.totalUnreadCount || 0);
    } catch (error) {
      console.error('Failed to fetch total unread count:', error);
    }
  }, [user]);

  const incrementUnreadCount = useCallback((count: number = 1) => {
    setTotalUnreadCount(prev => prev + count);
  }, []);

  const decrementUnreadCount = useCallback((count: number = 1) => {
    setTotalUnreadCount(prev => Math.max(0, prev - count));
  }, []);

  const resetUnreadCount = useCallback(() => {
    setTotalUnreadCount(0);
  }, []);

  // Fetch initial unread count when user changes
  useEffect(() => {
    if (user) {
      refreshUnreadCount();
      
      // Set up polling for unread count updates every 30 seconds (reduce frequency)
      const pollInterval = setInterval(refreshUnreadCount, 30000);

      // Set up WebSocket listeners for real-time updates
      const handleNewMessage = (data: unknown) => {
        console.log('New message received via WebSocket:', data);
        // Only refresh if we're not currently on the messenger page to avoid conflicts
        const currentPath = window.location.pathname;
        if (!currentPath.includes('/messenger')) {
          refreshUnreadCount();
        }
      };

      const handleMessageNotification = (data: unknown) => {
        console.log('Message notification received via WebSocket:', data);
        const notificationData = data as WebSocketNotificationData;
        // Update unread count based on notification
        if (notificationData.increment) {
          incrementUnreadCount(notificationData.increment);
        } else {
          // For message notifications, increment by 1
          incrementUnreadCount(1);
        }
      };

      // Connect to WebSocket if not already connected
      const token = localStorage.getItem('bloxmarket-token') || sessionStorage.getItem('bloxmarket-token');
      if (token && !socketService.isConnected) {
        socketService.connect(token);
      }

      // Set up WebSocket event listeners
      socketService.on('new_message', handleNewMessage);
      socketService.on('message_notification', handleMessageNotification);
      
      return () => {
        clearInterval(pollInterval);
        // Clean up WebSocket listeners
        socketService.off('new_message', handleNewMessage);
        socketService.off('message_notification', handleMessageNotification);
      };
    } else {
      setTotalUnreadCount(0);
      // Disconnect WebSocket when user logs out
      socketService.disconnect();
    }
  }, [user, refreshUnreadCount, incrementUnreadCount]);

  // Listen for custom events from socket or other components
  useEffect(() => {
    const handleChatMessageReceived = () => {
      refreshUnreadCount();
    };

    const handleChatUnreadUpdate = (event: CustomEvent) => {
      const { increment, decrement, reset } = event.detail;
      if (reset) {
        resetUnreadCount();
      } else if (increment) {
        incrementUnreadCount(increment);
      } else if (decrement) {
        decrementUnreadCount(decrement);
      }
    };

    window.addEventListener('chat-message-received', handleChatMessageReceived);
    window.addEventListener('chat-unread-update', handleChatUnreadUpdate as EventListener);

    return () => {
      window.removeEventListener('chat-message-received', handleChatMessageReceived);
      window.removeEventListener('chat-unread-update', handleChatUnreadUpdate as EventListener);
    };
  }, [incrementUnreadCount, decrementUnreadCount, resetUnreadCount, refreshUnreadCount]);

  const value: ChatNotificationContextType = {
    totalUnreadCount,
    refreshUnreadCount,
    incrementUnreadCount,
    decrementUnreadCount,
    resetUnreadCount
  };

  return (
    <ChatNotificationContext.Provider value={value}>
      {children}
    </ChatNotificationContext.Provider>
  );
};

// Re-export the context and types for convenience
export { ChatNotificationContext, type ChatNotificationContextType } from './ChatNotificationContextTypes';