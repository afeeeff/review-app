// review-app-backend/controllers/authController.js

const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto'); // For generating random tokens
const emailService = require('../services/emailService'); // Import the email service

// Helper function to generate JWT
const generateToken = (id, role, companyId = null, branchId = null) => {
  return jwt.sign(
    { id, role, companyId, branchId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Find user by email (select password explicitly as it's set to select: false in schema)
    const user = await User.findOne({ email }).select('+password');

    // Check if user exists and password matches
    if (user && (await user.matchPassword(password))) {
      // Generate token with role-based payload
      const token = generateToken(user._id, user.role, user.company, user.branch);

      res.json({
        _id: user._id,
        email: user.email,
        role: user.role,
        companyId: user.company, // Send companyId to frontend
        branchId: user.branch,   // Send branchId to frontend
        token: token,
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    console.error('User login error:', error);
    res.status(500).json({ message: 'Server error during login', error: error.message });
  }
};

// @desc    Request password reset OTP
// @route   POST /api/auth/request-password-reset-otp
// @access  Public
exports.requestPasswordResetOTP = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      // For security, send a generic success message even if user not found
      // This prevents enumeration of valid user emails
      return res.status(200).json({ message: 'If an account with that email exists, an OTP has been sent.' });
    }

    // Generate a 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();

    // Set OTP and expiry on the user document
    user.resetPasswordToken = otp;
    user.resetPasswordExpires = Date.now() + 10 * 60 * 1000; // 10 minutes from now
    await user.save();

    // Send OTP to user's email using the generic sendEmail function
    const mailOptions = {
      from: process.env.SENDER_EMAIL,
      to: user.email,
      subject: 'Password Reset OTP for Customer Review App',
      html: `
        <p>Dear ${user.email},</p>
        <p>You have requested a password reset for your account. Please use the following One-Time Password (OTP) to reset your password:</p>
        <h2 style="color: #4CAF50; font-size: 24px;"><b>${otp}</b></h2>
        <p>This OTP is valid for 10 minutes. If you did not request this, please ignore this email.</p>
        <p>Thank you,</p>
        <p>Customer Review App Team</p>
      `,
    };

    await emailService.sendEmail(mailOptions);

    res.status(200).json({ message: 'OTP sent to your email.' });

  } catch (error) {
    console.error('Error requesting password reset OTP:', error);
    res.status(500).json({ message: 'Server error sending OTP.', error: error.message });
  }
};

// @desc    Reset password with OTP
// @route   POST /api/auth/reset-password-with-otp
// @access  Public
exports.resetPasswordWithOTP = async (req, res) => {
  const { email, otp, newPassword } = req.body;

  try {
    const user = await User.findOne({
      email,
      resetPasswordToken: otp,
      resetPasswordExpires: { $gt: Date.now() }, // Check if OTP is not expired
    }).select('+password'); // Select password to update it

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired OTP.' });
    }

    // Set new password and clear OTP fields
    user.password = newPassword; // Mongoose pre-save hook will hash this
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.status(200).json({ message: 'Password reset successfully!' });

  } catch (error) {
    console.error('Error resetting password with OTP:', error);
    res.status(500).json({ message: 'Server error resetting password.', error: error.message });
  }
};
