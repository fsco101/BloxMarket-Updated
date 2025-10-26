import mongoose from 'mongoose';
import { Wishlist } from '../../models/Wishlist.js';
import { User } from '../../models/User.js';

const wishlistDatatableController = {
  // Get wishlists with pagination, filtering and sorting
  getWishlists: async (req, res) => {
    try {
      const { 
        page = 1, 
        limit = 10, 
        search = '', 
        category = '',
        priority = '',
        sortBy = 'created_at',
        sortOrder = 'desc'
      } = req.query;

      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;

      // Build query
      const query = {};
      
      // Add search functionality
      if (search) {
        query.$or = [
          { item_name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ];
      }

      // Add category filter
      if (category) {
        query.category = category;
      }

      // Add priority filter
      if (priority) {
        query.priority = priority;
      }

      // Get total count
      const totalCount = await Wishlist.countDocuments(query);
      const totalPages = Math.ceil(totalCount / limitNum);

      // Sort options
      const sortOptions = {};
      sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

      // Fetch wishlists with pagination and sorting
      const wishlists = await Wishlist.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .lean();

      // Get user details for each wishlist
      const userIds = wishlists.map(wishlist => wishlist.user_id);
      const users = await User.find({ _id: { $in: userIds } })
        .select('username credibility_score')
        .lean();

      const userMap = {};
      users.forEach(user => {
        userMap[user._id.toString()] = {
          username: user.username,
          credibility_score: user.credibility_score || 0
        };
      });

      // Add user details to wishlists
      const enrichedWishlists = wishlists.map(wishlist => {
        const userId = wishlist.user_id.toString();
        const user = userMap[userId] || { username: 'Unknown', credibility_score: 0 };
        
        return {
          wishlist_id: wishlist._id.toString(),
          item_name: wishlist.item_name,
          description: wishlist.description,
          max_price: wishlist.max_price,
          category: wishlist.category,
          priority: wishlist.priority,
          upvotes: wishlist.upvotes || 0,
          downvotes: wishlist.downvotes || 0,
          watchers: wishlist.watchers || 0,
          images: wishlist.images || [],
          image_count: wishlist.images ? wishlist.images.length : 0,
          user_id: userId,
          username: user.username,
          credibility_score: user.credibility_score,
          created_at: wishlist.created_at,
          updated_at: wishlist.updated_at
        };
      });

      res.status(200).json({
        wishlists: enrichedWishlists,
        pagination: {
          total: totalCount,
          per_page: limitNum,
          current_page: pageNum,
          last_page: totalPages,
          from: skip + 1,
          to: Math.min(skip + limitNum, totalCount)
        }
      });
    } catch (error) {
      console.error('Error fetching wishlist datatable:', error);
      res.status(500).json({ error: 'Failed to fetch wishlist data' });
    }
  },

  // Get a single wishlist by ID
  getWishlistById: async (req, res) => {
    try {
      const { wishlistId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(wishlistId)) {
        return res.status(400).json({ error: 'Invalid wishlist ID' });
      }

      const wishlist = await Wishlist.findById(wishlistId).lean();
      
      if (!wishlist) {
        return res.status(404).json({ error: 'Wishlist not found' });
      }

      // Get user details
      const user = await User.findById(wishlist.user_id)
        .select('username credibility_score')
        .lean();

      // Get comment count
      const commentCount = await mongoose.connection.db.collection('wishlist_comments')
        .countDocuments({ wishlist_id: new mongoose.Types.ObjectId(wishlistId) });

      const enrichedWishlist = {
        wishlist_id: wishlist._id.toString(),
        item_name: wishlist.item_name,
        description: wishlist.description,
        max_price: wishlist.max_price,
        category: wishlist.category,
        priority: wishlist.priority,
        upvotes: wishlist.upvotes || 0,
        downvotes: wishlist.downvotes || 0,
        watchers: wishlist.watchers || 0,
        images: wishlist.images || [],
        image_count: wishlist.images ? wishlist.images.length : 0,
        comment_count: commentCount,
        user_id: wishlist.user_id.toString(),
        username: user ? user.username : 'Unknown',
        credibility_score: user ? user.credibility_score || 0 : 0,
        created_at: wishlist.created_at,
        updated_at: wishlist.updated_at
      };

      res.status(200).json({ wishlist: enrichedWishlist });
    } catch (error) {
      console.error('Error fetching wishlist details:', error);
      res.status(500).json({ error: 'Failed to fetch wishlist details' });
    }
  },

  // Delete a wishlist
  deleteWishlist: async (req, res) => {
    try {
      const { wishlistId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(wishlistId)) {
        return res.status(400).json({ error: 'Invalid wishlist ID' });
      }

      const wishlist = await Wishlist.findByIdAndDelete(wishlistId);
      
      if (!wishlist) {
        return res.status(404).json({ error: 'Wishlist not found' });
      }

      // Delete related comments
      await mongoose.connection.db.collection('wishlist_comments')
        .deleteMany({ wishlist_id: mongoose.Types.ObjectId(wishlistId) });

      // Delete related votes
      await mongoose.connection.db.collection('wishlist_votes')
        .deleteMany({ wishlist_id: mongoose.Types.ObjectId(wishlistId) });

      res.status(200).json({ 
        message: 'Wishlist deleted successfully',
        wishlist_id: wishlistId
      });
    } catch (error) {
      console.error('Error deleting wishlist:', error);
      res.status(500).json({ error: 'Failed to delete wishlist' });
    }
  },

  // Bulk delete wishlists
  bulkDeleteWishlists: async (req, res) => {
    try {
      const { wishlistIds } = req.body;

      if (!Array.isArray(wishlistIds) || wishlistIds.length === 0) {
        return res.status(400).json({ error: 'No wishlist IDs provided' });
      }

      // Filter valid ObjectIds
      const validIds = wishlistIds.filter(id => mongoose.Types.ObjectId.isValid(id))
        .map(id => mongoose.Types.ObjectId(id));

      if (validIds.length === 0) {
        return res.status(400).json({ error: 'No valid wishlist IDs provided' });
      }

      // Delete wishlists
      const result = await Wishlist.deleteMany({ _id: { $in: validIds } });

      // Delete related comments
      await mongoose.connection.db.collection('wishlist_comments')
        .deleteMany({ wishlist_id: { $in: validIds } });

      // Delete related votes
      await mongoose.connection.db.collection('wishlist_votes')
        .deleteMany({ wishlist_id: { $in: validIds } });

      res.status(200).json({ 
        message: 'Wishlists deleted successfully',
        deletedCount: result.deletedCount,
        wishlistIds: wishlistIds.filter(id => mongoose.Types.ObjectId.isValid(id))
      });
    } catch (error) {
      console.error('Error bulk deleting wishlists:', error);
      res.status(500).json({ error: 'Failed to delete wishlists' });
    }
  },

  // Get wishlist statistics
  getStatistics: async (req, res) => {
    try {
      // Total wishlist count
      const totalWishlists = await Wishlist.countDocuments();
      
      // Category distribution
      const categoryData = await Wishlist.aggregate([
        { $group: { _id: "$category", count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]);
      
      // Priority distribution
      const priorityData = await Wishlist.aggregate([
        { $group: { _id: "$priority", count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]);
      
      // Most popular wishlists (by upvotes - downvotes)
      const popularWishlists = await Wishlist.aggregate([
        { 
          $addFields: { 
            popularity: { $subtract: ["$upvotes", "$downvotes"] } 
          } 
        },
        { $sort: { popularity: -1 } },
        { $limit: 5 },
        { 
          $project: { 
            _id: 1, 
            item_name: 1, 
            category: 1, 
            upvotes: 1, 
            downvotes: 1,
            popularity: 1
          } 
        }
      ]);
      
      // Recent activity
      const recentWishlists = await Wishlist.find()
        .sort({ created_at: -1 })
        .limit(5)
        .select('_id item_name category created_at user_id')
        .lean();
      
      // Get user data for recent wishlists
      const userIds = recentWishlists.map(item => item.user_id);
      const users = await User.find({ _id: { $in: userIds } })
        .select('username')
        .lean();
      
      const userMap = {};
      users.forEach(user => {
        userMap[user._id.toString()] = user.username;
      });
      
      const enrichedRecentWishlists = recentWishlists.map(item => ({
        wishlist_id: item._id.toString(),
        item_name: item.item_name,
        category: item.category,
        created_at: item.created_at,
        username: userMap[item.user_id.toString()] || 'Unknown'
      }));
      
      res.status(200).json({
        total: totalWishlists,
        categories: categoryData.map(item => ({
          category: item._id || 'Uncategorized',
          count: item.count
        })),
        priorities: priorityData.map(item => ({
          priority: item._id || 'Uncategorized',
          count: item.count
        })),
        popular: popularWishlists.map(item => ({
          wishlist_id: item._id.toString(),
          item_name: item.item_name,
          category: item.category,
          upvotes: item.upvotes || 0,
          downvotes: item.downvotes || 0,
          popularity: item.popularity
        })),
        recent: enrichedRecentWishlists
      });
    } catch (error) {
      console.error('Error fetching wishlist statistics:', error);
      res.status(500).json({ error: 'Failed to fetch wishlist statistics' });
    }
  },
  
  // Export wishlists to CSV
  exportCSV: async (req, res) => {
    try {
      const { category, priority } = req.query;
      
      // Build query
      const query = {};
      
      if (category) {
        query.category = category;
      }
      
      if (priority) {
        query.priority = priority;
      }
      
      // Get wishlists
      const wishlists = await Wishlist.find(query)
        .sort({ created_at: -1 })
        .lean();
      
      // Get user data
      const userIds = wishlists.map(item => item.user_id);
      const users = await User.find({ _id: { $in: userIds } })
        .select('username')
        .lean();
      
      const userMap = {};
      users.forEach(user => {
        userMap[user._id.toString()] = user.username;
      });
      
      // Create CSV header
      let csv = 'ID,Item Name,Description,Max Price,Category,Priority,Upvotes,Downvotes,Watchers,Images,User ID,Username,Created At,Updated At\n';
      
      // Add data rows
      wishlists.forEach(item => {
        // Handle CSV field escaping
        const escapeCsvField = (field) => {
          if (field === null || field === undefined) return '';
          const str = String(field);
          // Escape quotes and wrap in quotes if the field contains commas, quotes, or newlines
          if (str.includes('"') || str.includes(',') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        };
        
        const row = [
          escapeCsvField(item._id),
          escapeCsvField(item.item_name),
          escapeCsvField(item.description),
          escapeCsvField(item.max_price),
          escapeCsvField(item.category),
          escapeCsvField(item.priority),
          escapeCsvField(item.upvotes || 0),
          escapeCsvField(item.downvotes || 0),
          escapeCsvField(item.watchers || 0),
          escapeCsvField(item.images ? item.images.length : 0),
          escapeCsvField(item.user_id),
          escapeCsvField(userMap[item.user_id.toString()] || 'Unknown'),
          escapeCsvField(item.created_at ? new Date(item.created_at).toISOString() : ''),
          escapeCsvField(item.updated_at ? new Date(item.updated_at).toISOString() : '')
        ].join(',');
        
        csv += row + '\n';
      });
      
      // Set response headers
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=wishlists-${Date.now()}.csv`);
      
      // Send CSV data
      res.send(csv);
    } catch (error) {
      console.error('Error exporting wishlist CSV:', error);
      res.status(500).json({ error: 'Failed to export wishlist data to CSV' });
    }
  },

  // Moderate a wishlist (update status)
  moderateWishlist: async (req, res) => {
    try {
      const { wishlistId } = req.params;
      const { action, reason } = req.body;

      if (!mongoose.Types.ObjectId.isValid(wishlistId)) {
        return res.status(400).json({ error: 'Invalid wishlist ID' });
      }

      if (!action || !['hide', 'unhide', 'flag', 'unflag'].includes(action)) {
        return res.status(400).json({ error: 'Invalid action' });
      }

      const wishlist = await Wishlist.findById(wishlistId);
      
      if (!wishlist) {
        return res.status(404).json({ error: 'Wishlist not found' });
      }

      // Update status based on action
      switch (action) {
        case 'hide':
          wishlist.is_visible = false;
          wishlist.hidden_reason = reason || 'Hidden by admin';
          break;
        case 'unhide':
          wishlist.is_visible = true;
          wishlist.hidden_reason = null;
          break;
        case 'flag':
          wishlist.is_flagged = true;
          wishlist.flagged_reason = reason || 'Flagged by admin';
          break;
        case 'unflag':
          wishlist.is_flagged = false;
          wishlist.flagged_reason = null;
          break;
      }

      wishlist.updated_at = new Date();
      await wishlist.save();

      res.status(200).json({
        message: `Wishlist ${action}ed successfully`,
        wishlist_id: wishlistId,
        action,
        wishlist: {
          is_visible: wishlist.is_visible,
          is_flagged: wishlist.is_flagged,
          hidden_reason: wishlist.hidden_reason,
          flagged_reason: wishlist.flagged_reason
        }
      });
    } catch (error) {
      console.error('Error moderating wishlist:', error);
      res.status(500).json({ error: 'Failed to moderate wishlist' });
    }
  }
};

export default wishlistDatatableController;