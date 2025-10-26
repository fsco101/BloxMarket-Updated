import { TradeVouch } from '../models/TradeVouch.js';
import { User } from '../models/User.js';
import { Trade } from '../models/Trade.js';
import { Notification } from '../models/Notification.js';
import mongoose from 'mongoose';

// Vouch for a trade
export const vouchTrade = async (req, res) => {
  try {
    const { tradeId } = req.params;
    const userId = req.user.userId;

    // Find the trade
    const trade = await Trade.findById(tradeId);
    if (!trade) {
      return res.status(404).json({ error: 'Trade not found' });
    }

    // Check if user is trying to vouch for their own trade
    if (trade.user_id.toString() === userId) {
      return res.status(400).json({ error: 'You cannot vouch for your own trade' });
    }

    // Check if user has already vouched for this trade
    const existingVouch = await TradeVouch.findOne({
      trade_id: new mongoose.Types.ObjectId(tradeId),
      given_by_user_id: new mongoose.Types.ObjectId(userId)
    });

    if (existingVouch) {
      return res.status(400).json({ error: 'You have already vouched for this trade' });
    }

    // Create the vouch record
    const newVouch = new TradeVouch({
      trade_id: new mongoose.Types.ObjectId(tradeId),
      vouched_user_id: trade.user_id,
      given_by_user_id: new mongoose.Types.ObjectId(userId)
    });

    await newVouch.save();

    // Increment the vouch count for the trade owner
    await User.findByIdAndUpdate(trade.user_id, { $inc: { vouch_count: 1 } });

    // Create notification for trade owner
    try {
      await Notification.createNotification({
        recipient: trade.user_id,
        sender: userId,
        type: 'trade_vouch',
        title: 'New Trade Vouch',
        message: `${req.user.username} vouched for your trade "${trade.item_offered}"`,
        related_id: newVouch._id,
        related_model: 'Vouch'
      });
    } catch (notificationError) {
      console.error('Failed to create trade vouch notification:', notificationError);
      // Don't fail the vouch creation if notification fails
    }

    res.status(201).json({
      message: 'Vouch added successfully',
      vouch: {
        id: newVouch._id,
        trade_id: newVouch.trade_id,
        vouched_user_id: newVouch.vouched_user_id,
        given_by_user_id: newVouch.given_by_user_id,
        created_at: newVouch.created_at
      }
    });

  } catch (error) {
    console.error('Error vouching for trade:', error);
    if (error.code === 11000) {
      return res.status(400).json({ error: 'You have already vouched for this trade' });
    }
    res.status(500).json({ error: 'Failed to add vouch' });
  }
};

// Get all vouches for a trade
export const getTradeVouches = async (req, res) => {
  try {
    const { tradeId } = req.params;

    const vouches = await TradeVouch.find({ trade_id: new mongoose.Types.ObjectId(tradeId) })
      .populate('given_by_user_id', 'username')
      .sort({ created_at: -1 });

    res.json({
      vouches: vouches.map(vouch => ({
        id: vouch._id,
        trade_id: vouch.trade_id,
        vouched_user_id: vouch.vouched_user_id,
        given_by_user: {
          id: vouch.given_by_user_id._id,
          username: vouch.given_by_user_id.username
        },
        created_at: vouch.created_at
      }))
    });

  } catch (error) {
    console.error('Error getting trade vouches:', error);
    res.status(500).json({ error: 'Failed to get vouches' });
  }
};

// Check if user has already vouched for a trade
export const hasUserVouchedForTrade = async (req, res) => {
  try {
    const { tradeId } = req.params;
    const userId = req.user.userId;

    const existingVouch = await TradeVouch.findOne({
      trade_id: new mongoose.Types.ObjectId(tradeId),
      given_by_user_id: new mongoose.Types.ObjectId(userId)
    });

    res.json({ hasVouched: !!existingVouch });

  } catch (error) {
    console.error('Error checking vouch status:', error);
    res.status(500).json({ error: 'Failed to check vouch status' });
  }
};

// Remove a vouch for a trade
export const unvouchTrade = async (req, res) => {
  try {
    const { tradeId } = req.params;
    const userId = req.user.userId;

    // Find the trade
    const trade = await Trade.findById(tradeId);
    if (!trade) {
      return res.status(404).json({ error: 'Trade not found' });
    }

    // Find and delete the vouch
    const deletedVouch = await TradeVouch.findOneAndDelete({
      trade_id: new mongoose.Types.ObjectId(tradeId),
      given_by_user_id: new mongoose.Types.ObjectId(userId)
    });

    if (!deletedVouch) {
      return res.status(404).json({ error: 'Vouch not found' });
    }

    // Decrement the vouch count for the trade owner
    await User.findByIdAndUpdate(trade.user_id, { $inc: { vouch_count: -1 } });

    res.json({ message: 'Vouch removed successfully' });

  } catch (error) {
    console.error('Error removing vouch:', error);
    res.status(500).json({ error: 'Failed to remove vouch' });
  }
};