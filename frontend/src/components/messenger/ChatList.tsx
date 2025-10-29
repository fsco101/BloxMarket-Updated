import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { formatDistanceToNow } from 'date-fns';

interface Chat {
  chat_id: string;
  chat_type: 'direct' | 'group';
  name: string;
  avatar_url?: string;
  description?: string;
  last_message?: {
    content: string;
    sender_username: string;
    sent_at: string;
  };
  unread_count: number;
  participants_count: number;
  message_count: number;
  created_at: string;
  updated_at: string;
}

interface ChatListProps {
  chats: Chat[];
  selectedChat: Chat | null;
  onChatSelect: (chat: Chat) => void;
}

export const ChatList: React.FC<ChatListProps> = ({
  chats,
  selectedChat,
  onChatSelect
}) => {
  const formatLastMessageTime = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch {
      return '';
    }
  };

  const truncateMessage = (message: string, maxLength: number = 50) => {
    if (message.length <= maxLength) return message;
    return message.substring(0, maxLength) + '...';
  };

  return (
    <div className="flex-1 overflow-y-auto">
      {chats.length === 0 ? (
        <div className="p-4 text-center text-gray-500">
          <p>No conversations yet</p>
          <p className="text-sm mt-1">Start a new chat to begin messaging</p>
        </div>
      ) : (
        <div className="space-y-1 p-2">
          {chats.map((chat) => (
            <div
              key={chat.chat_id}
              onClick={() => onChatSelect(chat)}
              className={`p-3 rounded-lg cursor-pointer transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 ${
                selectedChat?.chat_id === chat.chat_id
                  ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500'
                  : ''
              }`}
            >
              <div className="flex items-center space-x-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={chat.avatar_url} alt={chat.name} />
                  <AvatarFallback>
                    {chat.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {chat.name}
                    </h3>
                    {chat.last_message && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {formatLastMessageTime(chat.last_message.sent_at)}
                      </span>
                    )}
                  </div>

                  {chat.last_message ? (
                    <p className="text-sm text-gray-600 dark:text-gray-300 truncate mt-1">
                      <span className="font-medium">{chat.last_message.sender_username}: </span>
                      {truncateMessage(chat.last_message.content)}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      No messages yet
                    </p>
                  )}

                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center space-x-2">
                      {chat.chat_type === 'group' && (
                        <Badge variant="secondary" className="text-xs">
                          {chat.participants_count} members
                        </Badge>
                      )}
                    </div>

                    {chat.unread_count > 0 && (
                      <Badge variant="destructive" className="text-xs h-5 min-w-5 flex items-center justify-center">
                        {chat.unread_count > 99 ? '99+' : chat.unread_count}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};