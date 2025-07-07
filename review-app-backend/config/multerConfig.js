// review-app-backend/config/multerConfig.js

const multer = require('multer');

// Configure multer to store files in memory as a buffer.
// This allows us to handle the GCS upload directly using @google-cloud/storage SDK.
const storage = multer.memoryStorage();

// Create the multer upload instance
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 20 * 1024 * 1024 // Increased limit to 20MB for invoices (PDF/images)
  },
  fileFilter: (req, file, cb) => {
    // Accept audio, image (jpeg, png), and PDF files
    if (file.mimetype.startsWith('audio/') || file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      // Return an error if the file type is not allowed
      cb(new Error('Only audio, image (JPG/PNG), or PDF files are allowed!'), false);
    }
  }
});

module.exports = upload;
