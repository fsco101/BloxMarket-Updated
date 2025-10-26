import express from 'express';
import { body, param, query } from 'express-validator';
// Fix: Change from eventDatatableController to eventsDataTableController
import { eventsDataTableController } from '../../controllers/datatables/eventsDataTableController.js';
import { authenticateToken } from '../../middleware/auth.js';

const router = express.Router();

// Validation middleware
const validateEventId = [
  param('eventId')
    .isMongoId()
    .withMessage('Invalid event ID')
];

const validateBulkDelete = [
  body('eventIds')
    .isArray({ min: 1 })
    .withMessage('Event IDs array is required'),
  body('eventIds.*')
    .isMongoId()
    .withMessage('Invalid event ID in array')
];

// Role check middleware
const isAdminOrModerator = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  if (req.user.role !== 'admin' && req.user.role !== 'moderator') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin or moderator privileges required.'
    });
  }

  next();
};

const isAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin privileges required.'
    });
  }

  next();
};

// All routes require authentication and moderator/admin role
router.use(authenticateToken);
router.use(isAdminOrModerator);

// Get all events with DataTables support
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: -1 }),
    query('search').optional().isString().trim(),
    query('status').optional().isIn(['active', 'upcoming', 'completed', '']),
    query('type').optional().isIn(['event', 'giveaway', '']),
    query('sortBy').optional().isString(),
    query('sortOrder').optional().isIn(['asc', 'desc'])
  ],
  eventsDataTableController.getEventsDataTable
);

// Get event statistics
router.get(
  '/statistics',
  eventsDataTableController.getEventStatistics
);

// Export events to CSV
router.get(
  '/export/csv',
  [
    query('status').optional().isIn(['active', 'upcoming', 'completed']),
    query('type').optional().isIn(['event', 'giveaway'])
  ],
  eventsDataTableController.exportEventsCSV
);

// Get single event details
router.get(
  '/:eventId',
  validateEventId,
  eventsDataTableController.getEventDetails
);

// Delete event (requires admin)
router.delete(
  '/:eventId',
  isAdmin,
  validateEventId,
  eventsDataTableController.deleteEvent
);

// Bulk delete events (requires admin)
router.post(
  '/bulk/delete',
  isAdmin,
  validateBulkDelete,
  eventsDataTableController.bulkDeleteEvents
);

export default router;