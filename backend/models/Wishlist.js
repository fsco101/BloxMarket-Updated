import mongoose from 'mongoose';

const wishlistSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  item_name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  max_price: {
    type: String,
    default: 'Negotiable'
  },
  category: {
    type: String,
    required: true,
    enum: ['limiteds', 'accessories', 'gear', 'event-items', 'gamepasses']
  },
  priority: {
    type: String,
    enum: ['high', 'medium', 'low'],
    default: 'medium'
  },
  watchers: {
    type: Number,
    default: 0
  },
  images: [{
    filename: {
      type: String,
      required: true
    },
    originalName: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  upvotes: {
    type: Number,
    default: 0
  },
  downvotes: {
    type: Number,
    default: 0
  },
  is_visible: {
    type: Boolean,
    default: true
  },
  is_flagged: {
    type: Boolean,
    default: false
  },
  flagged_reason: {
    type: String,
    default: null
  },
  hidden_reason: {
    type: String,
    default: null
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

wishlistSchema.index({ user_id: 1, created_at: -1 });
wishlistSchema.index({ category: 1, created_at: -1 });
wishlistSchema.index({ item_name: 'text', description: 'text' });

// Wishlist Comment Schema
const wishlistCommentSchema = new mongoose.Schema({
  wishlist_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Wishlist',
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
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

wishlistCommentSchema.index({ wishlist_id: 1, created_at: -1 });
wishlistCommentSchema.index({ user_id: 1 });

// Wishlist Vote Schema
const wishlistVoteSchema = new mongoose.Schema({
  wishlist_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Wishlist',
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
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

wishlistVoteSchema.index({ wishlist_id: 1, user_id: 1 }, { unique: true });
wishlistVoteSchema.index({ user_id: 1 });

export const Wishlist = mongoose.model('Wishlist', wishlistSchema);
export const WishlistComment = mongoose.model('WishlistComment', wishlistCommentSchema);
export const WishlistVote = mongoose.model('WishlistVote', wishlistVoteSchema);