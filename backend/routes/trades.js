import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { tradeController } from '../controllers/tradeController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Create uploads directory if it doesn't exist
const uploadsDir = 'uploads/trades';
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'trade-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Accept only image files
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 5 // Maximum 5 files
  },
  fileFilter: fileFilter
});

// Trade routes
router.get('/', tradeController.getAllTrades);
router.post('/', authenticateToken, upload.array('images', 5), tradeController.createTrade);
router.get('/:tradeId', tradeController.getTradeById);
router.patch('/:tradeId', authenticateToken, tradeController.updateTrade);
// Add PUT alias so older clients don't 404
router.put('/:tradeId', authenticateToken, tradeController.updateTrade);
router.delete('/:tradeId', authenticateToken, tradeController.deleteTrade);

// Comment routes
router.get('/:tradeId/comments', tradeController.getTradeComments);
router.post('/:tradeId/comments', authenticateToken, tradeController.addTradeComment);

// Vote routes
router.get('/:tradeId/votes', tradeController.getTradeVotes);
router.post('/:tradeId/vote', authenticateToken, tradeController.voteOnTrade);

export default router;