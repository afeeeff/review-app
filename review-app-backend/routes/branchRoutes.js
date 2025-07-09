// review-app-backend/routes/branchRoutes.js

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware'); // Import protect middleware
const branchController = require('../controllers/branchController'); // Import branch controller

// Middleware to ensure only Branch Admin can access these routes
const authorizeBranchAdmin = (req, res, next) => {
  // req.user is populated by the 'protect' middleware
  if (req.user && req.user.role === 'branch_admin') {
    next(); // Branch Admin is authorized, proceed
  } else {
    res.status(403).json({ message: 'Not authorized as a branch administrator' });
  }
};

// All routes below will use 'protect' and 'authorizeBranchAdmin' middleware
// This ensures only authenticated branch administrators can hit these endpoints

// --- Client Management Routes (by Branch Admin) ---
router.route('/clients')
  .post(protect, authorizeBranchAdmin, branchController.createClient) // Create Client
  .get(protect, authorizeBranchAdmin, branchController.getClients);   // Get All Clients for their branch

router.route('/clients/:id')
  .put(protect, authorizeBranchAdmin, branchController.updateClient)   // Update Client
  .delete(protect, authorizeBranchAdmin, branchController.deleteClient); // Delete Client

// --- Reviews Viewing Routes (Branch Admin can see branch-specific reviews) ---
router.get('/reviews', protect, authorizeBranchAdmin, branchController.getBranchReviews); // Get reviews with optional filters

module.exports = router;
