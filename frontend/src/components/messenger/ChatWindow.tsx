import React, { useState, useRef, useEffect, useCallback } from 'react';
import { BootstrapAvatar } from '../ui/bootstrap-avatar';
import { BootstrapButton } from '../ui/bootstrap-button';
import { BootstrapInput } from '../ui/bootstrap-input';
import { BootstrapBadge } from '../ui/bootstrap-badge';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEllipsisV, faReply, faSignOutAlt, faUserPlus, faSearch, faUsers, faCrown, faInfoCircle, faCheckDouble, faCamera, faArrowRight } from '@fortawesome/free-solid-svg-icons';
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
import { alertService } from '../../services/alertService';

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
  created_by?: string;
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

    if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) {
      return avatarUrl;
    }

    if (avatarUrl.startsWith('/uploads/') || avatarUrl.startsWith('/api/uploads/')) {
      return `http://localhost:5000${avatarUrl}`;
    }

    // Assume it's just a filename from backend/uploads/avatars/
    return `http://localhost:5000/uploads/avatars/${avatarUrl}`;
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

  // View members modal state
  const [showMembersModal, setShowMembersModal] = useState(false);

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

          const uploadResponse = await apiService.uploadChatImage(chat.chat_id, file) as { file_url: string; file_name: string; file_size: number };
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
      alertService.error('Failed to send message. Please try again.');
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
      alertService.error('Please select only image files');
      return;
    }

    // Validate file sizes (max 5MB each)
    const oversizedFiles = files.filter(file => file.size > 5 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      alertService.error('Each file must be less than 5MB');
      return;
    }

    // Limit to maximum 10 images at once
    if (files.length > 10) {
      alertService.error('You can upload a maximum of 10 images at once');
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
      
      const data = await apiService.getUserProfile(userId) as ProfileData;
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
      alertService.success('You have successfully left the group chat.');
    } catch (error) {
      console.error('ChatWindow: Error leaving group chat:', error);
      alertService.error('Failed to leave group chat. Please try again.');
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
      <div className="p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <BootstrapAvatar
              src={getAvatarUrl(chat.avatar_url)}
              alt={chat.name}
              size="lg"
              className="ring-2 ring-gray-100 dark:ring-gray-700"
            >
              {chat.name.substring(0, 2).toUpperCase()}
            </BootstrapAvatar>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
                {chat.name}
              </h2>
              {chat.chat_type === 'group' && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {chat.participants_count} members
                </p>
              )}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                <FontAwesomeIcon icon={faEllipsisV} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {chat.chat_type === 'group' && (
                <>
                  <DropdownMenuItem
                    onClick={() => setShowMembersModal(true)}
                    className="flex items-center gap-2"
                  >
                    <FontAwesomeIcon icon={faUsers} className="text-gray-400" />
                    View Members
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setShowAddUserModal(true)}
                    className="flex items-center gap-2"
                  >
                    <FontAwesomeIcon icon={faUserPlus} className="text-gray-400" />
                    Add User
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setShowLeaveModal(true)}
                    className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <FontAwesomeIcon icon={faSignOutAlt} />
                    Leave Groupchat
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 p-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        ) : Object.keys(messageGroups).length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
              <FontAwesomeIcon icon={faInfoCircle} className="text-gray-400 text-2xl" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              No messages yet
            </h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-sm">
              {chat.chat_type === 'group' 
                ? 'Be the first to start the conversation in this group chat!'
                : 'Start the conversation by sending a message.'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(messageGroups).map(([date, dateMessages]) => (
              <div key={date}>
                {/* Date separator */}
                <div className="flex items-center justify-center my-6">
                  <div className="bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-xs px-3 py-1 rounded-full shadow-sm border border-gray-200 dark:border-gray-700">
                    {new Date(date).toLocaleDateString([], {
                      weekday: 'long',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </div>
                </div>

                {/* Messages for this date */}
                <div className="space-y-4">
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
                        <div key={message.message_id} className="flex justify-center my-4">
                          <div className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs px-4 py-2 rounded-full border border-gray-300 dark:border-gray-600">
                            <FontAwesomeIcon icon={faInfoCircle} className="mr-2" />
                            {message.content}
                          </div>
                        </div>
                      );
                    }

                    const isCurrentUser = currentUser && message.sender.user_id === currentUser.id;

                    return (
                      <div key={message.message_id} className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} group`}>
                        <div className={`flex max-w-xs lg:max-w-md xl:max-w-lg ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'}`}>
                          {/* Avatar for other users */}
                          {!isCurrentUser && (
                            <div
                              onClick={(e) => handleUserProfileClick(message.sender.user_id, e)}
                              className="flex-shrink-0 mr-3 cursor-pointer"
                            >
                              <BootstrapAvatar
                                src={getAvatarUrl(message.sender.avatar_url)}
                                alt={message.sender.username}
                                size="sm"
                                className="ring-2 ring-white dark:ring-gray-800 shadow-sm hover:ring-blue-300 dark:hover:ring-blue-600 transition-all duration-200"
                              >
                                {message.sender.username.substring(0, 2).toUpperCase()}
                              </BootstrapAvatar>
                            </div>
                          )}

                          <div className={`flex flex-col ${isCurrentUser ? 'items-end' : 'items-start'} max-w-full`}>
                            {/* Message header for group chats */}
                            {!isCurrentUser && chat.chat_type === 'group' && (
                              <div className="flex items-center gap-2 mb-1 ml-1">
                                <span
                                  className="text-xs font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer transition-colors"
                                  onClick={(e) => handleUserProfileClick(message.sender.user_id, e)}
                                >
                                  {message.sender.username}
                                </span>
                                {chat.created_by === message.sender.user_id && (
                                  <BootstrapBadge variant="warning" className="text-xs px-1.5 py-0.5">
                                    <FontAwesomeIcon icon={faCrown} className="text-xs mr-1" />
                                    Admin
                                  </BootstrapBadge>
                                )}
                              </div>
                            )}

                            {/* Reply indicator */}
                            {message.reply_to && (
                              <div className={`mb-2 p-3 rounded-lg border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-900/20 max-w-full ${isCurrentUser ? 'mr-1' : 'ml-1'}`}>
                                <div className="flex items-center gap-2 mb-1">
                                  <FontAwesomeIcon icon={faReply} className="text-blue-500 text-xs" />
                                  <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                                    Replying to {message.reply_to.sender_username}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-600 dark:text-gray-400 truncate max-w-xs">
                                  {message.reply_to.content}
                                </p>
                              </div>
                            )}

                            {/* Message bubble */}
                            <div className={`relative group ${isCurrentUser ? 'ml-12' : 'mr-12'}`}>
                              <div
                                className={`px-4 py-3 rounded-2xl shadow-sm max-w-full break-words ${
                                  isCurrentUser
                                    ? 'bg-blue-500 text-white rounded-br-md'
                                    : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 rounded-bl-md'
                                }`}
                              >
                                {message.message_type === 'image' && message.file_url ? (
                                  <div className="space-y-3">
                                    <img
                                      src={getFileUrl(message.file_url)}
                                      alt={message.file_name || 'chat-image'}
                                      className="max-w-full h-auto rounded-lg cursor-pointer hover:opacity-90 transition-opacity shadow-sm"
                                      style={{ maxWidth: '280px', maxHeight: '280px' }}
                                      onClick={() => handleImageClick(message)}
                                    />
                                    {message.content && message.content !== '📷 Image' && (
                                      <p className={`text-sm ${isCurrentUser ? 'text-blue-100' : 'text-gray-700 dark:text-gray-300'}`}>
                                        {message.content}
                                      </p>
                                    )}
                                  </div>
                                ) : (
                                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                                    {message.content}
                                  </p>
                                )}
                              </div>

                              {/* Message timestamp and status */}
                              <div className={`flex items-center gap-1 mt-1 text-xs text-gray-500 dark:text-gray-400 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                                {message.edited && (
                                  <span className="opacity-75">edited</span>
                                )}
                                <span className="opacity-75">
                                  {formatMessageTime(message.created_at)}
                                </span>
                                {isCurrentUser && (
                                  <FontAwesomeIcon
                                    icon={faCheckDouble}
                                    className="text-xs text-blue-400"
                                  />
                                )}
                              </div>

                              {/* Reactions */}
                              {message.reactions && Array.isArray(message.reactions) && message.reactions.length > 0 && (
                                <div className={`flex flex-wrap gap-1 mt-2 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                                  {message.reactions.map((reaction, index) => (
                                    <div
                                      key={index}
                                      className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs px-2 py-1 rounded-full border border-gray-200 dark:border-gray-600 shadow-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors cursor-pointer"
                                    >
                                      {reaction.emoji}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
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
      </div>

      {/* Reply indicator */}
      {replyTo && (
        <div className="px-4 py-3 bg-blue-50 dark:bg-blue-900/20 border-t border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <FontAwesomeIcon icon={faReply} className="text-blue-500 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <span className="text-sm font-medium text-blue-700 dark:text-blue-300 block">
                  Replying to {replyTo.sender.username}
                </span>
                <p className="text-sm text-blue-600 dark:text-blue-400 truncate">
                  {replyTo.content}
                </p>
              </div>
            </div>
            <button
              onClick={() => setReplyTo(null)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex-shrink-0"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Message Input */}
      <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-end gap-3">
          <div className="flex-1 relative">
            <BootstrapInput
              ref={inputRef}
              value={newMessage}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="py-3 border-gray-300 dark:border-gray-600 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 dark:bg-gray-700"
              noWrapper
            />
          </div>
          <button
            onClick={handleImageUpload}
            className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 transition-colors p-3 rounded-full shadow-md hover:shadow-lg flex items-center justify-center w-12 h-12 flex-shrink-0"
            title="Upload image"
          >
            <FontAwesomeIcon icon={faCamera} className="text-base" />
          </button>
          <button
            onClick={handleSendMessage}
            disabled={(!newMessage.trim() && selectedFiles.length === 0) || isUploading}
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white p-3 rounded-full shadow-md hover:shadow-lg transition-colors flex items-center justify-center min-w-[48px] min-h-[48px] flex-shrink-0"
          >
            {isUploading ? (
              <div className="spinner-border spinner-border-sm" role="status">
                <span className="visually-hidden">Uploading...</span>
              </div>
            ) : (
              <FontAwesomeIcon icon={faArrowRight} className="text-base" />
            )}
          </button>
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
          <div className="mt-3 space-y-2">
            {selectedFiles.map((file, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg">
                <div className="flex items-center gap-3">
                  <FontAwesomeIcon icon={faImage} className="text-blue-500" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                </div>
                <button
                  onClick={() => {
                    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
                  }}
                  className="text-red-500 hover:text-red-700 dark:hover:text-red-400 p-1 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  ✕
                </button>
              </div>
            ))}
            <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-600">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {selectedFiles.length} image{selectedFiles.length > 1 ? 's' : ''} selected
              </span>
              <button
                onClick={() => {
                  setSelectedFiles([]);
                  clearFileInput();
                }}
                className="text-xs text-blue-600 hover:text-blue-800 dark:hover:text-blue-400 font-medium"
              >
                Clear All
              </button>
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

      {/* View Members Modal */}
      <ViewMembersModal
        isOpen={showMembersModal}
        onClose={() => setShowMembersModal(false)}
        chatId={chat.chat_id}
        chat={chat}
        onRemoveParticipant={(userId: string) => {
          // Optionally handle post-remove UI updates at parent level
          console.log('Participant removed:', userId);
        }}
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

    if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) {
      return avatarUrl;
    }

    if (avatarUrl.startsWith('/uploads/') || avatarUrl.startsWith('/api/uploads/')) {
      return `http://localhost:5000${avatarUrl}`;
    }

    // Assume it's just a filename from backend/uploads/avatars/
    return `http://localhost:5000/uploads/avatars/${avatarUrl}`;
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
      const response = await apiService.searchUsers(searchQuery) as { users: User[] };
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
      alertService.success('User added successfully!');
    } catch (error) {
      console.error('Error adding user:', error);
      alertService.error(error instanceof Error ? error.message : 'Failed to add user. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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

// View Members Modal Component
const ViewMembersModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  chatId: string;
  chat: Chat;
  onRemoveParticipant?: (userId: string) => void;
}> = ({ isOpen, onClose, chatId, chat, onRemoveParticipant }) => {
  const [members, setMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const { user: currentUser } = useAuth();
  const { setCurrentPage } = useApp();

  const isCreator = (userId: string) => {
    const result = chat.created_by === userId;
    console.log('isCreator check:', { userId, created_by: chat.created_by, result });
    return result;
  };

  const handleViewProfile = (userId: string) => {
    setCurrentPage(`profile-${userId}`);
  };

  const loadMembers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiService.getChat(chatId) as { participants?: User[]; chat?: { participants?: User[] } };
      // Expecting data.participants or data.chat.participants
      const participants: User[] = data.participants || data.chat?.participants || [];
      console.log('Loaded members:', participants);
      console.log('Chat created_by:', chat.created_by);
      setMembers(participants);
    } catch (err) {
      console.error('Failed to load chat members:', err);
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, [chatId, chat.created_by]);

  useEffect(() => {
    if (isOpen) loadMembers();
  }, [isOpen, loadMembers]);

  const handleRemove = async (memberId: string) => {
    const confirmed = await alertService.confirm('Remove this member from the group?');
    if (!confirmed) return;
    try {
      setRemovingId(memberId);
      await apiService.removeParticipant(chatId, memberId);
      setMembers(prev => prev.filter(m => m.user_id !== memberId));
      if (onRemoveParticipant) onRemoveParticipant(memberId);
    } catch (err) {
      console.error('Error removing participant:', err);
      alertService.error('Failed to remove member.');
    } finally {
      setRemovingId(null);
    }
  };

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold">Members</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
          </div>

          {/* Permission Info */}
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800 mb-1">
              <strong>Member Management:</strong>
            </p>
            <ul className="text-sm text-blue-700 list-disc list-inside space-y-1">
              <li>Only the group creator can remove members</li>
              <li>The creator is marked with a crown <BootstrapBadge variant="warning" className="small mx-1 d-inline-flex align-items-center gap-1"><FontAwesomeIcon icon={faCrown} className="small" />Creator</BootstrapBadge> badge</li>
              <li>Members cannot remove themselves or the creator</li>
            </ul>
          </div>

          {loading ? (
            <div className="p-6 text-center">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {members.map(m => {
                const isCreatorResult = isCreator(m.user_id);
                console.log('Rendering member:', m.username, m.user_id, 'isCreator:', isCreatorResult);
                return (
                <div key={m.user_id} className="d-flex align-items-center justify-content-between p-2 border rounded">
                  <div className="d-flex align-items-center gap-2">
                    <BootstrapAvatar src={getAvatarUrl(m.avatar_url)} alt={m.username} size="sm">{m.username.substring(0,2).toUpperCase()}</BootstrapAvatar>
                    <div>
                      <div className="fw-medium d-flex align-items-center gap-2">
                        {m.display_name || m.username}
                        {isCreatorResult && (
                          <BootstrapBadge variant="warning" className="small d-flex align-items-center gap-1">
                            <FontAwesomeIcon icon={faCrown} className="small" />
                            Creator
                          </BootstrapBadge>
                        )}
                      </div>
                      <div className="small text-muted">@{m.username}</div>
                    </div>
                  </div>
                  <div className="d-flex gap-2">
                    <BootstrapButton variant="outline-secondary" size="sm" onClick={() => handleViewProfile(m.user_id)}>
                      View
                    </BootstrapButton>
                    {currentUser && currentUser.id !== m.user_id && !isCreatorResult && (
                      <BootstrapButton variant="outline-danger" size="sm" disabled={removingId === m.user_id} onClick={() => handleRemove(m.user_id)}>
                        {removingId === m.user_id ? 'Removing...' : 'Remove'}
                      </BootstrapButton>
                    )}
                  </div>
                </div>
              )})}
              {members.length === 0 && (
                <div className="text-center text-muted p-4">No members found</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};