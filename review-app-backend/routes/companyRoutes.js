// review-app-backend/routes/companyRoutes.js

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware'); // Import protect middleware
const companyController = require('../controllers/companyController'); // Import company controller

// Middleware to ensure only Company Admin can access these routes
const authorizeCompanyAdmin = (req, res, next) => {
  // req.user is populated by the 'protect' middleware
  if (req.user && req.user.role === 'company_admin') {
    next(); // Company Admin is authorized, proceed
  } else {
    res.status(403).json({ message: 'Not authorized as a company administrator' });
  }
};

// All routes below will use 'protect' and 'authorizeCompanyAdmin' middleware
// This ensures only authenticated company administrators can hit these endpoints

// --- Branch Management Routes (by Company Admin) ---
router.route('/branches')
  .post(protect, authorizeCompanyAdmin, companyController.createBranch) // Create Branch
  .get(protect, authorizeCompanyAdmin, companyController.getBranches);   // Get All Branches for their company

router.route('/branches/:id')
  .put(protect, authorizeCompanyAdmin, companyController.updateBranch)   // Update Branch
  .delete(protect, authorizeCompanyAdmin, companyController.deleteBranch); // Delete Branch

// --- Client Management Routes (by Company Admin) ---
// Create Client under a specific branch or directly under the company
router.post('/branches/:branchId/clients', protect, authorizeCompanyAdmin, companyController.createClient);
router.post('/clients', protect, authorizeCompanyAdmin, companyController.createClient); // For clients directly under the company

// Get Clients for a specific branch or all clients under the company
router.get('/branches/:branchId/clients', protect, authorizeCompanyAdmin, companyController.getClients);
router.get('/clients', protect, authorizeCompanyAdmin, companyController.getClients); // Get all clients for their company

router.route('/clients/:id')
  .put(protect, authorizeCompanyAdmin, companyController.updateClient)   // Update Client
  .delete(protect, authorizeCompanyAdmin, companyController.deleteClient); // Delete Client

// --- Reviews Viewing Routes (Company Admin can see company-specific reviews) ---
router.get('/reviews', protect, authorizeCompanyAdmin, companyController.getCompanyReviews); // Get reviews with optional filters

module.exports = router;
