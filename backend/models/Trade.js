import mongoose from 'mongoose';

// Trade Schema
const tradeSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  item_offered: {
    type: String,
    required: true,
    trim: true
  },
  item_requested: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['open', 'in_progress', 'completed', 'cancelled'],
    default: 'open'
  },
  images: [{
    image_url: String,
    uploaded_at: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Trade Comment Schema
const tradeCommentSchema = new mongoose.Schema({
  trade_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Trade',
    required: true
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true,
    trim: true
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Trade Vote Schema (for upvotes/downvotes only)
const tradeVoteSchema = new mongoose.Schema({
  trade_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Trade',
    required: true
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  vote_type: {
    type: String,
    enum: ['up', 'down'],
    required: true
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Ensure one vote per user per trade
tradeVoteSchema.index({ trade_id: 1, user_id: 1 }, { unique: true });

// Create models
export const Trade = mongoose.model('Trade', tradeSchema);
export const TradeComment = mongoose.model('TradeComment', tradeCommentSchema);
export const TradeVote = mongoose.model('TradeVote', tradeVoteSchema);