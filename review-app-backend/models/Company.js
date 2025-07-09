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
  },
  // NEW: Array of emails to send review notifications to for this company
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

module.exports = mongoose.model('Company', CompanySchema);
