// review-app-backend/routes/reviewRoutes.js

const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const upload = require('../config/multerConfig'); // Import the multer configuration
const { protect } = require('../middleware/authMiddleware'); // Import the protect middleware

// Route for processing invoice upload and extracting data - PROTECTED
// Use upload.single('invoiceFile') middleware to handle a single invoice file upload
// 'invoiceFile' must match the field name in the FormData from the frontend
router.post('/process-invoice', protect, upload.single('invoiceFile'), reviewController.processInvoice);

// Route for submitting a new review - PROTECTED
// This route now expects invoice data in the body, and voice audio as a file (optional)
router.post('/submit', protect, upload.single('voiceAudio'), reviewController.submitReview);

// Route for fetching reviews for a specific client - PROTECTED
router.get('/:clientId', protect, reviewController.getClientReviews);

module.exports = router;
