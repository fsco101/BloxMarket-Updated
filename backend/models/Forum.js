import mongoose from 'mongoose';

const forumPostSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  category: {
    type: String,
    enum: ['trading_tips', 'scammer_reports', 'game_updates', 'general'],
    default: 'general'
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 255
  },
  content: {
    type: String,
    required: true,
    trim: true
  },
  images: [{
    filename: {
      type: String,
      required: true
    },
    originalName: {
      type: String,
      required: true
    },
    path: {
      type: String,
      required: true
    },
    size: {
      type: Number,
      required: true
    },
    mimetype: {
      type: String,
      required: true
    }
  }],
  upvotes: {
    type: Number,
    default: 0
  },
  downvotes: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

const forumCommentSchema = new mongoose.Schema({
  post_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ForumPost',
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
  timestamps: true
});

// Vote tracking schema
const forumVoteSchema = new mongoose.Schema({
  post_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ForumPost',
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
  timestamps: true
});

// Ensure one vote per user per post
forumVoteSchema.index({ post_id: 1, user_id: 1 }, { unique: true });

export const ForumPost = mongoose.model('ForumPost', forumPostSchema);
export const ForumComment = mongoose.model('ForumComment', forumCommentSchema);
export const ForumVote = mongoose.model('ForumVote', forumVoteSchema);