import express from 'express';
import { body, param, query } from 'express-validator';
import { forumDatatableController } from '../../controllers/datatables/forumDatatableController.js';
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

// Get all forum posts with DataTables support
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: -1 }),
    query('search').optional().isString().trim(),
    query('category').optional().isIn(['general', 'trading_tips', 'scammer_reports', 'game_updates', '']),
    query('sortBy').optional().isString(),
    query('sortOrder').optional().isIn(['asc', 'desc'])
  ],
  forumDatatableController.getForumPostsDataTable
);

// Get forum statistics
router.get(
  '/statistics',
  forumDatatableController.getForumStatistics
);

// Export forum posts to CSV
router.get(
  '/export/csv',
  [
    query('category').optional().isIn(['general', 'trading_tips', 'scammer_reports', 'game_updates'])
  ],
  forumDatatableController.exportForumPostsCSV
);

// Get single forum post details
router.get(
  '/:postId',
  validatePostId,
  forumDatatableController.getForumPostDetails
);

// Delete forum post (requires admin)
router.delete(
  '/:postId',
  isAdmin,
  validatePostId,
  forumDatatableController.deleteForumPost
);

// Bulk delete forum posts (requires admin)
router.post(
  '/bulk/delete',
  isAdmin,
  validateBulkDelete,
  forumDatatableController.bulkDeleteForumPosts
);

export default router;