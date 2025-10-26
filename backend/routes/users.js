import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { userController } from '../controllers/userController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Configure multer for avatar uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = './uploads/avatars';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB limit for avatars
    files: 1 // Only one avatar per upload
  },
  fileFilter: function (req, file, cb) {
    // Check file type
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed for avatars'), false);
    }
  }
});

// User routes
router.get('/me', authenticateToken, userController.getCurrentUserProfile);
router.get('/:userId', userController.getUserById);
router.patch('/me', authenticateToken, userController.updateProfile);
router.post('/avatar', authenticateToken, upload.single('avatar'), userController.uploadAvatar);
router.get('/:userId/wishlist', userController.getUserWishlist);
router.post('/wishlist', authenticateToken, userController.addToWishlist);
router.delete('/wishlist/:wishlistId', authenticateToken, userController.removeFromWishlist);
router.post('/request-verification', authenticateToken, userController.requestVerification);
router.post('/request-middleman', authenticateToken, userController.requestMiddleman);

export default router;