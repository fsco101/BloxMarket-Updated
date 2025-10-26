import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { forumController } from '../controllers/forumController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Configure multer for forum image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = './uploads/forum';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'forum-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 5 // Maximum 5 images per post
  },
  fileFilter: function (req, file, cb) {
    // Check file type
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Forum post routes
router.get('/posts', forumController.getForumPosts);
router.get('/posts/:postId', authenticateToken, forumController.getForumPostById);
router.post('/posts', authenticateToken, upload.array('images', 5), forumController.createForumPost);
router.put('/posts/:postId', authenticateToken, upload.array('images', 5), forumController.updateForumPost);
router.delete('/posts/:postId', authenticateToken, forumController.deleteForumPost);

// User’s own posts (history)
router.get('/user/:userId', authenticateToken, forumController.getUserForumPosts);

// Forum interaction routes
router.post('/posts/:postId/vote', authenticateToken, forumController.voteOnForumPost);
router.get('/posts/:postId/comments', authenticateToken, forumController.getForumComments);
router.post('/posts/:postId/comments', authenticateToken, forumController.addForumComment);

export default router;