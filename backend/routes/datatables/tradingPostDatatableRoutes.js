import express from 'express';
import { body, param, query } from 'express-validator';
import { tradingPostDatatableController } from '../../controllers/datatables/tradingPostDatatableController.js';
import { authenticateToken } from '../../middleware/auth.js';

const router = express.Router();

// Validation middleware
const validatePostId = [
  param('postId')
    .isMongoId()
    .withMessage('Invalid post ID')
];

const validateBulkDelete = [
  body('postIds')
    .isArray({ min: 1 })
    .withMessage('Post IDs array is required'),
  body('postIds.*')
    .isMongoId()
    .withMessage('Invalid post ID in array')
];

const validateModerate = [
  param('postId')
    .isMongoId()
    .withMessage('Invalid post ID'),
  body('action')
    .isIn(['archive', 'activate', 'complete', 'flag', 'unflag'])
    .withMessage('Invalid action'),
  body('reason')
    .optional()
    .isString()
    .withMessage('Reason must be a string')
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

// Get all trading posts with DataTables support
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: -1 }),
    query('search').optional().isString().trim(),
    query('type').optional().isIn(['sell', 'buy', 'trade', '']),
    query('status').optional().isIn(['active', 'completed', 'archived', 'flagged', 'pending', '']),
    query('sortBy').optional().isString(),
    query('sortOrder').optional().isIn(['asc', 'desc'])
  ],
  tradingPostDatatableController.getTradingPostsDataTable
);

// Get trading post statistics
router.get(
  '/statistics',
  tradingPostDatatableController.getTradingPostStatistics
);

// Export trading posts to CSV
router.get(
  '/export/csv',
  [
    query('status').optional().isIn(['active', 'completed', 'archived', 'flagged', 'pending']),
    query('type').optional().isIn(['sell', 'buy', 'trade'])
  ],
  tradingPostDatatableController.exportTradingPostsCSV
);

// Get single trading post details
router.get(
  '/:postId',
  validatePostId,
  tradingPostDatatableController.getTradingPostDetails
);

// Moderate trading post (archive, flag, etc.)
router.patch(
  '/:postId/moderate',
  validateModerate,
  tradingPostDatatableController.moderateTradingPost
);

// Delete trading post (requires admin)
router.delete(
  '/:postId',
  isAdmin,
  validatePostId,
  tradingPostDatatableController.deleteTradingPost
);

// Bulk delete trading posts (requires admin)
router.post(
  '/bulk/delete',
  isAdmin,
  validateBulkDelete,
  tradingPostDatatableController.bulkDeleteTradingPosts
);

export default router;