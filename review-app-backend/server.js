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
const superuserRoutes = require('./routes/superuserRoutes');
const companyRoutes = require('./routes/companyRoutes');
const branchRoutes = require('./routes/branchRoutes'); // NEW: Import branch routes

// --- Middleware ---
// Enable CORS for all origins. In a production app, you might restrict this to your frontend URL.
// For development, allowing all origins is fine.
const allowedOrigins = [
      
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:5175',
      'http://localhost:5176',
       // Your local Vite development server (if using Vite default)
      'https://branch-frontend.onrender.com',
      'https://superuser-frontend.onrender.com',
      'https://company-frontend-tdh3.onrender.com',
      'https://review-app-frontend.onrender.com',
      'https://superuser.instantreviews.in',
      'https://companyadmin.instantreviews.in',
      'https://branchadmin.instantreviews.in',
      'https://clientadmin.instantreviews.in'

       // <--- REPLACE THIS WITH YOUR ACTUAL DEPLOYED FRONTEND URL
      // Add any other specific frontend origins if you have them (e.g., a staging frontend)
    ];
app.use(cors({
      origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        // Or if the origin is in our allowed list
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
          callback(null, true);
        } else {
          // Deny access if the origin is not allowed
          const msg = `The CORS policy for this site does not allow access from the specified Origin: ${origin}`;
          console.error(msg); // Log the blocked origin for debugging
          callback(new Error(msg), false);
        }
      },
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE', // Specify allowed HTTP methods
      credentials: true, // Allow sending cookies and authorization headers (important for JWT)
      optionsSuccessStatus: 204, // Respond with 204 for preflight OPTIONS requests
    }));

// Parse JSON request bodies
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
app.use('/api/auth', authRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/superuser', superuserRoutes);
app.use('/api/company', companyRoutes);
app.use('/api/branch', branchRoutes); // NEW: Use branch routes

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
