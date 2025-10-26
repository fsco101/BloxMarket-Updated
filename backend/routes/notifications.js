import express from 'express';
import { notificationController } from '../controllers/notificationController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// All notification routes require authentication
router.use(authenticateToken);

// Get user's notifications
router.get('/', notificationController.getNotifications);

// Get single notification
router.get('/:id', notificationController.getNotification);

// Get unread count
router.get('/unread/count', notificationController.getUnreadCount);

// Mark notification as read
router.patch('/:id/read', notificationController.markAsRead);

// Mark all notifications as read
router.patch('/read-all', notificationController.markAllAsRead);

// Delete notification
router.delete('/:id', notificationController.deleteNotification);

// Delete all read notifications
router.delete('/read/delete-all', notificationController.deleteReadNotifications);

export default router;