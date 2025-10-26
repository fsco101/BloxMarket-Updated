import mongoose from 'mongoose';

const middlemanVouchSchema = new mongoose.Schema({
  middleman_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  given_by_user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  comment: {
    type: String,
    trim: true,
    maxlength: 500
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'approved' // Auto-approve for simplicity
  }
}, {
  timestamps: true
});

// Compound index to prevent duplicate vouches
middlemanVouchSchema.index({ middleman_id: 1, given_by_user_id: 1 }, { unique: true });

// Index for efficient queries
middlemanVouchSchema.index({ middleman_id: 1, status: 1 });
middlemanVouchSchema.index({ given_by_user_id: 1 });

export const MiddlemanVouch = mongoose.model('MiddlemanVouch', middlemanVouchSchema);