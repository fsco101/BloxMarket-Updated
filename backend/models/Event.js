import mongoose from 'mongoose';

// Event Schema
const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['giveaway', 'competition', 'event'],
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'ended', 'upcoming', 'ending-soon'],
    default: 'upcoming'
  },
  prizes: [{
    type: String,
    trim: true
  }],
  requirements: [{
    type: String,
    trim: true
  }],
  maxParticipants: {
    type: Number,
    min: 1
  },
  participantCount: {
    type: Number,
    default: 0
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  // Add images field
  images: [{
    filename: String,
    originalName: String,
    path: String,
    size: Number,
    mimetype: String
  }],
  creator: {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    username: String,
    avatar_url: String,
    verified: Boolean
  },
  participants: [{
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    username: String,
    avatar_url: String,
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }
});

// Event Comment Schema
const eventCommentSchema = new mongoose.Schema({
  event_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
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

// Event Vote Schema
const eventVoteSchema = new mongoose.Schema({
  event_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
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

// Ensure one vote per user per event
eventVoteSchema.index({ event_id: 1, user_id: 1 }, { unique: true });

export const Event = mongoose.model('Event', eventSchema);
export const EventComment = mongoose.model('EventComment', eventCommentSchema);
export const EventVote = mongoose.model('EventVote', eventVoteSchema);