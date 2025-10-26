import express from 'express';
import { authenticateToken, requireAdmin } from '../../middleware/auth.js';
import { middlemanVerificationDatatableController } from '../../controllers/datatables/middlemanVerificationDatatableController.js';

const router = express.Router();

// All routes require admin authentication
router.use(authenticateToken);
router.use(requireAdmin);

// DataTable endpoints
router.get('/', middlemanVerificationDatatableController.getVerificationRequests);
router.put('/:applicationId/approve', middlemanVerificationDatatableController.approveApplication);
router.put('/:applicationId/reject', middlemanVerificationDatatableController.rejectApplication);
router.get('/:applicationId', middlemanVerificationDatatableController.getApplicationDetails);
router.post('/bulk', middlemanVerificationDatatableController.bulkUpdateApplications);
router.get('/export', middlemanVerificationDatatableController.exportVerificationRequests);

export default router;