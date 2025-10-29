import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { messageController } from '../controllers/messageController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Configure multer for chat image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = './uploads/chat';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'chat-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1 // Maximum 1 image per message
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

// All message routes require authentication
router.use(authenticateToken);

// Message routes
router.get('/chats/:chatId/messages', messageController.getMessages);
router.post('/chats/:chatId/messages', messageController.sendMessage);
router.put('/:messageId', messageController.editMessage);
router.delete('/:messageId', messageController.deleteMessage);

// Message reactions
router.post('/:messageId/reactions', messageController.addReaction);
router.delete('/:messageId/reactions', messageController.removeReaction);

// Chat image upload
router.post('/chats/:chatId/upload-image', upload.single('image'), messageController.uploadChatImage);

export default router;