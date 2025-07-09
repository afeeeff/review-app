// review-app-backend/controllers/superuserController.js

const User = require('../models/User');
const Company = require('../models/Company');
const Branch = require('../models/Branch');
const Review = require('../models/Review'); // To fetch reviews
const jwt = require('jsonwebtoken'); // For generating tokens for new users
const mongoose = require('mongoose'); // Import mongoose for session

// Helper function to generate JWT for newly created users
const generateToken = (id, role, companyId = null, branchId = null) => {
  return jwt.sign(
    { id, role, companyId, branchId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );
};

// --- Company Management ---

// @desc    Create a new Company and its Company Admin user
// @route   POST /api/superuser/companies
// @access  Private (Superuser only)
exports.createCompany = async (req, res) => {
  const { companyName, adminEmail, adminPassword, notificationEmails } = req.body; // Added notificationEmails

  if (!companyName || !adminEmail || !adminPassword) {
    return res.status(400).json({ message: 'Please enter company name, admin email, and admin password.' });
  }

  try {
    // 1. Check if company already exists
    const companyExists = await Company.findOne({ name: companyName });
    if (companyExists) {
      return res.status(400).json({ message: 'Company with this name already exists.' });
    }

    // 2. Check if admin email already exists as a user
    const adminUserExists = await User.findOne({ email: adminEmail });
    if (adminUserExists) {
      return res.status(400).json({ message: 'A user with this admin email already exists.' });
    }

    // 3. Create the Company Admin User first
    const companyAdminUser = await User.create({
      email: adminEmail,
      password: adminPassword, // Password will be hashed by pre-save hook
      role: 'company_admin',
      // company field will be set after company creation
    });

    // 4. Create the Company, linking it to the newly created admin user
    const company = await Company.create({
      name: companyName,
      companyAdmin: companyAdminUser._id, // Link to the admin user
      notificationEmails: notificationEmails || [], // Save notification emails
    });

    // 5. Update the company admin user with the company ID
    companyAdminUser.company = company._id;
    await companyAdminUser.save(); // Save the updated user

    // Generate token for the newly created company admin
    const adminToken = generateToken(companyAdminUser._id, companyAdminUser.role, company._id);

    res.status(201).json({
      message: 'Company and Company Admin created successfully!',
      company: {
        _id: company._id,
        name: company.name,
        notificationEmails: company.notificationEmails, // Include in response
      },
      companyAdmin: {
        _id: companyAdminUser._id,
        email: companyAdminUser.email,
        token: adminToken, // Provide token for the new admin for potential immediate login
      },
    });
  } catch (error) {
    console.error('Error creating company:', error);
    res.status(500).json({ message: 'Server error creating company.', error: error.message });
  }
};

// @desc    Get all Companies
// @route   GET /api/superuser/companies
// @access  Private (Superuser only)
exports.getAllCompanies = async (req, res) => {
  try {
    // Populate admin email and notification emails
    const companies = await Company.find().populate('companyAdmin', 'email').select('+notificationEmails');
    res.status(200).json(companies);
  } catch (error) {
    console.error('Error fetching companies:', error);
    res.status(500).json({ message: 'Server error fetching companies.', error: error.message });
  }
};

// @desc    Update a Company and its Company Admin user
// @route   PUT /api/superuser/companies/:id
// @access  Private (Superuser only)
exports.updateCompany = async (req, res) => {
  const { id } = req.params;
  const { companyName, adminEmail, adminPassword, notificationEmails } = req.body; // Added notificationEmails

  try {
    const company = await Company.findById(id);

    if (!company) {
      return res.status(404).json({ message: 'Company not found.' });
    }

    // Check for duplicate company name if changing
    if (companyName && companyName !== company.name) {
      const existingCompany = await Company.findOne({ name: companyName });
      if (existingCompany && existingCompany._id.toString() !== id) {
        return res.status(400).json({ message: 'Company name already in use.' });
      }
      company.name = companyName;
    }

    // Update Company Admin details if provided
    const companyAdminUser = await User.findById(company.companyAdmin).select('+password'); // Select password to potentially re-hash
    if (!companyAdminUser) {
        return res.status(404).json({ message: 'Associated company admin user not found.' });
    }

    if (adminEmail && adminEmail !== companyAdminUser.email) {
        const existingUserWithEmail = await User.findOne({ email: adminEmail });
        if (existingUserWithEmail && existingUserWithEmail._id.toString() !== companyAdminUser._id.toString()) {
            return res.status(400).json({ message: 'Admin email already in use by another user.' });
        }
        companyAdminUser.email = adminEmail;
    }
    if (adminPassword) {
        companyAdminUser.password = adminPassword; // Pre-save hook will hash
    }
    await companyAdminUser.save(); // Save updated admin user

    // Update notification emails
    if (notificationEmails !== undefined) { // Allow setting to empty array
      company.notificationEmails = notificationEmails;
    }

    await company.save(); // Save updated company

    res.status(200).json({
      message: 'Company and admin updated successfully!',
      company: {
        _id: company._id,
        name: company.name,
        notificationEmails: company.notificationEmails, // Include in response
      },
      companyAdmin: {
        _id: companyAdminUser._id,
        email: companyAdminUser.email,
      },
    });
  } catch (error) {
    console.error('Error updating company:', error);
    res.status(500).json({ message: 'Server error updating company.', error: error.message });
  }
};

// @desc    Delete a Company and its associated Branches, Clients, and Reviews
// @route   DELETE /api/superuser/companies/:id
// @access  Private (Superuser only)
exports.deleteCompany = async (req, res) => {
  const { id } = req.params;

  try {
    const company = await Company.findById(id);

    if (!company) {
      return res.status(404).json({ message: 'Company not found.' });
    }

    // Start a session for transaction (recommended for complex deletions)
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // 1. Delete associated Branches
      const branches = await Branch.find({ company: company._id }).session(session);
      const branchIds = branches.map(b => b._id);
      await Branch.deleteMany({ company: company._id }).session(session);
      console.log(`Deleted ${branches.length} branches for company ${company.name}`);

      // 2. Delete associated Clients (Users with role 'client' under these branches/company)
      // Find clients directly associated with this company OR its branches
      const clientUsers = await User.find({
        $or: [
          { company: company._id, role: 'client' }, // Clients directly under company (if applicable)
          { branch: { $in: branchIds }, role: 'client' } // Clients under its branches
        ]
      }).session(session);
      const clientUserIds = clientUsers.map(u => u._id);
      await User.deleteMany({ _id: { $in: clientUserIds } }).session(session);
      console.log(`Deleted ${clientUsers.length} client users for company ${company.name}`);

      // 3. Delete associated Reviews
      await Review.deleteMany({ company: company._id }).session(session);
      console.log(`Deleted reviews for company ${company.name}`);

      // 4. Delete Company Admin User
      if (company.companyAdmin) {
        await User.findByIdAndDelete(company.companyAdmin).session(session);
        console.log(`Deleted company admin user ${company.companyAdmin}`);
      }

      // 5. Delete the Company itself
      await company.deleteOne({ session });
      console.log(`Deleted company ${company.name}`);

      await session.commitTransaction();
      session.endSession();

      res.status(200).json({ message: 'Company and all associated data deleted successfully!' });
    } catch (transactionError) {
      await session.abortTransaction();
      session.endSession();
      console.error('Transaction failed during company deletion:', transactionError);
      res.status(500).json({ message: 'Failed to delete company due to a transaction error.', error: transactionError.message });
    }
  } catch (error) {
    console.error('Error deleting company:', error);
    res.status(500).json({ message: 'Server error deleting company.', error: error.message });
  }
};


// --- Branch Management ---

// @desc    Create a new Branch and its Branch Admin user under a specific Company
// @route   POST /api/superuser/companies/:companyId/branches
// @access  Private (Superuser only)
exports.createBranch = async (req, res) => {
  const { companyId } = req.params;
  const { branchName, adminEmail, adminPassword, notificationEmails } = req.body; // Added notificationEmails

  if (!branchName || !adminEmail || !adminPassword) {
    return res.status(400).json({ message: 'Please enter branch name, admin email, and admin password.' });
  }

  try {
    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({ message: 'Company not found.' });
    }

    // Check if branch name already exists under this company
    const branchExists = await Branch.findOne({ name: branchName, company: companyId });
    if (branchExists) {
      return res.status(400).json({ message: 'Branch with this name already exists under this company.' });
    }

    // Check if admin email already exists as a user
    const adminUserExists = await User.findOne({ email: adminEmail });
    if (adminUserExists) {
      return res.status(400).json({ message: 'A user with this admin email already exists.' });
    }

    // 1. Create the Branch Admin User first
    const branchAdminUser = await User.create({
      email: adminEmail,
      password: adminPassword,
      role: 'branch_admin',
      company: company._id, // Link to parent company
      // branch field will be set after branch creation
    });

    // 2. Create the Branch, linking it to the company and admin user
    const branch = await Branch.create({
      name: branchName,
      company: company._id,
      branchAdmin: branchAdminUser._id,
      notificationEmails: notificationEmails || [], // Save notification emails
    });

    // 3. Update the branch admin user with the branch ID
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
    console.error('Error creating branch:', error);
    res.status(500).json({ message: 'Server error creating branch.', error: error.message });
  }
};

// @desc    Get all Branches for a specific Company
// @route   GET /api/superuser/companies/:companyId/branches
// @access  Private (Superuser only)
exports.getBranchesByCompany = async (req, res) => {
  const { companyId } = req.params;
  try {
    // Populate admin email and notification emails
    const branches = await Branch.find({ company: companyId }).populate('branchAdmin', 'email').select('+notificationEmails');
    res.status(200).json(branches);
  } catch (error) {
    console.error('Error fetching branches:', error);
    res.status(500).json({ message: 'Server error fetching branches.', error: error.message });
  }
};

// @desc    Update a Branch and its Branch Admin user
// @route   PUT /api/superuser/branches/:id
// @access  Private (Superuser only)
exports.updateBranch = async (req, res) => {
  const { id } = req.params;
  const { branchName, adminEmail, adminPassword, notificationEmails } = req.body; // Added notificationEmails

  try {
    const branch = await Branch.findById(id);

    if (!branch) {
      return res.status(404).json({ message: 'Branch not found.' });
    }

    // Check for duplicate branch name under the same company if changing
    if (branchName && branchName !== branch.name) {
      const existingBranch = await Branch.findOne({ name: branchName, company: branch.company });
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
        branchAdminUser.password = adminPassword;
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
    console.error('Error updating branch:', error);
    res.status(500).json({ message: 'Server error updating branch.', error: error.message });
  }
};

// @desc    Delete a Branch and its associated Clients and Reviews
// @route   DELETE /api/superuser/branches/:id
// @access  Private (Superuser only)
exports.deleteBranch = async (req, res) => {
  const { id } = req.params;

  try {
    const branch = await Branch.findById(id);

    if (!branch) {
      return res.status(404).json({ message: 'Branch not found.' });
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
      console.error('Transaction failed during branch deletion:', transactionError);
      res.status(500).json({ message: 'Failed to delete branch due to a transaction error.', error: transactionError.message });
    }
  } catch (error) {
    console.error('Error deleting branch:', error);
    res.status(500).json({ message: 'Server error deleting branch.', error: error.message });
  }
};


// --- Client Management ---

// @desc    Create a new Client user under a specific Branch (or Company if no branch)
// @route   POST /api/superuser/branches/:branchId/clients OR /api/superuser/companies/:companyId/clients
// @access  Private (Superuser only)
exports.createClient = async (req, res) => {
  const { branchId, companyId } = req.params; // One of these will be present
  const { clientEmail, clientPassword, customerName, customerMobile, notificationEmails } = req.body; // Added notificationEmails

  if (!clientEmail || !clientPassword || !customerName || !customerMobile) {
    return res.status(400).json({ message: 'Please enter client email, password, customer name, and mobile.' });
  }

  try {
    let parentCompanyId = null;
    let parentBranchId = null;

    if (branchId) {
      const branch = await Branch.findById(branchId).populate('company');
      if (!branch) {
        return res.status(404).json({ message: 'Branch not found.' });
      }
      parentCompanyId = branch.company._id;
      parentBranchId = branch._id;
    } else if (companyId) {
      const company = await Company.findById(companyId);
      if (!company) {
        return res.status(404).json({ message: 'Company not found.' });
      }
      parentCompanyId = company._id;
      // No branchId if client is directly under company
    } else {
      return res.status(400).json({ message: 'Must provide either companyId or branchId to create a client.' });
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
      company: parentCompanyId,
      branch: parentBranchId,
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
    console.error('Error creating client:', error);
    res.status(500).json({ message: 'Server error creating client.', error: error.message });
  }
};

// @desc    Get all Clients for a specific Branch or Company
// @route   GET /api/superuser/branches/:branchId/clients OR /api/superuser/companies/:companyId/clients
// @access  Private (Superuser only)
exports.getClients = async (req, res) => {
  const { branchId, companyId } = req.params;
  let query = { role: 'client' };

  if (branchId) {
    query.branch = branchId;
  } else if (companyId) {
    query.company = companyId;
    query.branch = null; // To get clients directly under company, not under any branch
  } else {
    // Superuser can get all clients if no specific company/branch is provided
    // This is the endpoint used by the frontend for the client filter dropdown
  }

  try {
    // Populate company and branch names, and also customerName and customerMobile from the User model
    const clients = await User.find(query)
      .populate('company', 'name')
      .populate('branch', 'name')
      .select('+notificationEmails'); // Select notification emails
    res.status(200).json(clients);
  } catch (error) {
    console.error('Error fetching clients:', error);
    res.status(500).json({ message: 'Server error fetching clients.', error: error.message });
  }
};

// @desc    Update a Client user
// @route   PUT /api/superuser/clients/:id
// @access  Private (Superuser only)
exports.updateClient = async (req, res) => {
  const { id } = req.params;
  const { clientEmail, clientPassword, customerName, customerMobile, branchId, companyId, notificationEmails } = req.body; // Added notificationEmails

  try {
    const clientUser = await User.findById(id).select('+password');

    if (!clientUser || clientUser.role !== 'client') {
      return res.status(404).json({ message: 'Client user not found.' });
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
    // Update customerName and customerMobile if you add them to User schema
    if (customerName) clientUser.customerName = customerName;
    if (customerMobile) clientUser.customerMobile = customerMobile;

    // Allow superuser to reassign client to a different branch/company
    if (branchId !== undefined) { // Check if branchId is explicitly provided (can be null)
        if (branchId) {
            const newBranch = await Branch.findById(branchId);
            if (!newBranch) return res.status(404).json({ message: 'New branch not found.' });
            clientUser.branch = newBranch._id;
            clientUser.company = newBranch.company; // Update company to match new branch's company
        } else {
            // If branchId is null, assign directly to company (if companyId is provided)
            if (companyId) {
                const newCompany = await Company.findById(companyId);
                if (!newCompany) return res.status(404).json({ message: 'New company not found.' });
                clientUser.company = newCompany._id;
            }
            clientUser.branch = null; // Ensure branch is null if assigned directly to company
        }
    } else if (companyId !== undefined) { // If branchId is not provided, but companyId is
        const newCompany = await Company.findById(companyId);
        if (!newCompany) return res.status(404).json({ message: 'New company not found.' });
        clientUser.company = newCompany._id;
        clientUser.branch = null; // Ensure branch is null if assigned directly to company
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
    console.error('Error updating client:', error);
    res.status(500).json({ message: 'Server error updating client.', error: error.message });
  }
};

// @desc    Delete a Client user and their associated Reviews
// @route   DELETE /api/superuser/clients/:id
// @access  Private (Superuser only)
exports.deleteClient = async (req, res) => {
  const { id } = req.params;

  try {
    const clientUser = await User.findById(id);

    if (!clientUser || clientUser.role !== 'client') {
      return res.status(404).json({ message: 'Client user not found.' });
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
      console.error('Transaction failed during client deletion:', transactionError);
      res.status(500).json({ message: 'Failed to delete client due to a transaction error.', error: transactionError.message });
    }
  } catch (error) {
    console.error('Error deleting client:', error);
    res.status(500).json({ message: 'Server error deleting client.', error: error.message });
  }
};


// --- Reviews Viewing ---

// @desc    Get all Reviews (Superuser can see everything)
// @route   GET /api/superuser/reviews
// @access  Private (Superuser only)
exports.getAllReviews = async (req, res) => {
  // Superuser can optionally filter by company, branch, client, or date range
  const { companyId, branchId, clientId, startDate, endDate } = req.query; // Added clientId
  let query = {};

  if (companyId) {
    query.company = companyId;
  }
  if (branchId) {
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
    // Populate client (email), company (name), and branch (name) details for richer review data
    const reviews = await Review.find(query)
      .populate('client', 'email') // Populate client email
      .populate('company', 'name') // Populate company name
      .populate('branch', 'name')   // Populate branch name
      .sort({ createdAt: -1 }); // Sort by newest first

    res.status(200).json(reviews);
  } catch (error) {
    console.error('Error fetching all reviews for superuser:', error);
    res.status(500).json({ message: 'Server error fetching reviews.', error: error.message });
  }
};
