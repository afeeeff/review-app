// review-app-backend/server.js

// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer'); // Import multer to check for its errors

const app = express();
const PORT = process.env.PORT || 5000; // Default to port 5000 if not specified in .env

// --- Import Routes ---
const authRoutes = require('./routes/authRoutes');
const reviewRoutes = require('./routes/reviewRoutes');

// --- Middleware ---
// Enable CORS for all origins.
app.use(cors());
// Parse JSON request bodies (for non-file data)
app.use(express.json());

// --- MongoDB Connection ---
const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/review_app_db';

mongoose.connect(mongoURI)
  .then(() => console.log('MongoDB connected successfully!'))
  .catch(err => console.error('MongoDB connection error:', err.message));

// --- Basic Test Route ---
app.get('/', (req, res) => {
  res.send('Review App Backend is running!');
});

// --- Use API Routes ---
app.use('/api/client', authRoutes);
app.use('/api/reviews', reviewRoutes);

// --- Multer Error Handling Middleware ---
// This middleware must be placed AFTER all routes that use multer
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    // A Multer error occurred when uploading.
    console.error('Multer Error:', err.message);
    console.error('Multer Error Code:', err.code);
    return res.status(400).json({ message: `File upload error: ${err.message}` });
  } else if (err) {
    // An unknown error occurred when uploading.
    console.error('General File Upload Error:');
    console.error('Message:', err.message);
    console.error('Stack:', err.stack);
    // Log specific properties if available (e.g., from Google Cloud Storage errors)
    if (err.code) console.error('Error Code:', err.code);
    if (err.errors) console.error('Validation Errors:', err.errors);
    if (err.details) console.error('Error Details:', err.details);

    return res.status(500).json({ message: `An unexpected error occurred during file upload: ${err.message}` });
  }
  next(); // Pass to the next middleware if no error
});


// --- Start the Server ---
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
