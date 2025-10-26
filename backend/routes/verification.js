import express from 'express';
import { verificationController, upload, uploadFace } from '../controllers/verificationController.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import multer from 'multer';

const router = express.Router();

// Routes that require authentication
router.use(authenticateToken);

// Apply for middleman status (regular authenticated users)
router.post('/apply', (req, res, next) => {
  upload(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        // Multer error (file too large, etc.)
        return res.status(400).json({ error: err.message });
      } else {
        // Unknown error
        return res.status(500).json({ error: err.message });
      }
    }
    // No error, proceed to controller
    next();
  });
}, verificationController.submitApplication);

// Upload face images for verification
router.post('/upload-face', (req, res, next) => {
  uploadFace(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        // Multer error (file too large, etc.)
        return res.status(400).json({ error: err.message });
      } else {
        // Unknown error
        return res.status(500).json({ error: err.message });
      }
    }
    // No error, proceed to controller
    next();
  });
}, verificationController.uploadFaceImages);

// Get current user's application status
router.get('/my-application', verificationController.getUserApplicationStatus);

// Public routes (accessible by all authenticated users)
router.get('/middlemen', verificationController.getActiveMiddlemen);

// Middleman vouch routes
router.post('/middlemen/:middlemanId/vouch', verificationController.vouchForMiddleman);
router.delete('/middlemen/:middlemanId/vouch', verificationController.unvouchForMiddleman);
router.get('/middlemen/:middlemanId/vouches', verificationController.getMiddlemanVouches);
router.get('/middlemen/:middlemanId/vouch-status', verificationController.hasUserVouchedForMiddleman);

// Routes that require admin privileges
router.use(requireAdmin);

// Get all verification applications (admin only)
router.get('/applications', verificationController.getApplications);

// Review application (approve/reject) - admin only
router.post('/applications/:applicationId/review', verificationController.reviewApplication);

// Access to documents (with security checks in the controller)
router.get('/documents/:documentId', verificationController.getDocumentById);

export default router;