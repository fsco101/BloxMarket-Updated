import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import wishlistController, { wishlistUpload } from '../controllers/wishlistController.js';

const router = express.Router();

// Get all wishlists (public)
router.get('/', wishlistController.getAllWishlists);

// Get single wishlist by ID (public)
router.get('/:wishlistId', wishlistController.getWishlistById);

// Create new wishlist item (protected)
router.post('/', authenticateToken, wishlistUpload.array('images', 5), wishlistController.createWishlist);

// Update wishlist item (protected)
router.put('/:wishlistId', authenticateToken, wishlistController.updateWishlist);

// Delete wishlist item (protected)
router.delete('/:wishlistId', authenticateToken, wishlistController.deleteWishlist);

// Get wishlist comments (public)
router.get('/:wishlistId/comments', wishlistController.getWishlistComments);

// Add wishlist comment (protected)
router.post('/:wishlistId/comments', authenticateToken, wishlistController.addWishlistComment);

// Get user's wishlists (public)
router.get('/user/:userId', wishlistController.getUserWishlists);

// Vote on a wishlist (protected)
router.post('/:wishlistId/vote', authenticateToken, wishlistController.voteOnWishlist);

// Get wishlist votes (public)
router.get('/:wishlistId/votes', wishlistController.getWishlistVotes);

// Upload images for wishlist (protected)
router.post('/:wishlistId/images', authenticateToken, wishlistUpload.array('images', 5), wishlistController.uploadWishlistImages);

// Delete wishlist image (protected)
router.delete('/:wishlistId/images/:filename', authenticateToken, wishlistController.deleteWishlistImage);

export default router;