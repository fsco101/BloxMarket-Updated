import express from 'express';
import { authenticateToken, requireAdmin } from '../../middleware/auth.js';
import wishlistDatatableController from '../../controllers/datatables/wishlistDatatableController.js';

const router = express.Router();

// All routes in this file require authentication and admin privileges
router.use(authenticateToken);
router.use(requireAdmin);

// Get all wishlists with filters, pagination, sorting for datatable
router.get('/', wishlistDatatableController.getWishlists);

// Get a single wishlist by ID
router.get('/:wishlistId', wishlistDatatableController.getWishlistById);

// Delete a wishlist
router.delete('/:wishlistId', wishlistDatatableController.deleteWishlist);

// Bulk delete wishlists
router.post('/bulk-delete', wishlistDatatableController.bulkDeleteWishlists);

// Get wishlist statistics
router.get('/stats/overview', wishlistDatatableController.getStatistics);

// Export wishlists to CSV
router.get('/export/csv', wishlistDatatableController.exportCSV);

// Moderate a wishlist (hide/unhide, flag/unflag)
router.patch('/:wishlistId/moderate', wishlistDatatableController.moderateWishlist);

export default router;