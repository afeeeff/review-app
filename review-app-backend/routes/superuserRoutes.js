// review-app-backend/routes/superuserRoutes.js

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware'); // Import protect middleware
const superuserController = require('../controllers/superuserController'); // Import superuser controller

// Middleware to ensure only Superuser can access these routes
// This is an additional layer of security, though protect middleware already checks role in req.user
const authorizeSuperuser = (req, res, next) => {
  if (req.user && req.user.role === 'superuser') {
    next(); // Superuser is authorized, proceed
  } else {
    res.status(403).json({ message: 'Not authorized as a superuser' });
  }
};

// All routes below will use 'protect' and 'authorizeSuperuser' middleware
// This ensures only authenticated superusers can hit these endpoints

// --- Company Management Routes ---
router.route('/companies')
  .post(protect, authorizeSuperuser, superuserController.createCompany) // Create Company
  .get(protect, authorizeSuperuser, superuserController.getAllCompanies); // Get All Companies

router.route('/companies/:id')
  .put(protect, authorizeSuperuser, superuserController.updateCompany) // Update Company
  .delete(protect, authorizeSuperuser, superuserController.deleteCompany); // Delete Company

// --- Branch Management Routes ---
// Create Branch under a specific company
router.post('/companies/:companyId/branches', protect, authorizeSuperuser, superuserController.createBranch);
// Get Branches for a specific company
router.get('/companies/:companyId/branches', protect, authorizeSuperuser, superuserController.getBranchesByCompany);

router.route('/branches/:id')
  .put(protect, authorizeSuperuser, superuserController.updateBranch) // Update Branch
  .delete(protect, authorizeSuperuser, superuserController.deleteBranch); // Delete Branch

// --- Client Management Routes ---
// Create Client under a specific branch or company
router.post('/branches/:branchId/clients', protect, authorizeSuperuser, superuserController.createClient);
router.post('/companies/:companyId/clients', protect, authorizeSuperuser, superuserController.createClient); // Alternative for clients directly under company

// Get Clients for a specific branch or company
router.get('/branches/:branchId/clients', protect, authorizeSuperuser, superuserController.getClients);
router.get('/companies/:companyId/clients', protect, authorizeSuperuser, superuserController.getClients); // Alternative for clients directly under company
router.get('/clients', protect, authorizeSuperuser, superuserController.getClients); // Get all clients (if no company/branch specified)

router.route('/clients/:id')
  .put(protect, authorizeSuperuser, superuserController.updateClient) // Update Client
  .delete(protect, authorizeSuperuser, superuserController.deleteClient); // Delete Client

// --- Reviews Viewing Routes (Superuser can see all) ---
router.get('/reviews', protect, authorizeSuperuser, superuserController.getAllReviews); // Get all reviews with optional filters

module.exports = router;
