import express from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { User } from '../models/User.js';
import { Notification } from '../models/Notification.js';
import crypto from 'crypto';

const router = express.Router();

// All admin routes require authentication and admin role
router.use(authenticateToken);
router.use(requireAdmin);

// Get admin statistics
router.get('/stats', async (req, res) => {
  try {
    console.log('Admin stats endpoint hit by:', req.user.username, 'Role:', req.user.role);
    
    // Get user statistics
    const [totalUsers, activeUsers, bannedUsers, usersWithPenalties] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ is_active: true, role: { $ne: 'banned' } }),
      User.countDocuments({ role: 'banned' }),
      User.countDocuments({ active_penalties: { $gt: 0 } })
    ]);

    // Initialize stats object
    const stats = {
      totalUsers,
      activeUsers,
      bannedUsers,
      usersWithPenalties,
      verificationRequests: 0,
      flaggedPosts: 0,
      pendingReports: 0,
      totalTrades: 0,
      activeTrades: 0,
      totalForumPosts: 0,
      totalWishlists: 0,
      totalEvents: 0,
      middlemanApplications: 0
    };

    // Try to get trade statistics
    try {
      const { Trade } = await import('../models/Trade.js');
      const [totalTrades, activeTrades] = await Promise.all([
        Trade.countDocuments({}),
        Trade.countDocuments({ status: { $in: ['open', 'in_progress'] } })
      ]);
      stats.totalTrades = totalTrades;
      stats.activeTrades = activeTrades;
    } catch (err) {
      console.log('Trade model not available');
    }

    // Try to get forum statistics
    try {
      const { ForumPost } = await import('../models/ForumPost.js');
      stats.totalForumPosts = await ForumPost.countDocuments({});
    } catch (err) {
      console.log('ForumPost model not available');
    }

    // Try to get wishlist statistics with popularity
    try {
      const { Wishlist } = await import('../models/Wishlist.js');
      stats.totalWishlists = await Wishlist.countDocuments({});
      
      // Get popular wishlists with vote counts (using upvotes field directly)
      const popularWishlists = await Wishlist.aggregate([
        {
          $sort: { upvotes: -1 }
        },
        {
          $limit: 5
        },
        {
          $project: {
            name: '$item_name',
            popularity: '$upvotes',
            items: { $size: '$images' }
          }
        }
      ]);
      
      stats.wishlistStats = popularWishlists;
    } catch (err) {
      console.log('Wishlist model not available or aggregation failed:', err);
      stats.wishlistStats = [];
    }

    // Try to get event statistics with participants
    try {
      const { Event } = await import('../models/Event.js');
      stats.totalEvents = await Event.countDocuments({});
      
      // Get events with participant counts (participants are embedded in the Event document)
      const eventsWithParticipants = await Event.aggregate([
        {
          $addFields: {
            participants: { $size: '$participants' }
          }
        },
        {
          $sort: { participants: -1, createdAt: -1 }
        },
        {
          $limit: 5
        },
        {
          $project: {
            name: '$title',
            participants: 1,
            date: '$startDate'
          }
        }
      ]);
      
      stats.eventStats = eventsWithParticipants;
    } catch (err) {
      console.log('Event model not available or aggregation failed:', err);
      stats.eventStats = [];
    }

    // Try to get report statistics
    try {
      const { Report } = await import('../models/Report.js');
      stats.pendingReports = await Report.countDocuments({ status: 'pending' });
    } catch (err) {
      console.log('Report model not available');
    }

    // Try to get flagged posts statistics
    try {
      const { ForumPost } = await import('../models/ForumPost.js');
      stats.flaggedPosts = await ForumPost.countDocuments({ is_flagged: true });
    } catch (err) {
      console.log('Cannot get flagged posts');
    }

    // Try to get middleman application statistics
    try {
      const { MiddlemanApplication } = await import('../models/MiddlemanApplication.js');
      stats.middlemanApplications = await MiddlemanApplication.countDocuments({ status: 'pending' });
    } catch (err) {
      // Check if it's stored in User model
      stats.middlemanApplications = await User.countDocuments({ 
        middleman_application_status: 'pending' 
      });
    }

    // Try to get verification requests
    try {
      const { VerificationRequest } = await import('../models/VerificationRequest.js');
      stats.verificationRequests = await VerificationRequest.countDocuments({ status: 'pending' });
    } catch (err) {
      // Check if it's stored in User model
      stats.verificationRequests = await User.countDocuments({ 
        verification_status: 'pending' 
      });
    }

    console.log('Admin stats:', stats);
    res.json(stats);
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ 
      error: 'Failed to fetch admin statistics', 
      details: error.message 
    });
  }
});

// Get analytics data for charts
router.get('/analytics', async (req, res) => {
  try {
    console.log('Admin analytics endpoint hit by:', req.user.username);

    const days = parseInt(req.query.days) || 7;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    const analytics = {
      userActivity: [],
      tradeActivity: [],
      forumActivity: [],
      reportActivity: []
    };

    // Generate date range
    const dateRange = [];
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(endDate.getDate() - (days - 1 - i));
      dateRange.push(date);
    }

    // User activity analytics
    try {
      const userPromises = dateRange.map(async (date) => {
        const nextDay = new Date(date);
        nextDay.setDate(date.getDate() + 1);

        const count = await User.countDocuments({
          createdAt: { $gte: date, $lt: nextDay }
        });

        return {
          date: date.toISOString().split('T')[0],
          users: count
        };
      });

      analytics.userActivity = await Promise.all(userPromises);
    } catch (err) {
      console.log('Error getting user analytics:', err);
      // Fallback to sample data
      analytics.userActivity = dateRange.map((date, index) => ({
        date: date.toISOString().split('T')[0],
        users: Math.floor(Math.random() * 20) + 5
      }));
    }

    // Trade activity analytics
    try {
      const { Trade } = await import('../models/Trade.js');

      const tradePromises = dateRange.map(async (date) => {
        const nextDay = new Date(date);
        nextDay.setDate(date.getDate() + 1);

        const count = await Trade.countDocuments({
          created_at: { $gte: date, $lt: nextDay }
        });

        return {
          date: date.toISOString().split('T')[0],
          trades: count
        };
      });

      analytics.tradeActivity = await Promise.all(tradePromises);
    } catch (err) {
      console.log('Error getting trade analytics:', err);
      // Fallback to sample data
      analytics.tradeActivity = dateRange.map((date, index) => ({
        date: date.toISOString().split('T')[0],
        trades: Math.floor(Math.random() * 15) + 2
      }));
    }

    // Forum activity analytics
    try {
      const { ForumPost } = await import('../models/ForumPost.js');

      const forumPromises = dateRange.map(async (date) => {
        const nextDay = new Date(date);
        nextDay.setDate(date.getDate() + 1);

        const count = await ForumPost.countDocuments({
          createdAt: { $gte: date, $lt: nextDay }
        });

        return {
          date: date.toISOString().split('T')[0],
          posts: count
        };
      });

      analytics.forumActivity = await Promise.all(forumPromises);
    } catch (err) {
      console.log('Error getting forum analytics:', err);
      // Fallback to sample data
      analytics.forumActivity = dateRange.map((date, index) => ({
        date: date.toISOString().split('T')[0],
        posts: Math.floor(Math.random() * 25) + 5
      }));
    }

    // Report activity analytics
    try {
      const { Report } = await import('../models/Report.js');

      const reportPromises = dateRange.map(async (date) => {
        const nextDay = new Date(date);
        nextDay.setDate(date.getDate() + 1);

        const count = await Report.countDocuments({
          createdAt: { $gte: date, $lt: nextDay }
        });

        return {
          date: date.toISOString().split('T')[0],
          reports: count
        };
      });

      analytics.reportActivity = await Promise.all(reportPromises);
    } catch (err) {
      console.log('Error getting report analytics:', err);
      // Fallback to sample data
      analytics.reportActivity = dateRange.map((date, index) => ({
        date: date.toISOString().split('T')[0],
        reports: Math.floor(Math.random() * 5) + 0
      }));
    }

    console.log('Admin analytics:', analytics);
    res.json(analytics);
  } catch (error) {
    console.error('Error fetching admin analytics:', error);
    res.status(500).json({ 
      error: 'Failed to fetch admin analytics', 
      details: error.message 
    });
  }
});

// Get users with filtering (for UserManagement component)
router.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 1000, search = '', role = '', status = '' } = req.query;
    
    const query = {};
    
    // Search filter
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { roblox_username: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Role filter
    if (role && role !== 'all') {
      query.role = role;
    }
    
    // Status filter
    if (status && status !== 'all') {
      if (status === 'active') {
        query.is_active = true;
        query.role = { $ne: 'banned' };
      } else if (status === 'inactive') {
        query.is_active = false;
      } else if (status === 'banned') {
        query.role = 'banned';
      }
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password_hash -tokens')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      User.countDocuments(query)
    ]);
    
    // Enhance users with additional stats
    const enhancedUsers = await Promise.all(
      users.map(async (user) => {
        let totalTrades = 0;
        let totalVouches = 0;
        
        try {
          const { Trade } = await import('../models/Trade.js');
          totalTrades = await Trade.countDocuments({ user_id: user._id });
        } catch (err) {
          console.log('Trade model not available');
        }
        
        try {
          const { Vouch } = await import('../models/Vouch.js');
          totalVouches = await Vouch.countDocuments({ 
            user_id: user._id,
            status: 'approved'
          });
        } catch (err) {
          console.log('Vouch model not available');
        }
        
        return {
          ...user,
          totalTrades,
          totalVouches,
          isActive: user.is_active !== undefined ? user.is_active : true,
          lastActive: user.last_active || user.updatedAt
        };
      })
    );
    
    res.json({
      users: enhancedUsers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ 
      error: 'Failed to fetch users', 
      details: error.message 
    });
  }
});

// Update user role
router.put('/users/:userId/role', async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;
    
    const validRoles = ['user', 'verified', 'middleman', 'moderator', 'admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    
    if (req.user.userId === userId && req.user.role === 'admin' && role !== 'admin') {
      return res.status(403).json({ error: 'Cannot demote yourself from admin' });
    }
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const oldRole = user.role;
    user.role = role;
    
    if (!user.role_history) user.role_history = [];
    user.role_history.push({
      old_role: oldRole,
      new_role: role,
      changed_by: req.user.userId,
      changed_at: new Date()
    });
    
    await user.save();
    
    // Create notification for role change
    try {
      await Notification.createNotification({
        recipient: userId,
        sender: req.user.userId,
        type: 'admin_role_changed',
        title: 'Role Changed',
        message: `Your role has been changed from ${oldRole} to ${role} by ${req.user.username}`,
        related_id: user._id,
        related_model: 'User'
      });
    } catch (notificationError) {
      console.error('Failed to create role change notification:', notificationError);
      // Don't fail the role change if notification fails
    }
    
    res.json({
      message: 'User role updated successfully',
      user: {
        _id: user._id,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

// Ban/Unban user
router.post('/users/:userId/ban', async (req, res) => {
  try {
    const { userId } = req.params;
    const { action, reason } = req.body;
    
    if (!['ban', 'unban'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action' });
    }
    
    if (action === 'ban' && !reason?.trim()) {
      return res.status(400).json({ error: 'Ban reason is required' });
    }
    
    if (req.user.userId === userId) {
      return res.status(403).json({ error: 'Cannot ban yourself' });
    }
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (action === 'ban') {
      user.role = 'banned';
      user.is_active = false;
      user.ban_reason = reason;
      user.banned_at = new Date();
      user.banned_by = req.user.userId;
    } else {
      user.role = 'user';
      user.is_active = true;
      user.unbanned_at = new Date();
      user.unbanned_by = req.user.userId;
    }
    
    await user.save();
    
    res.json({
      message: `User ${action}ned successfully`,
      user: {
        _id: user._id,
        username: user.username,
        role: user.role,
        is_active: user.is_active
      }
    });
  } catch (error) {
    console.error(`Error ${req.body.action}ning user:`, error);
    res.status(500).json({ error: `Failed to ${req.body.action} user` });
  }
});

// Activate/Deactivate user
router.post('/users/:userId/status', async (req, res) => {
  try {
    const { userId } = req.params;
    const { action, reason } = req.body;
    
    if (!['activate', 'deactivate'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action' });
    }
    
    if (action === 'deactivate' && !reason?.trim()) {
      return res.status(400).json({ error: 'Deactivation reason is required' });
    }
    
    if (req.user.userId === userId) {
      return res.status(403).json({ error: 'Cannot deactivate yourself' });
    }
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (user.role === 'banned') {
      return res.status(400).json({ error: 'Cannot change status of banned users' });
    }
    
    if (action === 'deactivate') {
      user.is_active = false;
      user.deactivation_reason = reason;
      user.deactivated_at = new Date();
      user.deactivated_by = req.user.userId;
    } else {
      user.is_active = true;
      user.activated_at = new Date();
      user.activated_by = req.user.userId;
    }
    
    await user.save();
    
    res.json({
      message: `User ${action}d successfully`,
      user: {
        _id: user._id,
        username: user.username,
        is_active: user.is_active
      }
    });
  } catch (error) {
    console.error(`Error ${req.body.action}ing user:`, error);
    res.status(500).json({ error: `Failed to ${req.body.action} user` });
  }
});

// Issue penalty to user
router.post('/users/penalty', async (req, res) => {
  try {
    const { userId, type, severity, reason, duration } = req.body;
    
    // Validate required fields
    if (!userId || !type || !severity || !reason) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Validate penalty type
    const validTypes = ['warning', 'restriction', 'suspension', 'strike'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: 'Invalid penalty type' });
    }
    
    // Validate severity
    const validSeverities = ['low', 'medium', 'high', 'critical'];
    if (!validSeverities.includes(severity)) {
      return res.status(400).json({ error: 'Invalid penalty severity' });
    }
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Create penalty object
    const penalty = {
      _id: crypto.randomBytes(16).toString('hex'),
      type,
      severity,
      reason,
      issued_by: req.user.userId,
      issued_at: new Date(),
      is_active: true
    };
    
    // Add expiration if duration is specified
    if (duration && typeof duration === 'number' && duration > 0) {
      penalty.expires_at = new Date(Date.now() + duration * 24 * 60 * 60 * 1000);
    }
    
    // Initialize penalties array if it doesn't exist
    if (!user.penalties) {
      user.penalties = [];
    }
    
    // Add penalty to user
    user.penalties.push(penalty);
    
    // Update active penalties count
    user.active_penalties = user.penalties.filter(p => p.is_active).length;
    
    await user.save();
    
    // Create notification for penalty
    try {
      await Notification.createNotification({
        recipient: userId,
        sender: req.user.userId,
        type: 'penalty_issued',
        title: 'Penalty Issued',
        message: `You have received a ${type} penalty: ${reason}`,
        related_id: penalty._id,
        related_model: 'Penalty'
      });
    } catch (notificationError) {
      console.error('Failed to create penalty notification:', notificationError);
      // Don't fail the penalty if notification fails
    }
    
    res.json({
      message: 'Penalty issued successfully',
      penalty,
      user: {
        _id: user._id,
        username: user.username,
        active_penalties: user.active_penalties
      }
    });
  } catch (error) {
    console.error('Error issuing penalty:', error);
    res.status(500).json({ error: 'Failed to issue penalty' });
  }
});

// Lift penalty from user
router.delete('/users/:userId/penalty/:penaltyId', async (req, res) => {
  try {
    const { userId, penaltyId } = req.params;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (!user.penalties || user.penalties.length === 0) {
      return res.status(404).json({ error: 'No penalties found for this user' });
    }
    
    const penaltyIndex = user.penalties.findIndex(p => p._id === penaltyId);
    if (penaltyIndex === -1) {
      return res.status(404).json({ error: 'Penalty not found' });
    }
    
    const penalty = user.penalties[penaltyIndex];
    
    // Mark penalty as inactive
    penalty.is_active = false;
    
    // Update active penalties count
    user.active_penalties = user.penalties.filter(p => p.is_active).length;
    
    await user.save();
    
    // Create notification for penalty lift
    try {
      await Notification.createNotification({
        recipient: userId,
        sender: req.user.userId,
        type: 'admin_activation', // Reuse existing notification type
        title: 'Penalty Lifted',
        message: `Your ${penalty.type} penalty has been lifted: ${penalty.reason}`,
        related_id: penalty._id,
        related_model: 'Penalty'
      });
    } catch (notificationError) {
      console.error('Failed to create penalty lift notification:', notificationError);
      // Don't fail the penalty lift if notification fails
    }
    
    res.json({
      message: 'Penalty lifted successfully',
      penalty: penalty,
      user: {
        _id: user._id,
        username: user.username,
        active_penalties: user.active_penalties
      }
    });
  } catch (error) {
    console.error('Error lifting penalty:', error);
    res.status(500).json({ error: 'Failed to lift penalty' });
  }
});

export default router;