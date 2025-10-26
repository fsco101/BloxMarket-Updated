import { Notification } from '../models/Notification.js';

export const notificationController = {
  // Get user's notifications
  getNotifications: async (req, res) => {
    try {
      const userId = req.user.userId;
      const { page = 1, limit = 20, unread_only = false } = req.query;

      const query = { recipient: userId };
      if (unread_only === 'true') {
        query.is_read = false;
      }

      const notifications = await Notification.find(query)
        .populate('sender', 'username avatar_url role')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .lean();

      const total = await Notification.countDocuments(query);
      const unreadCount = await Notification.getUnreadCount(userId);

      res.json({
        notifications,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        },
        unreadCount
      });
    } catch (error) {
      console.error('Error fetching notifications:', error);
      res.status(500).json({ error: 'Failed to fetch notifications' });
    }
  },

  // Get single notification
  getNotification: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.userId;

      const notification = await Notification.findOne({
        _id: id,
        recipient: userId
      }).populate('sender', 'username avatar_url role');

      if (!notification) {
        return res.status(404).json({ error: 'Notification not found' });
      }

      res.json({ notification });
    } catch (error) {
      console.error('Error fetching notification:', error);
      res.status(500).json({ error: 'Failed to fetch notification' });
    }
  },

  // Mark notification as read
  markAsRead: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.userId;

      const notification = await Notification.findOneAndUpdate(
        { _id: id, recipient: userId },
        { is_read: true },
        { new: true }
      );

      if (!notification) {
        return res.status(404).json({ error: 'Notification not found' });
      }

      res.json({ notification });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      res.status(500).json({ error: 'Failed to mark notification as read' });
    }
  },

  // Mark all notifications as read
  markAllAsRead: async (req, res) => {
    try {
      const userId = req.user.userId;

      await Notification.markAllAsRead(userId);

      res.json({ message: 'All notifications marked as read' });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      res.status(500).json({ error: 'Failed to mark all notifications as read' });
    }
  },

  // Get unread count
  getUnreadCount: async (req, res) => {
    try {
      const userId = req.user.userId;
      const count = await Notification.getUnreadCount(userId);

      res.json({ unreadCount: count });
    } catch (error) {
      console.error('Error fetching unread count:', error);
      res.status(500).json({ error: 'Failed to fetch unread count' });
    }
  },

  // Delete notification
  deleteNotification: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.userId;

      const notification = await Notification.findOneAndDelete({
        _id: id,
        recipient: userId
      });

      if (!notification) {
        return res.status(404).json({ error: 'Notification not found' });
      }

      res.json({ message: 'Notification deleted successfully' });
    } catch (error) {
      console.error('Error deleting notification:', error);
      res.status(500).json({ error: 'Failed to delete notification' });
    }
  },

  // Delete all read notifications
  deleteReadNotifications: async (req, res) => {
    try {
      const userId = req.user.userId;

      const result = await Notification.deleteMany({
        recipient: userId,
        is_read: true
      });

      res.json({
        message: `${result.deletedCount} read notifications deleted successfully`
      });
    } catch (error) {
      console.error('Error deleting read notifications:', error);
      res.status(500).json({ error: 'Failed to delete read notifications' });
    }
  }
};