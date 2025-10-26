import { ForumPost, ForumComment, ForumVote } from '../../models/Forum.js';
import { User } from '../../models/User.js';
import mongoose from 'mongoose';

class ForumDatatableController {
  // Get all forum posts with DataTables support (for admin panel)
  async getForumPostsDataTable(req, res) {
    try {
      const {
        page = 1,
        limit = 1000,
        search = '',
        category = '',
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      // Build query
      const query = {};

      // Search filter
      if (search) {
        query.$or = [
          { title: { $regex: search, $options: 'i' } },
          { content: { $regex: search, $options: 'i' } }
        ];
      }

      // Category filter
      if (category) {
        query.category = category;
      }

      // Calculate pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const limitNum = parseInt(limit);

      // Build sort object
      const sort = {};
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

      // Execute query
      const [posts, totalPosts] = await Promise.all([
        ForumPost.find(query)
          .populate('user_id', 'username email credibility_score')
          .sort(sort)
          .skip(skip)
          .limit(limitNum === -1 ? undefined : limitNum)
          .lean(),
        ForumPost.countDocuments(query)
      ]);

      // Get comment counts and vote counts for each post
      const postsWithDetails = await Promise.all(
        posts.map(async (post) => {
          const [commentCount, upvotes, downvotes] = await Promise.all([
            ForumComment.countDocuments({ post_id: post._id }),
            ForumVote.countDocuments({ post_id: post._id, vote_type: 'up' }),
            ForumVote.countDocuments({ post_id: post._id, vote_type: 'down' })
          ]);

          return {
            post_id: post._id,
            _id: post._id,
            title: post.title,
            content: post.content,
            category: post.category,
            username: post.user_id?.username || 'Unknown',
            user_id: post.user_id?._id,
            credibility_score: post.user_id?.credibility_score || 0,
            upvotes,
            downvotes,
            commentCount,
            comment_count: commentCount,
            images: post.images,
            createdAt: post.createdAt,
            created_at: post.createdAt,
            updatedAt: post.updatedAt,
            updated_at: post.updatedAt
          };
        })
      );

      // Calculate stats
      const stats = {
        total: totalPosts,
        general: await ForumPost.countDocuments({ category: 'general' }),
        trading_tips: await ForumPost.countDocuments({ category: 'trading_tips' }),
        scammer_reports: await ForumPost.countDocuments({ category: 'scammer_reports' }),
        game_updates: await ForumPost.countDocuments({ category: 'game_updates' }),
        thisMonth: await ForumPost.countDocuments({
          createdAt: {
            $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            $lt: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)
          }
        }),
        lastMonth: await ForumPost.countDocuments({
          createdAt: {
            $gte: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1),
            $lt: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        })
      };

      // Calculate growth
      stats.growth = stats.lastMonth > 0 
        ? ((stats.thisMonth - stats.lastMonth) / stats.lastMonth * 100).toFixed(1)
        : 0;

      res.json({
        success: true,
        posts: postsWithDetails,
        stats,
        pagination: {
          page: parseInt(page),
          limit: limitNum,
          totalPages: limitNum === -1 ? 1 : Math.ceil(totalPosts / limitNum),
          totalPosts
        }
      });
    } catch (error) {
      console.error('Error fetching forum posts for DataTable:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch forum posts',
        error: error.message
      });
    }
  }

  // Get single forum post details (for admin view)
  async getForumPostDetails(req, res) {
    try {
      const { postId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(postId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid post ID'
        });
      }

      const post = await ForumPost.findById(postId)
        .populate('user_id', 'username email credibility_score avatar_url')
        .lean();

      if (!post) {
        return res.status(404).json({
          success: false,
          message: 'Forum post not found'
        });
      }

      // Get comments, votes
      const [comments, upvotes, downvotes] = await Promise.all([
        ForumComment.find({ post_id: postId })
          .populate('user_id', 'username credibility_score')
          .sort({ createdAt: -1 })
          .lean(),
        ForumVote.countDocuments({ post_id: postId, vote_type: 'up' }),
        ForumVote.countDocuments({ post_id: postId, vote_type: 'down' })
      ]);

      const postDetails = {
        post_id: post._id,
        _id: post._id,
        title: post.title,
        content: post.content,
        category: post.category,
        username: post.user_id?.username || 'Unknown',
        user_id: post.user_id?._id,
        credibility_score: post.user_id?.credibility_score || 0,
        upvotes,
        downvotes,
        comments: comments.map(comment => ({
          comment_id: comment._id,
          content: comment.content,
          username: comment.user_id?.username || 'Unknown',
          credibility_score: comment.user_id?.credibility_score || 0,
          created_at: comment.createdAt
        })),
        commentCount: comments.length,
        images: post.images,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt
      };

      res.json({
        success: true,
        post: postDetails
      });
    } catch (error) {
      console.error('Error fetching forum post details:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch forum post details',
        error: error.message
      });
    }
  }

  // Delete forum post (admin action)
  async deleteForumPost(req, res) {
    try {
      const { postId } = req.params;
      const userId = req.user.userId;

      if (!mongoose.Types.ObjectId.isValid(postId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid post ID'
        });
      }

      const post = await ForumPost.findById(postId);

      if (!post) {
        return res.status(404).json({
          success: false,
          message: 'Forum post not found'
        });
      }

      // Check if user is admin or moderator
      const user = await User.findById(userId);
      if (!user || (user.role !== 'admin' && user.role !== 'moderator')) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
      }

      // Delete associated comments and votes
      await Promise.all([
        ForumComment.deleteMany({ post_id: postId }),
        ForumVote.deleteMany({ post_id: postId }),
        ForumPost.findByIdAndDelete(postId)
      ]);

      res.json({
        success: true,
        message: 'Forum post deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting forum post:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete forum post',
        error: error.message
      });
    }
  }

  // Bulk delete forum posts
  async bulkDeleteForumPosts(req, res) {
    try {
      const { postIds } = req.body;
      const userId = req.user.userId;

      if (!Array.isArray(postIds) || postIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Post IDs array is required'
        });
      }

      // Validate all post IDs
      const validIds = postIds.filter(id => mongoose.Types.ObjectId.isValid(id));
      if (validIds.length !== postIds.length) {
        return res.status(400).json({
          success: false,
          message: 'Some post IDs are invalid'
        });
      }

      // Check if user is admin or moderator
      const user = await User.findById(userId);
      if (!user || (user.role !== 'admin' && user.role !== 'moderator')) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
      }

      // Delete associated comments and votes, then delete posts
      await Promise.all([
        ForumComment.deleteMany({ post_id: { $in: validIds } }),
        ForumVote.deleteMany({ post_id: { $in: validIds } })
      ]);

      const result = await ForumPost.deleteMany({
        _id: { $in: validIds }
      });

      res.json({
        success: true,
        message: `${result.deletedCount} forum posts deleted successfully`,
        deletedCount: result.deletedCount
      });
    } catch (error) {
      console.error('Error bulk deleting forum posts:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete forum posts',
        error: error.message
      });
    }
  }

  // Get forum post statistics for dashboard
  async getForumStatistics(req, res) {
    try {
      const totalPosts = await ForumPost.countDocuments();
      const totalComments = await ForumComment.countDocuments();
      const totalVotes = await ForumVote.countDocuments();

      const stats = {
        total: totalPosts,
        totalComments,
        totalVotes,
        general: await ForumPost.countDocuments({ category: 'general' }),
        trading_tips: await ForumPost.countDocuments({ category: 'trading_tips' }),
        scammer_reports: await ForumPost.countDocuments({ category: 'scammer_reports' }),
        game_updates: await ForumPost.countDocuments({ category: 'game_updates' }),
        thisMonth: await ForumPost.countDocuments({
          createdAt: {
            $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            $lt: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)
          }
        }),
        lastMonth: await ForumPost.countDocuments({
          createdAt: {
            $gte: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1),
            $lt: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        }),
        topPosters: await ForumPost.aggregate([
          {
            $group: {
              _id: '$user_id',
              postCount: { $sum: 1 }
            }
          },
          { $sort: { postCount: -1 } },
          { $limit: 5 },
          {
            $lookup: {
              from: 'users',
              localField: '_id',
              foreignField: '_id',
              as: 'user'
            }
          },
          { $unwind: '$user' },
          {
            $project: {
              username: '$user.username',
              postCount: 1
            }
          }
        ])
      };

      // Calculate growth
      stats.growth = stats.lastMonth > 0 
        ? ((stats.thisMonth - stats.lastMonth) / stats.lastMonth * 100).toFixed(1)
        : 0;

      res.json({
        success: true,
        stats
      });
    } catch (error) {
      console.error('Error fetching forum statistics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch forum statistics',
        error: error.message
      });
    }
  }

  // Export forum posts to CSV
  async exportForumPostsCSV(req, res) {
    try {
      const { category } = req.query;
      const query = {};
      
      if (category) query.category = category;

      const posts = await ForumPost.find(query)
        .populate('user_id', 'username email')
        .lean();

      // Get comment counts for each post
      const postsWithCounts = await Promise.all(
        posts.map(async (post) => {
          const [commentCount, upvotes, downvotes] = await Promise.all([
            ForumComment.countDocuments({ post_id: post._id }),
            ForumVote.countDocuments({ post_id: post._id, vote_type: 'up' }),
            ForumVote.countDocuments({ post_id: post._id, vote_type: 'down' })
          ]);

          return {
            ...post,
            commentCount,
            upvotes,
            downvotes
          };
        })
      );

      // Create CSV content
      const csvHeaders = [
        'ID',
        'Title',
        'Content',
        'Category',
        'Author',
        'Author Email',
        'Upvotes',
        'Downvotes',
        'Comments',
        'Images',
        'Created At',
        'Updated At'
      ].join(',');

      const csvRows = postsWithCounts.map(post => [
        post._id,
        `"${(post.title || '').replace(/"/g, '""')}"`,
        `"${(post.content || '').replace(/"/g, '""').substring(0, 200)}"`,
        post.category || '',
        post.user_id?.username || '',
        post.user_id?.email || '',
        post.upvotes || 0,
        post.downvotes || 0,
        post.commentCount || 0,
        post.images?.length || 0,
        new Date(post.createdAt).toISOString(),
        post.updatedAt ? new Date(post.updatedAt).toISOString() : ''
      ].join(','));

      const csv = [csvHeaders, ...csvRows].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=forum-posts-${Date.now()}.csv`);
      res.send(csv);
    } catch (error) {
      console.error('Error exporting forum posts:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to export forum posts',
        error: error.message
      });
    }
  }
}

export const forumDatatableController = new ForumDatatableController();