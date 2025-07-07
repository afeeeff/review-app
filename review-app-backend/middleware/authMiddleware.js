// review-app-backend/middleware/authMiddleware.js

const jwt = require('jsonwebtoken');

// Middleware to verify JWT token
const protect = (req, res, next) => {
  let token;

  // Check if Authorization header exists and starts with 'Bearer'
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Attach clientId from token to the request object
      // This clientId will be used in controllers to identify the client
      req.clientId = decoded.clientId;

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
