import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: function() { return this.is_active; }, // Only required when user is active
    unique: true,
    sparse: true, // Allow multiple null values for unique constraint
    trim: true,
    maxlength: 50
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    maxlength: 100
  },
  password_hash: {
    type: String,
    required: function() { return this.is_active; } // Only required when user is active
  },
  roblox_username: {
    type: String,
    trim: true,
    maxlength: 50
  },
  avatar_url: {
    type: String,
    trim: true
  },
  credibility_score: {
    type: Number,
    default: 0
  },
  vouch_count: {
    type: Number,
    default: 0
  },
  role: {
    type: String,
    enum: ['user', 'verified', 'middleman', 'admin', 'moderator', 'banned'],
    default: 'user'
  },
  is_active: {
    type: Boolean,
    default: true
  },
  bio: {
    type: String,
    trim: true,
    maxlength: 500
  },
  discord_username: {
    type: String,
    trim: true,
    maxlength: 50
  },
  messenger_link: {
    type: String,
    trim: true,
    maxlength: 200
  },
  website: {
    type: String,
    trim: true,
    maxlength: 200
  },
  location: {
    type: String,
    trim: true,
    maxlength: 100
  },
  timezone: {
    type: String,
    trim: true,
    maxlength: 50
  },
  // Email verification fields
  verificationCode: {
    type: String,
    trim: true
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  verificationCodeExpires: {
    type: Date
  },
  verification_requested: {
    type: Boolean,
    default: false
  },
  middleman_requested: {
    type: Boolean,
    default: false
  },
  ban_reason: {
    type: String,
    trim: true,
    maxlength: 500
  },
  banned_at: {
    type: Date
  },
  deactivated_at: {
    type: Date
  },
  deactivation_reason: {
    type: String,
    trim: true,
    maxlength: 500
  },
  lastLogin: {
    type: Date,
    default: Date.now
  },
  tokens: [{
    token: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Role history tracking
  role_history: [{
    old_role: String,
    new_role: String,
    changed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    changed_at: Date,
    reason: String
  }],
  
  // Penalty tracking
  penalty_history: [{
    type: {
      type: String,
      enum: ['warning', 'suspension', 'ban', 'deactivation'],
      required: true
    },
    reason: { type: String, required: true },
    severity: { type: String, enum: ['low', 'medium', 'high'] },
    issued_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    issued_at: { type: Date, required: true },
    duration_days: Number,
    expires_at: Date,
    status: {
      type: String,
      enum: ['active', 'lifted', 'expired'],
      default: 'active'
    },
    lifted_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    lifted_at: Date
  }],
  
  // Ban tracking
  banned_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  unbanned_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  unbanned_at: Date,
  unban_reason: String,
  
  // Deactivation tracking
  deactivated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  activated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  activated_at: Date,
  activation_reason: String,
  
  // Suspension tracking
  suspension_end: Date,
  
  // Soft delete
  is_deleted: { type: Boolean, default: false },
  deleted_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  deleted_at: Date,
  
  // Last active tracking
  last_active: Date
  
}, {
  timestamps: true
});

// Add index for better query performance
userSchema.index({ role: 1, is_active: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ 'penalty_history.status': 1 });

export const User = mongoose.model('User', userSchema);