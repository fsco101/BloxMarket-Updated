import { Report } from '../models/Report.js';
import { User } from '../models/User.js';
import { Trade } from '../models/Trade.js';
import { ForumPost } from '../models/Forum.js';
import { Event } from '../models/Event.js';
import { Wishlist } from '../models/Wishlist.js';
import mongoose from 'mongoose';

export const reportController = {
  // Create a new report
  createReport: async (req, res) => {
    try {
      const { post_id, post_type, reason, type } = req.body;
      const reported_by_user_id = req.user.userId;

      // Validate required fields
      if (!post_id || !post_type || !reason) {
        return res.status(400).json({
          error: 'Missing required fields: post_id, post_type, and reason are required'
        });
      }

      // Validate post_type
      const validPostTypes = ['trade', 'forum', 'event', 'wishlist', 'user'];
      if (!validPostTypes.includes(post_type)) {
        return res.status(400).json({
          error: 'Invalid post_type. Must be one of: trade, forum, event, wishlist, user'
        });
      }

      // Check if the post exists and get the reported user
      let reportedUserId = null;
      let postExists = false;

      switch (post_type) {
        case 'trade':
          const trade = await Trade.findById(post_id);
          if (trade) {
            reportedUserId = trade.user_id;
            postExists = true;
          }
          break;
        case 'forum':
          const forumPost = await ForumPost.findById(post_id);
          if (forumPost) {
            reportedUserId = forumPost.user_id;
            postExists = true;
          }
          break;
        case 'event':
          const event = await Event.findById(post_id);
          if (event) {
            reportedUserId = event.creator;
            postExists = true;
          }
          break;
        case 'wishlist':
          const wishlist = await Wishlist.findById(post_id);
          if (wishlist) {
            reportedUserId = wishlist.user_id;
            postExists = true;
          }
          break;
        case 'user':
          const user = await User.findById(post_id);
          if (user) {
            reportedUserId = user._id;
            postExists = true;
          }
          break;
      }

      if (!postExists) {
        return res.status(404).json({ error: 'Post not found' });
      }

      // Check if user is trying to report their own post
      if (reportedUserId && reportedUserId.toString() === reported_by_user_id) {
        return res.status(400).json({ error: 'You cannot report your own post' });
      }

      // Check if user has already reported this post
      const existingReport = await Report.findOne({
        post_id,
        post_type,
        reported_by_user_id
      });

      if (existingReport) {
        return res.status(400).json({ error: 'You have already reported this post' });
      }

      // Create the report
      const report = new Report({
        reported_user_id: reportedUserId,
        reported_by_user_id,
        post_id,
        post_type,
        reason,
        type: type || 'Other'
      });

      await report.save();

      res.status(201).json({
        message: 'Report submitted successfully',
        report: {
          id: report._id,
          post_type,
          reason,
          type: report.type,
          status: report.status,
          created_at: report.createdAt
        }
      });

    } catch (error) {
      console.error('Create report error:', error);
      res.status(500).json({ error: 'Failed to create report' });
    }
  },

  // Get reports (for admin)
  getReports: async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const status = req.query.status;
      const post_type = req.query.post_type;
      const skip = (page - 1) * limit;

      let query = {};
      if (status && status !== 'all') query.status = status;
      if (post_type && post_type !== 'all') query.post_type = post_type;

      const [reports, total] = await Promise.all([
        Report.find(query)
          .populate('reported_user_id', 'username roblox_username')
          .populate('reported_by_user_id', 'username roblox_username')
          .populate('reviewed_by', 'username')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        Report.countDocuments(query)
      ]);

      const reportsWithPostDetails = await Promise.all(
        reports.map(async (report) => {
          let postDetails = null;

          try {
            switch (report.post_type) {
              case 'trade':
                const trade = await Trade.findById(report.post_id).select('item_offered item_requested description');
                if (trade) {
                  postDetails = {
                    title: `Trading ${trade.item_offered}${trade.item_requested ? ` for ${trade.item_requested}` : ''}`,
                    description: trade.description
                  };
                }
                break;
              case 'forum':
                const forumPost = await ForumPost.findById(report.post_id).select('title content');
                if (forumPost) {
                  postDetails = {
                    title: forumPost.title,
                    description: forumPost.content?.substring(0, 100) + '...'
                  };
                }
                break;
              case 'event':
                const event = await Event.findById(report.post_id).select('title description');
                if (event) {
                  postDetails = {
                    title: event.title,
                    description: event.description?.substring(0, 100) + '...'
                  };
                }
                break;
              case 'wishlist':
                const wishlist = await Wishlist.findById(report.post_id).select('item_name description');
                if (wishlist) {
                  postDetails = {
                    title: wishlist.item_name,
                    description: wishlist.description
                  };
                }
                break;
              case 'user':
                const user = await User.findById(report.post_id).select('username roblox_username');
                if (user) {
                  postDetails = {
                    title: `User: ${user.username}`,
                    description: user.roblox_username ? `@${user.roblox_username}` : 'No Roblox username'
                  };
                }
                break;
            }
          } catch (error) {
            console.warn(`Failed to fetch post details for ${report.post_type}:${report.post_id}`, error);
          }

          return {
            id: report._id,
            post_id: report.post_id,
            post_type: report.post_type,
            post_details: postDetails,
            reason: report.reason,
            type: report.type,
            status: report.status,
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
            review_notes: report.review_notes,
            created_at: report.createdAt,
            updated_at: report.updatedAt
          };
        })
      );

      res.json({
        reports: reportsWithPostDetails,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      console.error('Get reports error:', error);
      res.status(500).json({ error: 'Failed to fetch reports' });
    }
  },

  // Update report status (for admin)
  updateReportStatus: async (req, res) => {
    try {
      const { reportId } = req.params;
      const { status, review_notes } = req.body;
      const reviewed_by = req.user.userId;

      // Validate status
      const validStatuses = ['pending', 'reviewed', 'resolved'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          error: 'Invalid status. Must be one of: pending, reviewed, resolved'
        });
      }

      const report = await Report.findByIdAndUpdate(
        reportId,
        {
          status,
          reviewed_by,
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
      console.error('Update report status error:', error);
      res.status(500).json({ error: 'Failed to update report status' });
    }
  },

  // Delete report (for admin)
  deleteReport: async (req, res) => {
    try {
      const { reportId } = req.params;

      const report = await Report.findByIdAndDelete(reportId);

      if (!report) {
        return res.status(404).json({ error: 'Report not found' });
      }

      res.json({ message: 'Report deleted successfully' });

    } catch (error) {
      console.error('Delete report error:', error);
      res.status(500).json({ error: 'Failed to delete report' });
    }
  },

  // Get report statistics (for admin)
  getReportStats: async (req, res) => {
    try {
      const [totalReports, pendingReports, reviewedReports, resolvedReports, reportsByType, reportsByReason] = await Promise.all([
        Report.countDocuments(),
        Report.countDocuments({ status: 'pending' }),
        Report.countDocuments({ status: 'reviewed' }),
        Report.countDocuments({ status: 'resolved' }),
        Report.aggregate([
          { $group: { _id: '$post_type', count: { $sum: 1 } } }
        ]),
        Report.aggregate([
          { $group: { _id: '$type', count: { $sum: 1 } } }
        ])
      ]);

      res.json({
        total: totalReports,
        pending: pendingReports,
        reviewed: reviewedReports,
        resolved: resolvedReports,
        by_type: reportsByType.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        by_reason: reportsByReason.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {})
      });

    } catch (error) {
      console.error('Get report stats error:', error);
      res.status(500).json({ error: 'Failed to fetch report statistics' });
    }
  }
};