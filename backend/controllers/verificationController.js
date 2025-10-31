import { MiddlemanApplication } from '../models/MiddlemanApplication.js';
import { VerificationDocument } from '../models/VerificationDocument.js';
import { User } from '../models/User.js';
import { MiddlemanVouch } from '../models/MiddlemanVouch.js';
import { Notification } from '../models/Notification.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure storage for document uploads
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads/documents');
    cb(null, uploadDir);
  },
  filename: function(req, file, cb) {
    // Create a unique filename with original extension
    const fileExt = file.originalname.split('.').pop();
    const filename = `${uuidv4()}.${fileExt}`;
    cb(null, filename);
  }
});

// Configure storage for face image uploads
const faceStorage = multer.diskStorage({
  destination: function(req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads/middlemanface');
    cb(null, uploadDir);
  },
  filename: function(req, file, cb) {
    // Create a unique filename with original extension
    const fileExt = file.originalname.split('.').pop();
    const filename = `face_${uuidv4()}.${fileExt}`;
    cb(null, filename);
  }
});

// Configure upload options
export const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  },
  fileFilter: function(req, file, cb) {
    // Accept images and PDFs only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif|pdf)$/i)) {
      return cb(new Error('Only image files and PDFs are allowed!'), false);
    }
    cb(null, true);
  }
}).array('documents', 5); // Allow up to 5 files

// Configure face upload options
export const uploadFace = multer({
  storage: faceStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size for face images
  },
  fileFilter: function(req, file, cb) {
    // Accept images only
    if (!file.originalname.match(/\.(jpg|jpeg|png)$/i)) {
      return cb(new Error('Only image files (JPG, PNG) are allowed for face verification!'), false);
    }
    cb(null, true);
  }
}).array('faceImages', 3); // Allow up to 3 face images

export const verificationController = {
  // Get all middleman applications (admin only)
  getApplications: async (req, res) => {
    try {
      const { status, page = 1, limit = 10 } = req.query;
      
      const query = {};
      if (status && status !== 'all') {
        query.status = status;
      }
      
      const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        sort: { createdAt: -1 },
        populate: [
          { path: 'user_id', select: 'username email roblox_username avatar_url credibility_score' },
          { path: 'documents' }
        ]
      };
      
      const applications = await MiddlemanApplication.find(query)
        .populate('user_id', 'username email roblox_username avatar_url credibility_score')
        .populate({
          path: 'documents',
          select: '_id document_type filename original_filename file_path mime_type file_size description status createdAt',
          match: { is_deleted: { $ne: true } } // Only get non-deleted documents
        })
        .sort({ createdAt: -1 })
        .skip((options.page - 1) * options.limit)
        .limit(options.limit);
      
      // Get total counts for each status
      const [total, pending, approved, rejected] = await Promise.all([
        MiddlemanApplication.countDocuments({}),
        MiddlemanApplication.countDocuments({ status: 'pending' }),
        MiddlemanApplication.countDocuments({ status: 'approved' }),
        MiddlemanApplication.countDocuments({ status: 'rejected' })
      ]);
      
      // Enhance each application with trade and vouch counts
      const enhancedApplications = await Promise.all(applications.map(async (application) => {
        const appObject = application.toObject();
        
        // Get trade count
        let tradeCount = 0;
        try {
          const { Trade } = await import('../models/Trade.js');
          tradeCount = await Trade.countDocuments({ user_id: application.user_id._id });
        } catch (err) {
          console.error('Error counting trades:', err);
        }
        
        // Get vouch count
        let vouchCount = 0;
        try {
          const { Vouch } = await import('../models/Vouch.js');
          vouchCount = await Vouch.countDocuments({ 
            user_id: application.user_id._id,
            status: 'approved'
          });
        } catch (err) {
          console.error('Error counting vouches:', err);
        }
        
        return {
          ...appObject,
          trades: tradeCount,
          vouches: vouchCount,
          requestType: 'Middleman'
        };
      }));
      
      res.status(200).json({
        requests: enhancedApplications,
        pagination: {
          page: options.page,
          limit: options.limit,
          total,
          pages: Math.ceil(total / options.limit)
        },
        counts: {
          total,
          pending,
          approved,
          rejected
        }
      });
    } catch (error) {
      console.error('Error fetching middleman applications:', error);
      res.status(500).json({ error: 'Failed to fetch middleman applications' });
    }
  },
  
  // Submit middleman application
  submitApplication: async (req, res) => {
    try {
      console.log('Received application submission request');
      console.log('Request body:', req.body);
      console.log('Files received:', req.files ? req.files.length : 'none');
      
      const userId = req.user.userId;
      console.log('User ID:', userId);
      
      // Check if user already has a pending application
      const existingApplication = await MiddlemanApplication.findOne({ 
        user_id: userId, 
        status: 'pending' 
      });
      
      if (existingApplication) {
        console.log('User already has pending application:', existingApplication._id);
        return res.status(400).json({ 
          error: 'You already have a pending middleman application' 
        });
      }
      
      // Process form data
      const { 
        experience, 
        availability, 
        why_middleman, 
        referral_codes, 
        external_links,
        preferred_trade_types
      } = req.body;
      
      // Validate required fields
      if (!experience || !availability || !why_middleman) {
        console.log('Missing required fields:', { experience, availability, why_middleman });
        return res.status(400).json({
          error: 'Missing required fields'
        });
      }
      
      // Create application
      const application = new MiddlemanApplication({
        user_id: userId,
        experience,
        availability,
        why_middleman,
        referral_codes,
        external_links: external_links ? external_links.split(',').map(link => link.trim()) : [],
        preferred_trade_types: preferred_trade_types ? preferred_trade_types.split(',').map(type => type.trim()) : []
      });
      
      // Process uploaded documents if any
      if (req.files && req.files.length > 0) {
        console.log('Processing uploaded files:', req.files.length);
        const documentIds = [];
        
        for (const file of req.files) {
          console.log('Processing file:', file.originalname, file.fieldname);
          
          const document = new VerificationDocument({
            user_id: userId,
            document_type: file.fieldname === 'documents' ? 'other' : file.fieldname,
            filename: file.filename,
            original_filename: file.originalname,
            file_path: file.path,
            mime_type: file.mimetype,
            file_size: file.size,
            description: file.fieldname === 'id_card' ? 'Identity Verification' : 'Supporting Document'
          });
          
          try {
            await document.save();
            console.log('Document saved:', document._id);
            documentIds.push(document._id);
          } catch (docError) {
            console.error('Error saving document:', docError);
          }
        }
        
        application.documents = documentIds;
        console.log('Documents attached to application:', documentIds.length);
      } else {
        console.log('No documents uploaded with application');
      }
      
      await application.save();
      console.log('Application saved successfully:', application._id);
      
      // Update user model
      await User.updateOne(
        { _id: userId },
        { $set: { middleman_requested: true }}
      );
      console.log('User marked as having requested middleman status');
      
      res.status(201).json({
        message: 'Middleman application submitted successfully',
        applicationId: application._id
      });
    } catch (error) {
      console.error('Error submitting middleman application:', error);
      res.status(500).json({ error: 'Failed to submit application: ' + error.message });
    }
  },

  // Upload face images for verification
  uploadFaceImages: async (req, res) => {
    try {
      console.log('Received face image upload request');
      console.log('Face images received:', req.files ? req.files.length : 'none');

      const userId = req.user.userId;

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'No face images provided' });
      }

      // Find the user's pending application
      const pendingApplication = await MiddlemanApplication.findOne({
        user_id: userId,
        status: 'pending'
      });

      if (!pendingApplication) {
        return res.status(400).json({ error: 'No pending middleman application found' });
      }

      // Create face image documents
      const faceImageIds = [];
      for (const file of req.files) {
        console.log('Processing face image:', file.originalname);

        const faceImage = new VerificationDocument({
          user_id: userId,
          document_type: 'face_verification',
          filename: file.filename,
          original_filename: file.originalname,
          file_path: file.path,
          mime_type: file.mimetype,
          file_size: file.size,
          description: 'Face verification image'
        });

        try {
          await faceImage.save();
          console.log('Face image saved:', faceImage._id);
          faceImageIds.push(faceImage._id);
        } catch (faceError) {
          console.error('Error saving face image:', faceError);
        }
      }

      // Link face images to the application
      if (faceImageIds.length > 0) {
        pendingApplication.documents = [
          ...(pendingApplication.documents || []),
          ...faceImageIds
        ];
        await pendingApplication.save();
        console.log('Face images linked to application:', faceImageIds.length);
      }

      res.status(201).json({
        message: 'Face images uploaded successfully',
        faceImageIds,
        uploadedCount: faceImageIds.length
      });
    } catch (error) {
      console.error('Error uploading face images:', error);
      res.status(500).json({ error: 'Failed to upload face images: ' + error.message });
    }
  },
  
  // Review application (approve/reject)
  reviewApplication: async (req, res) => {
    try {
      const { applicationId } = req.params;
      const { action, reason } = req.body;
      const adminId = req.user.userId;
      
      if (!['approve', 'reject'].includes(action)) {
        return res.status(400).json({ error: 'Invalid action' });
      }
      
      if (action === 'reject' && !reason) {
        return res.status(400).json({ error: 'Rejection reason is required' });
      }
      
      const application = await MiddlemanApplication.findById(applicationId);
      
      if (!application) {
        return res.status(404).json({ error: 'Application not found' });
      }
      
      if (application.status !== 'pending') {
        return res.status(400).json({ error: 'Application has already been processed' });
      }
      
      // Update application status
      application.status = action === 'approve' ? 'approved' : 'rejected';
      application.reviewed_by = adminId;
      application.reviewed_date = new Date();
      
      if (action === 'reject') {
        application.rejection_reason = reason;
      }
      
      await application.save();
      
      // Update user model
      const user = await User.findById(application.user_id);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      if (action === 'approve') {
        user.role = 'middleman';
        
        // Add to role history
        user.role_history.push({
          old_role: user.role,
          new_role: 'middleman',
          changed_by: adminId,
          changed_at: new Date(),
          reason: 'Middleman application approved'
        });
      }
      
      user.middleman_requested = false;
      await user.save();
      
      res.status(200).json({
        message: `Application ${action === 'approve' ? 'approved' : 'rejected'} successfully`
      });
    } catch (error) {
      console.error('Error reviewing middleman application:', error);
      res.status(500).json({ error: 'Failed to process application review' });
    }
  },
  
  // Get application by id
  getApplicationById: async (req, res) => {
    try {
      const { applicationId } = req.params;
      
      const application = await MiddlemanApplication.findById(applicationId)
        .populate('user_id', 'username email roblox_username avatar_url credibility_score')
        .populate('documents');
      
      if (!application) {
        return res.status(404).json({ error: 'Application not found' });
      }
      
      // Get trade and vouch counts
      let tradeCount = 0;
      let vouchCount = 0;
      
      try {
        const { Trade } = await import('../models/Trade.js');
        tradeCount = await Trade.countDocuments({ user_id: application.user_id._id });
      } catch (err) {
        console.error('Error counting trades:', err);
      }
      
      try {
        const { Vouch } = await import('../models/Vouch.js');
        vouchCount = await Vouch.countDocuments({
          user_id: application.user_id._id,
          status: 'approved'
        });
      } catch (err) {
        console.error('Error counting vouches:', err);
      }
      
      // Construct response
      const applicationData = application.toObject();
      applicationData.trades = tradeCount;
      applicationData.vouches = vouchCount;
      
      res.status(200).json({
        application: applicationData
      });
    } catch (error) {
      console.error('Error fetching application details:', error);
      res.status(500).json({ error: 'Failed to fetch application details' });
    }
  },
  
  // Get user's application status
  getUserApplicationStatus: async (req, res) => {
    try {
      const userId = req.user.userId;
      
      const application = await MiddlemanApplication.findOne({
        user_id: userId
      }).sort({ createdAt: -1 });
      
      if (!application) {
        return res.status(404).json({ error: 'No application found' });
      }
      
      res.status(200).json({
        status: application.status,
        applicationId: application._id,
        submittedAt: application.createdAt,
        reviewedAt: application.reviewed_date,
        rejectionReason: application.rejection_reason
      });
    } catch (error) {
      console.error('Error fetching user application status:', error);
      res.status(500).json({ error: 'Failed to fetch application status' });
    }
  },
  
  // Get document by id
  getDocumentById: async (req, res) => {
    try {
      const { documentId } = req.params;
      
      const document = await VerificationDocument.findById(documentId);
      
      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }
      
      // Security check - only admin or document owner can access
      if (
        req.user.role !== 'admin' && 
        req.user.role !== 'moderator' && 
        document.user_id.toString() !== req.user.userId
      ) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      // Serve file
      res.sendFile(document.file_path);
    } catch (error) {
      console.error('Error retrieving document:', error);
      res.status(500).json({ error: 'Failed to retrieve document' });
    }
  },
  
  // Get active middlemen
  getActiveMiddlemen: async (req, res) => {
    try {
      const middlemen = await User.find({
        role: 'middleman',
        is_active: true
      }).select('_id username roblox_username avatar_url credibility_score vouch_count bio timezone');
      
      // Enhance with trade data and rating calculation
      const enhancedMiddlemen = await Promise.all(middlemen.map(async (mm) => {
        const middleman = mm.toObject();
        
        // Get trade count
        let tradeCount = 0;
        try {
          const { Trade } = await import('../models/Trade.js');
          tradeCount = await Trade.countDocuments({ user_id: mm._id });
        } catch (err) {
          console.error('Error counting trades:', err);
        }
        
        // Get average rating from middleman vouches
        let averageRating = 0;
        let totalRatingSum = 0;
        let vouchCount = 0;
        try {
          const vouchData = await MiddlemanVouch.aggregate([
            { $match: { middleman_id: mm._id, status: 'approved' }},
            { $group: { _id: null, avgRating: { $avg: '$rating' }, totalRating: { $sum: '$rating' }, count: { $sum: 1 }}}
          ]);
          
          if (vouchData.length > 0) {
            averageRating = vouchData[0].avgRating || 0;
            totalRatingSum = vouchData[0].totalRating || 0;
            vouchCount = vouchData[0].count || 0;
          }
        } catch (err) {
          console.error('Error calculating average rating:', err);
        }
        
        // Calculate credibility score as sum of ratings * 2
        const credibilityScore = totalRatingSum * 2;
        
        // Get verification date
        let verificationDate = null;
        if (mm.role_history && mm.role_history.length > 0) {
          const verificationEvent = mm.role_history.find(
            event => event.new_role === 'middleman'
          );
          if (verificationEvent) {
            verificationDate = verificationEvent.changed_at;
          }
        }
        
        return {
          ...middleman,
          trades: tradeCount,
          vouches: vouchCount,
          rating: Math.round(averageRating * 10) / 10, // Round to 1 decimal place
          credibility_score: credibilityScore, // Override with calculated value
          verificationDate
        };
      }));
      
      res.status(200).json({
        middlemen: enhancedMiddlemen
      });
    } catch (error) {
      console.error('Error fetching middlemen:', error);
      res.status(500).json({ error: 'Failed to fetch middlemen' });
    }
  },

  // Vouch for a middleman
  vouchForMiddleman: async (req, res) => {
    try {
      const { middlemanId } = req.params;
      const { rating, comment } = req.body;
      const userId = req.user.userId;

      // Validate rating
      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({ error: 'Rating must be between 1 and 5' });
      }

      // Ensure IDs are ObjectIds
      const middlemanObjectId = mongoose.Types.ObjectId.isValid(middlemanId) 
        ? new mongoose.Types.ObjectId(middlemanId) 
        : middlemanId;
      const userObjectId = mongoose.Types.ObjectId.isValid(userId) 
        ? new mongoose.Types.ObjectId(userId) 
        : userId;

      // Check if middleman exists and is active
      const middleman = await User.findOne({
        _id: middlemanObjectId,
        role: 'middleman',
        is_active: true
      });

      if (!middleman) {
        return res.status(404).json({ error: 'Middleman not found or not active' });
      }

      // Check if user is trying to vouch for themselves
      if (middlemanId === userId) {
        return res.status(400).json({ error: 'You cannot vouch for yourself' });
      }

      // Check if user has already vouched for this middleman
      const existingVouch = await MiddlemanVouch.findOne({
        middleman_id: middlemanObjectId,
        given_by_user_id: userObjectId
      });

      if (existingVouch) {
        return res.status(400).json({ error: 'You have already vouched for this middleman' });
      }

      // Create the vouch
      const vouch = new MiddlemanVouch({
        middleman_id: middlemanObjectId,
        given_by_user_id: userObjectId,
        rating,
        comment: comment || ''
      });

      await vouch.save();

      // Update middleman's vouch count and credibility score
      const totalVouches = await MiddlemanVouch.countDocuments({
        middleman_id: middlemanObjectId,
        status: 'approved'
      });

      // Calculate credibility score as sum of all ratings * 2
      const ratingSumResult = await MiddlemanVouch.aggregate([
        { $match: { middleman_id: middlemanObjectId, status: 'approved' }},
        { $group: { _id: null, totalRating: { $sum: '$rating' }}}
      ]);
      
      const totalRatingSum = ratingSumResult.length > 0 ? ratingSumResult[0].totalRating : 0;
      const credibilityScore = totalRatingSum * 2; // +2 points per star rating

      await User.updateOne(
        { _id: middlemanObjectId },
        {
          $set: {
            vouch_count: totalVouches,
            credibility_score: credibilityScore
          }
        }
      );

      // Create notification for middleman
      try {
        await Notification.createNotification({
          recipient: middlemanObjectId,
          sender: userObjectId,
          type: 'middleman_vouch',
          title: 'New Middleman Vouch',
          message: `${req.user.username} gave you a ${rating}-star vouch`,
          related_id: vouch._id,
          related_model: 'Vouch'
        });
      } catch (notificationError) {
        console.error('Failed to create middleman vouch notification:', notificationError);
        // Don't fail the vouch creation if notification fails
      }

      res.status(201).json({
        message: 'Successfully vouched for middleman',
        vouch: {
          id: vouch._id,
          rating: vouch.rating,
          comment: vouch.comment,
          createdAt: vouch.createdAt
        }
      });
    } catch (error) {
      console.error('Error vouching for middleman:', error);
      res.status(500).json({ error: 'Failed to vouch for middleman' });
    }
  },

  // Remove vouch for a middleman
  unvouchForMiddleman: async (req, res) => {
    try {
      const { middlemanId } = req.params;
      const userId = req.user.userId;

      // Ensure IDs are ObjectIds
      const middlemanObjectId = mongoose.Types.ObjectId.isValid(middlemanId) 
        ? new mongoose.Types.ObjectId(middlemanId)
        : middlemanId;
      const userObjectId = mongoose.Types.ObjectId.isValid(userId) 
        ? new mongoose.Types.ObjectId(userId) 
        : userId;

      // Find and delete the vouch
      const vouch = await MiddlemanVouch.findOneAndDelete({
        middleman_id: middlemanObjectId,
        given_by_user_id: userObjectId
      });

      if (!vouch) {
        return res.status(404).json({ error: 'Vouch not found' });
      }

      // Update middleman's vouch count and credibility score
      const totalVouches = await MiddlemanVouch.countDocuments({
        middleman_id: middlemanObjectId,
        status: 'approved'
      });

      // Calculate credibility score as sum of all ratings * 2
      const ratingSumResult = await MiddlemanVouch.aggregate([
        { $match: { middleman_id: middlemanObjectId, status: 'approved' }},
        { $group: { _id: null, totalRating: { $sum: '$rating' }}}
      ]);
      
      const totalRatingSum = ratingSumResult.length > 0 ? ratingSumResult[0].totalRating : 0;
      const credibilityScore = totalRatingSum * 2; // +2 points per star rating

      await User.updateOne(
        { _id: middlemanObjectId },
        {
          $set: {
            vouch_count: totalVouches,
            credibility_score: credibilityScore
          }
        }
      );

      res.status(200).json({
        message: 'Successfully removed vouch for middleman'
      });
    } catch (error) {
      console.error('Error removing vouch for middleman:', error);
      res.status(500).json({ error: 'Failed to remove vouch for middleman' });
    }
  },

  // Get vouches for a middleman
  getMiddlemanVouches: async (req, res) => {
    try {
      const { middlemanId } = req.params;

      // Ensure ID is ObjectId
      const middlemanObjectId = mongoose.Types.ObjectId.isValid(middlemanId) 
        ? new mongoose.Types.ObjectId(middlemanId) 
        : middlemanId;

      const vouches = await MiddlemanVouch.find({
        middleman_id: middlemanObjectId,
        status: 'approved'
      })
      .populate('given_by_user_id', 'username avatar_url')
      .sort({ createdAt: -1 });

      // Calculate average rating
      const totalVouches = vouches.length;
      const averageRating = totalVouches > 0
        ? vouches.reduce((sum, vouch) => sum + vouch.rating, 0) / totalVouches
        : 0;

      res.status(200).json({
        vouches: vouches.map(vouch => ({
          id: vouch._id,
          rating: vouch.rating,
          comment: vouch.comment,
          givenBy: {
            id: vouch.given_by_user_id._id,
            username: vouch.given_by_user_id.username,
            avatar: vouch.given_by_user_id.avatar_url
          },
          createdAt: vouch.createdAt
        })),
        totalVouches,
        averageRating: Math.round(averageRating * 10) / 10
      });
    } catch (error) {
      console.error('Error fetching middleman vouches:', error);
      res.status(500).json({ error: 'Failed to fetch middleman vouches' });
    }
  },

  // Check if user has vouched for a middleman
  hasUserVouchedForMiddleman: async (req, res) => {
    try {
      const { middlemanId } = req.params;
      const userId = req.user.userId;

      // Ensure IDs are ObjectIds for proper matching
      const middlemanObjectId = mongoose.Types.ObjectId.isValid(middlemanId) 
        ? new mongoose.Types.ObjectId(middlemanId) 
        : middlemanId;
      const userObjectId = mongoose.Types.ObjectId.isValid(userId) 
        ? new mongoose.Types.ObjectId(userId) 
        : userId;

      const vouch = await MiddlemanVouch.findOne({
        middleman_id: middlemanObjectId,
        given_by_user_id: userObjectId,
        status: 'approved'
      });

      res.status(200).json({
        hasVouched: !!vouch,
        vouch: vouch ? {
          id: vouch._id,
          rating: vouch.rating,
          comment: vouch.comment,
          createdAt: vouch.createdAt
        } : null
      });
    } catch (error) {
      console.error('Error checking user vouch status:', error);
      res.status(500).json({ error: 'Failed to check vouch status' });
    }
  },

  // Delete completed application (admin only)
  deleteApplication: async (req, res) => {
    try {
      const { applicationId } = req.params;
      const adminId = req.user.userId;

      console.log('Deleting application:', applicationId, 'by admin:', adminId);

      const application = await MiddlemanApplication.findById(applicationId);

      if (!application) {
        console.log('Application not found:', applicationId);
        return res.status(404).json({ error: 'Application not found' });
      }

      // Only allow deletion of completed applications
      if (!['approved', 'rejected'].includes(application.status)) {
        console.log('Application status not completed:', application.status);
        return res.status(400).json({ error: 'Only completed applications can be deleted' });
      }

      console.log('Application found, status:', application.status);

      // Delete associated documents from file system
      if (application.documents && application.documents.length > 0) {
        console.log('Deleting associated documents:', application.documents.length);

        for (const docId of application.documents) {
          try {
            console.log('Processing document:', docId);
            const document = await VerificationDocument.findById(docId);
            if (document && document.file_path) {
              console.log('Deleting file:', document.file_path);
              // Delete file from uploads directory
              const filePath = path.join(process.cwd(), document.file_path);
              try {
                await fs.unlink(filePath);
                console.log('File deleted successfully:', filePath);
              } catch (fileError) {
                console.warn(`Failed to delete file ${filePath}:`, fileError.message);
              }

              // Delete document record
              await VerificationDocument.findByIdAndDelete(docId);
              console.log('Document record deleted:', docId);
            } else {
              console.log('Document not found or no file path:', docId);
            }
          } catch (docError) {
            console.warn(`Failed to delete document ${docId}:`, docError.message);
          }
        }
      } else {
        console.log('No documents to delete');
      }

      // Delete the application
      console.log('Deleting application record');
      await MiddlemanApplication.findByIdAndDelete(applicationId);

      console.log('Application deleted successfully');
      res.status(200).json({
        message: 'Application deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting middleman application:', error);
      res.status(500).json({ error: 'Failed to delete application' });
    }
  },

  // Bulk delete completed applications (admin only)
  bulkDeleteApplications: async (req, res) => {
    try {
      const { applicationIds } = req.body;
      const adminId = req.user.userId;

      console.log('Bulk deleting applications:', applicationIds, 'by admin:', adminId);

      if (!applicationIds || !Array.isArray(applicationIds) || applicationIds.length === 0) {
        return res.status(400).json({ error: 'Application IDs array is required' });
      }

      if (applicationIds.length > 50) {
        return res.status(400).json({ error: 'Cannot delete more than 50 applications at once' });
      }

      const results = {
        successful: [],
        failed: []
      };

      for (const applicationId of applicationIds) {
        try {
          console.log('Processing application:', applicationId);

          const application = await MiddlemanApplication.findById(applicationId);

          if (!application) {
            console.log('Application not found:', applicationId);
            results.failed.push({ id: applicationId, error: 'Application not found' });
            continue;
          }

          // Only allow deletion of completed applications
          if (!['approved', 'rejected'].includes(application.status)) {
            console.log('Application status not completed:', application.status);
            results.failed.push({ id: applicationId, error: 'Only completed applications can be deleted' });
            continue;
          }

          // Delete associated documents from file system
          if (application.documents && application.documents.length > 0) {
            console.log('Deleting associated documents for:', applicationId);

            for (const docId of application.documents) {
              try {
                console.log('Processing document:', docId);
                const document = await VerificationDocument.findById(docId);
                if (document && document.file_path) {
                  console.log('Deleting file:', document.file_path);
                  // Delete file from uploads directory
                  const filePath = path.join(process.cwd(), document.file_path);
                  try {
                    await fs.unlink(filePath);
                    console.log('File deleted successfully:', filePath);
                  } catch (fileError) {
                    console.warn(`Failed to delete file ${filePath}:`, fileError.message);
                  }

                  // Delete document record
                  await VerificationDocument.findByIdAndDelete(docId);
                  console.log('Document record deleted:', docId);
                } else {
                  console.log('Document not found or no file path:', docId);
                }
              } catch (docError) {
                console.warn(`Failed to delete document ${docId}:`, docError.message);
              }
            }
          }

          // Delete the application
          console.log('Deleting application record:', applicationId);
          await MiddlemanApplication.findByIdAndDelete(applicationId);

          results.successful.push(applicationId);
          console.log('Application deleted successfully:', applicationId);

        } catch (appError) {
          console.error(`Error deleting application ${applicationId}:`, appError);
          results.failed.push({ id: applicationId, error: appError.message });
        }
      }

      console.log('Bulk delete completed. Successful:', results.successful.length, 'Failed:', results.failed.length);

      res.status(200).json({
        message: `Bulk delete completed. ${results.successful.length} successful, ${results.failed.length} failed`,
        results
      });
    } catch (error) {
      console.error('Error in bulk delete:', error);
      res.status(500).json({ error: 'Failed to process bulk delete' });
    }
  }
};