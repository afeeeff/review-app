// review-app-backend/routes/authRoutes.js

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User'); // Import the new User model
const bcrypt = require('bcryptjs');
const authController = require('../controllers/authController'); // Import authController

// Helper function to generate JWT
// Now includes role, companyId, and branchId in the token payload
const generateToken = (id, role, companyId = null, branchId = null) => {
  return jwt.sign(
    { id, role, companyId, branchId }, // Include role, companyId, branchId in payload
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );
};

// @desc    Register a new user (for initial superuser setup or future admin creation)
// @route   POST /api/auth/register
// @access  Public (for initial superuser, then restricted by superuser/company/branch admin)
router.post('/register', async (req, res) => {
  const { email, password, role, company, branch } = req.body;

  try {
    // Check if user already exists
    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create new user
    const user = await User.create({
      email,
      password, // Mongoose pre-save hook will hash this
      role,
      company: company || null, // Will be ObjectId or null
      branch: branch || null   // Will be ObjectId or null
    });

    if (user) {
      // Generate token with new role-based payload
      const token = generateToken(user._id, user.role, user.company, user.branch);

      res.status(201).json({
        message: 'User registered successfully',
        _id: user._id,
        email: user.email,
        role: user.role,
        companyId: user.company,
        branchId: user.branch,
        token: token,
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    console.error('User registration error:', error);
    res.status(500).json({ message: 'Server error during registration', error: error.message });
  }
});


// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
router.post('/login', authController.login); // Use the controller function

// @desc    Request password reset OTP
// @route   POST /api/auth/request-password-reset-otp
// @access  Public
router.post('/request-password-reset-otp', authController.requestPasswordResetOTP);

// @desc    Reset password with OTP
// @route   POST /api/auth/reset-password-with-otp
// @access  Public
router.post('/reset-password-with-otp', authController.resetPasswordWithOTP);


module.exports = router;
