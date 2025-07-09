// review-app-backend/models/Review.js

const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  // Changed from clientId (string) to client (ObjectId) referencing the User model
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Reference to the new User model
    required: true,
  },
  // NEW: Reference to the Company this review belongs to
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
  },
  // NEW: Reference to the Branch this review belongs to
  branch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: true,
  },
  customerName: {
    type: String,
    required: true,
  },
  customerMobile: {
    type: String,
    required: true,
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 10,
  },
  voiceData: { // URL to the audio file in GCS
    type: String,
    default: null,
  },
  textReview: {
    type: String,
    default: null,
  },
  transcribedText: { // Field for transcribed audio (original language or already translated)
    type: String,
    default: null,
  },
  // REMOVED: translatedText field as per user request.
  // All relevant text (original or translated) will be stored in transcribedText.
  invoiceFileUrl: { // URL to the uploaded invoice file in GCS
    type: String,
    default: null,
  },
  invoiceData: { // Structured data extracted from the invoice
    jobCardNumber: { type: String, default: null },
    invoiceNumber: { type: String, default: null },
    invoiceDate: { type: String, default: null },
    vin: { type: String, default: null },
    customerNameFromInvoice: { type: String, default: null },
    customerMobileFromInvoice: { type: String, default: null },
  },
  feedbackType: { // 'positive', 'neutral', 'negative'
    type: String,
    enum: ['positive', 'neutral', 'negative'],
    required: true,
  },
}, {
  timestamps: true, // Adds createdAt and updatedAt fields
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
