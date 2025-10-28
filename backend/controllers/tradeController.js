import { Trade, TradeComment, TradeVote } from '../models/Trade.js';
import { User } from '../models/User.js';
import { Notification } from '../models/Notification.js';
import mongoose from 'mongoose';
import fs from 'fs';

export const tradeController = {
  // Get all trades
  getAllTrades: async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const category = req.query.category;
      const status = req.query.status;
      const skip = (page - 1) * limit;

      let query = {};
      if (category && category !== 'all') query.category = category;
      if (status && status !== 'all') query.status = status;

      const [trades, total] = await Promise.all([
        Trade.find(query)
          .populate('user_id', 'username roblox_username credibility_score vouch_count avatar_url')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        Trade.countDocuments(query)
      ]);

      // Get vote and comment counts for each trade
      const tradesWithCounts = await Promise.all(
        trades.map(async (trade) => {
          const [commentCount, upvotes, downvotes, vouchCount] = await Promise.all([
            TradeComment.countDocuments({ trade_id: trade._id }),
            TradeVote.countDocuments({ trade_id: trade._id, vote_type: 'up' }),
            TradeVote.countDocuments({ trade_id: trade._id, vote_type: 'down' }),
            // Get vouch count from vouches collection
            mongoose.connection.db.collection('vouches').countDocuments({ trade_id: trade._id })
          ]);

          return {
            trade_id: trade._id,
            item_offered: trade.item_offered,
            item_requested: trade.item_requested,
            description: trade.description,
            status: trade.status,
            category: trade.category,
            created_at: trade.created_at,
            user: {
              _id: trade.user_id._id,
              username: trade.user_id.username,
              roblox_username: trade.user_id.roblox_username,
              credibility_score: trade.user_id.credibility_score,
              vouch_count: trade.user_id.vouch_count,
              avatar_url: trade.user_id.avatar_url
            },
            images: trade.images || [],
            comment_count: commentCount,
            upvotes,
            downvotes,
            vouch_count: vouchCount
          };
        })
      );

      res.json({
        trades: tradesWithCounts,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      console.error('Get trades error:', error);
      res.status(500).json({ error: 'Failed to fetch trades' });
    }
  },

  // Create new trade
  createTrade: async (req, res) => {
    try {
      const userId = req.user.userId;
      const { itemOffered, itemRequested, description, category } = req.body;
      const uploadedFiles = req.files;

      console.log('Create trade request:', { itemOffered, itemRequested, category, filesCount: uploadedFiles?.length || 0 });

      // Validate required fields - only itemOffered is required
      if (!itemOffered) {
        // Clean up uploaded files
        if (uploadedFiles && uploadedFiles.length > 0) {
          uploadedFiles.forEach(file => {
            try {
              if (fs.existsSync(file.path)) {
                fs.unlinkSync(file.path);
              }
            } catch (err) {
              console.error('Error deleting file:', err);
            }
          });
        }
        return res.status(400).json({ error: 'Item offered is required' });
      }

      // Process uploaded images
      const images = [];
      if (uploadedFiles && uploadedFiles.length > 0) {
        uploadedFiles.forEach(file => {
          images.push({
            image_url: `/uploads/trades/${file.filename}`,
            filename: file.filename,
            originalName: file.originalname,
            path: file.path,
            size: file.size,
            mimetype: file.mimetype,
            uploaded_at: new Date()
          });
        });
      }

      const newTrade = new Trade({
        user_id: userId,
        item_offered: itemOffered.trim(),
        item_requested: itemRequested?.trim() || '',
        description: description?.trim() || '',
        category: category || 'general',
        status: 'open', // Changed from 'active' to 'open'
        images: images
      });

      const savedTrade = await newTrade.save();
      console.log('Trade created successfully:', savedTrade._id);

      // Populate user data for the response
      await savedTrade.populate('user_id', 'username roblox_username credibility_score vouch_count');

      // Get initial vote/comment counts (should be 0 for new trade)
      const [commentCount, upvotes, downvotes, vouchCount] = await Promise.all([
        TradeComment.countDocuments({ trade_id: savedTrade._id }),
        TradeVote.countDocuments({ trade_id: savedTrade._id, vote_type: 'up' }),
        TradeVote.countDocuments({ trade_id: savedTrade._id, vote_type: 'down' }),
        // Get vouch count from vouches collection
        mongoose.connection.db.collection('vouches').countDocuments({ trade_id: savedTrade._id })
      ]);

      res.status(201).json({
        message: 'Trade created successfully',
        trade: {
          trade_id: savedTrade._id,
          item_offered: savedTrade.item_offered,
          item_requested: savedTrade.item_requested,
          description: savedTrade.description,
          status: savedTrade.status,
          category: savedTrade.category,
          created_at: savedTrade.created_at,
          updated_at: savedTrade.updated_at,
          user: {
            _id: savedTrade.user_id._id,
            username: savedTrade.user_id.username,
            roblox_username: savedTrade.user_id.roblox_username,
            credibility_score: savedTrade.user_id.credibility_score,
            vouch_count: savedTrade.user_id.vouch_count,
            avatar_url: savedTrade.user_id.avatar_url
          },
          images: savedTrade.images || [],
          comment_count: commentCount,
          upvotes,
          downvotes,
          vouch_count: vouchCount
        }
      });

    } catch (error) {
      console.error('Create trade error:', error);
      
      // Clean up uploaded files on error
      if (req.files && req.files.length > 0) {
        req.files.forEach(file => {
          try {
            if (fs.existsSync(file.path)) {
              fs.unlinkSync(file.path);
            }
          } catch (err) {
            console.error('Error deleting file during cleanup:', err);
          }
        });
      }
      
      res.status(500).json({ error: 'Failed to create trade' });
    }
  },

  // Get trade by ID
  getTradeById: async (req, res) => {
    try {
      const { tradeId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(tradeId)) {
        return res.status(400).json({ error: 'Invalid trade ID' });
      }

      const trade = await Trade.findById(tradeId)
        .populate('user_id', 'username roblox_username credibility_score vouch_count avatar_url');

      if (!trade) {
        return res.status(404).json({ error: 'Trade not found' });
      }

      // Get vote counts for this trade
      const [commentCount, upvotes, downvotes, vouchCount] = await Promise.all([
        TradeComment.countDocuments({ trade_id: trade._id }),
        TradeVote.countDocuments({ trade_id: trade._id, vote_type: 'up' }),
        TradeVote.countDocuments({ trade_id: trade._id, vote_type: 'down' }),
        // Get vouch count from vouches collection
        mongoose.connection.db.collection('vouches').countDocuments({ trade_id: trade._id })
      ]);

      res.json({
        trade_id: trade._id,
        item_offered: trade.item_offered,
        item_requested: trade.item_requested,
        description: trade.description,
        status: trade.status,
        category: trade.category,
        created_at: trade.created_at,
        user: {
          _id: trade.user_id._id,
          username: trade.user_id.username,
          roblox_username: trade.user_id.roblox_username,
          credibility_score: trade.user_id.credibility_score,
          vouch_count: trade.user_id.vouch_count,
          avatar_url: trade.user_id.avatar_url
        },
        images: trade.images || [],
        comment_count: commentCount,
        upvotes,
        downvotes,
        vouch_count: vouchCount
      });

    } catch (error) {
      console.error('Get trade error:', error);
      res.status(500).json({ error: 'Failed to fetch trade' });
    }
  },

  // Update trade
  updateTrade: async (req, res) => {
    try {
      const { tradeId } = req.params;
      const userId = req.user.userId;
      const { itemOffered, itemRequested, description, status, category } = req.body;
      const uploadedFiles = req.files;

      console.log('Update trade request:', { tradeId, itemOffered, itemRequested, status, category, filesCount: uploadedFiles?.length || 0 });

      if (!mongoose.Types.ObjectId.isValid(tradeId)) {
        return res.status(400).json({ error: 'Invalid trade ID' });
      }

      const trade = await Trade.findById(tradeId);
      if (!trade) {
        return res.status(404).json({ error: 'Trade not found' });
      }

      // Check if user owns the trade
      if (trade.user_id.toString() !== userId) {
        // Clean up uploaded files if user doesn't own the trade
        if (uploadedFiles && uploadedFiles.length > 0) {
          uploadedFiles.forEach(file => {
            try {
              if (fs.existsSync(file.path)) {
                fs.unlinkSync(file.path);
              }
            } catch (err) {
              console.error('Error deleting file:', err);
            }
          });
        }
        return res.status(403).json({ error: 'You can only update your own trades' });
      }

      // Update text fields
      if (itemOffered !== undefined) trade.item_offered = itemOffered.trim();
      if (itemRequested !== undefined) trade.item_requested = itemRequested.trim();
      if (description !== undefined) trade.description = description.trim();
      if (status !== undefined) trade.status = status;
      if (category !== undefined) trade.category = category;

      // Handle image updates - replace existing images with new ones
      if (uploadedFiles && uploadedFiles.length > 0) {
        // Delete existing images from filesystem
        if (trade.images && trade.images.length > 0) {
          trade.images.forEach(image => {
            try {
              if (fs.existsSync(image.path)) {
                fs.unlinkSync(image.path);
              }
            } catch (err) {
              console.error('Error deleting old image file:', err);
            }
          });
        }

        // Process new uploaded images
        const images = [];
        uploadedFiles.forEach(file => {
          images.push({
            image_url: `/uploads/trades/${file.filename}`,
            filename: file.filename,
            originalName: file.originalname,
            path: file.path,
            size: file.size,
            mimetype: file.mimetype,
            uploaded_at: new Date()
          });
        });

        trade.images = images;
      }

      await trade.save();

      // Populate user data for the response
      await trade.populate('user_id', 'username roblox_username credibility_score vouch_count avatar_url');

      // Get updated vote/comment counts
      const [commentCount, upvotes, downvotes, vouchCount] = await Promise.all([
        TradeComment.countDocuments({ trade_id: trade._id }),
        TradeVote.countDocuments({ trade_id: trade._id, vote_type: 'up' }),
        TradeVote.countDocuments({ trade_id: trade._id, vote_type: 'down' }),
        // Get vouch count from vouches collection
        mongoose.connection.db.collection('vouches').countDocuments({ trade_id: trade._id })
      ]);

      res.json({
        message: 'Trade updated successfully',
        trade: {
          trade_id: trade._id,
          item_offered: trade.item_offered,
          item_requested: trade.item_requested,
          description: trade.description,
          status: trade.status,
          category: trade.category,
          created_at: trade.created_at,
          updated_at: trade.updated_at,
          user: {
            _id: trade.user_id._id,
            username: trade.user_id.username,
            roblox_username: trade.user_id.roblox_username,
            credibility_score: trade.user_id.credibility_score,
            vouch_count: trade.user_id.vouch_count,
            avatar_url: trade.user_id.avatar_url
          },
          images: trade.images || [],
          comment_count: commentCount,
          upvotes,
          downvotes,
          vouch_count: vouchCount
        }
      });

    } catch (error) {
      console.error('Update trade error:', error);
      
      // Clean up uploaded files on error
      if (req.files && req.files.length > 0) {
        req.files.forEach(file => {
          try {
            if (fs.existsSync(file.path)) {
              fs.unlinkSync(file.path);
            }
          } catch (err) {
            console.error('Error deleting file during cleanup:', err);
          }
        });
      }
      
      res.status(500).json({ error: 'Failed to update trade' });
    }
  },

  // Delete trade
  deleteTrade: async (req, res) => {
    try {
      const { tradeId } = req.params;
      const userId = req.user.userId;

      if (!mongoose.Types.ObjectId.isValid(tradeId)) {
        return res.status(400).json({ error: 'Invalid trade ID' });
      }

      const trade = await Trade.findById(tradeId);
      if (!trade) {
        return res.status(404).json({ error: 'Trade not found' });
      }

      // Check if user owns the trade or is admin
      const user = await User.findById(userId);
      if (trade.user_id.toString() !== userId && user.role !== 'admin') {
        return res.status(403).json({ error: 'You can only delete your own trades' });
      }

      // Delete associated images
      if (trade.images && trade.images.length > 0) {
        trade.images.forEach(image => {
          try {
            if (fs.existsSync(image.path)) {
              fs.unlinkSync(image.path);
            }
          } catch (err) {
            console.error('Error deleting image file:', err);
          }
        });
      }

      // Delete related comments and votes
      await Promise.all([
        TradeComment.deleteMany({ trade_id: tradeId }),
        TradeVote.deleteMany({ trade_id: tradeId })
      ]);

      await Trade.findByIdAndDelete(tradeId);

      res.json({ message: 'Trade deleted successfully' });

    } catch (error) {
      console.error('Delete trade error:', error);
      res.status(500).json({ error: 'Failed to delete trade' });
    }
  },

  // Get trade comments
  getTradeComments: async (req, res) => {
    try {
      const { tradeId } = req.params;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const skip = (page - 1) * limit;

      if (!mongoose.Types.ObjectId.isValid(tradeId)) {
        return res.status(400).json({ error: 'Invalid trade ID' });
      }

      const [comments, total] = await Promise.all([
        TradeComment.find({ trade_id: tradeId })
          .populate('user_id', 'username roblox_username credibility_score avatar_url')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        TradeComment.countDocuments({ trade_id: tradeId })
      ]);

      res.json({
        comments: comments.map(comment => ({
          comment_id: comment._id,
          content: comment.content,
          created_at: comment.createdAt,
          user: {
            _id: comment.user_id._id,
            username: comment.user_id.username,
            roblox_username: comment.user_id.roblox_username,
            credibility_score: comment.user_id.credibility_score,
            avatar_url: comment.user_id.avatar_url
          }
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      console.error('Get trade comments error:', error);
      res.status(500).json({ error: 'Failed to fetch comments' });
    }
  },

  // Add comment to trade
  addTradeComment: async (req, res) => {
    try {
      const { tradeId } = req.params;
      const { content } = req.body;
      const userId = req.user.userId;

      if (!mongoose.Types.ObjectId.isValid(tradeId)) {
        return res.status(400).json({ error: 'Invalid trade ID' });
      }

      if (!content || content.trim().length === 0) {
        return res.status(400).json({ error: 'Comment content is required' });
      }

      // Check if trade exists
      const trade = await Trade.findById(tradeId);
      if (!trade) {
        return res.status(404).json({ error: 'Trade not found' });
      }

      const newComment = new TradeComment({
        trade_id: tradeId,
        user_id: userId,
        content: content.trim()
      });

      const savedComment = await newComment.save();
      await savedComment.populate('user_id', 'username roblox_username credibility_score');

      // Create notification for trade owner (if not commenting on own trade)
      if (!trade.user_id.equals(userId)) {
        try {
          await Notification.createNotification({
            recipient: trade.user_id,
            sender: userId,
            type: 'trade_comment',
            title: 'New Comment on Your Trade',
            message: `${req.user.username} commented on your trade "${trade.item_offered}"`,
            related_id: savedComment._id,
            related_model: 'TradeComment'
          });
        } catch (notificationError) {
          console.error('Failed to create trade comment notification:', notificationError);
          // Don't fail the comment creation if notification fails
        }
      }

      res.status(201).json({
        message: 'Comment added successfully',
        comment: {
          comment_id: savedComment._id,
          content: savedComment.content,
          created_at: savedComment.createdAt,
          user: {
            _id: savedComment.user_id._id,
            username: savedComment.user_id.username,
            roblox_username: savedComment.user_id.roblox_username,
            credibility_score: savedComment.user_id.credibility_score,
            avatar_url: savedComment.user_id.avatar_url
          }
        }
      });

    } catch (error) {
      console.error('Add trade comment error:', error);
      res.status(500).json({ error: 'Failed to add comment' });
    }
  },

  // Get trade votes
  getTradeVotes: async (req, res) => {
    try {
      const { tradeId } = req.params;
      const userId = req.user?.userId;

      if (!mongoose.Types.ObjectId.isValid(tradeId)) {
        return res.status(400).json({ error: 'Invalid trade ID' });
      }

      const [upvotes, downvotes] = await Promise.all([
        TradeVote.countDocuments({ trade_id: tradeId, vote_type: 'up' }),
        TradeVote.countDocuments({ trade_id: tradeId, vote_type: 'down' })
      ]);

      let userVote = null;
      if (userId) {
        const vote = await TradeVote.findOne({
          trade_id: tradeId,
          user_id: userId
        });
        userVote = vote ? vote.vote_type : null;
      }

      res.json({
        upvotes,
        downvotes,
        userVote
      });

    } catch (error) {
      console.error('Get trade votes error:', error);
      res.status(500).json({ error: 'Failed to fetch votes' });
    }
  },

  // Vote on trade
  voteOnTrade: async (req, res) => {
    try {
      const { tradeId } = req.params;
      const { voteType } = req.body;
      const userId = req.user.userId;

      if (!mongoose.Types.ObjectId.isValid(tradeId)) {
        return res.status(400).json({ error: 'Invalid trade ID' });
      }

      if (!['up', 'down'].includes(voteType)) {
        return res.status(400).json({ error: 'Vote type must be "up" or "down"' });
      }

      // Check if trade exists
      const trade = await Trade.findById(tradeId);
      if (!trade) {
        return res.status(404).json({ error: 'Trade not found' });
      }

      // Check if user is trying to vote on their own trade
      if (trade.user_id.toString() === userId) {
        return res.status(400).json({ error: 'You cannot vote on your own trade' });
      }

      // Check if user has already voted
      const existingVote = await TradeVote.findOne({
        trade_id: tradeId,
        user_id: userId
      });

      if (existingVote) {
        if (existingVote.vote_type === voteType) {
          // Same vote type, remove the vote
          await TradeVote.findByIdAndDelete(existingVote._id);
          
          const [upvotes, downvotes] = await Promise.all([
            TradeVote.countDocuments({ trade_id: tradeId, vote_type: 'up' }),
            TradeVote.countDocuments({ trade_id: tradeId, vote_type: 'down' })
          ]);

          return res.json({
            message: 'Vote removed',
            upvotes,
            downvotes,
            userVote: null
          });
        } else {
          // Different vote type, update the vote
          existingVote.vote_type = voteType;
          await existingVote.save();
        }
      } else {
        // Create new vote
        await TradeVote.create({
          trade_id: tradeId,
          user_id: userId,
          vote_type: voteType
        });
      }

      // Create notification for trade owner (if not voting on own trade and it's a new vote)
      if (!trade.user_id.equals(userId) && !existingVote) {
        try {
          const notificationType = voteType === 'up' ? 'trade_upvote' : 'trade_downvote';
          const actionText = voteType === 'up' ? 'upvoted' : 'downvoted';

          await Notification.createNotification({
            recipient: trade.user_id,
            sender: userId,
            type: notificationType,
            title: `Your Trade Was ${actionText}`,
            message: `${req.user.username} ${actionText} your trade "${trade.item_offered}"`,
            related_id: trade._id,
            related_model: 'Trade'
          });
        } catch (notificationError) {
          console.error('Failed to create trade vote notification:', notificationError);
          // Don't fail the vote if notification fails
        }
      }

      // Get updated vote counts
      const [upvotes, downvotes] = await Promise.all([
        TradeVote.countDocuments({ trade_id: tradeId, vote_type: 'up' }),
        TradeVote.countDocuments({ trade_id: tradeId, vote_type: 'down' })
      ]);

      res.json({
        message: 'Vote recorded successfully',
        upvotes,
        downvotes,
        userVote: voteType
      });

    } catch (error) {
      console.error('Vote on trade error:', error);
      res.status(500).json({ error: 'Failed to record vote' });
    }
  }
};