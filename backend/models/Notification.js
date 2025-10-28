import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: [
      // Comment notifications
      'forum_comment',
      'trade_comment',
      'event_comment',
      'wishlist_comment',

      // Vote notifications
      'forum_upvote',
      'forum_downvote',
      'trade_upvote',
      'trade_downvote',
      'event_upvote',
      'event_downvote',
      'wishlist_upvote',
      'wishlist_downvote',

      // Vouch notifications
      'trade_vouch',
      'middleman_vouch',

      // Admin action notifications
      'admin_warning',
      'admin_ban',
      'admin_unban',
      'admin_suspension',
      'admin_deactivation',
      'admin_activation',
      'admin_post_deleted',
      'admin_event_created',
      'admin_role_changed',
      'penalty_issued',

      // System notifications
      'system_announcement'
    ],
    required: true
  },
  title: {
    type: String,
    required: true,
    maxlength: 255
  },
  message: {
    type: String,
    required: true,
    maxlength: 1000
  },
  related_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    // Can reference different models based on type
    refPath: 'related_model'
  },
  related_model: {
    type: String,
    enum: ['ForumPost', 'ForumComment', 'Trade', 'TradeComment', 'Event', 'EventComment', 'Wishlist', 'WishlistComment', 'Vouch', 'User', 'Penalty'],
    required: true
  },
  is_read: {
    type: Boolean,
    default: false
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Indexes for performance
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, is_read: 1 });
notificationSchema.index({ recipient: 1, type: 1 });

// Static method to create notification
notificationSchema.statics.createNotification = async function(data) {
  const notification = new this(data);
  return notification.save();
};

// Static method to get unread count for user
notificationSchema.statics.getUnreadCount = async function(userId) {
  return this.countDocuments({ recipient: userId, is_read: false });
};

// Static method to mark all as read for user
notificationSchema.statics.markAllAsRead = async function(userId) {
  return this.updateMany(
    { recipient: userId, is_read: false },
    { is_read: true }
  );
};

export const Notification = mongoose.model('Notification', notificationSchema);