import mongoose from 'mongoose';

const middlemanApplicationSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  experience: {
    type: String,
    trim: true,
    required: true
  },
  availability: {
    type: String,
    trim: true,
    required: true
  },
  why_middleman: {
    type: String,
    trim: true,
    required: true
  },
  referral_codes: {
    type: String,
    trim: true
  },
  external_links: {
    type: [String],
    default: []
  },
  preferred_trade_types: {
    type: [String],
    default: []
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  rejection_reason: {
    type: String,
    trim: true
  },
  reviewed_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  documents: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VerificationDocument'
  }],
  application_date: {
    type: Date,
    default: Date.now
  },
  reviewed_date: Date
}, {
  timestamps: true
});

// Add indexes for better query performance
middlemanApplicationSchema.index({ user_id: 1 });
middlemanApplicationSchema.index({ status: 1 });

export const MiddlemanApplication = mongoose.model('MiddlemanApplication', middlemanApplicationSchema);