import React, { useState } from 'react';
import { BootstrapAvatar } from '../ui/bootstrap-avatar';
import { BootstrapBadge } from '../ui/bootstrap-badge';
import { BootstrapButton } from '../ui/bootstrap-button';
import { formatDistanceToNow } from 'date-fns';
import { apiService } from '../../services/api';

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
  const [contextMenuChat, setContextMenuChat] = useState<Chat | null>(null);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  // Helper function to construct correct avatar URL
  const getAvatarUrl = (avatarUrl: string | undefined) => {
    if (!avatarUrl) return undefined;

    if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) {
      return avatarUrl;
    }

    if (avatarUrl.startsWith('/uploads/') || avatarUrl.startsWith('/api/uploads/')) {
      return `http://localhost:5000${avatarUrl}`;
    }

    // Assume it's just a filename from backend/uploads/avatars/
    return `http://localhost:5000/uploads/avatars/${avatarUrl}`;
  };

  // Handle right-click context menu
  const handleContextMenu = (e: React.MouseEvent, chat: Chat) => {
    e.preventDefault();
    setContextMenuChat(chat);
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
  };

  // Close context menu
  const closeContextMenu = () => {
    setContextMenuChat(null);
  };

  // Handle clear conversation
  const handleClearConversation = async () => {
    if (!contextMenuChat) return;

    try {
      await apiService.clearConversation(contextMenuChat.chat_id);
      setShowClearConfirm(false);
      setContextMenuChat(null);
      // Optionally refresh the chat list or show a success message
      alert('Conversation cleared successfully');
    } catch (error) {
      console.error('Failed to clear conversation:', error);
      alert('Failed to clear conversation. Please try again.');
    }
  };

  // Handle clear confirmation
  const handleClearConfirm = () => {
    setShowClearConfirm(true);
  };

  // Close clear confirmation
  const closeClearConfirm = () => {
    setShowClearConfirm(false);
  };
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
    <div className="flex-1 overflow-y-auto" onClick={closeContextMenu}>
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
              onContextMenu={(e) => handleContextMenu(e, chat)}
              className={`p-3 rounded-lg cursor-pointer hover-bg-light ${
                selectedChat?.chat_id === chat.chat_id
                  ? 'bg-primary bg-opacity-10 border-start border-primary border-4'
                  : ''
              }`}
              style={{ cursor: 'pointer' }}
            >
              <div className="d-flex align-items-center gap-3">
                <BootstrapAvatar src={getAvatarUrl(chat.avatar_url)} alt={chat.name} size="lg">
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

      {/* Context Menu */}
      {contextMenuChat && (
        <div
          className="position-fixed bg-white border rounded shadow-sm py-2"
          style={{
            left: contextMenuPosition.x,
            top: contextMenuPosition.y,
            zIndex: 1050,
            minWidth: '160px'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="dropdown-item d-flex align-items-center gap-2"
            onClick={() => {
              handleClearConfirm();
            }}
          >
            <i className="fas fa-trash-alt text-muted"></i>
            Clear Conversation
          </button>
        </div>
      )}

      {/* Clear Conversation Confirmation Modal */}
      {showClearConfirm && contextMenuChat && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Clear Conversation</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={closeClearConfirm}
                ></button>
              </div>
              <div className="modal-body">
                <p>Are you sure you want to clear the conversation with <strong>{contextMenuChat.name}</strong>?</p>
                <div className="alert alert-warning">
                  <small>
                    <i className="fas fa-exclamation-triangle me-1"></i>
                    This will hide all previous messages in this conversation for you only.
                    The other participant(s) will still be able to see the messages.
                  </small>
                </div>
              </div>
              <div className="modal-footer">
                <BootstrapButton
                  variant="secondary"
                  onClick={closeClearConfirm}
                >
                  Cancel
                </BootstrapButton>
                <BootstrapButton
                  variant="danger"
                  onClick={handleClearConversation}
                >
                  Clear Conversation
                </BootstrapButton>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};