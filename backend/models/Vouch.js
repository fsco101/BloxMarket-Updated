import mongoose from 'mongoose';

const vouchSchema = new mongoose.Schema({
  vouched_user_id: {
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
    trim: true
  }
}, {
  timestamps: true
});

export const Vouch = mongoose.model('Vouch', vouchSchema);