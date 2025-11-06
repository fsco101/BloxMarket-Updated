import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth, useApp } from '../App';
import { apiService } from '../services/api';
import { socketService } from '../services/socket';
import { alertService } from '../services/alertService';
import { ChatList } from './messenger/ChatList';
import { ChatWindow } from './messenger/ChatWindow';
import { CreateChatDialog } from './messenger/CreateChatDialog';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMessage, faPlus } from '@fortawesome/free-solid-svg-icons';

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

interface FullChat {
  chat_id: string;
  chat_type: 'direct' | 'group';
  name?: string;
  avatar_url?: string;
  description?: string;
  last_message?: {
    content: string;
    sender_username: string;
    sent_at: string;
  };
  unread_count?: number;
  participants_count?: number;
  message_count?: number;
  created_at: string;
  updated_at: string;
  created_by?: string;
  participants?: Array<{
    user_id: string;
    username: string;
    avatar_url?: string;
  }>;
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

export const Messenger: React.FC = () => {
  const { user } = useAuth();
  const { currentPage } = useApp();
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [showCreateChat, setShowCreateChat] = useState(false);
  const [navigatingToChat, setNavigatingToChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Extract target user ID from currentPage if it starts with 'messages-'
  const targetUserId = currentPage.startsWith('messages-') ? currentPage.replace('messages-', '') : null;

  // Load user's chats
  useEffect(() => {
    loadChats();
  }, []);

  // Connect to socket when component mounts
  useEffect(() => {
    if (user) {
      const token = localStorage.getItem('bloxmarket-token') || sessionStorage.getItem('bloxmarket-token');
      if (token) {
        socketService.connect(token);
      }
    }

    return () => {
      socketService.disconnect();
    };
  }, [user]);

  // Socket event listeners
  useEffect(() => {
    const handleNewMessage = (data: unknown) => {
      const message = data as Message;
      setMessages(prev => {
        // Check if message already exists
        if (prev.some(msg => msg.message_id === message.message_id)) {
          return prev;
        }
        return [...prev, message];
      });

      // Update chat's last message and increment unread count if not current chat or not focused
      setChats(prev => prev.map(chat => {
        if (chat.chat_id === message.chat_id) {
          const isCurrentChat = selectedChat?.chat_id === chat.chat_id;
          const shouldIncrementUnread = !isCurrentChat && message.sender.user_id !== user?.id;
          
          return {
            ...chat,
            last_message: {
              content: message.content,
              sender_username: message.sender.username,
              sent_at: message.created_at
            },
            unread_count: shouldIncrementUnread ? chat.unread_count + 1 : chat.unread_count,
            updated_at: message.created_at
          };
        }
        return chat;
      }));

      // Dispatch chat message received event for global notification system
      if (message.sender.user_id !== user?.id) {
        window.dispatchEvent(new CustomEvent('chat-message-received'));
      }
    };

    const handleMessageEdited = (data: unknown) => {
      const editData = data as { message_id: string; content: string; edited: boolean; edited_at: string };
      setMessages(prev => prev.map(msg =>
        msg.message_id === editData.message_id
          ? { ...msg, content: editData.content, edited: editData.edited, edited_at: editData.edited_at }
          : msg
      ));
    };

    const handleMessageDeleted = (data: unknown) => {
      const deleteData = data as { message_id: string; chat_id: string };
      setMessages(prev => prev.filter(msg => msg.message_id !== deleteData.message_id));
    };

    const handleReactionAdded = (data: unknown) => {
      const reactionData = data as { message_id: string; reaction: { user_id: string; emoji: string; created_at: string } };
      setMessages(prev => prev.map(msg =>
        msg.message_id === reactionData.message_id
          ? { ...msg, reactions: [...msg.reactions, reactionData.reaction] }
          : msg
      ));
    };

    const handleReactionRemoved = (data: unknown) => {
      const reactionData = data as { message_id: string; user_id: string; emoji: string };
      setMessages(prev => prev.map(msg =>
        msg.message_id === reactionData.message_id
          ? {
              ...msg,
              reactions: msg.reactions.filter(r => !(r.user_id === reactionData.user_id && r.emoji === reactionData.emoji))
            }
          : msg
      ));
    };

    const handleUserLeftGroup = (data: unknown) => {
      const leaveData = data as { chat_id: string; user_id: string; username: string; message: string };
      console.log('Messenger: User left group:', leaveData);

      // If this is the currently selected chat, add a system message
      if (selectedChat && selectedChat.chat_id === leaveData.chat_id) {
        const systemMessage = {
          message_id: `system_${Date.now()}`,
          chat_id: leaveData.chat_id,
          sender: {
            user_id: 'system',
            username: 'System',
            avatar_url: undefined
          },
          content: `${leaveData.username} left the group chat`,
          message_type: 'system' as const,
          is_read: true,
          edited: false,
          reactions: [],
          created_at: new Date().toISOString()
        };

        setMessages(prev => [...prev, systemMessage]);
      }

      // Update the chat list - decrease participant count or remove chat if no participants left
      setChats(prevChats => {
        const updatedChats = prevChats.map(chat => {
          if (chat.chat_id === leaveData.chat_id) {
            const newParticipantCount = chat.participants_count - 1;
            if (newParticipantCount <= 0) {
              // Remove the chat if no participants left
              return null;
            } else {
              // Update participant count
              return {
                ...chat,
                participants_count: newParticipantCount
              };
            }
          }
          return chat;
        }).filter(chat => chat !== null) as Chat[];

        return updatedChats;
      });
    };

    socketService.on('new_message', handleNewMessage);
    socketService.on('message_edited', handleMessageEdited);
    socketService.on('message_deleted', handleMessageDeleted);
    socketService.on('reaction_added', handleReactionAdded);
    socketService.on('reaction_removed', handleReactionRemoved);
    socketService.on('user_left_group', handleUserLeftGroup);

    return () => {
      socketService.off('new_message', handleNewMessage);
      socketService.off('message_edited', handleMessageEdited);
      socketService.off('message_deleted', handleMessageDeleted);
      socketService.off('reaction_added', handleReactionAdded);
      socketService.off('reaction_removed', handleReactionRemoved);
      socketService.off('user_left_group', handleUserLeftGroup);
    };
  }, [selectedChat, user?.id]);

  // Update selectedChat when chats change (e.g., when someone leaves a group)
  useEffect(() => {
    if (selectedChat) {
      const updatedChat = chats.find(chat => chat.chat_id === selectedChat.chat_id);
      if (!updatedChat) {
        // Chat was removed
        setSelectedChat(null);
      } else if (updatedChat.participants_count !== selectedChat.participants_count) {
        // Chat was updated (participant count changed)
        setSelectedChat(updatedChat);
      }
    }
  }, [chats, selectedChat]);

  const loadChats = async () => {
    try {
      setLoading(true);
      const response = await apiService.getUserChats({ limit: 50 }) as { chats: Chat[] };
      // Filter out any undefined or invalid chats
      const validChats = (response.chats || []).filter(chat => 
        chat && 
        chat.chat_id && 
        chat.name && 
        typeof chat.name === 'string'
      );
      setChats(validChats);
    } catch (error) {
      console.error('Failed to load chats:', error);
    } finally {
      setLoading(false);
    }
  };

  const chatsRef = useRef<Chat[]>([]);
  
  // Keep chatsRef in sync with chats state
  useEffect(() => {
    chatsRef.current = chats;
  }, [chats]);

  // Handle navigation to specific user chat
  const handleUserChatNavigation = useCallback(async () => {
    if (!targetUserId || !chatsRef.current.length || navigatingToChat) return;

    setNavigatingToChat(true);

    try {
      const currentChats = chatsRef.current;
      
      // First, try to find an existing direct chat with the target user
      // We need to check the participants of each direct chat
      for (const chat of currentChats) {
        if (chat.chat_type === 'direct' && chat.participants_count === 2) {
          try {
            // Get full chat details to check participants
            const fullChat = await apiService.getChat(chat.chat_id) as FullChat;
            const participants = fullChat.participants || [];
            
            // Check if target user is a participant
            const hasTargetUser = participants.some((p: { user_id: string }) => p.user_id === targetUserId);
            const hasCurrentUser = participants.some((p: { user_id: string }) => p.user_id === user?.id);
            
            if (hasTargetUser && hasCurrentUser) {
              // Found existing chat with target user
              setSelectedChat(chat);
              setNavigatingToChat(false);
              return;
            }
          } catch (error) {
            console.warn('Failed to check chat participants:', error);
            // Continue checking other chats
          }
        }
      }

      // No existing chat found, create a new one
      const createResponse = await apiService.createDirectChat(targetUserId) as { chat_id: string; chat_type: string; message: string };
      
      // Fetch the full chat details
      const fullChat = await apiService.getChat(createResponse.chat_id) as FullChat;
      
      // Create a proper Chat object
      const chatObject: Chat = {
        chat_id: fullChat.chat_id,
        chat_type: fullChat.chat_type,
        name: fullChat.name || `Chat with ${fullChat.participants?.find((p: { user_id: string; username: string }) => p.user_id !== user?.id)?.username || 'User'}`,
        avatar_url: fullChat.avatar_url,
        description: fullChat.description,
        last_message: fullChat.last_message,
        unread_count: fullChat.unread_count || 0,
        participants_count: fullChat.participants_count || fullChat.participants?.length || 0,
        message_count: fullChat.message_count || 0,
        created_at: fullChat.created_at,
        updated_at: fullChat.updated_at,
        created_by: fullChat.created_by
      };
      
      // Add to chats list if not already present
      setChats(prev => {
        const chatExists = prev.some(chat => chat.chat_id === chatObject.chat_id);
        if (!chatExists) {
          return [chatObject, ...prev];
        }
        return prev;
      });
      
      setSelectedChat(chatObject);
    } catch (error) {
      console.error('Failed to handle user chat navigation:', error);
      alertService.error('Failed to start conversation. Please try again.');
    } finally {
      setNavigatingToChat(false);
    }
  }, [targetUserId, user?.id, navigatingToChat]);

  // Handle automatic navigation to user chat when coming from profile
  useEffect(() => {
    if (!loading && chats.length > 0 && targetUserId && !navigatingToChat && !selectedChat) {
      handleUserChatNavigation();
    }
  }, [loading, chats.length, targetUserId, navigatingToChat, selectedChat, handleUserChatNavigation]);

  const loadMessages = async (chatId: string) => {
    try {
      setMessagesLoading(true);
      console.log('Loading messages for chat:', chatId);
      const response = await apiService.getMessages(chatId, { limit: 50 }) as { messages: Message[] };
      console.log('Messages response:', response);
      setMessages(response.messages || []);
      console.log('Set messages to:', response.messages || []);
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setMessagesLoading(false);
    }
  };

  const handleChatSelect = (chat: Chat) => {
    setSelectedChat(chat);
    
    // Clear unread count for the selected chat
    if (chat.unread_count > 0) {
      setChats(prev => prev.map(c =>
        c.chat_id === chat.chat_id
          ? { ...c, unread_count: 0 }
          : c
      ));
      
      // Dispatch event to update global unread count
      window.dispatchEvent(new CustomEvent('chat-message-received'));
    }
  };

  // Load messages when selectedChat changes
  useEffect(() => {
    if (selectedChat) {
      loadMessages(selectedChat.chat_id);
      // Join the chat room for real-time updates
      socketService.joinChat(selectedChat.chat_id);
    } else {
      // Clear messages when no chat is selected
      setMessages([]);
    }

    // Leave previous chat room if switching chats
    return () => {
      if (selectedChat) {
        socketService.leaveChat(selectedChat.chat_id);
      }
    };
  }, [selectedChat]);

  const handleCreateChat = () => {
    setShowCreateChat(true);
  };

  const handleChatCreated = () => {
    setShowCreateChat(false);
    loadChats(); // Reload chats list
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid p-0 vh-100 bg-light">
      <div className="row h-100 g-0">
        {/* Chat List Sidebar */}
        <div className="col-md-4 col-lg-3 bg-white border-end d-flex flex-column" style={{ minWidth: '320px', maxWidth: '400px' }}>
          <div className="p-3 border-bottom bg-white">
            <div className="d-flex justify-content-between align-items-center">
              <h1 className="h5 mb-0 d-flex align-items-center gap-2">
                <FontAwesomeIcon icon={faMessage} className="text-primary" />
                Messages
              </h1>
              <button
                className="btn btn-primary btn-sm rounded-circle d-flex align-items-center justify-content-center"
                style={{ width: '36px', height: '36px' }}
                onClick={handleCreateChat}
                title="New Chat"
              >
                <FontAwesomeIcon icon={faPlus} />
              </button>
            </div>
          </div>

          <ChatList
            chats={chats}
            selectedChat={selectedChat}
            onChatSelect={handleChatSelect}
          />
        </div>

        {/* Chat Window */}
        <div className="col d-flex flex-column">
          {selectedChat ? (
            <ChatWindow
              chat={selectedChat}
              messages={messages}
              loading={messagesLoading}
              messagesEndRef={messagesEndRef}
              onSendMessage={async (content: string, replyTo?: string, messageType?: 'text' | 'image', fileUrl?: string, fileName?: string, fileSize?: number) => {
                if (!selectedChat) return;

                try {
                  await apiService.sendMessage(selectedChat.chat_id, content, messageType || 'text', replyTo, fileUrl, fileName, fileSize);
                  // Message will be added via socket event
                } catch (error) {
                  console.error('Failed to send message:', error);
                }
              }}
              onChatLeft={(chatId: string) => {
                console.log('Messenger ChatWindow: onChatLeft called with chatId:', chatId);
                // Remove the chat from the chats list
                setChats(prevChats => prevChats.filter(chat => chat.chat_id !== chatId));
                // Clear selected chat if it's the one being left
                if (selectedChat?.chat_id === chatId) {
                  console.log('Messenger ChatWindow: Clearing selected chat');
                  setSelectedChat(null);
                }
              }}
              onAddSystemMessage={(message: Message) => {
                setMessages(prev => [...prev, message]);
              }}
            />
          ) : (
            <div className="d-flex flex-column justify-content-center align-items-center h-100 bg-light">
              <div className="text-center">
                <FontAwesomeIcon icon={faMessage} className="text-muted mb-3" style={{ fontSize: '3rem' }} />
                <h3 className="h4 text-dark mb-2">Select a conversation</h3>
                <p className="text-muted">Choose a chat from the sidebar to start messaging</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Chat Dialog */}
      {showCreateChat && (
        <CreateChatDialog
          onClose={() => setShowCreateChat(false)}
          onChatCreated={handleChatCreated}
        />
      )}
    </div>
  );
};