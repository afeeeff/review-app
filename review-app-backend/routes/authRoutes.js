// review-app-backend/routes/authRoutes.js

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs'); // For password hashing

// Dummy client data for demonstration. In a real app, this would come from MongoDB.
const dummyClients = [
  // IMPORTANT: Replace the 'passwordHash' below with the EXACT hash you generated for '123'
  { id: 'client123', username: 'client1', passwordHash: '$2b$10$IZd1MU3a/JRTM.xabuV3Ae5Ea4RGYhAsp5yBmm5dsqzCEA1EWym.y' },
  { id: 'client456', username: 'client2', passwordHash: '$2a$10$Q7w5W1v.H6F.o.N.O.E.O.u.B.m.K.L.P.S.T.U.V.W.X.Y.Z.0.1.2.3.4.5.6.7.8.9' }, // Hashed 'password123'
];

// Helper function to generate JWT
const generateToken = (id) => {
  return jwt.sign({ clientId: id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

// Client Login Route
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  // Find dummy client (in real app, query MongoDB)
  const client = dummyClients.find(c => c.username === username);

  if (client) {
    // Compare provided password with hashed password
    const isMatch = await bcrypt.compare(password, client.passwordHash);

    if (isMatch) {
      // If credentials are valid, generate a token
      const token = generateToken(client.id);
      res.status(200).json({
        message: 'Login successful',
        clientId: client.id,
        token: token, // Send the JWT to the frontend
      });
    } else {
      res.status(401).json({ message: 'Invalid credentials' });
    }
  } else {
    res.status(401).json({ message: 'Invalid credentials' });
  }
});

module.exports = router;
