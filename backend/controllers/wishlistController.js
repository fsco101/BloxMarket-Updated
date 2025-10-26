import { Wishlist, WishlistComment, WishlistVote } from '../models/Wishlist.js';
import { User } from '../models/User.js';
import { Notification } from '../models/Notification.js';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer storage for wishlist images
const wishlistStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../uploads/wishlists');
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'wishlist-' + uniqueSuffix + ext);
  }
});

// Filter to accept only images
const imageFilter = function (req, file, cb) {
  // Accept images only
  if (!file.originalname.match(/\.(jpg|JPG|jpeg|JPEG|png|PNG|gif|GIF|webp|WEBP)$/)) {
    req.fileValidationError = 'Only image files are allowed!';
    return cb(new Error('Only image files are allowed!'), false);
  }
  cb(null, true);
};

// Configure multer upload
export const wishlistUpload = multer({
  storage: wishlistStorage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 5 // Max 5 files
  }
});

class WishlistController {
  /**
   * Get all wishlists with pagination and filtering
   * @route GET /api/wishlists
   * @access Public
   */
  async getAllWishlists(req, res) {
    try {
      const { page = 1, limit = 10, category, search, priority, sortBy = 'created_at', sortOrder = 'desc' } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);

      // Build query
      const query = {};
      
      // Category filter
      if (category && category !== 'all') {
        query.category = category;
      }
      
      // Priority filter
      if (priority && priority !== 'all') {
        query.priority = priority;
      }
      
      // Search filter
      if (search && search.trim()) {
        query.$or = [
          { item_name: { $regex: search.trim(), $options: 'i' } },
          { description: { $regex: search.trim(), $options: 'i' } }
        ];
      }

      // Build sort object
      const sortObject = {};
      sortObject[sortBy] = sortOrder === 'asc' ? 1 : -1;

      // Get wishlists with user data
      const wishlists = await Wishlist.find(query)
        .populate('user_id', 'username credibility_score avatar_url')
        .sort(sortObject)
        .skip(skip)
        .limit(parseInt(limit))
        .lean();

      // Get comment counts for each wishlist
      const wishlistsWithCounts = await Promise.all(
        wishlists.map(async (wishlist) => {
          const commentCount = await WishlistComment.countDocuments({ 
            wishlist_id: wishlist._id 
          });
          
          // Get user's vote if authenticated
          let userVote = null;
          const userId = req.user?.id || req.user?.userId || req.user?._id;
          
          if (userId) {
            const vote = await WishlistVote.findOne({
              wishlist_id: wishlist._id,
              user_id: userId
            });
            
            if (vote) {
              userVote = vote.vote_type;
            }
          }
          
          return {
            wishlist_id: wishlist._id,
            item_name: wishlist.item_name,
            description: wishlist.description,
            max_price: wishlist.max_price,
            category: wishlist.category,
            priority: wishlist.priority,
            created_at: wishlist.created_at,
            updated_at: wishlist.updated_at,
            user_id: wishlist.user_id._id.toString(), // Ensure it's a string
            username: wishlist.user_id.username,
            credibility_score: wishlist.user_id.credibility_score || 0,
            avatar_url: wishlist.user_id.avatar_url,
            watchers: wishlist.watchers || 0,
            comment_count: commentCount,
            upvotes: wishlist.upvotes || 0,
            downvotes: wishlist.downvotes || 0,
            images: wishlist.images || [],
            userVote: userVote
          };
        })
      );

      // Get total count for pagination
      const total = await Wishlist.countDocuments(query);

      res.json({
        success: true,
        wishlists: wishlistsWithCounts,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      });
    } catch (error) {
      console.error('Error fetching wishlists:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to fetch wishlists',
        message: error.message 
      });
    }
  }

  /**
   * Get single wishlist by ID
   * @route GET /api/wishlists/:wishlistId
   * @access Public
   */
  async getWishlistById(req, res) {
    try {
      const { wishlistId } = req.params;

      // Validate wishlist ID
      if (!wishlistId.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(400).json({ 
          success: false,
          error: 'Invalid wishlist ID format' 
        });
      }

      const wishlist = await Wishlist.findById(wishlistId)
        .populate('user_id', 'username credibility_score roblox_username avatar_url')
        .lean();

      if (!wishlist) {
        return res.status(404).json({ 
          success: false,
          error: 'Wishlist item not found' 
        });
      }

      // Get comment count
      const commentCount = await WishlistComment.countDocuments({ 
        wishlist_id: wishlist._id 
      });

      // Get user's vote if authenticated
      let userVote = null;
      const userId = req.user?.id || req.user?.userId || req.user?._id;
      
      if (userId) {
        const vote = await WishlistVote.findOne({
          wishlist_id: wishlist._id,
          user_id: userId
        });
        
        if (vote) {
          userVote = vote.vote_type;
        }
      }

      res.json({
        success: true,
        wishlist: {
          wishlist_id: wishlist._id,
          item_name: wishlist.item_name,
          description: wishlist.description,
          max_price: wishlist.max_price,
          category: wishlist.category,
          priority: wishlist.priority,
          created_at: wishlist.created_at,
          updated_at: wishlist.updated_at,
          user_id: wishlist.user_id._id,
          username: wishlist.user_id.username,
          credibility_score: wishlist.user_id.credibility_score || 0,
          avatar_url: wishlist.user_id.avatar_url,
          watchers: wishlist.watchers || 0,
          comment_count: commentCount,
          upvotes: wishlist.upvotes || 0,
          downvotes: wishlist.downvotes || 0,
          images: wishlist.images || [],
          userVote: userVote
        }
      });
    } catch (error) {
      console.error('Error fetching wishlist:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to fetch wishlist',
        message: error.message 
      });
    }
  }

  /**
   * Create new wishlist item
   * @route POST /api/wishlists
   * @access Private
   */
  async createWishlist(req, res) {
    try {
      console.log('=== CREATE WISHLIST DEBUG ===');
      console.log('Full req.user object:', req.user);
      console.log('Request body:', req.body);
      console.log('Authorization header:', req.headers['authorization']);
      console.log('Files:', req.files ? req.files.length : 'None');
      
      const { item_name, description, max_price, category, priority } = req.body;
      
      // Try multiple possible user ID locations
      const userId = req.user?.id || req.user?.userId || req.user?._id;
      
      console.log('Extracted userId:', userId);
      console.log('userId type:', typeof userId);

      // Validation
      if (!userId) {
        console.error('No user ID found in request. req.user:', req.user);
        return res.status(401).json({ 
          success: false,
          error: 'User not authenticated',
          debug: {
            hasReqUser: !!req.user,
            reqUserKeys: req.user ? Object.keys(req.user) : []
          }
        });
      }

      if (!item_name || !item_name.trim()) {
        return res.status(400).json({ 
          success: false,
          error: 'Item name is required' 
        });
      }

      if (!category) {
        return res.status(400).json({ 
          success: false,
          error: 'Category is required' 
        });
      }

      // Validate category
      const validCategories = ['limiteds', 'accessories', 'gear', 'event-items', 'gamepasses'];
      if (!validCategories.includes(category)) {
        return res.status(400).json({ 
          success: false,
          error: 'Invalid category. Must be one of: ' + validCategories.join(', ') 
        });
      }

      // Validate priority
      const validPriorities = ['high', 'medium', 'low'];
      if (priority && !validPriorities.includes(priority)) {
        return res.status(400).json({ 
          success: false,
          error: 'Invalid priority. Must be one of: high, medium, low' 
        });
      }

      console.log('Creating wishlist with userId:', userId);

      // Process uploaded images if any
      let images = [];
      if (req.files && req.files.length > 0) {
        // Maximum of 5 images allowed
        if (req.files.length > 5) {
          return res.status(400).json({ 
            success: false,
            error: 'Maximum of 5 images allowed per wishlist item' 
          });
        }
        
        // Format images data
        images = req.files.map(file => ({
          filename: file.filename,
          originalName: file.originalname,
          uploadedAt: new Date()
        }));
      }

      // Create wishlist
      const wishlist = new Wishlist({
        user_id: userId,
        item_name: item_name.trim(),
        description: description?.trim() || '',
        max_price: max_price?.trim() || 'Negotiable',
        category,
        priority: priority || 'medium',
        images
      });

      await wishlist.save();
      console.log('Wishlist saved successfully:', wishlist._id);

      // Populate user data
      const populatedWishlist = await Wishlist.findById(wishlist._id)
        .populate('user_id', 'username credibility_score avatar_url')
        .lean();

      console.log('Wishlist populated successfully');

      res.status(201).json({
        success: true,
        message: 'Wishlist item created successfully',
        wishlist: {
          wishlist_id: populatedWishlist._id,
          item_name: populatedWishlist.item_name,
          description: populatedWishlist.description,
          max_price: populatedWishlist.max_price,
          category: populatedWishlist.category,
          priority: populatedWishlist.priority,
          created_at: populatedWishlist.created_at,
          updated_at: populatedWishlist.updated_at,
          user_id: populatedWishlist.user_id._id,
          username: populatedWishlist.user_id.username,
          credibility_score: populatedWishlist.user_id.credibility_score || 0,
          avatar_url: populatedWishlist.user_id.avatar_url,
          watchers: 0,
          comment_count: 0
        }
      });
    } catch (error) {
      console.error('Error creating wishlist:', error);
      console.error('Error stack:', error.stack);
      res.status(500).json({ 
        success: false,
        error: 'Failed to create wishlist item',
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  /**
   * Update wishlist item
   * @route PUT /api/wishlists/:wishlistId
   * @access Private
   */
  async updateWishlist(req, res) {
    try {
      const { wishlistId } = req.params;
      const { item_name, description, max_price, category, priority } = req.body;
      
      // Try multiple possible user ID locations (consistent with createWishlist)
      const userId = req.user?.id || req.user?.userId || req.user?._id;
      
      console.log('=== UPDATE WISHLIST DEBUG ===');
      console.log('Full req.user object:', req.user);
      console.log('Extracted userId:', userId);
      console.log('Wishlist ID:', wishlistId);

      if (!userId) {
        console.error('No user ID found in request. req.user:', req.user);
        return res.status(401).json({ 
          success: false,
          error: 'User not authenticated',
          debug: {
            hasReqUser: !!req.user,
            reqUserKeys: req.user ? Object.keys(req.user) : []
          }
        });
      }

      // Validate wishlist ID
      if (!wishlistId.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(400).json({ 
          success: false,
          error: 'Invalid wishlist ID format' 
        });
      }

      // Find wishlist
      const wishlist = await Wishlist.findById(wishlistId);

      if (!wishlist) {
        return res.status(404).json({ 
          success: false,
          error: 'Wishlist item not found' 
        });
      }

      // Check ownership - convert both to strings for comparison
      const wishlistUserId = wishlist.user_id.toString();
      const currentUserId = userId.toString();
      
      console.log('Ownership check:', {
        wishlistUserId,
        currentUserId,
        matches: wishlistUserId === currentUserId
      });

      if (wishlistUserId !== currentUserId) {
        return res.status(403).json({ 
          success: false,
          error: 'Not authorized to update this wishlist item' 
        });
      }

      // Validation
      if (item_name !== undefined && !item_name.trim()) {
        return res.status(400).json({ 
          success: false,
          error: 'Item name cannot be empty' 
        });
      }

      // Validate category if provided
      if (category) {
        const validCategories = ['limiteds', 'accessories', 'gear', 'event-items', 'gamepasses'];
        if (!validCategories.includes(category)) {
          return res.status(400).json({ 
            success: false,
            error: 'Invalid category' 
          });
        }
      }

      // Validate priority if provided
      if (priority) {
        const validPriorities = ['high', 'medium', 'low'];
        if (!validPriorities.includes(priority)) {
          return res.status(400).json({ 
            success: false,
            error: 'Invalid priority' 
          });
        }
      }

      // Check for duplicate name (excluding current wishlist)
      if (item_name && item_name.trim() !== wishlist.item_name) {
        const duplicateWishlist = await Wishlist.findOne({
          user_id: userId,
          item_name: { $regex: new RegExp(`^${item_name.trim()}$`, 'i') },
          _id: { $ne: wishlistId }
        });

        if (duplicateWishlist) {
          return res.status(400).json({ 
            success: false,
            error: 'You already have a wishlist item with this name' 
          });
        }
      }

      // Update fields
      if (item_name !== undefined) wishlist.item_name = item_name.trim();
      if (description !== undefined) wishlist.description = description.trim();
      if (max_price !== undefined) wishlist.max_price = max_price.trim() || 'Negotiable';
      if (category !== undefined) wishlist.category = category;
      if (priority !== undefined) wishlist.priority = priority;
      wishlist.updated_at = new Date();

      await wishlist.save();

      // Populate user data
      const populatedWishlist = await Wishlist.findById(wishlist._id)
        .populate('user_id', 'username credibility_score avatar_url')
        .lean();

      // Get comment count
      const commentCount = await WishlistComment.countDocuments({ 
        wishlist_id: wishlist._id 
      });

      res.json({
        success: true,
        message: 'Wishlist item updated successfully',
        wishlist: {
          wishlist_id: populatedWishlist._id,
          item_name: populatedWishlist.item_name,
          description: populatedWishlist.description,
          max_price: populatedWishlist.max_price,
          category: populatedWishlist.category,
          priority: populatedWishlist.priority,
          created_at: populatedWishlist.created_at,
          updated_at: populatedWishlist.updated_at,
          user_id: populatedWishlist.user_id._id,
          username: populatedWishlist.user_id.username,
          credibility_score: populatedWishlist.user_id.credibility_score || 0,
          avatar_url: populatedWishlist.user_id.avatar_url,
          watchers: populatedWishlist.watchers || 0,
          comment_count: commentCount
        }
      });
    } catch (error) {
      console.error('Error updating wishlist:', error);
      console.error('Error stack:', error.stack);
      res.status(500).json({ 
        success: false,
        error: 'Failed to update wishlist item',
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  /**
   * Delete wishlist item
   * @route DELETE /api/wishlists/:wishlistId
   * @access Private
   */
  async deleteWishlist(req, res) {
    try {
      const { wishlistId } = req.params;
      
      // Try multiple possible user ID locations (consistent with createWishlist)
      const userId = req.user?.id || req.user?.userId || req.user?._id;
      
      console.log('=== DELETE WISHLIST DEBUG ===');
      console.log('Full req.user object:', req.user);
      console.log('Extracted userId:', userId);
      console.log('Wishlist ID:', wishlistId);

      if (!userId) {
        console.error('No user ID found in request. req.user:', req.user);
        return res.status(401).json({ 
          success: false,
          error: 'User not authenticated',
          debug: {
            hasReqUser: !!req.user,
            reqUserKeys: req.user ? Object.keys(req.user) : []
          }
        });
      }

      // Validate wishlist ID
      if (!wishlistId.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(400).json({ 
          success: false,
          error: 'Invalid wishlist ID format' 
        });
      }

      // Find wishlist
      const wishlist = await Wishlist.findById(wishlistId);

      if (!wishlist) {
        return res.status(404).json({ 
          success: false,
          error: 'Wishlist item not found' 
        });
      }

      // Check if user owns the wishlist or is admin/moderator
      const user = await User.findById(userId);
      
      // Convert to strings for comparison
      const wishlistUserId = wishlist.user_id.toString();
      const currentUserId = userId.toString();
      
      const isOwner = wishlistUserId === currentUserId;
      const isAdmin = user && (user.role === 'admin' || user.role === 'moderator');

      console.log('Delete permission check:', {
        wishlistUserId,
        currentUserId,
        userRole: user?.role,
        isOwner,
        isAdmin,
        canDelete: isOwner || isAdmin
      });

      if (!isOwner && !isAdmin) {
        return res.status(403).json({ 
          success: false,
          error: 'Not authorized to delete this wishlist item' 
        });
      }

      // Delete associated comments
      const deletedComments = await WishlistComment.deleteMany({ 
        wishlist_id: wishlist._id 
      });

      // Delete wishlist
      await wishlist.deleteOne();

      res.json({ 
        success: true,
        message: 'Wishlist item deleted successfully',
        deleted: {
          wishlist_id: wishlistId,
          comments_deleted: deletedComments.deletedCount
        }
      });
    } catch (error) {
      console.error('Error deleting wishlist:', error);
      console.error('Error stack:', error.stack);
      res.status(500).json({ 
        success: false,
        error: 'Failed to delete wishlist item',
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  /**
   * Get wishlist comments
   * @route GET /api/wishlists/:wishlistId/comments
   * @access Public
   */
  async getWishlistComments(req, res) {
    try {
      const { wishlistId } = req.params;

      // Validate wishlist ID
      if (!wishlistId.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(400).json({ 
          success: false,
          error: 'Invalid wishlist ID format' 
        });
      }

      // Check if wishlist exists
      const wishlist = await Wishlist.findById(wishlistId);
      if (!wishlist) {
        return res.status(404).json({ 
          success: false,
          error: 'Wishlist item not found' 
        });
      }

      // Get comments
      const comments = await WishlistComment.find({ wishlist_id: wishlistId })
        .populate('user_id', 'username credibility_score avatar_url')
        .sort({ created_at: -1 })
        .lean();

      const formattedComments = comments.map(comment => ({
        comment_id: comment._id,
        wishlist_id: comment.wishlist_id,
        user_id: comment.user_id._id,
        content: comment.content,
        created_at: comment.created_at,
        username: comment.user_id.username,
        credibility_score: comment.user_id.credibility_score || 0,
        avatar_url: comment.user_id.avatar_url
      }));

      res.json({ 
        success: true,
        comments: formattedComments,
        count: formattedComments.length
      });
    } catch (error) {
      console.error('Error fetching wishlist comments:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to fetch comments',
        message: error.message 
      });
    }
  }

  /**
   * Add wishlist comment
   * @route POST /api/wishlists/:wishlistId/comments
   * @access Private
   */
  async addWishlistComment(req, res) {
    try {
      const { wishlistId } = req.params;
      const { content } = req.body;
      // Use the userId property from req.user
      const userId = req.user.userId;
      
      console.log('Add wishlist comment - User ID:', userId);
      console.log('Add wishlist comment - req.user object:', req.user);

      // Validate wishlist ID
      if (!wishlistId.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(400).json({ 
          success: false,
          error: 'Invalid wishlist ID format' 
        });
      }

      // Validation
      if (!content || !content.trim()) {
        return res.status(400).json({ 
          success: false,
          error: 'Comment content is required' 
        });
      }

      if (content.trim().length > 1000) {
        return res.status(400).json({ 
          success: false,
          error: 'Comment is too long (max 1000 characters)' 
        });
      }

      // Check if wishlist exists
      const wishlist = await Wishlist.findById(wishlistId);
      if (!wishlist) {
        return res.status(404).json({ 
          success: false,
          error: 'Wishlist item not found' 
        });
      }

      // Create comment
      const comment = new WishlistComment({
        wishlist_id: wishlistId,
        user_id: userId,
        content: content.trim()
      });

      await comment.save();

      // Create notification for wishlist owner (if not commenting on own wishlist)
      if (!wishlist.user_id.equals(userId)) {
        try {
          await Notification.createNotification({
            recipient: wishlist.user_id,
            sender: userId,
            type: 'wishlist_comment',
            title: 'New Comment on Your Wishlist',
            message: `${req.user.username} commented on your wishlist item "${wishlist.item_name}"`,
            related_id: comment._id,
            related_model: 'WishlistComment'
          });
        } catch (notificationError) {
          console.error('Failed to create wishlist comment notification:', notificationError);
          // Don't fail the comment creation if notification fails
        }
      }

      // Populate user data
      const populatedComment = await WishlistComment.findById(comment._id)
        .populate('user_id', 'username credibility_score avatar_url')
        .lean();

      res.status(201).json({
        success: true,
        message: 'Comment added successfully',
        comment_id: populatedComment._id,
        wishlist_id: populatedComment.wishlist_id,
        user_id: populatedComment.user_id._id,
        content: populatedComment.content,
        created_at: populatedComment.created_at,
        username: populatedComment.user_id.username,
        credibility_score: populatedComment.user_id.credibility_score || 0,
        avatar_url: populatedComment.user_id.avatar_url
      });
    } catch (error) {
      console.error('Error adding wishlist comment:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to add comment',
        message: error.message 
      });
    }
  }

  /**
   * Get user's wishlists
   * @route GET /api/wishlists/user/:userId
   * @access Public
   */
  async getUserWishlists(req, res) {
    try {
      const { userId } = req.params;
      const { page = 1, limit = 10 } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);

      // Validate user ID
      if (!userId.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(400).json({ 
          success: false,
          error: 'Invalid user ID format' 
        });
      }

      // Get user's wishlists
      const wishlists = await Wishlist.find({ user_id: userId })
        .populate('user_id', 'username credibility_score avatar_url')
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean();

      // Get comment counts
      const wishlistsWithCounts = await Promise.all(
        wishlists.map(async (wishlist) => {
          const commentCount = await WishlistComment.countDocuments({ 
            wishlist_id: wishlist._id 
          });
          
          return {
            wishlist_id: wishlist._id,
            item_name: wishlist.item_name,
            description: wishlist.description,
            max_price: wishlist.max_price,
            category: wishlist.category,
            priority: wishlist.priority,
            created_at: wishlist.created_at,
            updated_at: wishlist.updated_at,
            user_id: wishlist.user_id._id,
            username: wishlist.user_id.username,
            credibility_score: wishlist.user_id.credibility_score || 0,
            avatar_url: wishlist.user_id.avatar_url,
            watchers: wishlist.watchers || 0,
            comment_count: commentCount,
            upvotes: wishlist.upvotes || 0,
            downvotes: wishlist.downvotes || 0,
            images: wishlist.images || []
          };
        })
      );

      const total = await Wishlist.countDocuments({ user_id: userId });

      res.json({
        success: true,
        wishlists: wishlistsWithCounts,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      });
    } catch (error) {
      console.error('Error fetching user wishlists:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to fetch user wishlists',
        message: error.message 
      });
    }
  }
  
  /**
   * Vote on a wishlist (upvote/downvote)
   * @route POST /api/wishlists/:wishlistId/vote
   * @access Private
   */
  async voteOnWishlist(req, res) {
    try {
      const { wishlistId } = req.params;
      const { voteType } = req.body;
      const userId = req.user?.id || req.user?.userId || req.user?._id;
      
      console.log('=== VOTE ON WISHLIST DEBUG ===');
      console.log('Full req.user object:', req.user);
      console.log('Extracted userId:', userId);
      console.log('Wishlist ID:', wishlistId);
      console.log('Vote type:', voteType);

      // Validate user ID
      if (!userId) {
        return res.status(401).json({ 
          success: false,
          error: 'User not authenticated' 
        });
      }

      // Validate wishlist ID
      if (!wishlistId.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(400).json({ 
          success: false,
          error: 'Invalid wishlist ID format' 
        });
      }

      // Validate vote type
      if (!voteType || !['up', 'down'].includes(voteType)) {
        return res.status(400).json({ 
          success: false,
          error: 'Invalid vote type. Must be "up" or "down".' 
        });
      }

      // Check if wishlist exists
      const wishlist = await Wishlist.findById(wishlistId);
      if (!wishlist) {
        return res.status(404).json({ 
          success: false,
          error: 'Wishlist item not found' 
        });
      }

      // Check if user already voted on this wishlist
      let userVote = await WishlistVote.findOne({ 
        wishlist_id: wishlistId, 
        user_id: userId 
      });

      // If user hasn't voted, create new vote
      if (!userVote) {
        userVote = new WishlistVote({
          wishlist_id: wishlistId,
          user_id: userId,
          vote_type: voteType
        });
        
        // Update upvotes/downvotes count
        if (voteType === 'up') {
          wishlist.upvotes = (wishlist.upvotes || 0) + 1;
        } else {
          wishlist.downvotes = (wishlist.downvotes || 0) + 1;
        }
        
        await userVote.save();
        await wishlist.save();
        
        // Create notification for wishlist owner (if not voting on own wishlist)
        if (!wishlist.user_id.equals(userId)) {
          try {
            const notificationType = voteType === 'up' ? 'wishlist_upvote' : 'wishlist_downvote';
            const actionText = voteType === 'up' ? 'upvoted' : 'downvoted';

            await Notification.createNotification({
              recipient: wishlist.user_id,
              sender: userId,
              type: notificationType,
              title: `Your Wishlist Item Was ${actionText}`,
              message: `${req.user.username} ${actionText} your wishlist item "${wishlist.item_name}"`,
              related_id: wishlist._id,
              related_model: 'Wishlist'
            });
          } catch (notificationError) {
            console.error('Failed to create wishlist vote notification:', notificationError);
            // Don't fail the vote if notification fails
          }
        }
        
        return res.json({
          success: true,
          message: `${voteType === 'up' ? 'Upvoted' : 'Downvoted'} wishlist item`,
          userVote: voteType,
          upvotes: wishlist.upvotes || 0,
          downvotes: wishlist.downvotes || 0
        });
      }
      
      // If user clicks on same vote type, remove the vote
      if (userVote.vote_type === voteType) {
        // Update upvotes/downvotes count
        if (voteType === 'up') {
          wishlist.upvotes = Math.max(0, (wishlist.upvotes || 0) - 1);
        } else {
          wishlist.downvotes = Math.max(0, (wishlist.downvotes || 0) - 1);
        }
        
        // Remove the vote
        await userVote.deleteOne();
        await wishlist.save();
        
        return res.json({
          success: true,
          message: 'Vote removed',
          userVote: null,
          upvotes: wishlist.upvotes || 0,
          downvotes: wishlist.downvotes || 0
        });
      }
      
      // If user changes vote type (up to down or down to up)
      // First, remove the old vote count
      if (userVote.vote_type === 'up') {
        wishlist.upvotes = Math.max(0, (wishlist.upvotes || 0) - 1);
      } else {
        wishlist.downvotes = Math.max(0, (wishlist.downvotes || 0) - 1);
      }
      
      // Then add the new vote count
      if (voteType === 'up') {
        wishlist.upvotes = (wishlist.upvotes || 0) + 1;
      } else {
        wishlist.downvotes = (wishlist.downvotes || 0) + 1;
      }
      
      // Update the vote type
      userVote.vote_type = voteType;
      
      await userVote.save();
      await wishlist.save();
      
      res.json({
        success: true,
        message: `Changed vote to ${voteType === 'up' ? 'upvote' : 'downvote'}`,
        userVote: voteType,
        upvotes: wishlist.upvotes || 0,
        downvotes: wishlist.downvotes || 0
      });
    } catch (error) {
      console.error('Error voting on wishlist:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to vote on wishlist item',
        message: error.message 
      });
    }
  }
  
  /**
   * Get wishlist votes
   * @route GET /api/wishlists/:wishlistId/votes
   * @access Public
   */
  async getWishlistVotes(req, res) {
    try {
      const { wishlistId } = req.params;
      
      // Get user ID if authenticated
      const userId = req.user?.id || req.user?.userId || req.user?._id;
      
      // Validate wishlist ID
      if (!wishlistId.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(400).json({ 
          success: false,
          error: 'Invalid wishlist ID format' 
        });
      }

      // Get wishlist with vote counts
      const wishlist = await Wishlist.findById(wishlistId);
      if (!wishlist) {
        return res.status(404).json({ 
          success: false,
          error: 'Wishlist item not found' 
        });
      }
      
      // Get user's vote if authenticated
      let userVote = null;
      if (userId) {
        const vote = await WishlistVote.findOne({
          wishlist_id: wishlistId,
          user_id: userId
        });
        
        if (vote) {
          userVote = vote.vote_type;
        }
      }
      
      res.json({
        success: true,
        upvotes: wishlist.upvotes || 0,
        downvotes: wishlist.downvotes || 0,
        userVote: userVote
      });
    } catch (error) {
      console.error('Error getting wishlist votes:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to get wishlist votes',
        message: error.message 
      });
    }
  }
  
  /**
   * Upload images for wishlist
   * @route POST /api/wishlists/:wishlistId/images
   * @access Private
   */
  async uploadWishlistImages(req, res) {
    try {
      const { wishlistId } = req.params;
      const userId = req.user?.id || req.user?.userId || req.user?._id;
      
      // Validate user ID
      if (!userId) {
        return res.status(401).json({ 
          success: false,
          error: 'User not authenticated' 
        });
      }

      // Validate wishlist ID
      if (!wishlistId.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(400).json({ 
          success: false,
          error: 'Invalid wishlist ID format' 
        });
      }
      
      // Get wishlist
      const wishlist = await Wishlist.findById(wishlistId);
      if (!wishlist) {
        return res.status(404).json({ 
          success: false,
          error: 'Wishlist item not found' 
        });
      }
      
      // Check ownership
      const wishlistUserId = wishlist.user_id.toString();
      const currentUserId = userId.toString();
      
      if (wishlistUserId !== currentUserId) {
        return res.status(403).json({ 
          success: false,
          error: 'Not authorized to upload images for this wishlist item' 
        });
      }
      
      // Check if files exist in request
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ 
          success: false,
          error: 'No images uploaded' 
        });
      }
      
      // Initialize images array if it doesn't exist
      if (!wishlist.images) {
        wishlist.images = [];
      }
      
      // Check if wishlist already has 5 or more images
      if (wishlist.images.length + req.files.length > 5) {
        return res.status(400).json({ 
          success: false,
          error: 'Maximum of 5 images allowed per wishlist item' 
        });
      }
      
      // Add new images to wishlist
      req.files.forEach(file => {
        wishlist.images.push({
          filename: file.filename,
          originalName: file.originalname,
          uploadedAt: new Date()
        });
      });
      
      wishlist.updated_at = new Date();
      
      await wishlist.save();
      
      res.json({
        success: true,
        message: 'Images uploaded successfully',
        images: wishlist.images
      });
    } catch (error) {
      console.error('Error uploading wishlist images:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to upload images',
        message: error.message 
      });
    }
  }
  
  /**
   * Delete wishlist image
   * @route DELETE /api/wishlists/:wishlistId/images/:filename
   * @access Private
   */
  async deleteWishlistImage(req, res) {
    try {
      const { wishlistId, filename } = req.params;
      const userId = req.user?.id || req.user?.userId || req.user?._id;
      
      // Validate user ID
      if (!userId) {
        return res.status(401).json({ 
          success: false,
          error: 'User not authenticated' 
        });
      }
      
      // Validate wishlist ID
      if (!wishlistId.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(400).json({ 
          success: false,
          error: 'Invalid wishlist ID format' 
        });
      }
      
      // Get wishlist
      const wishlist = await Wishlist.findById(wishlistId);
      if (!wishlist) {
        return res.status(404).json({ 
          success: false,
          error: 'Wishlist item not found' 
        });
      }
      
      // Check ownership
      const wishlistUserId = wishlist.user_id.toString();
      const currentUserId = userId.toString();
      
      if (wishlistUserId !== currentUserId) {
        return res.status(403).json({ 
          success: false,
          error: 'Not authorized to delete images from this wishlist item' 
        });
      }
      
      // Check if image exists in wishlist
      const imageIndex = wishlist.images?.findIndex(img => img.filename === filename);
      if (imageIndex === -1 || imageIndex === undefined) {
        return res.status(404).json({ 
          success: false,
          error: 'Image not found in wishlist' 
        });
      }
      
      // Get the image to delete
      const imageToDelete = wishlist.images[imageIndex];
      
      // Remove image from array
      wishlist.images.splice(imageIndex, 1);
      wishlist.updated_at = new Date();
      
      // Save wishlist
      await wishlist.save();
      
      // Delete the file from filesystem
      const imagePath = path.join(__dirname, '../uploads/wishlists', filename);
      try {
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      } catch (err) {
        console.error('Error deleting image file:', err);
        // Continue even if file deletion fails
      }
      
      res.json({
        success: true,
        message: 'Image deleted successfully',
        deleted: {
          filename: imageToDelete.filename,
          originalName: imageToDelete.originalName
        }
      });
    } catch (error) {
      console.error('Error deleting wishlist image:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to delete image',
        message: error.message 
      });
    }
  }
}

export default new WishlistController();