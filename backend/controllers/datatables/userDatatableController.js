import { User } from '../../models/User.js';
import mongoose from 'mongoose';

/**
 * DataTable controller for User Management
 * Handles server-side processing for DataTables with user role, status, and penalty management
 */
export const userDatatableController = {
  /**
   * Get users for DataTable with server-side processing
   * Supports search, filtering, sorting, and pagination
   */
  getUsers: async (req, res) => {
    try {
      // DataTables parameters
      const draw = parseInt(req.query.draw) || 1;
      const start = parseInt(req.query.start) || 0;
      const length = parseInt(req.query.length) || 25;
      const searchValue = req.query.search?.value || '';
      
      // Custom filters
      const roleFilter = req.query.role || '';
      const statusFilter = req.query.status || '';
      
      // Sorting
      const orderColumnIndex = parseInt(req.query.order?.[0]?.column) || 5;
      const orderDir = req.query.order?.[0]?.dir || 'desc';
      
      // Build query
      const query = {};
      
      // Search across multiple fields
      if (searchValue) {
        query.$or = [
          { username: { $regex: searchValue, $options: 'i' } },
          { email: { $regex: searchValue, $options: 'i' } },
          { roblox_username: { $regex: searchValue, $options: 'i' } }
        ];
      }
      
      // Role filter
      if (roleFilter && roleFilter !== 'all') {
        query.role = roleFilter;
      }
      
      // Status filter
      if (statusFilter && statusFilter !== 'all') {
        if (statusFilter === 'active') {
          query.is_active = true;
          query.role = { $ne: 'banned' };
        } else if (statusFilter === 'inactive') {
          query.is_active = false;
          query.role = { $ne: 'banned' };
        } else if (statusFilter === 'banned') {
          query.role = 'banned';
        }
      }
      
      // Sorting configuration
      const sortFields = ['username', 'role', 'totalTrades', 'is_active', 'createdAt', 'createdAt'];
      const sortField = sortFields[orderColumnIndex] || 'createdAt';
      const sortOrder = orderDir === 'asc' ? 1 : -1;
      
      // Get total count
      const totalRecords = await User.countDocuments({});
      const filteredRecords = await User.countDocuments(query);
      
      // Fetch users with pagination
      const users = await User.find(query)
        .sort({ [sortField]: sortOrder })
        .skip(start)
        .limit(length)
        .select('-password_hash -tokens')
        .lean();
      
      // Enhance user data with additional stats
      const enhancedUsers = await Promise.all(
        users.map(async (user) => {
          // Get trade count (if you have a Trade model)
          let totalTrades = 0;
          let totalVouches = 0;
          
          try {
            const Trade = mongoose.model('Trade');
            totalTrades = await Trade.countDocuments({ user_id: user._id });
          } catch (err) {
            console.log('Trade model not found, skipping trade count');
          }
          
          try {
            const Vouch = mongoose.model('Vouch');
            totalVouches = await Vouch.countDocuments({ 
              user_id: user._id,
              status: 'approved'
            });
          } catch (err) {
            console.log('Vouch model not found, skipping vouch count');
          }
          
          return {
            ...user,
            totalTrades,
            totalVouches,
            isActive: user.is_active,
            lastActive: user.last_active || user.updatedAt
          };
        })
      );
      
      // DataTables response format
      res.json({
        draw,
        recordsTotal: totalRecords,
        recordsFiltered: filteredRecords,
        data: enhancedUsers
      });
    } catch (error) {
      console.error('Error fetching users for DataTable:', error);
      res.status(500).json({ 
        error: 'Failed to fetch users',
        details: error.message 
      });
    }
  },

  /**
   * Update user role
   */
  updateRole: async (req, res) => {
    try {
      const { userId } = req.params;
      const { role } = req.body;
      
      // Validate role
      const validRoles = ['user', 'verified', 'middleman', 'moderator', 'admin'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ error: 'Invalid role' });
      }
      
      // Prevent self-demotion from admin
      if (req.user.userId === userId && req.user.role === 'admin' && role !== 'admin') {
        return res.status(403).json({ error: 'Cannot demote yourself from admin' });
      }
      
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      const oldRole = user.role;
      user.role = role;
      
      // Log the role change
      if (!user.role_history) user.role_history = [];
      user.role_history.push({
        old_role: oldRole,
        new_role: role,
        changed_by: req.user.userId,
        changed_at: new Date(),
        reason: req.body.reason || 'Role updated by admin'
      });
      
      await user.save();
      
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
  },

  /**
   * Ban/Unban user
   */
  banUser: async (req, res) => {
    try {
      const { userId } = req.params;
      const { action, reason } = req.body;
      
      if (!['ban', 'unban'].includes(action)) {
        return res.status(400).json({ error: 'Invalid action' });
      }
      
      if (action === 'ban' && !reason?.trim()) {
        return res.status(400).json({ error: 'Ban reason is required' });
      }
      
      // Prevent banning yourself
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
        
        // Add to penalty history
        if (!user.penalty_history) user.penalty_history = [];
        user.penalty_history.push({
          type: 'ban',
          reason,
          issued_by: req.user.userId,
          issued_at: new Date(),
          status: 'active'
        });
      } else {
        // Unban
        user.role = 'user'; // Reset to basic user role
        user.is_active = true;
        user.unbanned_at = new Date();
        user.unbanned_by = req.user.userId;
        user.unban_reason = reason || 'Ban lifted by admin';
        
        // Update penalty history
        if (user.penalty_history) {
          const activeBan = user.penalty_history.find(p => p.type === 'ban' && p.status === 'active');
          if (activeBan) {
            activeBan.status = 'lifted';
            activeBan.lifted_at = new Date();
            activeBan.lifted_by = req.user.userId;
          }
        }
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
  },

  /**
   * Activate/Deactivate user
   */
  updateStatus: async (req, res) => {
    try {
      const { userId } = req.params;
      const { action, reason } = req.body;
      
      if (!['activate', 'deactivate'].includes(action)) {
        return res.status(400).json({ error: 'Invalid action' });
      }
      
      if (action === 'deactivate' && !reason?.trim()) {
        return res.status(400).json({ error: 'Deactivation reason is required' });
      }
      
      // Prevent deactivating yourself
      if (req.user.userId === userId) {
        return res.status(403).json({ error: 'Cannot deactivate yourself' });
      }
      
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Cannot activate/deactivate banned users
      if (user.role === 'banned') {
        return res.status(400).json({ error: 'Cannot change status of banned users. Unban them first.' });
      }
      
      if (action === 'deactivate') {
        user.is_active = false;
        user.deactivation_reason = reason;
        user.deactivated_at = new Date();
        user.deactivated_by = req.user.userId;
        
        // Add to penalty history
        if (!user.penalty_history) user.penalty_history = [];
        user.penalty_history.push({
          type: 'deactivation',
          reason,
          issued_by: req.user.userId,
          issued_at: new Date(),
          status: 'active'
        });
      } else {
        // Activate
        user.is_active = true;
        user.activated_at = new Date();
        user.activated_by = req.user.userId;
        user.activation_reason = reason || 'Account reactivated by admin';
        
        // Update penalty history
        if (user.penalty_history) {
          const activeDeactivation = user.penalty_history.find(
            p => p.type === 'deactivation' && p.status === 'active'
          );
          if (activeDeactivation) {
            activeDeactivation.status = 'lifted';
            activeDeactivation.lifted_at = new Date();
            activeDeactivation.lifted_by = req.user.userId;
          }
        }
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
  },

  /**
   * Issue penalty (warning, suspension, or ban)
   */
  issuePenalty: async (req, res) => {
    try {
      const { userId } = req.params;
      const { type, reason, duration } = req.body;
      
      const validTypes = ['warning', 'suspension', 'ban'];
      if (!validTypes.includes(type)) {
        return res.status(400).json({ error: 'Invalid penalty type' });
      }
      
      if (!reason?.trim()) {
        return res.status(400).json({ error: 'Penalty reason is required' });
      }
      
      if (type === 'suspension' && (!duration || duration < 1)) {
        return res.status(400).json({ error: 'Valid suspension duration is required' });
      }
      
      // Prevent penalizing yourself
      if (req.user.userId === userId) {
        return res.status(403).json({ error: 'Cannot issue penalty to yourself' });
      }
      
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Initialize penalty history if not exists
      if (!user.penalty_history) user.penalty_history = [];
      
      const penalty = {
        type,
        reason,
        issued_by: req.user.userId,
        issued_at: new Date(),
        status: 'active'
      };
      
      if (type === 'warning') {
        // Just log the warning
        penalty.severity = 'low';
        user.penalty_history.push(penalty);
        
        // Send notification to user (implement notification system)
        // await sendNotification(userId, 'warning', reason);
        
      } else if (type === 'suspension') {
        // Suspend user for specified duration (in days)
        const suspensionEnd = new Date();
        suspensionEnd.setDate(suspensionEnd.getDate() + parseInt(duration));
        
        penalty.duration_days = duration;
        penalty.expires_at = suspensionEnd;
        penalty.severity = 'medium';
        
        user.is_active = false;
        user.suspension_end = suspensionEnd;
        user.penalty_history.push(penalty);
        
        // Schedule auto-reactivation (implement job scheduler)
        // await scheduleUserReactivation(userId, suspensionEnd);
        
      } else if (type === 'ban') {
        // Permanent ban
        penalty.severity = 'high';
        
        user.role = 'banned';
        user.is_active = false;
        user.ban_reason = reason;
        user.banned_at = new Date();
        user.banned_by = req.user.userId;
        user.penalty_history.push(penalty);
      }
      
      await user.save();
      
      res.json({
        message: `${type.charAt(0).toUpperCase() + type.slice(1)} issued successfully`,
        penalty: {
          type,
          reason,
          issued_at: penalty.issued_at,
          ...(type === 'suspension' && { expires_at: penalty.expires_at })
        },
        user: {
          _id: user._id,
          username: user.username,
          role: user.role,
          is_active: user.is_active
        }
      });
    } catch (error) {
      console.error('Error issuing penalty:', error);
      res.status(500).json({ error: 'Failed to issue penalty' });
    }
  },

  /**
   * Get user penalty history
   */
  getPenaltyHistory: async (req, res) => {
    try {
      const { userId } = req.params;
      
      const user = await User.findById(userId)
        .select('username email penalty_history ban_reason banned_at deactivation_reason deactivated_at')
        .populate('penalty_history.issued_by', 'username')
        .populate('penalty_history.lifted_by', 'username');
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      res.json({
        user: {
          _id: user._id,
          username: user.username,
          email: user.email
        },
        penalties: user.penalty_history || [],
        current_restrictions: {
          ban_reason: user.ban_reason,
          banned_at: user.banned_at,
          deactivation_reason: user.deactivation_reason,
          deactivated_at: user.deactivated_at
        }
      });
    } catch (error) {
      console.error('Error fetching penalty history:', error);
      res.status(500).json({ error: 'Failed to fetch penalty history' });
    }
  },

  /**
   * Bulk update users (for batch operations)
   */
  bulkUpdate: async (req, res) => {
    try {
      const { userIds, action, reason } = req.body;
      
      if (!Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({ error: 'User IDs array is required' });
      }
      
      const validActions = ['activate', 'deactivate', 'delete'];
      if (!validActions.includes(action)) {
        return res.status(400).json({ error: 'Invalid action' });
      }
      
      // Prevent bulk action on self
      if (userIds.includes(req.user.userId)) {
        return res.status(403).json({ error: 'Cannot perform bulk action on yourself' });
      }
      
      const results = {
        success: 0,
        failed: 0,
        errors: []
      };
      
      for (const userId of userIds) {
        try {
          const user = await User.findById(userId);
          if (!user) {
            results.failed++;
            results.errors.push({ userId, error: 'User not found' });
            continue;
          }
          
          if (action === 'activate') {
            user.is_active = true;
          } else if (action === 'deactivate') {
            user.is_active = false;
            user.deactivation_reason = reason || 'Bulk deactivation by admin';
            user.deactivated_at = new Date();
            user.deactivated_by = req.user.userId;
          } else if (action === 'delete') {
            // Soft delete - mark as deleted instead of removing
            user.is_deleted = true;
            user.deleted_at = new Date();
            user.deleted_by = req.user.userId;
            user.is_active = false;
          }
          
          await user.save();
          results.success++;
        } catch (err) {
          results.failed++;
          results.errors.push({ userId, error: err.message });
        }
      }
      
      res.json({
        message: 'Bulk update completed',
        results
      });
    } catch (error) {
      console.error('Error in bulk update:', error);
      res.status(500).json({ error: 'Bulk update failed' });
    }
  },

  /**
   * Export users data (CSV/Excel format)
   */
  exportUsers: async (req, res) => {
    try {
      const { format = 'csv', filters = {} } = req.query;
      
      // Build query from filters
      const query = {};
      if (filters.role && filters.role !== 'all') query.role = filters.role;
      if (filters.status === 'active') {
        query.is_active = true;
        query.role = { $ne: 'banned' };
      } else if (filters.status === 'inactive') {
        query.is_active = false;
      } else if (filters.status === 'banned') {
        query.role = 'banned';
      }
      
      const users = await User.find(query)
        .select('-password_hash -tokens')
        .sort({ createdAt: -1 })
        .lean();
      
      if (format === 'csv') {
        // Generate CSV
        const csv = [
          ['Username', 'Email', 'Role', 'Status', 'Credibility', 'Joined', 'Last Active'].join(','),
          ...users.map(u => [
            u.username,
            u.email,
            u.role,
            u.is_active ? 'Active' : 'Inactive',
            u.credibility_score || 0,
            new Date(u.createdAt).toLocaleDateString(),
            u.last_active ? new Date(u.last_active).toLocaleDateString() : 'Never'
          ].join(','))
        ].join('\n');
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=users-export.csv');
        return res.send(csv);
      }
      
      // Default JSON export
      res.json({ users, total: users.length });
    } catch (error) {
      console.error('Error exporting users:', error);
      res.status(500).json({ error: 'Failed to export users' });
    }
  }
};