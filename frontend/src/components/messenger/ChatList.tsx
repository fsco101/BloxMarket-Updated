import React, { useState, useEffect } from 'react';
import { BootstrapAvatar } from '../ui/bootstrap-avatar';
import { BootstrapBadge } from '../ui/bootstrap-badge';
import { BootstrapButton } from '../ui/bootstrap-button';
import { formatDistanceToNow } from 'date-fns';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSignOutAlt } from '@fortawesome/free-solid-svg-icons';
import { apiService } from '../../services/api';
import { socketService } from '../../services/socket';

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
  onChatLeft?: (chatId: string) => void; // Callback when a chat is left
}

export const ChatList: React.FC<ChatListProps> = ({
  chats,
  selectedChat,
  onChatSelect,
  onChatLeft
}) => {
  const [contextMenuChat, setContextMenuChat] = useState<Chat | null>(null);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });

  // Socket event listeners
  useEffect(() => {
    const handleUserLeftGroup = (data: unknown) => {
      const leaveData = data as { chat_id: string; user_id: string; username: string; message: string };
      // Show notification that someone left the group
      alert(`${leaveData.username} left the group chat`);
    };

    // Listen for user left group events
    socketService.on('user_left_group', handleUserLeftGroup);

    return () => {
      socketService.off('user_left_group', handleUserLeftGroup);
    };
  }, []);
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

  // Handle right-click context menu
  const handleContextMenu = (e: React.MouseEvent, chat: Chat) => {
    e.preventDefault();
    setContextMenuChat(chat);
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
  };

  // Handle leave group chat
  const handleLeaveGroupChat = async () => {
    if (!contextMenuChat) return;

    try {
      console.log('Leaving group chat:', contextMenuChat.chat_id);
      await apiService.leaveGroupChat(contextMenuChat.chat_id);
      console.log('Successfully left group chat, calling onChatLeft callback');
      setShowLeaveModal(false);
      setContextMenuChat(null);
      alert('You have successfully left the group chat.');
      // Call the callback to refresh the chat list
      onChatLeft?.(contextMenuChat.chat_id);
      console.log('onChatLeft callback called with chat_id:', contextMenuChat.chat_id);
    } catch (error) {
      console.error('Error leaving group chat:', error);
      alert('Failed to leave group chat. Please try again.');
    }
  };

  // Close context menu
  const closeContextMenu = () => {
    setContextMenuChat(null);
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
              onContextMenu={(e) => handleContextMenu(e, chat)}
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

      {/* Context Menu */}
      {contextMenuChat && (
        <div
          className="fixed z-50 bg-white border border-gray-300 rounded-lg shadow-lg py-1 min-w-48"
          style={{
            left: contextMenuPosition.x,
            top: contextMenuPosition.y,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenuChat.chat_type === 'group' && (
            <button
              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
              onClick={() => {
                setShowLeaveModal(true);
                closeContextMenu();
              }}
            >
              <FontAwesomeIcon icon={faSignOutAlt} />
              Leave Group Chat
            </button>
          )}
        </div>
      )}

      {/* Leave Group Chat Confirmation Modal */}
      <LeaveGroupChatModal
        isOpen={showLeaveModal}
        onClose={() => setShowLeaveModal(false)}
        onConfirm={handleLeaveGroupChat}
        chatName={contextMenuChat?.name || ''}
      />
    </div>
  );
};

// Leave Group Chat Modal Component
const LeaveGroupChatModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  chatName: string;
}> = ({ isOpen, onClose, onConfirm, chatName }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Leave Group Chat</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          {/* Content */}
          <div className="mb-6">
            <p className="text-gray-700 mb-3">
              Are you sure you want to leave <strong>{chatName}</strong>?
            </p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-yellow-800 text-sm mb-2">
                <strong>Warning:</strong> This action cannot be undone.
              </p>
              <ul className="text-yellow-700 text-sm list-disc list-inside space-y-1">
                <li>You will no longer have access to this group chat</li>
                <li>You will not receive new messages from this group</li>
                <li>Your previous messages will remain visible to other group members</li>
              </ul>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <BootstrapButton
              variant="outline-secondary"
              onClick={onClose}
            >
              Cancel
            </BootstrapButton>
            <BootstrapButton
              variant="danger"
              onClick={onConfirm}
            >
              Leave Group Chat
            </BootstrapButton>
          </div>
        </div>
      </div>
    </div>
  );
};