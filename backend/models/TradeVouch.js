import mongoose from 'mongoose';

const tradeVouchSchema = new mongoose.Schema({
  trade_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Trade',
    required: true
  },
  vouched_user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  given_by_user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Compound index to ensure a user can only vouch once per trade
tradeVouchSchema.index({ trade_id: 1, given_by_user_id: 1 }, { unique: true });

export const TradeVouch = mongoose.model('TradeVouch', tradeVouchSchema);