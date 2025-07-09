// review-app-backend/controllers/branchController.js

const User = require('../models/User');
const Company = require('../models/Company'); // Needed for validation/population
const Branch = require('../models/Branch');   // Needed for validation/population
const Review = require('../models/Review');
const jwt = require('jsonwebtoken');

// Helper function to generate JWT for newly created users
const generateToken = (id, role, companyId = null, branchId = null) => {
  return jwt.sign(
    { id, role, companyId, branchId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );
};

// --- Client Management (by Branch Admin) ---

// @desc    Create a new Client user under the authenticated Branch
// @route   POST /api/branch/clients
// @access  Private (Branch Admin only)
exports.createClient = async (req, res) => {
  const { clientEmail, clientPassword, customerName, customerMobile } = req.body;
  const companyId = req.user.company; // Get company ID from authenticated user's token
  const branchId = req.user.branch;   // Get branch ID from authenticated user's token

  if (!companyId || !branchId) {
    return res.status(403).json({ message: 'Unauthorized: Company or Branch ID not found for this user.' });
  }

  if (!clientEmail || !clientPassword || !customerName || !customerMobile) {
    return res.status(400).json({ message: 'Please enter client email, password, customer name, and mobile.' });
  }

  try {
    // 1. Verify the branch exists and belongs to the company (should be true if admin is logged in)
    const branch = await Branch.findById(branchId);
    if (!branch || branch.company.toString() !== companyId.toString()) {
      return res.status(403).json({ message: 'Unauthorized: Branch not found or does not belong to your company.' });
    }

    // 2. Check if client email already exists as a user
    const clientUserExists = await User.findOne({ email: clientEmail });
    if (clientUserExists) {
      return res.status(400).json({ message: 'A user with this client email already exists.' });
    }

    // 3. Create the Client User
    const clientUser = await User.create({
      email: clientEmail,
      password: clientPassword,
      role: 'client',
      company: companyId, // Client is always linked to the branch admin's company
      branch: branchId,   // Client is always linked to the branch admin's branch
      customerName: customerName,
      customerMobile: customerMobile,
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
        token: clientToken,
      },
    });
  } catch (error) {
    console.error('Error creating client (Branch Admin):', error);
    res.status(500).json({ message: 'Server error creating client.', error: error.message });
  }
};

// @desc    Get all Clients for the authenticated Branch
// @route   GET /api/branch/clients
// @access  Private (Branch Admin only)
exports.getClients = async (req, res) => {
  const companyId = req.user.company; // Get company ID from authenticated user's token
  const branchId = req.user.branch;   // Get branch ID from authenticated user's token

  if (!companyId || !branchId) {
    return res.status(403).json({ message: 'Unauthorized: Company or Branch ID not found for this user.' });
  }

  try {
    const clients = await User.find({ role: 'client', company: companyId, branch: branchId })
      .populate('company', 'name')
      .populate('branch', 'name');
    res.status(200).json(clients);
  } catch (error) {
    console.error('Error fetching clients (Branch Admin):', error);
    res.status(500).json({ message: 'Server error fetching clients.', error: error.message });
  }
};

// @desc    Update a Client user within the authenticated Branch
// @route   PUT /api/branch/clients/:id
// @access  Private (Branch Admin only)
exports.updateClient = async (req, res) => {
  const { id } = req.params; // Client User ID
  const { clientEmail, clientPassword, customerName, customerMobile } = req.body;
  const companyId = req.user.company; // Get company ID from authenticated user's token
  const branchId = req.user.branch;   // Get branch ID from authenticated user's token

  if (!companyId || !branchId) {
    return res.status(403).json({ message: 'Unauthorized: Company or Branch ID not found for this user.' });
  }

  try {
    const clientUser = await User.findById(id).select('+password');

    if (!clientUser || clientUser.role !== 'client') {
      return res.status(404).json({ message: 'Client user not found.' });
    }

    // Ensure the client belongs to the authenticated branch and company
    if (clientUser.company.toString() !== companyId.toString() || clientUser.branch.toString() !== branchId.toString()) {
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
      },
    });
  } catch (error) {
    console.error('Error updating client (Branch Admin):', error);
    res.status(500).json({ message: 'Server error updating client.', error: error.message });
  }
};

// @desc    Delete a Client user and their associated Reviews within the authenticated Branch
// @route   DELETE /api/branch/clients/:id
// @access  Private (Branch Admin only)
exports.deleteClient = async (req, res) => {
  const { id } = req.params; // Client User ID
  const companyId = req.user.company; // Get company ID from authenticated user's token
  const branchId = req.user.branch;   // Get branch ID from authenticated user's token

  if (!companyId || !branchId) {
    return res.status(403).json({ message: 'Unauthorized: Company or Branch ID not found for this user.' });
  }

  try {
    const clientUser = await User.findById(id);

    if (!clientUser || clientUser.role !== 'client') {
      return res.status(404).json({ message: 'Client user not found.' });
    }

    // Ensure the client belongs to the authenticated branch and company
    if (clientUser.company.toString() !== companyId.toString() || clientUser.branch.toString() !== branchId.toString()) {
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
      console.error('Transaction failed during client deletion (Branch Admin):', transactionError);
      res.status(500).json({ message: 'Failed to delete client due to a transaction error.', error: transactionError.message });
    }
  } catch (error) {
    console.error('Error deleting client (Branch Admin):', error);
    res.status(500).json({ message: 'Server error deleting client.', error: error.message });
  }
};


// --- Reviews Viewing (by Branch Admin) ---

// @desc    Get all Reviews for the authenticated Branch (optionally filtered by date range or client)
// @route   GET /api/branch/reviews
// @access  Private (Branch Admin only)
exports.getBranchReviews = async (req, res) => {
  const companyId = req.user.company; // Get company ID from authenticated user's token
  const branchId = req.user.branch;   // Get branch ID from authenticated user's token
  const { clientId, startDate, endDate } = req.query; // Optional filters, added clientId

  if (!companyId || !branchId) {
    return res.status(403).json({ message: 'Unauthorized: Company or Branch ID not found for this user.' });
  }

  let query = { company: companyId, branch: branchId }; // Base query: only reviews for this specific branch

  if (clientId) { // Apply client filter if provided
    query.client = clientId;
  }

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) {
      const startOfDay = new Date(startDate);
      startOfDay.setUTCHours(0, 0, 0, 0);
      query.createdAt.$gte = startOfDay;
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setUTCHours(23, 59, 59, 999); // Set to end of the day
      query.createdAt.$lte = end;
    }
  }

  try {
    const reviews = await Review.find(query)
      .populate('client', 'email customerName customerMobile') // Populate client email, name, mobile
      .populate('company', 'name')
      .populate('branch', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json(reviews);
  } catch (error) {
    console.error('Error fetching branch reviews:', error);
    res.status(500).json({ message: 'Server error fetching reviews.', error: error.message });
  }
};
