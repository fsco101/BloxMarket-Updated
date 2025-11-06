import { createContext } from 'react';

export interface ChatNotificationContextType {
  totalUnreadCount: number;
  refreshUnreadCount: () => Promise<void>;
  incrementUnreadCount: (count?: number) => void;
  decrementUnreadCount: (count?: number) => void;
  resetUnreadCount: () => void;
}

export const ChatNotificationContext = createContext<ChatNotificationContextType | undefined>(undefined);