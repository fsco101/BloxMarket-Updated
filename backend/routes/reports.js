import express from 'express';
import { reportController } from '../controllers/reportController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// All report routes require authentication
router.use(authenticateToken);

// Create a new report
router.post('/', reportController.createReport);

// Get reports (admin only - this would need additional admin middleware)
router.get('/', reportController.getReports);

// Update report status (admin only)
router.patch('/:reportId/status', reportController.updateReportStatus);

// Delete report (admin only)
router.delete('/:reportId', reportController.deleteReport);

// Get report statistics (admin only)
router.get('/stats/overview', reportController.getReportStats);

export default router;