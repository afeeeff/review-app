// review-app-backend/models/Company.js

const mongoose = require('mongoose');

const CompanySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Company name is required'],
    unique: true,
    trim: true
  },
  // Reference to the User who is the admin for this company
  // This helps in easily finding the company admin's user document
  companyAdmin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Company admin user ID is required'],
    unique: true // A user can only be an admin for one company
  }
}, {
  timestamps: true // Adds createdAt and updatedAt fields
});

module.exports = mongoose.model('Company', CompanySchema);
