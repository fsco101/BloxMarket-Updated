import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../App';
import { apiService } from '../services/api';
import { socketService } from '../services/socket';
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
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [showCreateChat, setShowCreateChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

      // Update chat's last message
      setChats(prev => prev.map(chat =>
        chat.chat_id === message.chat_id
          ? {
              ...chat,
              last_message: {
                content: message.content,
                sender_username: message.sender.username,
                sent_at: message.created_at
              },
              updated_at: message.created_at
            }
          : chat
      ));
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
  }, [selectedChat]);

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
      const response = await apiService.getUserChats({ limit: 50 });
      setChats(response.chats || []);
    } catch (error) {
      console.error('Failed to load chats:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (chatId: string) => {
    try {
      setMessagesLoading(true);
      console.log('Loading messages for chat:', chatId);
      const response = await apiService.getMessages(chatId, { limit: 50 });
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
            onChatLeft={(chatId) => {
              console.log('Messenger: onChatLeft called with chatId:', chatId);
              console.log('Messenger: Current chats before filter:', chats.map(c => c.chat_id));
              setChats(prevChats => prevChats.filter(chat => chat.chat_id !== chatId));
              console.log('Messenger: Chats after filter:', chats.filter(chat => chat.chat_id !== chatId).map(c => c.chat_id));
              if (selectedChat?.chat_id === chatId) {
                console.log('Messenger: Clearing selected chat');
                setSelectedChat(null);
              }
            }}
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