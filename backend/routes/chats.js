import express from 'express';
import { chatController } from '../controllers/chatController.js';
import { authenticateToken } from '../middleware/auth.js';
import { Chat } from '../models/Chat.js';

// Import message routes
import messageRoutes from './messages.js';

const router = express.Router();

// All chat routes require authentication
router.use(authenticateToken);

// Message routes as sub-router
router.use('/:chatId/messages', messageRoutes);

// Chat routes
router.get('/', chatController.getUserChats);
router.get('/unread/count', chatController.getTotalUnreadCount);
// Debug route to check connected socket users
router.get('/debug/connected-users', authenticateToken, (req, res) => {
  const io = req.app.get('io');
  const sockets = io.sockets.sockets;
  const connectedUsers = [];
  
  sockets.forEach((socket) => {
    if (socket.userId && socket.username) {
      connectedUsers.push({
        userId: socket.userId,
        username: socket.username,
        socketId: socket.id,
        rooms: Array.from(socket.rooms)
      });
    }
  });
  
  res.json({ 
    connectedUsers,
    totalConnected: connectedUsers.length
  });
});

// Debug route to check unread counts for a specific chat
router.get('/debug/unread/:chatId', authenticateToken, async (req, res) => {
  try {
    const { chatId } = req.params;
    const chat = await Chat.findById(chatId).select('unread_counts participants');
    res.json({
      chatId,
      unread_counts: chat?.unread_counts || [],
      participants: chat?.participants?.map(p => ({ user_id: p.user_id, is_active: p.is_active })) || []
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
router.get('/:chatId', chatController.getChatById);
router.post('/direct', chatController.createDirectChat);
router.post('/group', chatController.createGroupChat);
router.put('/:chatId', chatController.updateGroupChat);
router.put('/:chatId/clear', chatController.clearConversation);
router.delete('/:chatId', chatController.deleteChat);

// Group chat participant management
router.post('/:chatId/participants', chatController.addParticipant);
router.delete('/:chatId/participants', chatController.removeParticipant);
router.post('/:chatId/leave', chatController.leaveGroupChat);
router.put('/:chatId/participants/role', chatController.updateParticipantRole);

export default router;