import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema({
  reported_user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reported_by_user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  post_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  post_type: {
    type: String,
    enum: ['trade', 'forum', 'event', 'wishlist', 'user'],
    required: true
  },
  reason: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['Scamming', 'Harassment', 'Inappropriate Content', 'Spam', 'Impersonation', 'Other'],
    default: 'Other'
  },
  status: {
    type: String,
    enum: ['pending', 'reviewed', 'resolved'],
    default: 'pending'
  },
  reviewed_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  review_notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Add indexes for better query performance
reportSchema.index({ post_id: 1, post_type: 1 });
reportSchema.index({ status: 1 });
reportSchema.index({ reported_by_user_id: 1 });

export const Report = mongoose.model('Report', reportSchema);