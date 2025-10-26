import express from 'express';
import { vouchTrade, getTradeVouches, hasUserVouchedForTrade, unvouchTrade } from '../controllers/vouchController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// All vouch routes require authentication
router.use(authenticateToken);

// Vouch for a trade
router.post('/trade/:tradeId', vouchTrade);

// Remove a vouch for a trade
router.delete('/trade/:tradeId', unvouchTrade);

// Get all vouches for a trade
router.get('/trade/:tradeId', getTradeVouches);

// Check if user has vouched for a trade
router.get('/trade/:tradeId/check', hasUserVouchedForTrade);

export default router;