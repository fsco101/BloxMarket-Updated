import { useContext } from 'react';
import { ChatNotificationContext } from '../contexts/ChatNotificationContext.ts';

export const useChatNotifications = () => {
  const context = useContext(ChatNotificationContext);
  if (context === undefined) {
    throw new Error('useChatNotifications must be used within a ChatNotificationProvider');
  }
  return context;
};