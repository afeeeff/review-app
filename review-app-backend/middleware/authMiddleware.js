// review-app-backend/middleware/authMiddleware.js

const jwt = require('jsonwebtoken');
const User = require('../models/User'); // Import the new User model

// Middleware to verify JWT token and attach user details to request
const protect = async (req, res, next) => {
  let token;

  // Check if Authorization header exists and starts with 'Bearer'
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Find the user by ID from the decoded token payload
      // Select '-password' to exclude the hashed password from the returned user object
      const user = await User.findById(decoded.id).select('-password');

      if (!user) {
        return res.status(401).json({ message: 'Not authorized, user not found' });
      }

      // Attach the user object (including role, company, branch) to the request
      // This will be accessible as req.user in subsequent controllers
      req.user = user;

      next(); // Proceed to the next middleware/controller
    } catch (error) {
      console.error('JWT Verification Error:', error.message);
      // Handle different JWT errors
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Not authorized, token expired' });
      }
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

module.exports = { protect };
