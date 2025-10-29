import { Message } from '../models/Message.js';
import { Chat } from '../models/Chat.js';
import { User } from '../models/User.js';
import mongoose from 'mongoose';
import { io } from '../server.js';

export const messageController = {
  // Get messages for a chat with pagination
  getMessages: async (req, res) => {
    try {
      const { chatId } = req.params;
      const userId = req.user.userId;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 50;
      const skip = (page - 1) * limit;

      if (!mongoose.Types.ObjectId.isValid(chatId)) {
        return res.status(400).json({ error: 'Invalid chat ID' });
      }

      // Check if user is participant in the chat
      const chat = await Chat.findById(chatId);
      if (!chat) {
        return res.status(404).json({ error: 'Chat not found' });
      }

      const isParticipant = chat.participants.some(p => p.user_id.equals(userId) && p.is_active);
      if (!isParticipant) {
        return res.status(403).json({ error: 'Not authorized to view this chat' });
      }

      // Get messages
      const messages = await Message.find({ chat_id: chatId })
        .populate('sender_id', 'username avatar_url')
        .populate('reply_to', 'content sender_id')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      // Mark messages as read for this user
      await Message.updateMany(
        { chat_id: chatId, sender_id: { $ne: userId }, is_read: false },
        { is_read: true, read_at: new Date() }
      );

      // Update unread count for this user
      await Chat.updateOne(
        { _id: chatId, 'unread_counts.user_id': userId },
        { $set: { 'unread_counts.$.count': 0 } }
      );

      // Format messages for response
      const formattedMessages = messages.map(message => ({
        message_id: message._id,
        chat_id: message.chat_id,
        sender: {
          user_id: message.sender_id._id,
          username: message.sender_id.username,
          avatar_url: message.sender_id.avatar_url
        },
        content: message.content,
        message_type: message.message_type,
        file_url: message.file_url,
        file_name: message.file_name,
        file_size: message.file_size,
        is_read: message.is_read,
        read_at: message.read_at,
        edited: message.edited,
        edited_at: message.edited_at,
        reply_to: message.reply_to ? {
          message_id: message.reply_to._id,
          content: message.reply_to.content,
          sender_username: message.reply_to.sender_id?.username
        } : null,
        reactions: message.reactions || [],
        created_at: message.createdAt
      }));

      res.json({
        messages: formattedMessages,
        pagination: {
          page,
          limit,
          hasMore: messages.length === limit
        }
      });

    } catch (error) {
      console.error('Get messages error:', error);
      res.status(500).json({ error: 'Failed to get messages' });
    }
  },

  // Upload chat image
  uploadChatImage: async (req, res) => {
    try {
      const { chatId } = req.params;
      const userId = req.user.userId;

      if (!req.file) {
        return res.status(400).json({ error: 'No image file provided' });
      }

      if (!mongoose.Types.ObjectId.isValid(chatId)) {
        return res.status(400).json({ error: 'Invalid chat ID' });
      }

      // Check if user is participant in the chat
      const chat = await Chat.findById(chatId);
      if (!chat) {
        return res.status(404).json({ error: 'Chat not found' });
      }

      const participant = chat.participants.find(p => p.user_id.equals(userId) && p.is_active);
      if (!participant) {
        return res.status(403).json({ error: 'Not authorized to upload images in this chat' });
      }

      // Check if group chat has restrictions
      if (chat.chat_type === 'group' && chat.settings.only_admins_can_send && participant.role !== 'admin') {
        return res.status(403).json({ error: 'Only admins can upload images in this group' });
      }

      // Return the uploaded file info
      const fileUrl = `/uploads/chat/${req.file.filename}`;
      res.json({
        file_url: fileUrl,
        file_name: req.file.originalname,
        file_size: req.file.size
      });

    } catch (error) {
      console.error('Upload chat image error:', error);
      res.status(500).json({ error: 'Failed to upload image' });
    }
  },

  // Send a message
  sendMessage: async (req, res) => {
    try {
      const { chatId } = req.params;
      const userId = req.user.userId;
      const { content, message_type = 'text', reply_to, file_url, file_name, file_size } = req.body;

      if (!mongoose.Types.ObjectId.isValid(chatId)) {
        return res.status(400).json({ error: 'Invalid chat ID' });
      }

      if (!content || !content.trim()) {
        return res.status(400).json({ error: 'Message content is required' });
      }

      // Check if user is participant in the chat
      const chat = await Chat.findById(chatId);
      if (!chat) {
        return res.status(404).json({ error: 'Chat not found' });
      }

      const participant = chat.participants.find(p => p.user_id.equals(userId) && p.is_active);
      if (!participant) {
        return res.status(403).json({ error: 'Not authorized to send messages in this chat' });
      }

      // Check if group chat has restrictions
      if (chat.chat_type === 'group' && chat.settings.only_admins_can_send && participant.role !== 'admin') {
        return res.status(403).json({ error: 'Only admins can send messages in this group' });
      }

      // Validate reply_to if provided
      if (reply_to && !mongoose.Types.ObjectId.isValid(reply_to)) {
        return res.status(400).json({ error: 'Invalid reply_to message ID' });
      }

      // Create message
      const message = new Message({
        chat_id: chatId,
        sender_id: userId,
        content: content.trim(),
        message_type,
        reply_to: reply_to || null,
        file_url,
        file_name,
        file_size
      });

      const savedMessage = await message.save();

      // Update chat's last message
      await Chat.findByIdAndUpdate(chatId, {
        last_message: {
          message_id: savedMessage._id,
          content: savedMessage.content,
          sender_id: savedMessage.sender_id,
          sent_at: savedMessage.createdAt
        },
        $inc: { message_count: 1 }
      });

      // Increment unread counts for other participants
      const otherParticipants = chat.participants.filter(p => !p.user_id.equals(userId) && p.is_active);
      if (otherParticipants.length > 0) {
        const unreadUpdates = {};
        otherParticipants.forEach(participant => {
          unreadUpdates[`unread_counts.${participant.user_id}`] = 1;
        });
        
        await Chat.findOneAndUpdate(
          { _id: chatId },
          { $inc: unreadUpdates }
        );
      }

      // Populate sender info
      await savedMessage.populate('sender_id', 'username avatar_url');

      const responseData = {
        message_id: savedMessage._id,
        chat_id: savedMessage.chat_id,
        sender: {
          user_id: savedMessage.sender_id._id,
          username: savedMessage.sender_id.username,
          avatar_url: savedMessage.sender_id.avatar_url
        },
        content: savedMessage.content,
        message_type: savedMessage.message_type,
        file_url: savedMessage.file_url,
        file_name: savedMessage.file_name,
        file_size: savedMessage.file_size,
        is_read: savedMessage.is_read,
        created_at: savedMessage.createdAt
      };

      // Emit real-time message to all chat participants
      io.to(`chat_${chatId}`).emit('new_message', responseData);

      // Also emit to individual users for notifications
      otherParticipants.forEach(participant => {
        io.to(`user_${participant.user_id}`).emit('message_notification', {
          chat_id: chatId,
          chat_type: chat.chat_type,
          chat_name: chat.chat_type === 'direct' ? savedMessage.sender_id.username : chat.name,
          message: responseData,
          unread_count: 1
        });
      });

      res.status(201).json(responseData);

    } catch (error) {
      console.error('Send message error:', error);
      res.status(500).json({ error: 'Failed to send message' });
    }
  },

  // Edit a message
  editMessage: async (req, res) => {
    try {
      const { messageId } = req.params;
      const userId = req.user.userId;
      const { content } = req.body;

      if (!mongoose.Types.ObjectId.isValid(messageId)) {
        return res.status(400).json({ error: 'Invalid message ID' });
      }

      if (!content || !content.trim()) {
        return res.status(400).json({ error: 'Message content is required' });
      }

      // Find message and check ownership
      const message = await Message.findById(messageId);
      if (!message) {
        return res.status(404).json({ error: 'Message not found' });
      }

      if (!message.sender_id.equals(userId)) {
        return res.status(403).json({ error: 'Not authorized to edit this message' });
      }

      // Update message
      message.content = content.trim();
      message.edited = true;
      message.edited_at = new Date();
      await message.save();

      const responseData = {
        message_id: message._id,
        content: message.content,
        edited: message.edited,
        edited_at: message.edited_at
      };

      // Emit message edit event
      io.to(`chat_${message.chat_id}`).emit('message_edited', responseData);

      res.json(responseData);

    } catch (error) {
      console.error('Edit message error:', error);
      res.status(500).json({ error: 'Failed to edit message' });
    }
  },

  // Delete a message
  deleteMessage: async (req, res) => {
    try {
      const { messageId } = req.params;
      const userId = req.user.userId;

      if (!mongoose.Types.ObjectId.isValid(messageId)) {
        return res.status(400).json({ error: 'Invalid message ID' });
      }

      // Find message and check ownership
      const message = await Message.findById(messageId);
      if (!message) {
        return res.status(404).json({ error: 'Message not found' });
      }

      if (!message.sender_id.equals(userId)) {
        return res.status(403).json({ error: 'Not authorized to delete this message' });
      }

      // Delete message
      await Message.findByIdAndDelete(messageId);

      // Update chat message count
      await Chat.findByIdAndUpdate(message.chat_id, {
        $inc: { message_count: -1 }
      });

      // Emit message deletion event
      io.to(`chat_${message.chat_id}`).emit('message_deleted', {
        message_id: messageId,
        chat_id: message.chat_id
      });

      res.json({ message: 'Message deleted successfully' });

    } catch (error) {
      console.error('Delete message error:', error);
      res.status(500).json({ error: 'Failed to delete message' });
    }
  },

  // Add reaction to message
  addReaction: async (req, res) => {
    try {
      const { messageId } = req.params;
      const userId = req.user.userId;
      const { emoji } = req.body;

      if (!mongoose.Types.ObjectId.isValid(messageId)) {
        return res.status(400).json({ error: 'Invalid message ID' });
      }

      if (!emoji) {
        return res.status(400).json({ error: 'Emoji is required' });
      }

      // Find message and check if user can react
      const message = await Message.findById(messageId).populate('chat_id');
      if (!message) {
        return res.status(404).json({ error: 'Message not found' });
      }

      const chat = message.chat_id;
      const isParticipant = chat.participants.some(p => p.user_id.equals(userId) && p.is_active);
      if (!isParticipant) {
        return res.status(403).json({ error: 'Not authorized to react to messages in this chat' });
      }

      if (!chat.settings.allow_reactions) {
        return res.status(403).json({ error: 'Reactions are not allowed in this chat' });
      }

      // Check if reaction already exists
      const existingReaction = message.reactions.find(r => r.user_id.equals(userId) && r.emoji === emoji);
      if (existingReaction) {
        return res.status(400).json({ error: 'You have already reacted with this emoji' });
      }

      // Add reaction
      message.reactions.push({
        user_id: userId,
        emoji,
        created_at: new Date()
      });

      await message.save();

      res.json({
        message_id: message._id,
        reactions: message.reactions
      });

      // Emit reaction added event
      io.to(`chat_${chat._id}`).emit('reaction_added', {
        message_id: message._id,
        reaction: message.reactions[message.reactions.length - 1]
      });

    } catch (error) {
      console.error('Add reaction error:', error);
      res.status(500).json({ error: 'Failed to add reaction' });
    }
  },

  // Remove reaction from message
  removeReaction: async (req, res) => {
    try {
      const { messageId } = req.params;
      const userId = req.user.userId;
      const { emoji } = req.body;

      if (!mongoose.Types.ObjectId.isValid(messageId)) {
        return res.status(400).json({ error: 'Invalid message ID' });
      }

      // Find message and remove reaction
      const message = await Message.findById(messageId);
      if (!message) {
        return res.status(404).json({ error: 'Message not found' });
      }

      // Remove reaction
      message.reactions = message.reactions.filter(r => !(r.user_id.equals(userId) && r.emoji === emoji));
      await message.save();

      res.json({
        message_id: message._id,
        reactions: message.reactions
      });

      // Emit reaction removed event
      io.to(`chat_${message.chat_id}`).emit('reaction_removed', {
        message_id: message._id,
        user_id: userId,
        emoji
      });

    } catch (error) {
      console.error('Remove reaction error:', error);
      res.status(500).json({ error: 'Failed to remove reaction' });
    }
  }
};