import express from 'express';
import { authenticateToken, requireAdmin } from '../../middleware/auth.js';
import { userDatatableController } from '../../controllers/datatables/userDatatableController.js';

const router = express.Router();

// All routes require admin authentication
router.use(authenticateToken);
router.use(requireAdmin);

// DataTable endpoints
router.get('/users', userDatatableController.getUsers);
router.put('/users/:userId/role', userDatatableController.updateRole);
router.post('/users/:userId/ban', userDatatableController.banUser);
router.post('/users/:userId/status', userDatatableController.updateStatus);
router.post('/users/:userId/penalty', userDatatableController.issuePenalty);
router.get('/users/:userId/penalties', userDatatableController.getPenaltyHistory);
router.post('/users/bulk', userDatatableController.bulkUpdate);
router.get('/users/export', userDatatableController.exportUsers);

export default router;