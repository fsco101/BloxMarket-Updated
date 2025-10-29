import express from 'express';
import { chatController } from '../controllers/chatController.js';
import { authenticateToken } from '../middleware/auth.js';

// Import message routes
import messageRoutes from './messages.js';

const router = express.Router();

// All chat routes require authentication
router.use(authenticateToken);

// Message routes as sub-router
router.use('/:chatId/messages', messageRoutes);

// Chat routes
router.get('/', chatController.getUserChats);
router.get('/:chatId', chatController.getChatById);
router.post('/direct', chatController.createDirectChat);
router.post('/group', chatController.createGroupChat);
router.put('/:chatId', chatController.updateGroupChat);
router.delete('/:chatId', chatController.deleteChat);

// Group chat participant management
router.post('/:chatId/participants', chatController.addParticipant);
router.delete('/:chatId/participants', chatController.removeParticipant);
router.post('/:chatId/leave', chatController.leaveGroupChat);
router.put('/:chatId/participants/role', chatController.updateParticipantRole);

export default router;