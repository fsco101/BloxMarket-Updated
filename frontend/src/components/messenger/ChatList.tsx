import React from 'react';
import { BootstrapAvatar } from '../ui/bootstrap-avatar';
import { BootstrapBadge } from '../ui/bootstrap-badge';
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
        <div className="p-4 text-center text-muted">
          <p className="mb-0">No conversations yet</p>
          <p className="small mb-0 mt-1">Start a new chat to begin messaging</p>
        </div>
      ) : (
        <div className="gap-1 p-2">
          {chats.map((chat) => (
            <div
              key={chat.chat_id}
              onClick={() => onChatSelect(chat)}
              className={`p-3 rounded-lg cursor-pointer hover-bg-light ${
                selectedChat?.chat_id === chat.chat_id
                  ? 'bg-primary bg-opacity-10 border-start border-primary border-4'
                  : ''
              }`}
              style={{ cursor: 'pointer' }}
            >
              <div className="d-flex align-items-center gap-3">
                <BootstrapAvatar src={chat.avatar_url} alt={chat.name} size="lg">
                  {chat.name.substring(0, 2).toUpperCase()}
                </BootstrapAvatar>

                <div className="flex-1 min-w-0">
                  <div className="d-flex align-items-center justify-content-between">
                    <h3 className="small fw-medium text-dark truncate mb-0">
                      {chat.name}
                    </h3>
                    {chat.last_message && (
                      <span className="small text-muted">
                        {formatLastMessageTime(chat.last_message.sent_at)}
                      </span>
                    )}
                  </div>

                  {chat.last_message ? (
                    <p className="small text-muted truncate mt-1 mb-0">
                      <span className="fw-medium">{chat.last_message.sender_username}: </span>
                      {truncateMessage(chat.last_message.content)}
                    </p>
                  ) : (
                    <p className="small text-muted mt-1 mb-0">
                      No messages yet
                    </p>
                  )}

                  <div className="d-flex align-items-center justify-content-between mt-2">
                    <div className="d-flex align-items-center gap-2">
                      {chat.chat_type === 'group' && (
                        <BootstrapBadge variant="secondary" className="small">
                          {chat.participants_count} members
                        </BootstrapBadge>
                      )}
                    </div>

                    {chat.unread_count > 0 && (
                      <BootstrapBadge variant="danger" className="small d-flex align-items-center justify-content-center min-w-5 h-5">
                        {chat.unread_count > 99 ? '99+' : chat.unread_count}
                      </BootstrapBadge>
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