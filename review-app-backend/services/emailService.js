// review-app-backend/services/emailService.js

const nodemailer = require('nodemailer');

// Configure your email transporter
// IMPORTANT: Replace with your actual SMTP details.
// For production, use environment variables for these credentials.
// Example for Gmail (less secure apps or app passwords required):
// const transporter = nodemailer.createTransport({
//   service: 'gmail',
//   auth: {
//     user: process.env.EMAIL_USER, // Your Gmail address
//     pass: process.env.EMAIL_PASS, // Your Gmail App Password (recommended over regular password)
//   },
// });

// Example for a generic SMTP server (e.g., SendGrid, Mailgun, your own server)
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.example.com', // e.g., 'smtp.sendgrid.net'
  port: process.env.EMAIL_PORT || 587, // Common ports: 587 (TLS), 465 (SSL)
  secure: process.env.EMAIL_SECURE === 'true' || false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER || 'your_email@example.com',
    pass: process.env.EMAIL_PASS || 'your_email_password',
  },
  // Optional: Disable TLS/SSL certificate validation for testing (NOT recommended for production)
  // tls: {
  //   rejectUnauthorized: false
  // }
});

/**
 * Sends an email notification for a customer review with a rating between 1 and 8.
 * @param {object} reviewDetails - Object containing all details for the email.
 * @param {number} reviewDetails.rating - The submitted customer rating.
 * @param {string} reviewDetails.transcribedText - The transcribed text of the voice review.
 * @param {string} reviewDetails.translatedText - The translated text of the voice review.
 * @param {string} reviewDetails.voiceAudioUrl - Google Cloud Storage URL of the voice audio file.
 * @param {object} reviewDetails.invoiceData - Extracted invoice data.
 * @param {string} reviewDetails.customerName - Name of the customer.
 * @param {string} reviewDetails.customerMobile - Mobile number of the customer.
 */
exports.sendReviewEmail = async (reviewDetails) => {
  const {
    rating,
    transcribedText,
    translatedText,
    voiceAudioUrl,
    invoiceData,
    customerName,
    customerMobile
  } = reviewDetails;

  // TODO: In the future, fetch these recipient emails from a database (e.g., superuser settings)
  // For now, hardcode them:
  const recipientEmails = [
    'afeefsyed30@gmail.com', // Example support email
    'manager@yourcompany.com'  // Example manager email
  ];

  // Construct the HTML content for the email
  const emailHtml = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <h2 style="color: #d9534f;">New Customer Feedback - Rating: ${rating} (Action Required!)</h2>
      <p>A customer has submitted feedback with a rating of <strong>${rating}</strong>. This rating indicates an area that might require attention or follow-up.</p>

      <h3 style="color: #5cb85c;">Customer Details:</h3>
      <ul>
        <li><strong>Name:</strong> ${customerName || 'N/A'}</li>
        <li><strong>Mobile:</strong> ${customerMobile || 'N/A'}</li>
      </ul>

      <h3 style="color: #f0ad4e;">Invoice Details:</h3>
      <ul>
        <li><strong>Job Card Number:</strong> ${invoiceData.jobCardNumber || 'N/A'}</li>
        <li><strong>Invoice Number:</strong> ${invoiceData.invoiceNumber || 'N/A'}</li>
        <li><strong>Invoice Date:</strong> ${invoiceData.invoiceDate || 'N/A'}</li>
        <li><strong>VIN:</strong> ${invoiceData.vin || 'N/A'}</li>
        <li><strong>Invoice File URL:</strong> <a href="${voiceAudioUrl.replace('.wav', '.pdf').replace('.mp3', '.pdf').replace('.ogg', '.pdf')}" target="_blank">View Invoice</a> (if applicable)</li>
      </ul>

      <h3 style="color: #428bca;">Feedback Details:</h3>
      <p><strong>Original Transcribed Text:</strong></p>
      <p style="background-color: #f9f9f9; border-left: 4px solid #428bca; padding: 10px; margin-left: 20px;">
        <em>"${transcribedText || 'N/A'}"</em>
      </p>

      <p><strong>Translated Text:</strong></p>
      <p style="background-color: #f9f9f9; border-left: 4px solid #428bca; padding: 10px; margin-left: 20px;">
        <em>"${translatedText || 'N/A'}"</em>
      </p>

      <p><strong>Voice Audio Recording:</strong> <a href="${voiceAudioUrl}" target="_blank">Listen to Audio</a></p>
      <p>The voice audio file is also attached to this email.</p>

      <p style="margin-top: 20px; font-size: 0.9em; color: #777;">
        This is an automated notification. Please do not reply to this email.
      </p>
    </div>
  `;

  const mailOptions = {
    from: process.env.SENDER_EMAIL || 'noreply@yourcompany.com', // Your verified sender email
    to: recipientEmails.join(','), // Comma-separated list of recipients
    subject: `Urgent: Customer Feedback Rating ${rating} - ${customerName || 'Unknown Customer'}`,
    html: emailHtml,
    attachments: [
      {
        filename: `customer_voice_feedback_${Date.now()}.wav`, // Dynamic filename
        path: voiceAudioUrl, // Nodemailer can fetch directly from URL
        contentType: 'audio/wav' // Ensure correct content type
      }
    ]
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent: %s', info.messageId);
    console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info)); // Only for ethereal.email testing
  } catch (error) {
    console.error('Error sending email:', error);
    // In a real application, you might log this error to a monitoring service
    // or implement a retry mechanism.
  }
};
