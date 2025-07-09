// review-app-backend/models/User.js

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs'); // For password hashing

const UserSchema = new mongoose.Schema({

  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/.+@.+\..+/, 'Please enter a valid email address'] // Basic email regex
  },
  password: { // Store hashed password
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long'],
    select: false // Do not return password by default in queries
  },
  role: {
    type: String,
    enum: ['superuser', 'company_admin', 'branch_admin', 'client'],
    required: [true, 'User role is required']
  },
  // Reference to Company model (only applicable for company_admin, branch_admin, client)
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    default: null // Superuser will not have a company
  },
  // Reference to Branch model (only applicable for branch_admin, client)
  branch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    default: null // Superuser and Company Admin will not have a branch
  },
   customerName: { // Only applicable if role is 'client'
    type: String,
    default: null
  },
  customerMobile: { // Only applicable if role is 'client'
    type: String,
    default: null
  },
  // Fields for password reset (OTP functionality)
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  // NEW: Array of emails to send review notifications to for this client
  // This field is primarily relevant for users with the 'client' role.
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
  timestamps: true // Adds createdAt and updatedAt fields automatically
});

// Middleware to hash password before saving
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) { // Only hash if the password has been modified
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Method to compare entered password with hashed password in DB
UserSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
