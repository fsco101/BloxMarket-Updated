import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  chat_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat',
    required: true
  },
  sender_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000
  },
  message_type: {
    type: String,
    enum: ['text', 'image', 'file'],
    default: 'text'
  },
  file_url: {
    type: String,
    trim: true
  },
  file_name: {
    type: String,
    trim: true
  },
  file_size: {
    type: Number
  },
  is_read: {
    type: Boolean,
    default: false
  },
  read_at: {
    type: Date
  },
  edited: {
    type: Boolean,
    default: false
  },
  edited_at: {
    type: Date
  },
  reply_to: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  reactions: [{
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    emoji: {
      type: String,
      required: true
    },
    created_at: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Indexes for better query performance
messageSchema.index({ chat_id: 1, createdAt: -1 });
messageSchema.index({ sender_id: 1, createdAt: -1 });
messageSchema.index({ chat_id: 1, is_read: 1 });

export const Message = mongoose.model('Message', messageSchema);