import express from 'express';
import { authenticateToken, requireAdmin } from '../../middleware/auth.js';
import { reportsDatatableController } from '../../controllers/datatables/reportsDatatableController.js';

const router = express.Router();

// All routes require admin authentication
router.use(authenticateToken);
router.use(requireAdmin);

// DataTable endpoints
router.get('/', reportsDatatableController.getReports);
router.patch('/:reportId/status', reportsDatatableController.updateStatus);
router.delete('/:reportId', reportsDatatableController.deleteReport);
router.post('/bulk/status', reportsDatatableController.bulkUpdateStatus);
router.get('/stats', reportsDatatableController.getStats);
router.get('/export', reportsDatatableController.exportReports);

export default router;