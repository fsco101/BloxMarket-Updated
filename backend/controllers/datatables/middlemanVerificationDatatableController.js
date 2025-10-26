import { MiddlemanApplication } from '../../models/MiddlemanApplication.js';
import mongoose from 'mongoose';

/**
 * DataTable controller for Middleman Verification
 * Handles server-side processing for DataTables with middleman application management
 */
export const middlemanVerificationDatatableController = {
  /**
   * Get middleman verification requests for DataTable with server-side processing
   * Supports search, filtering, sorting, and pagination
   */
  getVerificationRequests: async (req, res) => {
    try {
      // DataTables parameters
      const draw = parseInt(req.query.draw) || 1;
      const start = parseInt(req.query.start) || 0;
      const length = parseInt(req.query.length) || 25;
      const searchValue = req.query.search?.value || '';

      // Custom filters
      const statusFilter = req.query.status || '';

      // Sorting
      const orderColumnIndex = parseInt(req.query.order?.[0]?.column) || 0;
      const orderDir = req.query.order?.[0]?.dir || 'desc';

      // Build query
      const query = {};

      // Search across multiple fields
      if (searchValue) {
        query.$or = [
          { 'user_id.username': { $regex: searchValue, $options: 'i' } },
          { 'user_id.email': { $regex: searchValue, $options: 'i' } },
          { 'user_id.roblox_username': { $regex: searchValue, $options: 'i' } },
          { experience: { $regex: searchValue, $options: 'i' } },
          { availability: { $regex: searchValue, $options: 'i' } },
          { why_middleman: { $regex: searchValue, $options: 'i' } }
        ];
      }

      // Status filter
      if (statusFilter && statusFilter !== 'all') {
        query.status = statusFilter;
      }

      // Sorting configuration
      const sortFields = [
        'createdAt', // 0: Applied Date
        'user_id.username', // 1: Username
        'status', // 2: Status
        'user_id.credibility_score', // 3: Credibility
        'createdAt' // 4: Applied Date (fallback)
      ];
      const sortField = sortFields[orderColumnIndex] || 'createdAt';
      const sortOrder = orderDir === 'asc' ? 1 : -1;

      // Get total count
      const totalRecords = await MiddlemanApplication.countDocuments({});
      const filteredRecords = await MiddlemanApplication.countDocuments(query);

      // Fetch applications with pagination and population
      const applications = await MiddlemanApplication.find(query)
        .populate('user_id', 'username email roblox_username avatar_url credibility_score')
        .populate({
          path: 'documents',
          select: '_id document_type filename original_filename file_path mime_type file_size description status createdAt',
          match: { is_deleted: { $ne: true } }
        })
        .sort({ [sortField]: sortOrder })
        .skip(start)
        .limit(length)
        .lean();

      // Enhance application data with additional stats
      const enhancedApplications = await Promise.all(
        applications.map(async (application) => {
          // Get trade count
          let tradeCount = 0;
          try {
            const Trade = mongoose.model('Trade');
            tradeCount = await Trade.countDocuments({ user_id: application.user_id._id });
          } catch (err) {
            console.log('Trade model not found, skipping trade count');
          }

          // Get vouch count
          let vouchCount = 0;
          try {
            const Vouch = mongoose.model('Vouch');
            vouchCount = await Vouch.countDocuments({
              user_id: application.user_id._id,
              status: 'approved'
            });
          } catch (err) {
            console.log('Vouch model not found, skipping vouch count');
          }

          // Get average rating from middleman vouches if user is already a middleman
          let averageRating = 0;
          try {
            const MiddlemanVouch = mongoose.model('MiddlemanVouch');
            const vouchData = await MiddlemanVouch.aggregate([
              { $match: { middleman_id: application.user_id._id, status: 'approved' } },
              { $group: { _id: null, avgRating: { $avg: '$rating' }, count: { $sum: 1 } } }
            ]);

            if (vouchData.length > 0) {
              averageRating = vouchData[0].avgRating || 0;
            }
          } catch (err) {
            console.log('MiddlemanVouch model not found, skipping rating calculation');
          }

          return {
            ...application,
            trades: tradeCount,
            vouches: vouchCount,
            averageRating: Math.round(averageRating * 10) / 10,
            documentCount: application.documents?.length || 0,
            user: application.user_id,
            // Flatten user data for DataTables
            username: application.user_id.username,
            email: application.user_id.email,
            roblox_username: application.user_id.roblox_username,
            avatar_url: application.user_id.avatar_url,
            credibility_score: application.user_id.credibility_score || 0
          };
        })
      );

      // DataTables response format
      res.json({
        draw,
        recordsTotal: totalRecords,
        recordsFiltered: filteredRecords,
        data: enhancedApplications
      });
    } catch (error) {
      console.error('Error fetching verification requests for DataTable:', error);
      res.status(500).json({
        error: 'Failed to fetch verification requests',
        details: error.message
      });
    }
  },

  /**
   * Approve middleman application
   */
  approveApplication: async (req, res) => {
    try {
      const { applicationId } = req.params;
      const adminId = req.user.userId;

      const application = await MiddlemanApplication.findById(applicationId);
      if (!application) {
        return res.status(404).json({ error: 'Application not found' });
      }

      if (application.status !== 'pending') {
        return res.status(400).json({ error: 'Application has already been processed' });
      }

      // Update application status
      application.status = 'approved';
      application.reviewed_by = adminId;
      application.reviewed_date = new Date();
      await application.save();

      // Update user role
      const { User } = await import('../../models/User.js');
      const user = await User.findById(application.user_id);
      if (user) {
        user.role = 'middleman';
        user.middleman_requested = false;

        // Add to role history
        if (!user.role_history) user.role_history = [];
        user.role_history.push({
          old_role: user.role,
          new_role: 'middleman',
          changed_by: adminId,
          changed_at: new Date(),
          reason: 'Middleman application approved'
        });

        await user.save();
      }

      res.json({
        message: 'Application approved successfully',
        application: {
          _id: application._id,
          status: application.status,
          reviewed_date: application.reviewed_date
        }
      });
    } catch (error) {
      console.error('Error approving middleman application:', error);
      res.status(500).json({ error: 'Failed to approve application' });
    }
  },

  /**
   * Reject middleman application
   */
  rejectApplication: async (req, res) => {
    try {
      const { applicationId } = req.params;
      const { reason } = req.body;
      const adminId = req.user.userId;

      if (!reason?.trim()) {
        return res.status(400).json({ error: 'Rejection reason is required' });
      }

      const application = await MiddlemanApplication.findById(applicationId);
      if (!application) {
        return res.status(404).json({ error: 'Application not found' });
      }

      if (application.status !== 'pending') {
        return res.status(400).json({ error: 'Application has already been processed' });
      }

      // Update application status
      application.status = 'rejected';
      application.rejection_reason = reason;
      application.reviewed_by = adminId;
      application.reviewed_date = new Date();
      await application.save();

      // Update user
      const { User } = await import('../../models/User.js');
      const user = await User.findById(application.user_id);
      if (user) {
        user.middleman_requested = false;
        await user.save();
      }

      res.json({
        message: 'Application rejected successfully',
        application: {
          _id: application._id,
          status: application.status,
          rejection_reason: application.rejection_reason,
          reviewed_date: application.reviewed_date
        }
      });
    } catch (error) {
      console.error('Error rejecting middleman application:', error);
      res.status(500).json({ error: 'Failed to reject application' });
    }
  },

  /**
   * Get application details by ID
   */
  getApplicationDetails: async (req, res) => {
    try {
      const { applicationId } = req.params;

      const application = await MiddlemanApplication.findById(applicationId)
        .populate('user_id', 'username email roblox_username avatar_url credibility_score')
        .populate('reviewed_by', 'username')
        .populate({
          path: 'documents',
          select: '_id document_type filename original_filename file_path mime_type file_size description status createdAt',
          match: { is_deleted: { $ne: true } }
        });

      if (!application) {
        return res.status(404).json({ error: 'Application not found' });
      }

      // Get additional stats
      let tradeCount = 0;
      let vouchCount = 0;
      let averageRating = 0;

      try {
        const Trade = mongoose.model('Trade');
        tradeCount = await Trade.countDocuments({ user_id: application.user_id._id });
      } catch (err) {
        console.log('Trade model not found');
      }

      try {
        const Vouch = mongoose.model('Vouch');
        vouchCount = await Vouch.countDocuments({
          user_id: application.user_id._id,
          status: 'approved'
        });
      } catch (err) {
        console.log('Vouch model not found');
      }

      try {
        const MiddlemanVouch = mongoose.model('MiddlemanVouch');
        const vouchData = await MiddlemanVouch.aggregate([
          { $match: { middleman_id: application.user_id._id, status: 'approved' } },
          { $group: { _id: null, avgRating: { $avg: '$rating' }, count: { $sum: 1 } } }
        ]);

        if (vouchData.length > 0) {
          averageRating = vouchData[0].avgRating || 0;
        }
      } catch (err) {
        console.log('MiddlemanVouch model not found');
      }

      const applicationData = application.toObject();
      applicationData.trades = tradeCount;
      applicationData.vouches = vouchCount;
      applicationData.averageRating = Math.round(averageRating * 10) / 10;

      res.json({
        application: applicationData
      });
    } catch (error) {
      console.error('Error fetching application details:', error);
      res.status(500).json({ error: 'Failed to fetch application details' });
    }
  },

  /**
   * Bulk approve/reject applications
   */
  bulkUpdateApplications: async (req, res) => {
    try {
      const { applicationIds, action, reason } = req.body;
      const adminId = req.user.userId;

      if (!Array.isArray(applicationIds) || applicationIds.length === 0) {
        return res.status(400).json({ error: 'Application IDs array is required' });
      }

      if (!['approve', 'reject'].includes(action)) {
        return res.status(400).json({ error: 'Invalid action' });
      }

      if (action === 'reject' && !reason?.trim()) {
        return res.status(400).json({ error: 'Rejection reason is required for bulk reject' });
      }

      const results = {
        success: 0,
        failed: 0,
        errors: []
      };

      for (const applicationId of applicationIds) {
        try {
          const application = await MiddlemanApplication.findById(applicationId);
          if (!application) {
            results.failed++;
            results.errors.push({ applicationId, error: 'Application not found' });
            continue;
          }

          if (application.status !== 'pending') {
            results.failed++;
            results.errors.push({ applicationId, error: 'Application already processed' });
            continue;
          }

          // Update application
          application.status = action === 'approve' ? 'approved' : 'rejected';
          application.reviewed_by = adminId;
          application.reviewed_date = new Date();

          if (action === 'reject') {
            application.rejection_reason = reason;
          }

          await application.save();

          // Update user if approving
          if (action === 'approve') {
            const { User } = await import('../../models/User.js');
            const user = await User.findById(application.user_id);
            if (user) {
              user.role = 'middleman';
              user.middleman_requested = false;

              if (!user.role_history) user.role_history = [];
              user.role_history.push({
                old_role: user.role,
                new_role: 'middleman',
                changed_by: adminId,
                changed_at: new Date(),
                reason: 'Middleman application approved (bulk)'
              });

              await user.save();
            }
          } else {
            // Reject - just clear the request flag
            const { User } = await import('../../models/User.js');
            const user = await User.findById(application.user_id);
            if (user) {
              user.middleman_requested = false;
              await user.save();
            }
          }

          results.success++;
        } catch (err) {
          results.failed++;
          results.errors.push({ applicationId, error: err.message });
        }
      }

      res.json({
        message: `Bulk ${action} completed`,
        results
      });
    } catch (error) {
      console.error('Error in bulk update:', error);
      res.status(500).json({ error: 'Bulk update failed' });
    }
  },

  /**
   * Export verification requests data (CSV format)
   */
  exportVerificationRequests: async (req, res) => {
    try {
      const { format = 'csv', status = 'all' } = req.query;

      // Build query
      const query = {};
      if (status && status !== 'all') {
        query.status = status;
      }

      const applications = await MiddlemanApplication.find(query)
        .populate('user_id', 'username email roblox_username credibility_score')
        .populate('reviewed_by', 'username')
        .sort({ createdAt: -1 })
        .lean();

      if (format === 'csv') {
        // Generate CSV
        const csv = [
          ['Username', 'Email', 'Roblox Username', 'Status', 'Applied Date', 'Experience', 'Availability', 'Credibility', 'Trades', 'Vouches', 'Reviewed By', 'Reviewed Date'].join(','),
          ...applications.map(app => [
            app.user_id.username,
            app.user_id.email,
            app.user_id.roblox_username,
            app.status,
            new Date(app.createdAt).toLocaleDateString(),
            `"${(app.experience || '').replace(/"/g, '""')}"`,
            `"${(app.availability || '').replace(/"/g, '""')}"`,
            app.user_id.credibility_score || 0,
            0, // Will be populated if needed
            0, // Will be populated if needed
            app.reviewed_by?.username || '',
            app.reviewed_date ? new Date(app.reviewed_date).toLocaleDateString() : ''
          ].join(','))
        ].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=middleman-verification-export.csv');
        return res.send(csv);
      }

      // Default JSON export
      res.json({ applications, total: applications.length });
    } catch (error) {
      console.error('Error exporting verification requests:', error);
      res.status(500).json({ error: 'Failed to export verification requests' });
    }
  }
};