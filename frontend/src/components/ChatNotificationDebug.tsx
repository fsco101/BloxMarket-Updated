import { useState } from 'react';
import { useChatNotifications } from '../hooks/useChatNotifications';
import { Button } from './ui/button';

export function ChatNotificationDebug() {
  const { totalUnreadCount, refreshUnreadCount, incrementUnreadCount } = useChatNotifications();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshUnreadCount();
    } catch (error) {
      console.error('Manual refresh failed:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleTestIncrement = () => {
    incrementUnreadCount(1);
  };

  return (
    <div className="fixed bottom-4 left-4 z-50 bg-slate-800 text-white p-4 rounded-lg shadow-lg">
      <h3 className="text-sm font-semibold mb-2">Chat Notification Debug</h3>
      <div className="text-xs space-y-1">
        <div>Total Unread Count: <span className="font-mono">{totalUnreadCount}</span></div>
        <div className="flex gap-2">
          <Button 
            size="sm" 
            onClick={handleRefresh} 
            disabled={isRefreshing}
          >
            {isRefreshing ? 'Refreshing...' : 'Refresh Count'}
          </Button>
          <Button 
            size="sm" 
            onClick={handleTestIncrement}
            variant="secondary"
          >
            Test +1
          </Button>
        </div>
      </div>
    </div>
  );
}