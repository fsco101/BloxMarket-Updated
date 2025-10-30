import React, { useState, useRef, useEffect, useCallback } from 'react';
import { BootstrapAvatar } from '../ui/bootstrap-avatar';
import { BootstrapButton } from '../ui/bootstrap-button';
import { BootstrapInput } from '../ui/bootstrap-input';
import { BootstrapScrollArea } from '../ui/bootstrap-scroll-area';
import { BootstrapBadge } from '../ui/bootstrap-badge';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaperPlane, faEllipsisV, faReply, faImage, faSignOutAlt, faUserPlus, faSearch } from '@fortawesome/free-solid-svg-icons';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { socketService } from '../../services/socket';
import { useApp } from '../../App';
import { useAuth } from '../../App';
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

interface Message {
  message_id: string;
  chat_id: string;
  sender: {
    user_id: string;
    username: string;
    avatar_url?: string;
  };
  content: string;
  message_type: 'text' | 'image' | 'file' | 'system';
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

interface User {
  user_id: string;
  username: string;
  avatar_url?: string;
  display_name?: string;
}

interface ProfileData {
  user: {
    _id: string;
    username: string;
    roblox_username?: string;
    bio?: string;
    discord_username?: string;
    messenger_link?: string;
    website?: string;
    avatar_url?: string;
    role: string;
    credibility_score: number;
    vouch_count: number;
    is_verified?: boolean;
    is_middleman?: boolean;
    createdAt: string;
    last_active?: string;
    location?: string;
  };
  stats: {
    totalTrades: number;
    completedTrades: number;
    totalVouches: number;
    successRate: number;
  };
}

interface ChatWindowProps {
  chat: Chat;
  messages: Message[];
  loading: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  onSendMessage: (content: string, replyTo?: string, messageType?: 'text' | 'image', fileUrl?: string, fileName?: string, fileSize?: number) => void;
  onChatLeft?: (chatId: string) => void;
  onAddSystemMessage?: (message: Message) => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  chat,
  messages,
  loading,
  messagesEndRef,
  onSendMessage,
  onChatLeft,
  onAddSystemMessage
}) => {
  const [newMessage, setNewMessage] = useState('');
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const typingTimeoutRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { setCurrentPage } = useApp();
  const { user: currentUser } = useAuth();
  
  console.log('ChatWindow render - messages:', messages);
  console.log('ChatWindow render - loading:', loading);
  
  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, messagesEndRef]);
  
  // Helper function to construct correct avatar URL
  const getAvatarUrl = (avatarUrl: string | undefined) => {
    if (!avatarUrl) return undefined;
    // Ensure the URL is absolute by prepending API base if it's a relative path
    if (avatarUrl.startsWith('/uploads/')) {
      return `http://localhost:5000${avatarUrl}`;
    }
    return avatarUrl;
  };

  // Helper to build absolute URL for uploaded files (images)
  const getFileUrl = (fileUrl: string | undefined) => {
    if (!fileUrl) return undefined;
    if (fileUrl.startsWith('/uploads/')) {
      return `http://localhost:5000${fileUrl}`;
    }
    return fileUrl;
  };
  
  // Profile modal state
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  // Image viewer modal state
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageMessages, setImageMessages] = useState<Message[]>([]);

  // Leave group chat modal state
  const [showLeaveModal, setShowLeaveModal] = useState(false);

  // Add user modal state
  const [showAddUserModal, setShowAddUserModal] = useState(false);

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

  // Socket event listeners
  useEffect(() => {
    // No need for user_left_group handler here since Messenger handles it
    return () => {
      // Cleanup if needed
    };
  }, [chat.chat_id]);

  // Handle sending message
  const handleSendMessage = async () => {
    if (!newMessage.trim() && selectedFiles.length === 0) return;

    setIsUploading(true);
    try {
      if (selectedFiles.length > 0) {
        // Upload all images and send messages for each
        const uploadPromises = selectedFiles.map(async (file) => {
          const formData = new FormData();
          formData.append('image', file);
          formData.append('chat_id', chat.chat_id);

          const uploadResponse = await apiService.uploadChatImage(chat.chat_id, file);
          return {
            file,
            uploadResponse
          };
        });

        const uploadResults = await Promise.all(uploadPromises);

        // Send a message for each uploaded image
        const messagePromises = uploadResults.map(async ({ uploadResponse }) => {
          const content = selectedFiles.length === 1 ? (newMessage.trim() || '📷 Image') : '📷 Image';
          return onSendMessage(
            content,
            replyTo?.message_id,
            'image',
            uploadResponse.file_url,
            uploadResponse.file_name,
            uploadResponse.file_size
          );
        });

        await Promise.all(messagePromises);
      } else {
        // Send text message
        onSendMessage(newMessage.trim(), replyTo?.message_id);
      }

      setNewMessage('');
      setSelectedFiles([]);
      clearFileInput();
      setReplyTo(null);
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    if (files.length === 0) return;

    // Validate file types (images only)
    const invalidFiles = files.filter(file => !file.type.startsWith('image/'));
    if (invalidFiles.length > 0) {
      alert('Please select only image files');
      return;
    }

    // Validate file sizes (max 5MB each)
    const oversizedFiles = files.filter(file => file.size > 5 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      alert('Each file must be less than 5MB');
      return;
    }

    // Limit to maximum 10 images at once
    if (files.length > 10) {
      alert('You can upload a maximum of 10 images at once');
      return;
    }

    setSelectedFiles(files);
    clearFileInput();
  };

  // Handle image upload button click
  const handleImageUpload = () => {
    fileInputRef.current?.click();
  };

  // Clear file input after selection
  const clearFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle user profile navigation
  const handleUserProfileClick = async (userId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    
    try {
      setProfileLoading(true);
      setShowProfileModal(true);
      
      const data = await apiService.getUserProfile(userId);
      setProfileData(data);
    } catch (error) {
      console.error('Error loading profile:', error);
      setShowProfileModal(false);
    } finally {
      setProfileLoading(false);
    }
  };

  // Close profile modal
  const closeProfileModal = () => {
    setShowProfileModal(false);
    setProfileData(null);
  };

  // Navigate to full profile page
  const navigateToProfile = (userId: string) => {
    setCurrentPage(`profile-${userId}`);
    closeProfileModal();
  };

  // Handle image click to open viewer
  const handleImageClick = (clickedMessage: Message) => {
    // Get all image messages from current messages
    const allImageMessages = messages.filter(msg => msg.message_type === 'image' && msg.file_url);
    
    // Find the index of the clicked image
    const clickedIndex = allImageMessages.findIndex(msg => msg.message_id === clickedMessage.message_id);
    
    if (clickedIndex !== -1) {
      setImageMessages(allImageMessages);
      setCurrentImageIndex(clickedIndex);
      setShowImageViewer(true);
    }
  };

  // Close image viewer
  const closeImageViewer = () => {
    setShowImageViewer(false);
    setImageMessages([]);
    setCurrentImageIndex(0);
  };

  // Navigate to next/previous image
  const navigateImage = (direction: 'next' | 'prev') => {
    if (direction === 'next') {
      setCurrentImageIndex((prev) => (prev + 1) % imageMessages.length);
    } else {
      setCurrentImageIndex((prev) => (prev - 1 + imageMessages.length) % imageMessages.length);
    }
  };

  // Handle leave group chat
  const handleLeaveGroupChat = async () => {
    try {
      console.log('ChatWindow: Leaving group chat:', chat.chat_id);
      await apiService.leaveGroupChat(chat.chat_id);
      console.log('ChatWindow: Successfully left group chat, calling onChatLeft callback');
      
      // Add a system message to show the user left
      const systemMessage: Message = {
        message_id: `system_leave_${Date.now()}`,
        chat_id: chat.chat_id,
        sender: {
          user_id: 'system',
          username: 'System',
          avatar_url: undefined
        },
        content: 'You left the group chat',
        message_type: 'system',
        is_read: true,
        edited: false,
        reactions: [],
        created_at: new Date().toISOString()
      };
      
      // Add the system message to the messages
      if (onAddSystemMessage) {
        onAddSystemMessage(systemMessage);
      }
      
      // Close the modal
      setShowLeaveModal(false);
      // Notify parent component that chat was left
      if (onChatLeft) {
        console.log('ChatWindow: Calling onChatLeft with chat_id:', chat.chat_id);
        onChatLeft(chat.chat_id);
      } else {
        console.log('ChatWindow: onChatLeft callback not provided');
      }
      alert('You have successfully left the group chat. All your messages and uploaded files have been deleted.');
    } catch (error) {
      console.error('ChatWindow: Error leaving group chat:', error);
      alert('Failed to leave group chat. Please try again.');
    }
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
    console.log('groupMessagesByDate called with messages:', messages);
    if (!messages || !Array.isArray(messages)) {
      console.log('Messages is not an array or is empty');
      return {};
    }
    
    const groups: { [key: string]: Message[] } = {};

    messages.forEach(message => {
      const date = new Date(message.created_at).toDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(message);
    });

    // Sort messages within each date group by created_at (ascending - oldest first)
    Object.keys(groups).forEach(date => {
      groups[date].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    });

    console.log('Grouped messages:', groups);
    return groups;
  };

  const messageGroups = groupMessagesByDate(messages || []);
  console.log('Message groups:', messageGroups);
  console.log('Object.keys(messageGroups):', Object.keys(messageGroups));

  return (
    <div className="d-flex flex-column h-100">
      {/* Chat Header */}
      <div className="p-4 border-bottom border-secondary bg-white">
        <div className="d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center gap-3">
            <BootstrapAvatar src={getAvatarUrl(chat.avatar_url)} alt={chat.name} size="lg">
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <BootstrapButton variant="outline-secondary" size="sm">
                <FontAwesomeIcon icon={faEllipsisV} />
              </BootstrapButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {chat.chat_type === 'group' && (
                <>
                  <DropdownMenuItem
                    onClick={() => setShowAddUserModal(true)}
                  >
                    <FontAwesomeIcon icon={faUserPlus} className="me-2" />
                    Add User
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setShowLeaveModal(true)}
                    className="text-danger"
                  >
                    <FontAwesomeIcon icon={faSignOutAlt} className="me-2" />
                    Leave Groupchat
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
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
                  {dateMessages.map((message) => {
                    console.log('Rendering message:', message);
                    // Safety check for message data
                    if (!message || !message.sender) {
                      console.log('Message or sender is null/undefined');
                      return null;
                    }
                    
                    // Handle system messages
                    if (message.message_type === 'system') {
                      return (
                        <div key={message.message_id} className="d-flex justify-content-center my-2">
                          <div className="bg-light text-muted small px-3 py-2 rounded-pill border">
                            {message.content}
                          </div>
                        </div>
                      );
                    }
                    
                    const isCurrentUser = currentUser && message.sender.user_id === currentUser.id;
                    
                    return (
                      <div key={message.message_id} className={`group ${isCurrentUser ? 'd-flex justify-content-end' : ''}`}>
                        {/* Reply indicator */}
                        {message.reply_to && (
                          <div className={`${isCurrentUser ? 'me-12' : 'ms-12'} mb-1 p-2 bg-light rounded border-start border-primary`}>
                            <p className="small text-muted mb-0">
                              Replying to <span className="fw-medium">{message.reply_to.sender_username}</span>
                            </p>
                            <p className="small text-dark mb-0 truncate">
                              {message.reply_to.content}
                            </p>
                          </div>
                        )}

                        <div className={`d-flex align-items-start gap-3 ${isCurrentUser ? 'flex-row-reverse' : ''}`}>
                          {!isCurrentUser && (
                            <div
                              onClick={(e) => handleUserProfileClick(message.sender.user_id, e)}
                              className="cursor-pointer"
                              style={{ cursor: 'pointer' }}
                            >
                              <BootstrapAvatar src={getAvatarUrl(message.sender.avatar_url)} alt={message.sender.username} size="sm">
                                {message.sender.username.substring(0, 2).toUpperCase()}
                              </BootstrapAvatar>
                            </div>
                          )}

                          <div className={`flex-1 min-w-0 ${isCurrentUser ? 'text-end' : ''}`}>
                            {!isCurrentUser && (
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
                            )}

                            {isCurrentUser && (
                              <div className="d-flex align-items-center justify-content-end gap-2 mb-1">
                                {message.edited && (
                                  <span className="small text-muted">
                                    (edited)
                                  </span>
                                )}
                                <span className="small text-muted">
                                  {formatMessageTime(message.created_at)}
                                </span>
                              </div>
                            )}

                            <div className={`small text-dark p-3 rounded ${isCurrentUser ? 'bg-primary text-white' : 'bg-light'}`}>
                              {message.message_type === 'image' && message.file_url ? (
                                <div className="d-flex flex-column align-items-center gap-2">
                                  <img
                                    src={getFileUrl(message.file_url)}
                                    alt={message.file_name || 'chat-image'}
                                    style={{ maxWidth: '320px', maxHeight: '320px', borderRadius: 8, cursor: 'pointer' }}
                                    onClick={() => handleImageClick(message)}
                                    className="hover:opacity-90 transition-opacity"
                                  />
                                  {message.content && (
                                    <div className={`small ${isCurrentUser ? 'text-white' : 'text-dark'}`}>
                                      {message.content}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                message.content
                              )}
                            </div>

                            {/* Reactions */}
                            {message.reactions && Array.isArray(message.reactions) && message.reactions.length > 0 && (
                              <div className={`d-flex flex-wrap gap-1 mt-2 ${isCurrentUser ? 'justify-content-end' : ''}`}>
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
                    );
                  })}
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
            variant="outline-secondary"
            size="sm"
            onClick={handleImageUpload}
            title="Upload image"
          >
            <FontAwesomeIcon icon={faImage} />
          </BootstrapButton>
          <BootstrapButton
            onClick={handleSendMessage}
            disabled={(!newMessage.trim() && selectedFiles.length === 0) || isUploading}
            size="sm"
          >
            {isUploading ? (
              <div className="spinner-border spinner-border-sm" role="status">
                <span className="visually-hidden">Uploading...</span>
              </div>
            ) : (
              <FontAwesomeIcon icon={faPaperPlane} />
            )}
          </BootstrapButton>
        </div>
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
        {/* Selected files indicator */}
        {selectedFiles.length > 0 && (
          <div className="mt-2">
            {selectedFiles.map((file, index) => (
              <div key={index} className="d-flex align-items-center justify-content-between p-2 bg-light rounded mb-1">
                <span className="small text-dark">
                  📷 {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                </span>
                <BootstrapButton
                  variant="outline-danger"
                  size="sm"
                  onClick={() => {
                    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
                  }}
                  className="border-0"
                >
                  ✕
                </BootstrapButton>
              </div>
            ))}
            <div className="d-flex justify-content-between align-items-center mt-2">
              <span className="small text-muted">
                {selectedFiles.length} image{selectedFiles.length > 1 ? 's' : ''} selected
              </span>
              <BootstrapButton
                variant="outline-secondary"
                size="sm"
                onClick={() => {
                  setSelectedFiles([]);
                  clearFileInput();
                }}
              >
                Clear All
              </BootstrapButton>
            </div>
          </div>
        )}
      </div>

      {/* Profile Modal */}
      <ProfileModal
        isOpen={showProfileModal}
        onClose={closeProfileModal}
        profileData={profileData}
        loading={profileLoading}
        onNavigateToProfile={navigateToProfile}
      />

      {/* Image Viewer Modal */}
      <ImageViewerModal
        isOpen={showImageViewer}
        onClose={closeImageViewer}
        images={imageMessages}
        currentIndex={currentImageIndex}
        onNavigate={navigateImage}
      />

      {/* Leave Group Chat Confirmation Modal */}
      <LeaveGroupChatModal
        isOpen={showLeaveModal}
        onClose={() => setShowLeaveModal(false)}
        onConfirm={handleLeaveGroupChat}
        chatName={chat.name}
      />

      {/* Add User Modal */}
      <AddUserModal
        isOpen={showAddUserModal}
        onClose={() => setShowAddUserModal(false)}
        chatId={chat.chat_id}
        chatName={chat.name}
      />
    </div>
  );
};

// Profile Modal Component
const ProfileModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  profileData: ProfileData | null;
  loading: boolean;
  onNavigateToProfile: (userId: string) => void;
}> = ({ isOpen, onClose, profileData, loading, onNavigateToProfile }) => {
  if (!isOpen) return null;

  const getAvatarUrl = (avatarUrl?: string) => {
    if (!avatarUrl) return undefined;
    // Ensure the URL is absolute by prepending API base if it's a relative path
    if (avatarUrl.startsWith('/uploads/')) {
      return `http://localhost:5000${avatarUrl}`;
    }
    return avatarUrl;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        {loading ? (
          <div className="p-6 text-center">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-2 text-gray-600">Loading profile...</p>
          </div>
        ) : profileData ? (
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">User Profile</h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            {/* Profile Content */}
            <div className="text-center mb-4">
              <BootstrapAvatar
                src={getAvatarUrl(profileData.user.avatar_url)}
                alt={profileData.user.username}
                size="xl"
                className="mx-auto mb-3"
              >
                {profileData.user.username.substring(0, 2).toUpperCase()}
              </BootstrapAvatar>
              
              <h4 className="text-xl font-semibold text-gray-900 mb-1">
                {profileData.user.username}
              </h4>
              
              {profileData.user.is_verified && (
                <BootstrapBadge variant="success" className="mb-2">
                  ✓ Verified
                </BootstrapBadge>
              )}
              
              {profileData.user.is_middleman && (
                <BootstrapBadge variant="info" className="mb-2 ml-2">
                  Middleman
                </BootstrapBadge>
              )}
              
              <p className="text-sm text-gray-600 mb-2">
                Role: {profileData.user.role}
              </p>
              
              {profileData.user.bio && (
                <p className="text-sm text-gray-700 mb-3">{profileData.user.bio}</p>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="text-center p-3 bg-gray-50 rounded">
                <div className="text-2xl font-bold text-blue-600">
                  {profileData.stats.totalTrades}
                </div>
                <div className="text-sm text-gray-600">Total Trades</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded">
                <div className="text-2xl font-bold text-green-600">
                  {profileData.stats.successRate}%
                </div>
                <div className="text-sm text-gray-600">Success Rate</div>
              </div>
            </div>

            {/* Additional Info */}
            <div className="space-y-2 text-sm text-gray-600 mb-4">
              {profileData.user.roblox_username && (
                <p><strong>Roblox:</strong> {profileData.user.roblox_username}</p>
              )}
              {profileData.user.discord_username && (
                <p><strong>Discord:</strong> {profileData.user.discord_username}</p>
              )}
              {profileData.user.location && (
                <p><strong>Location:</strong> {profileData.user.location}</p>
              )}
              <p><strong>Member since:</strong> {new Date(profileData.user.createdAt).toLocaleDateString()}</p>
              {profileData.user.last_active && (
                <p><strong>Last active:</strong> {new Date(profileData.user.last_active).toLocaleDateString()}</p>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <BootstrapButton
                variant="primary"
                className="flex-1"
                onClick={() => onNavigateToProfile(profileData.user._id)}
              >
                View Full Profile
              </BootstrapButton>
              <BootstrapButton
                variant="outline-secondary"
                onClick={onClose}
              >
                Close
              </BootstrapButton>
            </div>
          </div>
        ) : (
          <div className="p-6 text-center">
            <p className="text-red-600">Failed to load profile data</p>
            <BootstrapButton
              variant="outline-secondary"
              className="mt-2"
              onClick={onClose}
            >
              Close
            </BootstrapButton>
          </div>
        )}
      </div>
    </div>
  );
};

// Image Viewer Modal Component
const ImageViewerModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  images: Message[];
  currentIndex: number;
  onNavigate: (direction: 'next' | 'prev') => void;
}> = ({ isOpen, onClose, images, currentIndex, onNavigate }) => {
  const currentImage = images[currentIndex];
  const getFileUrl = (fileUrl: string | undefined) => {
    if (!fileUrl) return undefined;
    if (fileUrl.startsWith('/uploads/')) {
      return `http://localhost:5000${fileUrl}`;
    }
    return fileUrl;
  };

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        onNavigate('prev');
      } else if (e.key === 'ArrowRight') {
        onNavigate('next');
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyPress);
      return () => document.removeEventListener('keydown', handleKeyPress);
    }
  }, [isOpen, onNavigate, onClose]);

  if (!isOpen || images.length === 0) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white text-2xl hover:text-gray-300 z-60"
      >
        ✕
      </button>

      {/* Navigation buttons */}
      {images.length > 1 && (
        <>
          <button
            onClick={() => onNavigate('prev')}
            className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white text-3xl hover:text-gray-300 z-60"
          >
            ‹
          </button>
          <button
            onClick={() => onNavigate('next')}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white text-3xl hover:text-gray-300 z-60"
          >
            ›
          </button>
        </>
      )}

      {/* Main image */}
      <div className="max-w-full max-h-full p-4 flex flex-col items-center justify-center">
        <img
          src={getFileUrl(currentImage.file_url)}
          alt={currentImage.file_name || 'chat-image'}
          className="max-w-full max-h-full object-contain"
          style={{ maxWidth: '90vw', maxHeight: '90vh' }}
        />

        {/* Image info */}
        <div className="mt-4 text-white text-center">
          <p className="text-sm opacity-80">
            {currentImage.file_name || 'Image'}
            {currentImage.file_size && ` (${(currentImage.file_size / 1024 / 1024).toFixed(2)} MB)`}
          </p>
          <p className="text-xs opacity-60 mt-1">
            {currentImage.sender.username} • {new Date(currentImage.created_at).toLocaleString()}
          </p>
          {currentImage.content && currentImage.content !== '📷 Image' && (
            <p className="text-sm mt-2 max-w-md">{currentImage.content}</p>
          )}
        </div>

        {/* Image counter */}
        {images.length > 1 && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white text-sm bg-black bg-opacity-50 px-3 py-1 rounded">
            {currentIndex + 1} / {images.length}
          </div>
        )}
      </div>
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
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 text-sm mb-2">
                <strong>Warning:</strong> This action cannot be undone.
              </p>
              <ul className="text-red-700 text-sm list-disc list-inside space-y-1">
                <li>All your messages in this group chat will be permanently deleted</li>
                <li>All images and files you uploaded will be permanently deleted</li>
                <li>You will no longer have access to this group chat</li>
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

// Add User Modal Component
const AddUserModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  chatId: string;
  chatName: string;
}> = ({ isOpen, onClose, chatId, chatName }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);

  const searchUsers = useCallback(async () => {
    try {
      setSearching(true);
      const response = await apiService.searchUsers(searchQuery);
      setUsers(response.users || []);
    } catch (error) {
      console.error('Failed to search users:', error);
    } finally {
      setSearching(false);
    }
  }, [searchQuery]);

  // Search users when query changes
  useEffect(() => {
    if (searchQuery.trim().length >= 2) {
      searchUsers();
    } else {
      setUsers([]);
    }
  }, [searchQuery, searchUsers]);

  const handleUserSelect = (user: User) => {
    setSelectedUser(user);
  };

  const handleAddUser = async () => {
    if (!selectedUser) {
      return;
    }

    setLoading(true);

    try {
      await apiService.addParticipant(chatId, selectedUser.user_id);
      setSearchQuery('');
      setUsers([]);
      setSelectedUser(null);
      onClose();
      alert('User added successfully!');
    } catch (error) {
      console.error('Error adding user:', error);
      alert(error instanceof Error ? error.message : 'Failed to add user. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getAvatarUrl = (avatarUrl: string | undefined) => {
    if (!avatarUrl) return undefined;
    if (avatarUrl.startsWith('/uploads/')) {
      return `http://localhost:5000${avatarUrl}`;
    }
    return avatarUrl;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Add User to {chatName}</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          {/* Content */}
          <div className="mb-6">
            <div className="mb-4">
              <label htmlFor="search" className="form-label">Search Users</label>
              <div className="position-relative">
                <FontAwesomeIcon icon={faSearch} className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted" />
                <BootstrapInput
                  id="search"
                  placeholder="Search by username..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="ps-5"
                  noWrapper
                />
              </div>
            </div>

            {searching && (
              <div className="text-center py-4">
                <div className="spinner-border spinner-border-sm text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            )}

            {!searching && users.length > 0 && (
              <div className="max-h-48 overflow-y-auto space-y-2 mb-4">
                {users.map((user) => (
                  <div
                    key={user.user_id}
                    className={`d-flex align-items-center space-x-3 p-2 rounded-lg cursor-pointer hover-bg-light ${selectedUser?.user_id === user.user_id ? 'bg-primary bg-opacity-10 border border-primary' : ''}`}
                    onClick={() => handleUserSelect(user)}
                    style={{ cursor: 'pointer' }}
                  >
                    <BootstrapAvatar src={getAvatarUrl(user.avatar_url)} alt={user.username} size="sm">
                      {user.username.substring(0, 2).toUpperCase()}
                    </BootstrapAvatar>
                    <div className="flex-1 ms-3">
                      <p className="mb-0 fw-medium text-dark">{user.display_name || user.username}</p>
                      <p className="mb-0 small text-muted">@{user.username}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!searching && searchQuery.length >= 2 && users.length === 0 && (
              <div className="text-center py-4 text-muted mb-4">
                No users found
              </div>
            )}

            {selectedUser && (
              <div className="p-3 bg-light rounded">
                <p className="mb-1 small text-muted">Selected User:</p>
                <div className="d-flex align-items-center gap-2">
                  <BootstrapAvatar src={getAvatarUrl(selectedUser.avatar_url)} alt={selectedUser.username} size="sm">
                    {selectedUser.username.substring(0, 2).toUpperCase()}
                  </BootstrapAvatar>
                  <div>
                    <p className="mb-0 fw-medium text-dark">{selectedUser.display_name || selectedUser.username}</p>
                    <p className="mb-0 small text-muted">@{selectedUser.username}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <BootstrapButton
              variant="outline-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </BootstrapButton>
            <BootstrapButton
              onClick={handleAddUser}
              disabled={loading || !selectedUser}
            >
              {loading ? (
                <>
                  <div className="spinner-border spinner-border-sm me-2" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  Adding...
                </>
              ) : (
                'Add User'
              )}
            </BootstrapButton>
          </div>
        </div>
      </div>
    </div>
  );
};