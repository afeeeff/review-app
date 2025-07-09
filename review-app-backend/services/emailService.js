// review-app-backend/services/emailService.js

const nodemailer = require('nodemailer');

// Configure your email transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: process.env.EMAIL_SECURE === 'true', // Use 'true' for 465, 'false' for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    // Do not fail on invalid certs for development/testing, but be cautious in production
    rejectUnauthorized: false
  }
});

/**
 * Sends a generic email using the configured Nodemailer transporter.
 * @param {Object} mailOptions - Options for the email (from, to, subject, html, attachments, etc.)
 */
const sendEmail = async (mailOptions) => {
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent: %s', info.messageId);
    // console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info)); // Only for ethereal.email testing
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Failed to send email.');
  }
};

/**
 * Sends an email notification for a customer review with a rating between 1 and 8.
 * @param {object} reviewDetails - Object containing all details for the email.
 * @param {string[]} reviewDetails.recipientEmails - Array of email addresses to send the notification to.
 * @param {number} reviewDetails.rating - The submitted customer rating.
 * @param {string} reviewDetails.transcribedText - The transcribed text of the voice review.
 * @param {string} reviewDetails.translatedText - The translated text of the voice review.
 * @param {string} reviewDetails.voiceAudioUrl - Google Cloud Storage URL of the voice audio file.
 * @param {object} reviewDetails.invoiceData - Extracted invoice data.
 * @param {string} reviewDetails.customerName - Name of the customer.
 * @param {string} reviewDetails.customerMobile - Mobile number of the customer.
 * @param {string} reviewDetails.invoiceFileUrl - URL to the uploaded invoice file in GCS.
 */
exports.sendReviewEmail = async (reviewDetails) => {
  const {
    recipientEmails, // NEW: Dynamic recipient emails
    rating,
    transcribedText,
    translatedText,
    voiceAudioUrl,
    invoiceData,
    customerName,
    customerMobile,
    invoiceFileUrl
  } = reviewDetails;

  // Ensure recipientEmails is an array and not empty
  if (!recipientEmails || recipientEmails.length === 0) {
    console.warn('sendReviewEmail called with no recipient emails. Skipping email sending.');
    return;
  }

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
        <li><strong>Invoice File URL:</strong> ${invoiceFileUrl ? `<a href="${invoiceFileUrl}" target="_blank">View Invoice</a>` : 'N/A'}</li>
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
    console.log('Review Email sent: %s', info.messageId);
    // console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info)); // Only for ethereal.email testing
  } catch (error) {
    console.error('Error sending review email:', error);
    // In a real application, you might log this error to a monitoring service
    // or implement a retry mechanism.
  }
};

module.exports = { sendEmail, sendReviewEmail: exports.sendReviewEmail }; // Export both functions
