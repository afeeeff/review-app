// review-app-backend/models/Branch.js

const mongoose = require('mongoose');

const BranchSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Branch name is required'],
    trim: true
  },
  // Reference to the parent Company
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: [true, 'Company ID is required for a branch']
  },
  // Reference to the User who is the admin for this branch
  branchAdmin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Branch admin user ID is required'],
    unique: true // A user can only be an admin for one branch
  },
  // NEW: Array of emails to send review notifications to for this branch
  notificationEmails: {
    type: [String], // Array of strings
    default: [],    // Default to an empty array
    validate: {
      validator: function(v) {
        // Optional: Basic email format validation for each email in the array
        if (!v || v.length === 0) return true; // Allow empty array
        return v.every(email => /.+@.+\..+/.test(email));
      },
      message: props => `${props.value} contains invalid email addresses!`
    }
  }
}, {
  timestamps: true // Adds createdAt and updatedAt fields
});

// Add a compound unique index to ensure branch names are unique per company
BranchSchema.index({ name: 1, company: 1 }, { unique: true });

module.exports = mongoose.model('Branch', BranchSchema);
