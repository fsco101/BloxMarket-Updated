import mongoose from 'mongoose';

const chatSchema = new mongoose.Schema({
  chat_type: {
    type: String,
    enum: ['direct', 'group'],
    required: true
  },
  name: {
    type: String,
    trim: true,
    maxlength: 100,
    // Only required for group chats
    required: function() { return this.chat_type === 'group'; }
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  avatar_url: {
    type: String,
    trim: true
  },
  // For direct chats: exactly 2 participants
  // For group chats: multiple participants
  participants: [{
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    joined_at: {
      type: Date,
      default: Date.now
    },
    role: {
      type: String,
      enum: ['member', 'admin'],
      default: 'member'
    },
    is_active: {
      type: Boolean,
      default: true
    },
    last_seen: {
      type: Date,
      default: Date.now
    }
  }],
  // For direct chats: reference to the other participant
  direct_participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  last_message: {
    message_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message'
    },
    content: {
      type: String,
      trim: true
    },
    sender_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    sent_at: {
      type: Date
    }
  },
  message_count: {
    type: Number,
    default: 0
  },
  unread_counts: [{
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    count: {
      type: Number,
      default: 0
    }
  }],
  is_active: {
    type: Boolean,
    default: true
  },
  settings: {
    allow_reactions: {
      type: Boolean,
      default: true
    },
    allow_replies: {
      type: Boolean,
      default: true
    },
    allow_file_sharing: {
      type: Boolean,
      default: true
    },
    // Group chat specific settings
    only_admins_can_send: {
      type: Boolean,
      default: false
    },
    allow_member_invites: {
      type: Boolean,
      default: true
    }
  }
}, {
  timestamps: true
});

// Indexes for better query performance
chatSchema.index({ 'participants.user_id': 1, is_active: 1 });
chatSchema.index({ chat_type: 1, createdAt: -1 });
chatSchema.index({ 'direct_participants': 1 }, { sparse: true });
chatSchema.index({ created_by: 1 });

// Pre-save middleware to maintain direct_participants for direct chats
chatSchema.pre('save', function(next) {
  if (this.chat_type === 'direct' && this.participants.length === 2) {
    this.direct_participants = [
      this.participants[0].user_id,
      this.participants[1].user_id
    ].sort();
  }
  next();
});

// Static method to find or create direct chat between two users
chatSchema.statics.findOrCreateDirectChat = async function(userId1, userId2) {
  const sortedUsers = [userId1, userId2].sort();

  let chat = await this.findOne({
    chat_type: 'direct',
    direct_participants: sortedUsers,
    is_active: true
  });

  if (!chat) {
    chat = new this({
      chat_type: 'direct',
      participants: [
        { user_id: userId1 },
        { user_id: userId2 }
      ],
      direct_participants: sortedUsers,
      created_by: userId1
    });
    await chat.save();
  }

  return chat;
};

export const Chat = mongoose.model('Chat', chatSchema);