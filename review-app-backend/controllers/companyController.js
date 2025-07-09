// review-app-backend/controllers/companyController.js

const User = require('../models/User');
const Company = require('../models/Company');
const Branch = require('../models/Branch');
const Review = require('../models/Review');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose'); // Import mongoose for session

// Helper function to generate JWT for newly created users
const generateToken = (id, role, companyId = null, branchId = null) => {
  return jwt.sign(
    { id, role, companyId, branchId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );
};

// --- Branch Management (by Company Admin) ---

// @desc    Create a new Branch and its Branch Admin user under the authenticated Company
// @route   POST /api/company/branches
// @access  Private (Company Admin only)
exports.createBranch = async (req, res) => {
  const { branchName, adminEmail, adminPassword, notificationEmails } = req.body; // Added notificationEmails
  const companyId = req.user.company; // Get company ID from authenticated user's token

  if (!companyId) {
    return res.status(403).json({ message: 'Unauthorized: Company ID not found for this user.' });
  }

  if (!branchName || !adminEmail || !adminPassword) {
    return res.status(400).json({ message: 'Please enter branch name, admin email, and admin password.' });
  }

  try {
    // 1. Verify the company exists (though it should exist if the company admin is logged in)
    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({ message: 'Company not found.' });
    }

    // 2. Check if branch name already exists under this company
    const branchExists = await Branch.findOne({ name: branchName, company: companyId });
    if (branchExists) {
      return res.status(400).json({ message: 'Branch with this name already exists under your company.' });
    }

    // 3. Check if admin email already exists as a user
    const adminUserExists = await User.findOne({ email: adminEmail });
    if (adminUserExists) {
      return res.status(400).json({ message: 'A user with this admin email already exists.' });
    }

    // 4. Create the Branch Admin User first
    const branchAdminUser = await User.create({
      email: adminEmail,
      password: adminPassword, // Password will be hashed by pre-save hook
      role: 'branch_admin',
      company: company._id, // Link to parent company
      // branch field will be set after branch creation
    });

    // 5. Create the Branch, linking it to the company and admin user
    const branch = await Branch.create({
      name: branchName,
      company: company._id,
      branchAdmin: branchAdminUser._id,
      notificationEmails: notificationEmails || [], // Save notification emails
    });

    // 6. Update the branch admin user with the branch ID
    branchAdminUser.branch = branch._id;
    await branchAdminUser.save();

    // Generate token for the newly created branch admin
    const adminToken = generateToken(branchAdminUser._id, branchAdminUser.role, company._id, branch._id);

    res.status(201).json({
      message: 'Branch and Branch Admin created successfully!',
      branch: {
        _id: branch._id,
        name: branch.name,
        company: branch.company,
        notificationEmails: branch.notificationEmails, // Include in response
      },
      branchAdmin: {
        _id: branchAdminUser._id,
        email: branchAdminUser.email,
        token: adminToken,
      },
    });
  } catch (error) {
    console.error('Error creating branch (Company Admin):', error);
    res.status(500).json({ message: 'Server error creating branch.', error: error.message });
  }
};

// @desc    Get all Branches for the authenticated Company
// @route   GET /api/company/branches
// @access  Private (Company Admin only)
exports.getBranches = async (req, res) => {
  const companyId = req.user.company; // Get company ID from authenticated user's token

  if (!companyId) {
    return res.status(403).json({ message: 'Unauthorized: Company ID not found for this user.' });
  }

  try {
    // Populate admin email and notification emails
    const branches = await Branch.find({ company: companyId }).populate('branchAdmin', 'email').select('+notificationEmails');
    res.status(200).json(branches);
  } catch (error) {
    console.error('Error fetching branches (Company Admin):', error);
    res.status(500).json({ message: 'Server error fetching branches.', error: error.message });
  }
};

// @desc    Update a Branch and its Branch Admin user within the authenticated Company
// @route   PUT /api/company/branches/:id
// @access  Private (Company Admin only)
exports.updateBranch = async (req, res) => {
  const { id } = req.params; // Branch ID
  const { branchName, adminEmail, adminPassword, notificationEmails } = req.body; // Added notificationEmails
  const companyId = req.user.company; // Get company ID from authenticated user's token

  if (!companyId) {
    return res.status(403).json({ message: 'Unauthorized: Company ID not found for this user.' });
  }

  try {
    const branch = await Branch.findById(id);

    if (!branch) {
      return res.status(404).json({ message: 'Branch not found.' });
    }

    // Ensure the branch belongs to the authenticated company
    if (branch.company.toString() !== companyId.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this branch.' });
    }

    // Check for duplicate branch name under the same company if changing
    if (branchName && branchName !== branch.name) {
      const existingBranch = await Branch.findOne({ name: branchName, company: companyId });
      if (existingBranch && existingBranch._id.toString() !== id) {
        return res.status(400).json({ message: 'Branch name already in use for this company.' });
      }
      branch.name = branchName;
    }

    // Update Branch Admin details if provided
    const branchAdminUser = await User.findById(branch.branchAdmin).select('+password');
    if (!branchAdminUser) {
        return res.status(404).json({ message: 'Associated branch admin user not found.' });
    }

    if (adminEmail && adminEmail !== branchAdminUser.email) {
        const existingUserWithEmail = await User.findOne({ email: adminEmail });
        if (existingUserWithEmail && existingUserWithEmail._id.toString() !== branchAdminUser._id.toString()) {
            return res.status(400).json({ message: 'Admin email already in use by another user.' });
        }
        branchAdminUser.email = adminEmail;
    }
    if (adminPassword) {
        branchAdminUser.password = adminPassword; // Pre-save hook will hash
    }
    await branchAdminUser.save();

    // Update notification emails
    if (notificationEmails !== undefined) { // Allow setting to empty array
      branch.notificationEmails = notificationEmails;
    }

    await branch.save();

    res.status(200).json({
      message: 'Branch and admin updated successfully!',
      branch: {
        _id: branch._id,
        name: branch.name,
        notificationEmails: branch.notificationEmails, // Include in response
      },
      branchAdmin: {
        _id: branchAdminUser._id,
        email: branchAdminUser.email,
      },
    });
  } catch (error) {
    console.error('Error updating branch (Company Admin):', error);
    res.status(500).json({ message: 'Server error updating branch.', error: error.message });
  }
};

// @desc    Delete a Branch and its associated Clients and Reviews within the authenticated Company
// @route   DELETE /api/company/branches/:id
// @access  Private (Company Admin only)
exports.deleteBranch = async (req, res) => {
  const { id } = req.params; // Branch ID
  const companyId = req.user.company; // Get company ID from authenticated user's token

  if (!companyId) {
    return res.status(403).json({ message: 'Unauthorized: Company ID not found for this user.' });
  }

  try {
    const branch = await Branch.findById(id);

    if (!branch) {
      return res.status(404).json({ message: 'Branch not found.' });
    }

    // Ensure the branch belongs to the authenticated company
    if (branch.company.toString() !== companyId.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this branch.' });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // 1. Delete associated Clients (Users with role 'client' under this branch)
      const clientUsers = await User.find({ branch: branch._id, role: 'client' }).session(session);
      const clientUserIds = clientUsers.map(u => u._id);
      await User.deleteMany({ _id: { $in: clientUserIds } }).session(session);
      console.log(`Deleted ${clientUsers.length} client users for branch ${branch.name}`);

      // 2. Delete associated Reviews
      await Review.deleteMany({ branch: branch._id }).session(session);
      console.log(`Deleted reviews for branch ${branch.name}`);

      // 3. Delete Branch Admin User
      if (branch.branchAdmin) {
        await User.findByIdAndDelete(branch.branchAdmin).session(session);
        console.log(`Deleted branch admin user ${branch.branchAdmin}`);
      }

      // 4. Delete the Branch itself
      await branch.deleteOne({ session });
      console.log(`Deleted branch ${branch.name}`);

      await session.commitTransaction();
      session.endSession();

      res.status(200).json({ message: 'Branch and all associated data deleted successfully!' });
    } catch (transactionError) {
      await session.abortTransaction();
      session.endSession();
      console.error('Transaction failed during branch deletion (Company Admin):', transactionError);
      res.status(500).json({ message: 'Failed to delete branch due to a transaction error.', error: transactionError.message });
    }
  } catch (error) {
    console.error('Error deleting branch (Company Admin):', error);
    res.status(500).json({ message: 'Server error deleting branch.', error: error.message });
  }
};


// --- Client Management (by Company Admin) ---

// @desc    Create a new Client user under a specific Branch or directly under the authenticated Company
// @route   POST /api/company/branches/:branchId/clients OR /api/company/clients
// @access  Private (Company Admin only)
exports.createClient = async (req, res) => {
  const { branchId } = req.params; // Optional branchId
  const { clientEmail, clientPassword, customerName, customerMobile, notificationEmails } = req.body; // Added notificationEmails
  const companyId = req.user.company; // Get company ID from authenticated user's token

  if (!companyId) {
    return res.status(403).json({ message: 'Unauthorized: Company ID not found for this user.' });
  }

  if (!clientEmail || !clientPassword || !customerName || !customerMobile) {
    return res.status(400).json({ message: 'Please enter client email, password, customer name, and mobile.' });
  }

  try {
    let parentBranchId = null;

    if (branchId) {
      // If branchId is provided, ensure it belongs to the authenticated company
      const branch = await Branch.findById(branchId);
      if (!branch) {
        return res.status(404).json({ message: 'Branch not found.' });
      }
      if (branch.company.toString() !== companyId.toString()) {
        return res.status(403).json({ message: 'Not authorized to create client for this branch.' });
      }
      parentBranchId = branch._id;
    }

    // Check if client email already exists as a user
    const clientUserExists = await User.findOne({ email: clientEmail });
    if (clientUserExists) {
      return res.status(400).json({ message: 'A user with this client email already exists.' });
    }

    // Create the Client User
    const clientUser = await User.create({
      email: clientEmail,
      password: clientPassword,
      role: 'client',
      company: companyId, // Client is always linked to the company admin's company
      branch: parentBranchId, // Will be ObjectId or null
      customerName: customerName,
      customerMobile: customerMobile,
      notificationEmails: notificationEmails || [], // Save notification emails
    });

    // Generate token for the newly created client
    const clientToken = generateToken(clientUser._id, clientUser.role, clientUser.company, clientUser.branch);

    res.status(201).json({
      message: 'Client user created successfully!',
      client: {
        _id: clientUser._id,
        email: clientUser.email,
        company: clientUser.company,
        branch: clientUser.branch,
        customerName: clientUser.customerName,
        customerMobile: clientUser.customerMobile,
        notificationEmails: clientUser.notificationEmails, // Include in response
        token: clientToken,
      },
    });
  } catch (error) {
    console.error('Error creating client (Company Admin):', error);
    res.status(500).json({ message: 'Server error creating client.', error: error.message });
  }
};

// @desc    Get all Clients for the authenticated Company (optionally filtered by branch)
// @route   GET /api/company/clients OR /api/company/branches/:branchId/clients
// @access  Private (Company Admin only)
exports.getClients = async (req, res) => {
  const { branchId } = req.params; // Optional branchId
  const companyId = req.user.company; // Get company ID from authenticated user's token

  if (!companyId) {
    return res.status(403).json({ message: 'Unauthorized: Company ID not found for this user.' });
  }

  let query = { role: 'client', company: companyId };

  if (branchId) {
    // Ensure the branch belongs to the authenticated company if branchId is provided
    const branch = await Branch.findById(branchId);
    if (!branch || branch.company.toString() !== companyId.toString()) {
      return res.status(403).json({ message: 'Not authorized to view clients for this branch.' });
    }
    query.branch = branchId;
  } else {
    // If no branchId is provided, fetch clients directly under the company and those under its branches
    // This is for the company-level view of all clients
    const companyBranches = await Branch.find({ company: companyId }, '_id');
    const branchIds = companyBranches.map(branch => branch._id);
    query.$or = [
      { branch: null, company: companyId }, // Clients directly under the company
      { branch: { $in: branchIds }, company: companyId } // Clients under any of its branches
    ];
    delete query.branch; // Remove individual branch filter if using $or
    delete query.company; // Remove individual company filter if using $or
  }


  try {
    const clients = await User.find(query)
      .populate('company', 'name')
      .populate('branch', 'name')
      .select('+notificationEmails'); // Select notification emails
    res.status(200).json(clients);
  } catch (error) {
    console.error('Error fetching clients (Company Admin):', error);
    res.status(500).json({ message: 'Server error fetching clients.', error: error.message });
  }
};

// @desc    Update a Client user within the authenticated Company
// @route   PUT /api/company/clients/:id
// @access  Private (Company Admin only)
exports.updateClient = async (req, res) => {
  const { id } = req.params; // Client User ID
  const { clientEmail, clientPassword, customerName, customerMobile, branchId, notificationEmails } = req.body; // Added notificationEmails
  const companyId = req.user.company; // Get company ID from authenticated user's token

  if (!companyId) {
    return res.status(403).json({ message: 'Unauthorized: Company ID not found for this user.' });
  }

  try {
    const clientUser = await User.findById(id).select('+password');

    if (!clientUser || clientUser.role !== 'client') {
      return res.status(404).json({ message: 'Client user not found.' });
    }

    // Ensure the client belongs to the authenticated company
    if (clientUser.company.toString() !== companyId.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this client.' });
    }

    if (clientEmail && clientEmail !== clientUser.email) {
        const existingUserWithEmail = await User.findOne({ email: clientEmail });
        if (existingUserWithEmail && existingUserWithEmail._id.toString() !== id) {
            return res.status(400).json({ message: 'Email already in use by another user.' });
        }
        clientUser.email = clientEmail;
    }
    if (clientPassword) {
        clientUser.password = clientPassword; // Pre-save hook will hash
    }
    if (customerName) clientUser.customerName = customerName;
    if (customerMobile) clientUser.customerMobile = customerMobile;

    // Allow company admin to reassign client to a different branch within their company
    if (branchId !== undefined) { // Check if branchId is explicitly provided (can be null)
        if (branchId) {
            const newBranch = await Branch.findById(branchId);
            if (!newBranch) return res.status(404).json({ message: 'New branch not found.' });
            // Ensure the new branch belongs to the same company
            if (newBranch.company.toString() !== companyId.toString()) {
                return res.status(403).json({ message: 'Cannot assign client to a branch outside your company.' });
            }
            clientUser.branch = newBranch._id;
        } else {
            clientUser.branch = null; // Assign directly to company (no branch)
        }
    }

    // Update notification emails
    if (notificationEmails !== undefined) { // Allow setting to empty array
      clientUser.notificationEmails = notificationEmails;
    }

    await clientUser.save();

    res.status(200).json({
      message: 'Client user updated successfully!',
      client: {
        _id: clientUser._id,
        email: clientUser.email,
        company: clientUser.company,
        branch: clientUser.branch,
        customerName: clientUser.customerName,
        customerMobile: clientUser.customerMobile,
        notificationEmails: clientUser.notificationEmails, // Include in response
      },
    });
  } catch (error) {
    console.error('Error updating client (Company Admin):', error);
    res.status(500).json({ message: 'Server error updating client.', error: error.message });
  }
};

// @desc    Delete a Client user and their associated Reviews within the authenticated Company
// @route   DELETE /api/company/clients/:id
// @access  Private (Company Admin only)
exports.deleteClient = async (req, res) => {
  const { id } = req.params; // Client User ID
  const companyId = req.user.company; // Get company ID from authenticated user's token

  if (!companyId) {
    return res.status(403).json({ message: 'Unauthorized: Company ID not found for this user.' });
  }

  try {
    const clientUser = await User.findById(id);

    if (!clientUser || clientUser.role !== 'client') {
      return res.status(404).json({ message: 'Client user not found.' });
    }

    // Ensure the client belongs to the authenticated company
    if (clientUser.company.toString() !== companyId.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this client.' });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // 1. Delete associated Reviews
      await Review.deleteMany({ client: clientUser._id }).session(session);
      console.log(`Deleted reviews for client ${clientUser.email}`);

      // 2. Delete the Client User
      await clientUser.deleteOne({ session });
      console.log(`Deleted client user ${clientUser.email}`);

      await session.commitTransaction();
      session.endSession();

      res.status(200).json({ message: 'Client user and associated reviews deleted successfully!' });
    } catch (transactionError) {
      await session.abortTransaction();
      session.endSession();
      console.error('Transaction failed during client deletion (Company Admin):', transactionError);
      res.status(500).json({ message: 'Failed to delete client due to a transaction error.', error: transactionError.message });
    }
  } catch (error) {
    console.error('Error deleting client (Company Admin):', error);
    res.status(500).json({ message: 'Server error deleting client.', error: error.message });
  }
};


// --- Reviews Viewing (by Company Admin) ---

// @desc    Get all Reviews for the authenticated Company (optionally filtered by branch or date range)
// @route   GET /api/company/reviews
// @access  Private (Company Admin only)
exports.getCompanyReviews = async (req, res) => {
  const companyId = req.user.company; // Get company ID from authenticated user's token
  const { branchId, clientId, startDate, endDate } = req.query; // Added clientId

  if (!companyId) {
    return res.status(403).json({ message: 'Unauthorized: Company ID not found for this user.' });
  }

  let query = { company: companyId }; // Base query: only reviews for this company

  if (branchId) {
    // Ensure the requested branchId belongs to the authenticated company
    const branch = await Branch.findById(branchId);
    if (!branch || branch.company.toString() !== companyId.toString()) {
      return res.status(403).json({ message: 'Not authorized to view reviews for this branch.' });
    }
    query.branch = branchId;
  }

  if (clientId) { // Apply client filter if provided
    query.client = clientId;
  }

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) {
      // Convert startDate (YYYY-MM-DD) to the beginning of the day in UTC
      const startOfDay = new Date(startDate);
      startOfDay.setUTCHours(0, 0, 0, 0);
      query.createdAt.$gte = startOfDay;
    }
    if (endDate) {
      // Convert endDate (YYYY-MM-DD) to the end of the day in UTC
      // Add one day and then subtract one millisecond to get to the end of the day
      const endOfDay = new Date(endDate);
      endOfDay.setUTCHours(23, 59, 59, 999);
      query.createdAt.$lte = endOfDay;
    }
  }

  try {
    const reviews = await Review.find(query)
      .populate('client', 'email customerName customerMobile') // Populate client email, name, mobile
      .populate('company', 'name')
      .populate('branch', 'name')
      .sort({ createdAt: -1 }); // Sort by newest first

    res.status(200).json(reviews);
  } catch (error) {
    console.error('Error fetching company reviews:', error);
    res.status(500).json({ message: 'Server error fetching reviews.', error: error.message });
  }
};
