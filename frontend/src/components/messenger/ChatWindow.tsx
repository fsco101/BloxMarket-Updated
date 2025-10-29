import React, { useState, useRef } from 'react';
import { BootstrapAvatar } from '../ui/bootstrap-avatar';
import { BootstrapButton } from '../ui/bootstrap-button';
import { BootstrapInput } from '../ui/bootstrap-input';
import { BootstrapScrollArea } from '../ui/bootstrap-scroll-area';
import { BootstrapBadge } from '../ui/bootstrap-badge';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaperPlane, faEllipsisV, faReply } from '@fortawesome/free-solid-svg-icons';
import { socketService } from '../../services/socket';
import { useApp } from '../../App';

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

interface Message {
  message_id: string;
  chat_id: string;
  sender: {
    user_id: string;
    username: string;
    avatar_url?: string;
  };
  content: string;
  message_type: 'text' | 'image' | 'file';
  file_url?: string;
  file_name?: string;
  file_size?: number;
  is_read: boolean;
  read_at?: string;
  edited: boolean;
  edited_at?: string;
  reply_to?: {
    message_id: string;
    content: string;
    sender_username: string;
  };
  reactions: Array<{
    user_id: string;
    emoji: string;
    created_at: string;
  }>;
  created_at: string;
}

interface ChatWindowProps {
  chat: Chat;
  messages: Message[];
  loading: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  onSendMessage: (content: string, replyTo?: string) => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  chat,
  messages,
  loading,
  messagesEndRef,
  onSendMessage
}) => {
  const [newMessage, setNewMessage] = useState('');
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { setCurrentPage } = useApp();

  // Handle typing indicators
  const handleInputChange = (value: string) => {
    setNewMessage(value);

    if (!isTyping) {
      setIsTyping(true);
      socketService.startTyping(chat.chat_id);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      socketService.stopTyping(chat.chat_id);
    }, 1000);
  };

  // Handle sending message
  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    onSendMessage(newMessage.trim(), replyTo?.message_id);
    setNewMessage('');
    setReplyTo(null);

    if (isTyping) {
      setIsTyping(false);
      socketService.stopTyping(chat.chat_id);
    }
  };

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Handle user profile navigation
  const handleUserProfileClick = (userId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setCurrentPage(`profile-${userId}`);
  };

  // Format message time
  const formatMessageTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

      if (diffInHours < 24) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } else {
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
      }
    } catch {
      return '';
    }
  };

  // Group messages by date
  const groupMessagesByDate = (messages: Message[]) => {
    const groups: { [key: string]: Message[] } = {};

    messages.forEach(message => {
      const date = new Date(message.created_at).toDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(message);
    });

    return groups;
  };

  const messageGroups = groupMessagesByDate(messages);

  return (
    <div className="d-flex flex-column h-100">
      {/* Chat Header */}
      <div className="p-4 border-bottom border-secondary bg-white">
        <div className="d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center gap-3">
            <BootstrapAvatar src={chat.avatar_url} alt={chat.name} size="lg">
              {chat.name.substring(0, 2).toUpperCase()}
            </BootstrapAvatar>
            <div>
              <h2 className="h5 mb-0 fw-semibold text-dark">
                {chat.name}
              </h2>
              {chat.chat_type === 'group' && (
                <p className="mb-0 small text-muted">
                  {chat.participants_count} members
                </p>
              )}
            </div>
          </div>
          <BootstrapButton variant="outline-secondary" size="sm">
            <FontAwesomeIcon icon={faEllipsisV} />
          </BootstrapButton>
        </div>
      </div>

      {/* Messages Area */}
      <BootstrapScrollArea className="flex-1 p-4">
        {loading ? (
          <div className="d-flex align-items-center justify-content-center h-100">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        ) : (
          <div className="gap-4">
            {Object.entries(messageGroups).map(([date, dateMessages]) => (
              <div key={date}>
                {/* Date separator */}
                <div className="d-flex align-items-center justify-content-center my-4">
                  <div className="bg-secondary text-muted small px-3 py-1 rounded-pill">
                    {new Date(date).toLocaleDateString([], {
                      weekday: 'long',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </div>
                </div>

                {/* Messages for this date */}
                <div className="gap-2">
                  {dateMessages.map((message) => (
                    <div key={message.message_id} className="group">
                      {/* Reply indicator */}
                      {message.reply_to && (
                        <div className="ms-12 mb-1 p-2 bg-light rounded border-start border-primary">
                          <p className="small text-muted mb-0">
                            Replying to <span className="fw-medium">{message.reply_to.sender_username}</span>
                          </p>
                          <p className="small text-dark mb-0 truncate">
                            {message.reply_to.content}
                          </p>
                        </div>
                      )}

                      <div className="d-flex align-items-start gap-3">
                        <div
                          onClick={(e) => handleUserProfileClick(message.sender.user_id, e)}
                          className="cursor-pointer"
                          style={{ cursor: 'pointer' }}
                        >
                          <BootstrapAvatar src={message.sender.avatar_url} alt={message.sender.username} size="sm">
                            {message.sender.username.substring(0, 2).toUpperCase()}
                          </BootstrapAvatar>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="d-flex align-items-center gap-2 mb-1">
                            <span
                              className="small fw-medium text-dark cursor-pointer"
                              style={{ cursor: 'pointer' }}
                              onClick={(e) => handleUserProfileClick(message.sender.user_id, e)}
                            >
                              {message.sender.username}
                            </span>
                            <span className="small text-muted">
                              {formatMessageTime(message.created_at)}
                            </span>
                            {message.edited && (
                              <span className="small text-muted">
                                (edited)
                              </span>
                            )}
                          </div>

                          <div className="small text-dark bg-light p-3 rounded">
                            {message.content}
                          </div>

                          {/* Reactions */}
                          {message.reactions.length > 0 && (
                            <div className="d-flex flex-wrap gap-1 mt-2">
                              {message.reactions.map((reaction, index) => (
                                <BootstrapBadge key={index} variant="secondary" className="small">
                                  {reaction.emoji}
                                </BootstrapBadge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </BootstrapScrollArea>

      {/* Reply indicator */}
      {replyTo && (
        <div className="px-4 py-2 bg-primary bg-opacity-10 border-top border-primary">
          <div className="d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center gap-2">
              <FontAwesomeIcon icon={faReply} className="text-primary" />
              <span className="small text-dark">
                Replying to <span className="fw-medium">{replyTo.sender.username}</span>
              </span>
            </div>
            <BootstrapButton
              variant="outline-primary"
              size="sm"
              onClick={() => setReplyTo(null)}
              className="border-0"
            >
              ✕
            </BootstrapButton>
          </div>
          <p className="small text-dark mt-1 truncate">
            {replyTo.content}
          </p>
        </div>
      )}

      {/* Message Input */}
      <div className="p-4 border-top border-secondary bg-white">
        <div className="d-flex align-items-center gap-2">
          <BootstrapInput
            ref={inputRef}
            value={newMessage}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className="flex-1"
            noWrapper
          />
          <BootstrapButton
            onClick={handleSendMessage}
            disabled={!newMessage.trim()}
            size="sm"
          >
            <FontAwesomeIcon icon={faPaperPlane} />
          </BootstrapButton>
        </div>
      </div>
    </div>
  );
};