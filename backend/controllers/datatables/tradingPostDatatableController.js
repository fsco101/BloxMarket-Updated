import { Trade } from '../../models/Trade.js';
import { User } from '../../models/User.js';
import mongoose from 'mongoose';

class TradingPostDatatableController {
  // Get all trading posts with DataTables support (for admin panel)
  async getTradingPostsDataTable(req, res) {
    try {
      const {
        page = 1,
        limit = 1000,
        search = '',
        type = '',
        status = '',
        sortBy = 'created_at',
        sortOrder = 'desc'
      } = req.query;

      // Build query
      const query = {};

      // Search filter
      if (search) {
        query.$or = [
          { item_offered: { $regex: search, $options: 'i' } },
          { item_requested: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ];
      }

      // Status filter
      if (status) {
        query.status = status;
      }

      // Calculate pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const limitNum = parseInt(limit);

      // Build sort object
      const sort = {};
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

      // Execute query - use 'user_id' instead of 'user'
      const [trades, totalTrades] = await Promise.all([
        Trade.find(query)
          .populate('user_id', 'username email avatar credibility_score role')
          .sort(sort)
          .skip(skip)
          .limit(limitNum === -1 ? undefined : limitNum)
          .lean(),
        Trade.countDocuments(query)
      ]);

      // Normalize trades to match frontend interface
      const normalizedTrades = trades.map(trade => {
        const user = trade.user_id || {};
        return {
          _id: trade._id,
          id: trade._id,
          title: trade.item_offered || 'Untitled Trade',
          description: trade.description || '',
          author: {
            _id: user._id,
            username: user.username || 'Unknown',
            avatar_url: user.avatar,
            role: user.role || 'user',
            credibility_score: user.credibility_score || 0
          },
          type: 'trade',
          item_name: trade.item_offered,
          itemOffered: trade.item_offered,
          itemRequested: trade.item_requested,
          price: null,
          currency: 'Robux',
          images: trade.images?.map(img => img.image_url) || [],
          status: trade.status || 'open',
          createdAt: trade.created_at,
          updatedAt: trade.updated_at,
          views: 0,
          interested_users: 0,
          flagCount: 0,
          isFlagged: false,
          expiresAt: null
        };
      });

      // Calculate stats
      const stats = {
        total: totalTrades,
        active: await Trade.countDocuments({ status: 'open' }),
        completed: await Trade.countDocuments({ status: 'completed' }),
        archived: 0,
        flagged: 0,
        pending: await Trade.countDocuments({ status: 'in_progress' }),
        cancelled: await Trade.countDocuments({ status: 'cancelled' }),
        thisMonth: await Trade.countDocuments({
          created_at: {
            $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            $lt: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)
          }
        }),
        lastMonth: await Trade.countDocuments({
          created_at: {
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
        posts: normalizedTrades,
        trades: normalizedTrades,
        stats,
        pagination: {
          page: parseInt(page),
          limit: limitNum,
          totalPages: limitNum === -1 ? 1 : Math.ceil(totalTrades / limitNum),
          totalTrades,
          totalPosts: totalTrades
        }
      });
    } catch (error) {
      console.error('Error fetching trading posts for DataTable:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch trading posts',
        error: error.message
      });
    }
  }

  // Get single trading post details (for admin view)
  async getTradingPostDetails(req, res) {
    try {
      const { postId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(postId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid post ID'
        });
      }

      const trade = await Trade.findById(postId)
        .populate('user_id', 'username email avatar credibility_score role')
        .lean();

      if (!trade) {
        return res.status(404).json({
          success: false,
          message: 'Trading post not found'
        });
      }

      const user = trade.user_id || {};
      const normalizedTrade = {
        _id: trade._id,
        title: trade.item_offered || 'Untitled Trade',
        description: trade.description || '',
        author: {
          _id: user._id,
          username: user.username || 'Unknown',
          avatar_url: user.avatar,
          role: user.role || 'user'
        },
        item_name: trade.item_offered,
        itemOffered: trade.item_offered,
        itemRequested: trade.item_requested,
        images: trade.images?.map(img => img.image_url) || [],
        status: trade.status || 'open',
        createdAt: trade.created_at,
        updatedAt: trade.updated_at,
        interested_users: 0,
        flagCount: 0,
        isFlagged: false
      };

      res.json({
        success: true,
        post: normalizedTrade,
        trade: normalizedTrade
      });
    } catch (error) {
      console.error('Error fetching trading post details:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch trading post details',
        error: error.message
      });
    }
  }

  // Delete trading post (admin action)
  async deleteTradingPost(req, res) {
    try {
      const { postId } = req.params;
      const userId = req.user.userId;

      if (!mongoose.Types.ObjectId.isValid(postId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid post ID'
        });
      }

      const trade = await Trade.findById(postId);

      if (!trade) {
        return res.status(404).json({
          success: false,
          message: 'Trading post not found'
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

      await Trade.findByIdAndDelete(postId);

      res.json({
        success: true,
        message: 'Trading post deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting trading post:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete trading post',
        error: error.message
      });
    }
  }

  // Bulk delete trading posts
  async bulkDeleteTradingPosts(req, res) {
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

      const result = await Trade.deleteMany({
        _id: { $in: validIds }
      });

      res.json({
        success: true,
        message: `${result.deletedCount} trading posts deleted successfully`,
        deletedCount: result.deletedCount
      });
    } catch (error) {
      console.error('Error bulk deleting trading posts:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete trading posts',
        error: error.message
      });
    }
  }

  // Update trading post status
  async moderateTradingPost(req, res) {
    try {
      const { postId } = req.params;
      const { action, reason } = req.body;
      const userId = req.user.userId;

      if (!mongoose.Types.ObjectId.isValid(postId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid post ID'
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

      const trade = await Trade.findById(postId);

      if (!trade) {
        return res.status(404).json({
          success: false,
          message: 'Trading post not found'
        });
      }

      let updateData = {};

      switch (action) {
        case 'archive':
          updateData = { status: 'cancelled' };
          break;
        case 'activate':
          updateData = { status: 'open' };
          break;
        case 'complete':
          updateData = { status: 'completed' };
          break;
        case 'flag':
          updateData = { status: 'cancelled' };
          break;
        case 'unflag':
          updateData = { status: 'open' };
          break;
        default:
          return res.status(400).json({
            success: false,
            message: 'Invalid action'
          });
      }

      const updatedTrade = await Trade.findByIdAndUpdate(
        postId,
        updateData,
        { new: true }
      ).populate('user_id', 'username email avatar');

      res.json({
        success: true,
        message: `Trading post ${action}d successfully`,
        trade: updatedTrade
      });
    } catch (error) {
      console.error('Error moderating trading post:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to moderate trading post',
        error: error.message
      });
    }
  }

  // Get trading post statistics for dashboard
  async getTradingPostStatistics(req, res) {
    try {
      const totalTrades = await Trade.countDocuments();

      const stats = {
        total: totalTrades,
        active: await Trade.countDocuments({ status: 'open' }),
        completed: await Trade.countDocuments({ status: 'completed' }),
        archived: 0,
        flagged: 0,
        pending: await Trade.countDocuments({ status: 'in_progress' }),
        cancelled: await Trade.countDocuments({ status: 'cancelled' }),
        thisMonth: await Trade.countDocuments({
          created_at: {
            $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            $lt: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)
          }
        }),
        lastMonth: await Trade.countDocuments({
          created_at: {
            $gte: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1),
            $lt: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        }),
        topTraders: await Trade.aggregate([
          {
            $group: {
              _id: '$user_id',
              tradeCount: { $sum: 1 }
            }
          },
          { $sort: { tradeCount: -1 } },
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
              tradeCount: 1
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
      console.error('Error fetching trading post statistics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch trading post statistics',
        error: error.message
      });
    }
  }

  // Export trading posts to CSV
  async exportTradingPostsCSV(req, res) {
    try {
      const { status, type } = req.query;
      const query = {};
      
      if (status) query.status = status;

      const trades = await Trade.find(query)
        .populate('user_id', 'username email')
        .lean();

      // Create CSV content
      const csvHeaders = [
        'ID',
        'Item Offered',
        'Item Requested',
        'Description',
        'Status',
        'Author',
        'Author Email',
        'Created At',
        'Updated At'
      ].join(',');

      const csvRows = trades.map(trade => {
        const user = trade.user_id || {};
        return [
          trade._id,
          `"${(trade.item_offered || '').replace(/"/g, '""')}"`,
          `"${(trade.item_requested || '').replace(/"/g, '""')}"`,
          `"${(trade.description || '').replace(/"/g, '""').substring(0, 200)}"`,
          trade.status || 'open',
          user.username || '',
          user.email || '',
          new Date(trade.created_at).toISOString(),
          trade.updated_at ? new Date(trade.updated_at).toISOString() : ''
        ].join(',');
      });

      const csv = [csvHeaders, ...csvRows].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=trading-posts-${Date.now()}.csv`);
      res.send(csv);
    } catch (error) {
      console.error('Error exporting trading posts:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to export trading posts',
        error: error.message
      });
    }
  }
}

export const tradingPostDatatableController = new TradingPostDatatableController();