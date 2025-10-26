import mongoose from 'mongoose';

const verificationDocumentSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  document_type: {
    type: String,
    enum: ['id_card', 'passport', 'driver_license', 'proof_of_address', 'social_media', 'other'],
    required: true
  },
  filename: {
    type: String,
    required: true
  },
  original_filename: {
    type: String,
    required: true
  },
  file_path: {
    type: String,
    required: true
  },
  mime_type: {
    type: String,
    required: true
  },
  file_size: {
    type: Number,
    required: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: 200
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  reviewed_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  review_notes: {
    type: String,
    trim: true
  },
  reviewed_at: Date,
  is_deleted: {
    type: Boolean,
    default: false
  },
  deleted_at: Date
}, {
  timestamps: true
});

// Add indexes for better query performance
verificationDocumentSchema.index({ user_id: 1, status: 1 });
verificationDocumentSchema.index({ document_type: 1 });

export const VerificationDocument = mongoose.model('VerificationDocument', verificationDocumentSchema);