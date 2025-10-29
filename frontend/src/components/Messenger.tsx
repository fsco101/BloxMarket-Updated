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

export const Messenger: React.FC = () => {
  const { user } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [showCreateChat, setShowCreateChat] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
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

      // Scroll to bottom for new messages
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
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

    socketService.on('new_message', handleNewMessage);
    socketService.on('message_edited', handleMessageEdited);
    socketService.on('message_deleted', handleMessageDeleted);
    socketService.on('reaction_added', handleReactionAdded);
    socketService.on('reaction_removed', handleReactionRemoved);

    return () => {
      socketService.off('new_message', handleNewMessage);
      socketService.off('message_edited', handleMessageEdited);
      socketService.off('message_deleted', handleMessageDeleted);
      socketService.off('reaction_added', handleReactionAdded);
      socketService.off('reaction_removed', handleReactionRemoved);
    };
  }, []);

  // Join/leave chat rooms when selected chat changes
  useEffect(() => {
    if (selectedChat) {
      socketService.joinChat(selectedChat.chat_id);
      loadMessages(selectedChat.chat_id);
    }

    return () => {
      if (selectedChat) {
        socketService.leaveChat(selectedChat.chat_id);
      }
    };
  }, [selectedChat]);

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
      const response = await apiService.getMessages(chatId, { limit: 50 });
      setMessages(response.messages || []);
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setMessagesLoading(false);
    }
  };

  const handleChatSelect = (chat: Chat) => {
    setSelectedChat(chat);
  };

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
            onlineUsers={onlineUsers}
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
              onSendMessage={async (content: string, replyTo?: string) => {
                if (!selectedChat) return;

                try {
                  await apiService.sendMessage(selectedChat.chat_id, content, 'text', replyTo);
                  // Message will be added via socket event
                } catch (error) {
                  console.error('Failed to send message:', error);
                }
              }}
              onSendImage={async (file: File) => {
                if (!selectedChat) return;

                try {
                  // For now, we'll send the image as a text message with the filename
                  // TODO: Implement proper image upload functionality
                  await apiService.sendMessage(selectedChat.chat_id, `[Image: ${file.name}]`, 'image');
                } catch (error) {
                  console.error('Failed to send image:', error);
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