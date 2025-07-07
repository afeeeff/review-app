// review-app-backend/models/Review.js

const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  clientId: {
    type: String,
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
  transcribedText: { // New field for transcribed audio
    type: String,
    default: null,
  },
  // New fields for invoice data
  invoiceFileUrl: { // URL to the uploaded invoice file in GCS
    type: String,
    default: null,
  },
  invoiceData: { // Structured data extracted from the invoice
    jobCardNumber: { type: String, default: null },
    invoiceNumber: { type: String, default: null },
    invoiceDate: { type: String, default: null },
    vin: { type: String, default: null },
    customerNameFromInvoice: { type: String, default: null }, // Name extracted from delivery address
    customerMobileFromInvoice: { type: String, default: null }, // Mobile extracted from delivery address
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
