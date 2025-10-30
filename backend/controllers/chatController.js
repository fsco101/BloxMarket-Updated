import { Chat } from '../models/Chat.js';
import { User } from '../models/User.js';
import { Message } from '../models/Message.js';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';

export const chatController = {
  // Get user's chats
  getUserChats: async (req, res) => {
    try {
      const userId = req.user.userId;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const skip = (page - 1) * limit;

      // Find all chats where user is an active participant
      const chats = await Chat.find({
        participants: {
          $elemMatch: {
            user_id: userId,
            is_active: true
          }
        },
        is_active: true
      })
        .populate('participants.user_id', 'username avatar_url credibility_score last_active')
        .populate('last_message.sender_id', 'username')
        .sort({ 'last_message.sent_at': -1, updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      // Format chats for response
      const formattedChats = chats.map(chat => {
        const currentUserParticipant = chat.participants.find(p => p.user_id._id.toString() === userId.toString());
        const unreadCount = currentUserParticipant ? (chat.unread_counts?.find(u => u.user_id.toString() === userId.toString())?.count || 0) : 0;

        let chatName, chatAvatar;

        if (chat.chat_type === 'direct') {
          // For direct chats, show the other participant's info
          const otherParticipant = chat.participants.find(p => p.user_id._id.toString() !== userId.toString());
          if (otherParticipant) {
            chatName = otherParticipant.user_id.username;
            chatAvatar = otherParticipant.user_id.avatar_url;
          }
        } else {
          // For group chats, use the chat's name and avatar
          chatName = chat.name;
          chatAvatar = chat.avatar_url;
        }

        return {
          chat_id: chat._id,
          chat_type: chat.chat_type,
          name: chatName,
          avatar_url: chatAvatar,
          description: chat.description,
          last_message: chat.last_message ? {
            content: chat.last_message.content,
            sender_username: chat.last_message.sender_id?.username,
            sent_at: chat.last_message.sent_at
          } : null,
          unread_count: unreadCount,
          participants_count: chat.participants.filter(p => p.is_active).length,
          message_count: chat.message_count,
          created_at: chat.createdAt,
          updated_at: chat.updatedAt
        };
      });

      res.json({
        chats: formattedChats,
        pagination: {
          page,
          limit,
          hasMore: chats.length === limit
        }
      });

    } catch (error) {
      console.error('Get user chats error:', error);
      res.status(500).json({ error: 'Failed to get chats' });
    }
  },

  // Get chat details
  getChatById: async (req, res) => {
    try {
      const { chatId } = req.params;
      const userId = req.user.userId;

      if (!mongoose.Types.ObjectId.isValid(chatId)) {
        return res.status(400).json({ error: 'Invalid chat ID' });
      }

      const chat = await Chat.findById(chatId)
        .populate('participants.user_id', 'username avatar_url credibility_score last_active role')
        .populate('created_by', 'username')
        .lean();

      if (!chat) {
        return res.status(404).json({ error: 'Chat not found' });
      }

      // Check if user is participant
      const isParticipant = chat.participants.some(p => p.user_id._id.toString() === userId.toString() && p.is_active);
      if (!isParticipant) {
        return res.status(403).json({ error: 'Not authorized to view this chat' });
      }

      // Format response
      const formattedChat = {
        chat_id: chat._id,
        chat_type: chat.chat_type,
        name: chat.name,
        description: chat.description,
        avatar_url: chat.avatar_url,
        participants: chat.participants
          .filter(p => p.is_active)
          .map(p => ({
            user_id: p.user_id._id,
            username: p.user_id.username,
            avatar_url: p.user_id.avatar_url,
            credibility_score: p.user_id.credibility_score,
            role: p.role,
            joined_at: p.joined_at,
            last_seen: p.last_seen
          })),
        created_by: {
          user_id: chat.created_by._id,
          username: chat.created_by.username
        },
        last_message: chat.last_message,
        message_count: chat.message_count,
        settings: chat.settings,
        created_at: chat.createdAt,
        updated_at: chat.updatedAt
      };

      res.json(formattedChat);

    } catch (error) {
      console.error('Get chat error:', error);
      res.status(500).json({ error: 'Failed to get chat details' });
    }
  },

  // Create direct chat with another user
  createDirectChat: async (req, res) => {
    try {
      const userId = req.user.userId;
      const { otherUserId } = req.body;

      if (!mongoose.Types.ObjectId.isValid(otherUserId)) {
        return res.status(400).json({ error: 'Invalid user ID' });
      }

      if (otherUserId === userId) {
        return res.status(400).json({ error: 'Cannot create chat with yourself' });
      }

      // Check if other user exists
      const otherUser = await User.findById(otherUserId);
      if (!otherUser) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Find or create direct chat
      const chat = await Chat.findOrCreateDirectChat(userId, otherUserId);

      res.status(201).json({
        chat_id: chat._id,
        chat_type: chat.chat_type,
        message: 'Direct chat created successfully'
      });

    } catch (error) {
      console.error('Create direct chat error:', error);
      res.status(500).json({ error: 'Failed to create direct chat' });
    }
  },

  // Create group chat
  createGroupChat: async (req, res) => {
    try {
      const userId = req.user.userId;
      const { name, description, participantIds } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Group name is required' });
      }

      if (!participantIds || !Array.isArray(participantIds) || participantIds.length < 2) {
        return res.status(400).json({ error: 'At least 2 participants are required for a group chat' });
      }

      // Validate participant IDs
      const validParticipantIds = participantIds.filter(id => mongoose.Types.ObjectId.isValid(id));
      if (validParticipantIds.length !== participantIds.length) {
        return res.status(400).json({ error: 'Invalid participant IDs' });
      }

      // Check if all participants exist
      const participants = await User.find({ _id: { $in: validParticipantIds } });
      if (participants.length !== validParticipantIds.length) {
        return res.status(404).json({ error: 'Some participants not found' });
      }

      // Add creator to participants if not already included
      const allParticipantIds = [...new Set([...validParticipantIds, userId])];

      // Create participants array
      const participantsArray = allParticipantIds.map(id => ({
        user_id: id,
        role: id === userId ? 'admin' : 'member'
      }));

      // Create group chat
      const chat = new Chat({
        chat_type: 'group',
        name: name.trim(),
        description: description?.trim(),
        participants: participantsArray,
        created_by: userId
      });

      const savedChat = await chat.save();

      res.status(201).json({
        chat_id: savedChat._id,
        chat_type: savedChat.chat_type,
        name: savedChat.name,
        message: 'Group chat created successfully'
      });

    } catch (error) {
      console.error('Create group chat error:', error);
      res.status(500).json({ error: 'Failed to create group chat' });
    }
  },

  // Update group chat
  updateGroupChat: async (req, res) => {
    try {
      const { chatId } = req.params;
      const userId = req.user.userId;
      const { name, description, avatar_url } = req.body;

      if (!mongoose.Types.ObjectId.isValid(chatId)) {
        return res.status(400).json({ error: 'Invalid chat ID' });
      }

      const chat = await Chat.findById(chatId);
      if (!chat) {
        return res.status(404).json({ error: 'Chat not found' });
      }

      if (chat.chat_type !== 'group') {
        return res.status(400).json({ error: 'Can only update group chats' });
      }

      // Check if user is admin
      const participant = chat.participants.find(p => p.user_id.equals(userId) && p.is_active);
      if (!participant || participant.role !== 'admin') {
        return res.status(403).json({ error: 'Only admins can update group settings' });
      }

      // Update chat
      const updateData = {};
      if (name !== undefined) updateData.name = name.trim();
      if (description !== undefined) updateData.description = description?.trim();
      if (avatar_url !== undefined) updateData.avatar_url = avatar_url?.trim();

      await Chat.findByIdAndUpdate(chatId, updateData);

      res.json({ message: 'Group chat updated successfully' });

    } catch (error) {
      console.error('Update group chat error:', error);
      res.status(500).json({ error: 'Failed to update group chat' });
    }
  },

  // Add participant to group chat
  addParticipant: async (req, res) => {
    try {
      const { chatId } = req.params;
      const userId = req.user.userId;
      const { newParticipantId } = req.body;

      if (!mongoose.Types.ObjectId.isValid(chatId) || !mongoose.Types.ObjectId.isValid(newParticipantId)) {
        return res.status(400).json({ error: 'Invalid IDs' });
      }

      const chat = await Chat.findById(chatId);
      if (!chat) {
        return res.status(404).json({ error: 'Chat not found' });
      }

      if (chat.chat_type !== 'group') {
        return res.status(400).json({ error: 'Can only add participants to group chats' });
      }

      // Check if user is admin or if member invites are allowed
      const participant = chat.participants.find(p => p.user_id.equals(userId) && p.is_active);
      if (!participant) {
        return res.status(403).json({ error: 'Not a participant in this chat' });
      }

      const canInvite = participant.role === 'admin' || chat.settings.allow_member_invites;
      if (!canInvite) {
        return res.status(403).json({ error: 'Not authorized to add participants' });
      }

      // Check if user is already a participant
      const existingParticipant = chat.participants.find(p => p.user_id.equals(newParticipantId));
      if (existingParticipant) {
        if (existingParticipant.is_active) {
          return res.status(400).json({ error: 'User is already a participant' });
        } else {
          // Reactivate participant
          existingParticipant.is_active = true;
          existingParticipant.joined_at = new Date();
          await chat.save();
          return res.json({ message: 'Participant reactivated successfully' });
        }
      }

      // Check if user exists
      const newUser = await User.findById(newParticipantId);
      if (!newUser) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Add participant
      chat.participants.push({
        user_id: newParticipantId,
        role: 'member',
        joined_at: new Date()
      });

      await chat.save();

      res.json({ message: 'Participant added successfully' });

    } catch (error) {
      console.error('Add participant error:', error);
      res.status(500).json({ error: 'Failed to add participant' });
    }
  },

  // Remove participant from group chat
  removeParticipant: async (req, res) => {
    try {
      const { chatId } = req.params;
      const userId = req.user.userId;
      const { participantId } = req.body;

      if (!mongoose.Types.ObjectId.isValid(chatId) || !mongoose.Types.ObjectId.isValid(participantId)) {
        return res.status(400).json({ error: 'Invalid IDs' });
      }

      const chat = await Chat.findById(chatId);
      if (!chat) {
        return res.status(404).json({ error: 'Chat not found' });
      }

      if (chat.chat_type !== 'group') {
        return res.status(400).json({ error: 'Can only remove participants from group chats' });
      }

      // Check permissions
      const currentParticipant = chat.participants.find(p => p.user_id.equals(userId) && p.is_active);
      const targetParticipant = chat.participants.find(p => p.user_id.equals(participantId) && p.is_active);

      if (!currentParticipant) {
        return res.status(403).json({ error: 'Not a participant in this chat' });
      }

      if (!targetParticipant) {
        return res.status(404).json({ error: 'Participant not found in this chat' });
      }

      // Users can remove themselves, admins can remove anyone
      const canRemove = currentParticipant.role === 'admin' || participantId === userId;
      if (!canRemove) {
        return res.status(403).json({ error: 'Not authorized to remove this participant' });
      }

      // Cannot remove the last admin
      if (targetParticipant.role === 'admin') {
        const adminCount = chat.participants.filter(p => p.role === 'admin' && p.is_active).length;
        if (adminCount <= 1) {
          return res.status(400).json({ error: 'Cannot remove the last admin from the group' });
        }
      }

      // Mark participant as inactive
      targetParticipant.is_active = false;
      await chat.save();

      res.json({ message: 'Participant removed successfully' });

    } catch (error) {
      console.error('Remove participant error:', error);
      res.status(500).json({ error: 'Failed to remove participant' });
    }
  },

  // Leave group chat
  leaveGroupChat: async (req, res) => {
    try {
      const { chatId } = req.params;
      const userId = req.user.userId;

      if (!mongoose.Types.ObjectId.isValid(chatId)) {
        return res.status(400).json({ error: 'Invalid chat ID' });
      }

      const chat = await Chat.findById(chatId);
      if (!chat) {
        return res.status(404).json({ error: 'Chat not found' });
      }

      if (chat.chat_type !== 'group') {
        return res.status(400).json({ error: 'Can only leave group chats' });
      }

      const participant = chat.participants.find(p => p.user_id.equals(userId) && p.is_active);
      if (!participant) {
        return res.status(400).json({ error: 'Not a participant in this chat' });
      }

      // Get user info for notification
      const leavingUser = await User.findById(userId);

      // Mark participant as inactive
      participant.is_active = false;
      await chat.save();

      // Send notification to other group members
      if (leavingUser) {
        const io = req.app.get('io');
        const activeParticipants = chat.participants.filter(p => p.is_active && !p.user_id.equals(userId));

        // Send real-time notification to other members
        activeParticipants.forEach(participant => {
          io.to(`user_${participant.user_id}`).emit('user_left_group', {
            chat_id: chatId,
            user_id: userId,
            username: leavingUser.username,
            message: `${leavingUser.username} left the group chat`
          });
        });
      }

      res.json({
        message: 'Successfully left the group chat.'
      });

    } catch (error) {
      console.error('Leave group chat error:', error);
      res.status(500).json({ error: 'Failed to leave group chat' });
    }
  },

  // Update participant role (admin only)
  updateParticipantRole: async (req, res) => {
    try {
      const { chatId } = req.params;
      const userId = req.user.userId;
      const { participantId, role } = req.body;

      if (!mongoose.Types.ObjectId.isValid(chatId) || !mongoose.Types.ObjectId.isValid(participantId)) {
        return res.status(400).json({ error: 'Invalid IDs' });
      }

      if (!['member', 'admin'].includes(role)) {
        return res.status(400).json({ error: 'Invalid role' });
      }

      const chat = await Chat.findById(chatId);
      if (!chat) {
        return res.status(404).json({ error: 'Chat not found' });
      }

      if (chat.chat_type !== 'group') {
        return res.status(400).json({ error: 'Can only update roles in group chats' });
      }

      // Check if current user is admin
      const currentParticipant = chat.participants.find(p => p.user_id.equals(userId) && p.is_active);
      if (!currentParticipant || currentParticipant.role !== 'admin') {
        return res.status(403).json({ error: 'Only admins can update participant roles' });
      }

      // Find target participant
      const targetParticipant = chat.participants.find(p => p.user_id.equals(participantId) && p.is_active);
      if (!targetParticipant) {
        return res.status(404).json({ error: 'Participant not found' });
      }

      // Update role
      targetParticipant.role = role;
      await chat.save();

      res.json({ message: 'Participant role updated successfully' });

    } catch (error) {
      console.error('Update participant role error:', error);
      res.status(500).json({ error: 'Failed to update participant role' });
    }
  },

  // Delete chat (for direct chats or group chats by admin)
  deleteChat: async (req, res) => {
    try {
      const { chatId } = req.params;
      const userId = req.user.userId;

      if (!mongoose.Types.ObjectId.isValid(chatId)) {
        return res.status(400).json({ error: 'Invalid chat ID' });
      }

      const chat = await Chat.findById(chatId);
      if (!chat) {
        return res.status(404).json({ error: 'Chat not found' });
      }

      // Check permissions
      let canDelete = false;

      if (chat.chat_type === 'direct') {
        // For direct chats, any participant can "delete" (deactivate)
        canDelete = chat.participants.some(p => p.user_id.equals(userId) && p.is_active);
      } else {
        // For group chats, only admins can delete
        const participant = chat.participants.find(p => p.user_id.equals(userId) && p.is_active);
        canDelete = participant && participant.role === 'admin';
      }

      if (!canDelete) {
        return res.status(403).json({ error: 'Not authorized to delete this chat' });
      }

      // Mark chat as inactive instead of deleting
      chat.is_active = false;
      await chat.save();

      res.json({ message: 'Chat deleted successfully' });

    } catch (error) {
      console.error('Delete chat error:', error);
      res.status(500).json({ error: 'Failed to delete chat' });
    }
  }
};