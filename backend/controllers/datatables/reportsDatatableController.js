import { Report } from '../../models/Report.js';
import { User } from '../../models/User.js';
import { Trade } from '../../models/Trade.js';
import { ForumPost } from '../../models/Forum.js';
import { Event } from '../../models/Event.js';
import { Wishlist } from '../../models/Wishlist.js';

/**
 * DataTable controller for Reports Management
 * Handles server-side processing for DataTables with report management
 */
export const reportsDatatableController = {
  /**
   * Get reports for DataTable with server-side processing
   * Supports search, filtering, sorting, and pagination
   */
  getReports: async (req, res) => {
    try {
      // DataTables parameters
      const draw = parseInt(req.query.draw) || 1;
      const start = parseInt(req.query.start) || 0;
      const length = parseInt(req.query.length) || 25;
      const searchValue = req.query.search?.value || '';

      // Custom filters
      const statusFilter = req.query.status || '';
      const typeFilter = req.query.type || '';
      const postTypeFilter = req.query.post_type || '';

      // Sorting
      const orderColumnIndex = parseInt(req.query.order?.[0]?.column) || 6;
      const orderDir = req.query.order?.[0]?.dir || 'desc';

      // Build query
      const query = {};

      // Search across multiple fields
      if (searchValue) {
        query.$or = [
          { reason: { $regex: searchValue, $options: 'i' } },
          { type: { $regex: searchValue, $options: 'i' } }
        ];
      }

      // Status filter
      if (statusFilter && statusFilter !== 'all') {
        query.status = statusFilter;
      }

      // Type filter (report type like Scamming, Harassment, etc.)
      if (typeFilter && typeFilter !== 'all') {
        query.type = typeFilter;
      }

      // Post type filter (trade, forum, event, wishlist)
      if (postTypeFilter && postTypeFilter !== 'all') {
        query.post_type = postTypeFilter;
      }

      // Sorting configuration
      const sortFields = [
        'type',           // 0: Report type
        'post_type',      // 1: Post type
        'status',         // 2: Status
        'createdAt',      // 3: Created date
        'updatedAt',      // 4: Updated date
        'createdAt'       // 5: Default sort
      ];
      const sortField = sortFields[orderColumnIndex] || 'createdAt';
      const sortOrder = orderDir === 'asc' ? 1 : -1;

      // Get total count
      const totalRecords = await Report.countDocuments({});
      const filteredRecords = await Report.countDocuments(query);

      // Fetch reports with pagination and population
      const reports = await Report.find(query)
        .populate('reported_user_id', 'username roblox_username')
        .populate('reported_by_user_id', 'username roblox_username')
        .populate('reviewed_by', 'username')
        .sort({ [sortField]: sortOrder })
        .skip(start)
        .limit(length)
        .lean();

      // Enhance report data with post details
      const enhancedReports = await Promise.all(
        reports.map(async (report) => {
          let postDetails = null;
          let postTitle = 'Unknown Post';
          let postContent = 'Post not found or deleted';

          try {
            switch (report.post_type) {
              case 'trade':
                const trade = await Trade.findById(report.post_id).select('item_offered item_requested description');
                if (trade) {
                  postTitle = `Trading ${trade.item_offered}${trade.item_requested ? ` for ${trade.item_requested}` : ''}`;
                  postContent = trade.description || 'No description available';
                }
                break;
              case 'forum':
                const forumPost = await ForumPost.findById(report.post_id).select('title content');
                if (forumPost) {
                  postTitle = forumPost.title;
                  postContent = forumPost.content?.substring(0, 100) + '...' || 'No content available';
                }
                break;
              case 'event':
                const event = await Event.findById(report.post_id).select('title description');
                if (event) {
                  postTitle = event.title;
                  postContent = event.description?.substring(0, 100) + '...' || 'No description available';
                }
                break;
              case 'wishlist':
                const wishlist = await Wishlist.findById(report.post_id).select('item_name description');
                if (wishlist) {
                  postTitle = wishlist.item_name;
                  postContent = wishlist.description || 'No description available';
                }
                break;
            }
          } catch (error) {
            console.warn(`Failed to fetch post details for ${report.post_type}:${report.post_id}`, error);
          }

          return {
            ...report,
            post_title: postTitle,
            post_content: postContent,
            reported_user: report.reported_user_id ? {
              id: report.reported_user_id._id,
              username: report.reported_user_id.username,
              roblox_username: report.reported_user_id.roblox_username
            } : null,
            reported_by: {
              id: report.reported_by_user_id._id,
              username: report.reported_by_user_id.username,
              roblox_username: report.reported_by_user_id.roblox_username
            },
            reviewed_by: report.reviewed_by ? {
              id: report.reviewed_by._id,
              username: report.reviewed_by.username
            } : null,
            created_at: report.createdAt,
            updated_at: report.updatedAt
          };
        })
      );

      // DataTables response format
      res.json({
        draw,
        recordsTotal: totalRecords,
        recordsFiltered: filteredRecords,
        data: enhancedReports
      });
    } catch (error) {
      console.error('Error fetching reports for DataTable:', error);
      res.status(500).json({
        error: 'Failed to fetch reports',
        details: error.message
      });
    }
  },

  /**
   * Update report status
   */
  updateStatus: async (req, res) => {
    try {
      const { reportId } = req.params;
      const { status, review_notes } = req.body;

      // Validate status
      const validStatuses = ['pending', 'reviewed', 'resolved'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }

      const report = await Report.findByIdAndUpdate(
        reportId,
        {
          status,
          reviewed_by: req.user.userId,
          review_notes: review_notes || null,
          updatedAt: new Date()
        },
        { new: true }
      ).populate('reviewed_by', 'username');

      if (!report) {
        return res.status(404).json({ error: 'Report not found' });
      }

      res.json({
        message: 'Report status updated successfully',
        report: {
          id: report._id,
          status: report.status,
          reviewed_by: {
            id: report.reviewed_by._id,
            username: report.reviewed_by.username
          },
          review_notes: report.review_notes,
          updated_at: report.updatedAt
        }
      });
    } catch (error) {
      console.error('Error updating report status:', error);
      res.status(500).json({ error: 'Failed to update report status' });
    }
  },

  /**
   * Delete report
   */
  deleteReport: async (req, res) => {
    try {
      const { reportId } = req.params;

      const report = await Report.findByIdAndDelete(reportId);

      if (!report) {
        return res.status(404).json({ error: 'Report not found' });
      }

      res.json({ message: 'Report deleted successfully' });
    } catch (error) {
      console.error('Error deleting report:', error);
      res.status(500).json({ error: 'Failed to delete report' });
    }
  },

  /**
   * Bulk update reports status
   */
  bulkUpdateStatus: async (req, res) => {
    try {
      const { reportIds, status, review_notes } = req.body;

      if (!Array.isArray(reportIds) || reportIds.length === 0) {
        return res.status(400).json({ error: 'Report IDs array is required' });
      }

      const validStatuses = ['pending', 'reviewed', 'resolved'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }

      const results = {
        success: 0,
        failed: 0,
        errors: []
      };

      for (const reportId of reportIds) {
        try {
          const report = await Report.findByIdAndUpdate(
            reportId,
            {
              status,
              reviewed_by: req.user.userId,
              review_notes: review_notes || null,
              updatedAt: new Date()
            },
            { new: true }
          );

          if (!report) {
            results.failed++;
            results.errors.push({ reportId, error: 'Report not found' });
            continue;
          }

          results.success++;
        } catch (err) {
          results.failed++;
          results.errors.push({ reportId, error: err.message });
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
   * Get report statistics
   */
  getStats: async (req, res) => {
    try {
      const [totalReports, pendingReports, reviewedReports, resolvedReports, reportsByType, reportsByPostType] = await Promise.all([
        Report.countDocuments(),
        Report.countDocuments({ status: 'pending' }),
        Report.countDocuments({ status: 'reviewed' }),
        Report.countDocuments({ status: 'resolved' }),
        Report.aggregate([
          { $group: { _id: '$type', count: { $sum: 1 } } }
        ]),
        Report.aggregate([
          { $group: { _id: '$post_type', count: { $sum: 1 } } }
        ])
      ]);

      // Get recent reports (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const recentReports = await Report.countDocuments({
        createdAt: { $gte: sevenDaysAgo }
      });

      res.json({
        total: totalReports,
        pending: pendingReports,
        reviewed: reviewedReports,
        resolved: resolvedReports,
        recent: recentReports,
        by_type: reportsByType.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        by_post_type: reportsByPostType.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {})
      });
    } catch (error) {
      console.error('Error fetching report stats:', error);
      res.status(500).json({ error: 'Failed to fetch report statistics' });
    }
  },

  /**
   * Export reports data (CSV format)
   */
  exportReports: async (req, res) => {
    try {
      const { format = 'csv', filters = {} } = req.query;

      // Build query from filters
      const query = {};
      if (filters.status && filters.status !== 'all') query.status = filters.status;
      if (filters.type && filters.type !== 'all') query.type = filters.type;
      if (filters.post_type && filters.post_type !== 'all') query.post_type = filters.post_type;

      const reports = await Report.find(query)
        .populate('reported_user_id', 'username roblox_username')
        .populate('reported_by_user_id', 'username roblox_username')
        .populate('reviewed_by', 'username')
        .sort({ createdAt: -1 })
        .lean();

      if (format === 'csv') {
        // Generate CSV
        const csv = [
          ['Report Type', 'Post Type', 'Reason', 'Status', 'Reported User', 'Reported By', 'Reviewed By', 'Created', 'Updated'].join(','),
          ...reports.map(r => [
            r.type,
            r.post_type,
            `"${r.reason.replace(/"/g, '""')}"`,
            r.status,
            r.reported_user_id ? r.reported_user_id.username : 'Unknown',
            r.reported_by_user_id.username,
            r.reviewed_by ? r.reviewed_by.username : 'Not reviewed',
            new Date(r.createdAt).toLocaleDateString(),
            r.updatedAt ? new Date(r.updatedAt).toLocaleDateString() : 'Never'
          ].join(','))
        ].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=reports-export.csv');
        return res.send(csv);
      }

      // Default JSON export
      res.json({ reports, total: reports.length });
    } catch (error) {
      console.error('Error exporting reports:', error);
      res.status(500).json({ error: 'Failed to export reports' });
    }
  }
};