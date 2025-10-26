import { ForumPost, ForumComment, ForumVote } from '../models/Forum.js';
import { User } from '../models/User.js';
import { Notification } from '../models/Notification.js';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';

export const forumController = {
  // Get forum posts with pagination
  getForumPosts: async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const category = req.query.category;
      const skip = (page - 1) * limit;

      let query = {};
      if (category) {
        query.category = category;
      }

      const posts = await ForumPost.find(query)
        .populate('user_id', 'username vouch_count avatar_url')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      // Get comment counts for each post
      const postsWithComments = await Promise.all(
        posts.map(async (post) => {
          const commentCount = await ForumComment.countDocuments({ post_id: post._id });
          return {
            post_id: post._id,
            title: post.title,
            content: post.content,
            category: post.category,
            upvotes: post.upvotes,
            downvotes: post.downvotes,
            created_at: post.createdAt,
            username: post.user_id.username,
            vouch_count: post.user_id.vouch_count,
            user_id: post.user_id._id,
            avatar_url: post.user_id.avatar_url,
            images: post.images || [],
            commentCount
          };
        })
      );

      res.json(postsWithComments);

    } catch (error) {
      console.error('Get forum posts error:', error);
      res.status(500).json({ error: 'Failed to get forum posts' });
    }
  },

  // Get single forum post with comments
  getForumPostById: async (req, res) => {
    try {
      const { postId } = req.params;
      const userId = req.user.userId;

      if (!mongoose.Types.ObjectId.isValid(postId)) {
        return res.status(400).json({ error: 'Invalid post ID' });
      }

      const post = await ForumPost.findById(postId)
        .populate('user_id', 'username vouch_count avatar_url')
        .lean();

      if (!post) {
        return res.status(404).json({ error: 'Post not found' });
      }

      // Get comments for this post
      const comments = await ForumComment.find({ post_id: postId })
        .populate('user_id', 'username vouch_count avatar_url')
        .sort({ createdAt: -1 })
        .lean();

      // Check user's vote on this post
      const userVote = await ForumVote.findOne({
        post_id: postId,
        user_id: userId
      }).lean();

      // Format response
      const response = {
        post_id: post._id,
        title: post.title,
        content: post.content,
        category: post.category,
        upvotes: post.upvotes || 0,
        downvotes: post.downvotes || 0,
        created_at: post.createdAt,
        username: post.user_id.username,
        vouch_count: post.user_id.vouch_count,
        userVote: userVote ? userVote.vote_type : null,
        avatar_url: post.user_id.avatar_url,
        comments: comments.map(comment => ({
          comment_id: comment._id,
          content: comment.content,
          created_at: comment.createdAt,
          username: comment.user_id.username,
          vouch_count: comment.user_id.vouch_count,
          avatar_url: comment.user_id.avatar_url
        }))
      };

      res.json(response);

    } catch (error) {
      console.error('Get post error:', error);
      res.status(500).json({ error: 'Failed to fetch post' });
    }
  },

  // Create forum post
  createForumPost: async (req, res) => {
    try {
      const { title, content, category } = req.body;
      const userId = req.user.userId;
      const uploadedFiles = req.files;

      if (!title || !content) {
        // Clean up uploaded files if validation fails
        if (uploadedFiles && uploadedFiles.length > 0) {
          uploadedFiles.forEach(file => {
            if (fs.existsSync(file.path)) {
              fs.unlinkSync(file.path);
            }
          });
        }
        return res.status(400).json({ error: 'Title and content are required' });
      }

      const validCategories = ['trading_tips', 'scammer_reports', 'game_updates', 'general'];
      if (category && !validCategories.includes(category)) {
        // Clean up uploaded files if validation fails
        if (uploadedFiles && uploadedFiles.length > 0) {
          uploadedFiles.forEach(file => {
            if (fs.existsSync(file.path)) {
              fs.unlinkSync(file.path);
            }
          });
        }
        return res.status(400).json({ error: 'Invalid category' });
      }

      // Process uploaded images
      const images = [];
      if (uploadedFiles && uploadedFiles.length > 0) {
        uploadedFiles.forEach(file => {
          images.push({
            filename: file.filename,
            originalName: file.originalname,
            path: file.path,
            size: file.size,
            mimetype: file.mimetype
          });
        });
      }

      const newPost = new ForumPost({
        user_id: userId,
        title,
        content,
        category: category || 'general',
        images: images
      });

      const savedPost = await newPost.save();

      res.status(201).json({
        message: 'Post created successfully',
        postId: savedPost._id,
        imagesUploaded: images.length
      });

    } catch (error) {
      console.error('Create forum post error:', error);
      
      // Clean up uploaded files on error
      if (req.files && req.files.length > 0) {
        req.files.forEach(file => {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        });
      }
      
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'File size too large. Maximum 5MB per image.' });
      }
      if (error.code === 'LIMIT_FILE_COUNT') {
        return res.status(413).json({ error: 'Too many files. Maximum 5 images per post.' });
      }
      if (error.message === 'Only image files are allowed') {
        return res.status(400).json({ error: 'Only image files are allowed' });
      }
      
      res.status(500).json({ error: 'Failed to create forum post' });
    }
  },

  // Update forum post
  updateForumPost: async (req, res) => {
    try {
      const { postId } = req.params;
      const { title, content, category } = req.body;
      const userId = req.user.userId;
      const uploadedFiles = req.files;

      if (!mongoose.Types.ObjectId.isValid(postId)) {
        return res.status(400).json({ error: 'Invalid post ID' });
      }

      if (!title || !content) {
        // Clean up uploaded files if validation fails
        if (uploadedFiles && uploadedFiles.length > 0) {
          uploadedFiles.forEach(file => {
            if (fs.existsSync(file.path)) {
              fs.unlinkSync(file.path);
            }
          });
        }
        return res.status(400).json({ error: 'Title and content are required' });
      }

      // Check if user owns the post
      const post = await ForumPost.findById(postId);
      if (!post) {
        return res.status(404).json({ error: 'Post not found' });
      }

      if (!post.user_id.equals(userId)) {
        // Clean up uploaded files if not authorized
        if (uploadedFiles && uploadedFiles.length > 0) {
          uploadedFiles.forEach(file => {
            if (fs.existsSync(file.path)) {
              fs.unlinkSync(file.path);
            }
          });
        }
        return res.status(403).json({ error: 'Not authorized to update this post' });
      }

      const validCategories = ['trading_tips', 'scammer_reports', 'game_updates', 'general'];
      if (category && !validCategories.includes(category)) {
        // Clean up uploaded files if validation fails
        if (uploadedFiles && uploadedFiles.length > 0) {
          uploadedFiles.forEach(file => {
            if (fs.existsSync(file.path)) {
              fs.unlinkSync(file.path);
            }
          });
        }
        return res.status(400).json({ error: 'Invalid category' });
      }

      // Update post data
      const updateData = {
        title,
        content,
        category: category || 'general',
        updatedAt: new Date()
      };

      // Process uploaded images if any
      if (uploadedFiles && uploadedFiles.length > 0) {
        const newImages = [];
        uploadedFiles.forEach(file => {
          newImages.push({
            filename: file.filename,
            originalName: file.originalname,
            path: file.path,
            size: file.size,
            mimetype: file.mimetype
          });
        });

        // Delete old images from filesystem
        if (post.images && post.images.length > 0) {
          post.images.forEach(image => {
            const filePath = path.join('./uploads/forum', image.filename);
            if (fs.existsSync(filePath)) {
              fs.unlink(filePath, (err) => {
                if (err) console.error('Error deleting old image:', err);
              });
            }
          });
        }

        updateData.images = newImages;
      }

      await ForumPost.findByIdAndUpdate(postId, updateData);

      res.json({ 
        message: 'Post updated successfully',
        imagesUploaded: uploadedFiles ? uploadedFiles.length : 0
      });

    } catch (error) {
      console.error('Update forum post error:', error);
      
      // Clean up uploaded files on error
      if (req.files && req.files.length > 0) {
        req.files.forEach(file => {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        });
      }
      
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'File size too large. Maximum 5MB per image.' });
      }
      if (error.code === 'LIMIT_FILE_COUNT') {
        return res.status(413).json({ error: 'Too many files. Maximum 5 images per post.' });
      }
      if (error.message === 'Only image files are allowed') {
        return res.status(400).json({ error: 'Only image files are allowed' });
      }
      
      res.status(500).json({ error: 'Failed to update forum post' });
    }
  },

  // Vote on forum post
  voteOnForumPost: async (req, res) => {
    try {
      const { postId } = req.params;
      const { voteType } = req.body;
      const userId = req.user.userId;

      console.log('Vote request:', { postId, voteType, userId });

      if (!mongoose.Types.ObjectId.isValid(postId)) {
        return res.status(400).json({ error: 'Invalid post ID' });
      }

      if (!['up', 'down'].includes(voteType)) {
        return res.status(400).json({ error: 'Invalid vote type. Must be "up" or "down"' });
      }

      const post = await ForumPost.findById(postId);
      if (!post) {
        return res.status(404).json({ error: 'Post not found' });
      }

      // Check for existing vote
      const existingVote = await ForumVote.findOne({
        post_id: postId,
        user_id: userId
      });

      let userVote = null;
      let upvotes = post.upvotes || 0;
      let downvotes = post.downvotes || 0;

      if (existingVote) {
        // User has already voted
        if (existingVote.vote_type === voteType) {
          // Same vote type - remove the vote
          await ForumVote.deleteOne({ _id: existingVote._id });
          
          if (voteType === 'up') {
            upvotes = Math.max(0, upvotes - 1);
          } else {
            downvotes = Math.max(0, downvotes - 1);
          }
          
          userVote = null;
          console.log('Vote removed');
        } else {
          // Different vote type - change the vote
          existingVote.vote_type = voteType;
          await existingVote.save();
          
          if (voteType === 'up') {
            upvotes += 1;
            downvotes = Math.max(0, downvotes - 1);
          } else {
            upvotes = Math.max(0, upvotes - 1);
            downvotes += 1;
          }
          
          userVote = voteType;
          console.log('Vote changed to:', voteType);
        }
      } else {
        // New vote
        const newVote = new ForumVote({
          post_id: postId,
          user_id: userId,
          vote_type: voteType
        });
        
        await newVote.save();
        
        if (voteType === 'up') {
          upvotes += 1;
        } else {
          downvotes += 1;
        }
        
        userVote = voteType;
        console.log('New vote added:', voteType);
      }

      // Update post with new vote counts
      post.upvotes = upvotes;
      post.downvotes = downvotes;
      await post.save();

      // Create notification for post owner (if not voting on own post)
      if (!post.user_id.equals(userId) && !existingVote) {
        try {
          const notificationType = voteType === 'up' ? 'forum_upvote' : 'forum_downvote';
          const actionText = voteType === 'up' ? 'upvoted' : 'downvoted';

          await Notification.createNotification({
            recipient: post.user_id,
            sender: userId,
            type: notificationType,
            title: `Your Post Was ${actionText}`,
            message: `${req.user.username} ${actionText} your forum post "${post.title}"`,
            related_id: post._id,
            related_model: 'ForumPost'
          });
        } catch (notificationError) {
          console.error('Failed to create vote notification:', notificationError);
          // Don't fail the vote if notification fails
        }
      }

      console.log('Final vote counts:', { upvotes, downvotes, userVote });

      res.json({
        message: 'Vote updated successfully',
        upvotes,
        downvotes,
        userVote
      });

    } catch (error) {
      console.error('Vote error:', error);
      
      // Handle duplicate key error
      if (error.code === 11000) {
        return res.status(400).json({ error: 'You have already voted on this post' });
      }
      
      res.status(500).json({ error: 'Failed to record vote' });
    }
  },

  // Add comment to forum post
  addForumComment: async (req, res) => {
    try {
      const { postId } = req.params;
      const { content } = req.body;
      const userId = req.user.userId;

      console.log('Comment request:', { postId, content, userId });

      if (!mongoose.Types.ObjectId.isValid(postId)) {
        return res.status(400).json({ error: 'Invalid post ID' });
      }

      if (!content || !content.trim()) {
        return res.status(400).json({ error: 'Content is required' });
      }

      // Check if post exists
      const post = await ForumPost.findById(postId);
      if (!post) {
        return res.status(404).json({ error: 'Post not found' });
      }

      // Create comment
      const comment = new ForumComment({
        post_id: postId,
        user_id: userId,
        content: content.trim()
      });

      await comment.save();
      console.log('Comment saved:', comment._id);

      // Create notification for post owner (if not commenting on own post)
      if (!post.user_id.equals(userId)) {
        try {
          await Notification.createNotification({
            recipient: post.user_id,
            sender: userId,
            type: 'forum_comment',
            title: 'New Comment on Your Post',
            message: `${req.user.username} commented on your forum post "${post.title}"`,
            related_id: comment._id,
            related_model: 'ForumComment'
          });
        } catch (notificationError) {
          console.error('Failed to create notification:', notificationError);
          // Don't fail the comment creation if notification fails
        }
      }

      // Populate user data
      await comment.populate('user_id', 'username vouch_count avatar_url');

      const responseData = {
        comment_id: comment._id,
        content: comment.content,
        created_at: comment.createdAt,
        username: comment.user_id.username,
        vouch_count: comment.user_id.vouch_count,
        avatar_url: comment.user_id.avatar_url
      };

      console.log('Comment response:', responseData);

      res.status(201).json(responseData);

    } catch (error) {
      console.error('Add comment error:', error);
      res.status(500).json({ error: 'Failed to add comment' });
    }
  },

  // Get comments for a forum post
  getForumComments: async (req, res) => {
    try {
      const { postId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(postId)) {
        return res.status(400).json({ error: 'Invalid post ID' });
      }

      // Check if post exists
      const post = await ForumPost.findById(postId);
      if (!post) {
        return res.status(404).json({ error: 'Post not found' });
      }

      // Get comments for this post
      const comments = await ForumComment.find({ post_id: postId })
        .populate('user_id', 'username vouch_count avatar_url')
        .sort({ createdAt: -1 })
        .lean();

      // Format comments for response
      const formattedComments = comments.map(comment => ({
        comment_id: comment._id,
        content: comment.content,
        created_at: comment.createdAt,
        username: comment.user_id.username,
        vouch_count: comment.user_id.vouch_count,
        user_id: comment.user_id._id,
        avatar_url: comment.user_id.avatar_url
      }));

      res.json({
        comments: formattedComments
      });

    } catch (error) {
      console.error('Get forum comments error:', error);
      res.status(500).json({ error: 'Failed to fetch comments' });
    }
  },

  // Delete forum post
  deleteForumPost: async (req, res) => {
    try {
      const { postId } = req.params;
      const userId = req.user.userId;

      if (!mongoose.Types.ObjectId.isValid(postId)) {
        return res.status(400).json({ error: 'Invalid post ID' });
      }

      // Check if user owns the post or is admin/moderator
      const post = await ForumPost.findById(postId);
      if (!post) {
        return res.status(404).json({ error: 'Post not found' });
      }

      if (!post.user_id.equals(userId)) {
        // Check if user is admin/moderator
        const user = await User.findById(userId);
        if (!user || !['admin', 'moderator'].includes(user.role)) {
          return res.status(403).json({ error: 'Not authorized to delete this post' });
        }
      }

      // Delete post images from filesystem
      if (post.images && post.images.length > 0) {
        post.images.forEach(image => {
          const filePath = path.join('./uploads/forum', image.filename);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        });
      }

      // Delete post and its comments and votes
      await Promise.all([
        ForumComment.deleteMany({ post_id: postId }),
        ForumVote.deleteMany({ post_id: postId }),
        ForumPost.findByIdAndDelete(postId)
      ]);

      res.json({ message: 'Post deleted successfully' });

    } catch (error) {
      console.error('Delete forum post error:', error);
      res.status(500).json({ error: 'Failed to delete forum post' });
    }
  },

  // Get posts authored by a specific user (auth required)
  getUserForumPosts: async (req, res) => {
    try {
      const { userId } = req.params;

      // Only allow the same user or staff to view this history
      const requesterId = String(req.user.userId);
      const isSelf = requesterId === String(userId);
      const isStaff = req.user.role === 'admin' || req.user.role === 'moderator';
      if (!isSelf && !isStaff) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const posts = await ForumPost.find({ user_id: userId })
        .populate('user_id', 'username vouch_count avatar_url')
        .sort({ createdAt: -1 })
        .lean();

      // Count comments for each post
      const postsWithCounts = await Promise.all(
        posts.map(async (post) => {
          const commentCount = await ForumComment.countDocuments({ post_id: post._id });
          return {
            post_id: post._id,
            title: post.title,
            content: post.content,
            category: post.category,
            upvotes: post.upvotes || 0,
            downvotes: post.downvotes || 0,
            created_at: post.createdAt,
            updated_at: post.updatedAt || post.createdAt,
            username: post.user_id?.username,
            vouch_count: post.user_id?.vouch_count ?? 0,
            user_id: post.user_id?._id?.toString(),
            images: Array.isArray(post.images)
              ? post.images.map(img => ({
                  filename: img.filename,
                  originalName: img.originalName
                }))
              : [],
            commentCount
          };
        })
      );

      return res.json({ posts: postsWithCounts, total: postsWithCounts.length });
    } catch (error) {
      console.error('Get user forum posts error:', error);
      res.status(500).json({ error: 'Failed to fetch user forum posts' });
    }
  }
};