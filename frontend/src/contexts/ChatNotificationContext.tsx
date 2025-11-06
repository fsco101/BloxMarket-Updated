import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../App';
import { apiService } from '../services/api';
import { ChatNotificationContext, type ChatNotificationContextType } from './ChatNotificationContext';

interface UnreadCountResponse {
  totalUnreadCount: number;
  chatCount: number;
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
      
      // Set up polling for unread count updates every 30 seconds
      const pollInterval = setInterval(refreshUnreadCount, 30000);
      
      return () => {
        clearInterval(pollInterval);
      };
    } else {
      setTotalUnreadCount(0);
    }
  }, [user, refreshUnreadCount]);

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