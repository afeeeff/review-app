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

/**
 * Sends an account creation email with login credentials and a link.
 * @param {object} accountDetails - Object containing account details for the email.
 * @param {string} accountDetails.recipientEmail - The email address of the new account admin/user.
 * @param {string} accountDetails.username - The username (email) for login.
 * @param {string} accountDetails.password - The plain text password for initial login.
 * @param {string} accountDetails.role - The role of the created account (e.g., 'company_admin', 'branch_admin', 'client').
 * @param {string} accountDetails.loginLink - The specific login URL for their role.
 * @param {string} [accountDetails.name] - Optional. The name of the company, branch, or client for personalization.
 */
exports.sendAccountCreationEmail = async (accountDetails) => {
  const { recipientEmail, username, password, role, loginLink, name } = accountDetails;

  let subjectLine = '';
  let greetingName = name || username; // Use provided name, fallback to username
  let accessType = ''; // Used for the main heading

  switch (role) {
    case 'company_admin':
      subjectLine = 'Your Dealer Access is created';
      accessType = 'Dealer Access (Company)';
      break;
    case 'branch_admin':
      subjectLine = 'Your Branch Access is created';
      accessType = 'Branch Access';
      break;
    case 'client':
      subjectLine = 'Your User Access is created';
      accessType = 'User Access';
      break;
    default:
      subjectLine = 'Your Account is created';
      accessType = 'Account';
  }

  const emailHtml = `
    <div style="font-family: 'Inter', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.05);">
      <h2 style="color: #1a237e; text-align: center; margin-bottom: 20px;">Your ${accessType} is created</h2>
      <p style="font-size: 16px; color: #555;">Hi <strong style="color: #007bff;">${greetingName}</strong>,</p>
      <p style="font-size: 16px; color: #555;">You can now log in using the following credentials:</p>
      <ul style="list-style-type: none; padding: 0; margin: 20px 0; background-color: #f9f9f9; border-left: 4px solid #007bff; padding: 15px; border-radius: 4px;">
        <li style="margin-bottom: 10px; font-size: 15px;"><strong>Username:</strong> <span style="color: #333; word-break: break-all;">${username}</span></li>
        <li style="font-size: 15px;"><strong>Password:</strong> <span style="color: #333; word-break: break-all;">${password}</span></li>
      </ul>
      <p style="font-size: 16px; color: #555;">Please use the link below to log in to your dashboard:</p>
      <p style="margin-top: 25px; text-align: center;">
        <a href="https://${loginLink}" target="_blank" style="display: inline-block; padding: 12px 25px; background-color: #007bff; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; box-shadow: 0 2px 5px rgba(0,123,255,0.2);">
          Click here for login
        </a>
      </p>
      <p style="margin-top: 30px; font-size: 0.9em; color: #777; text-align: center; border-top: 1px solid #eee; padding-top: 15px;">
        For security reasons, we recommend changing your password after your first login.
      </p>
      <p style="margin-top: 10px; font-size: 0.85em; color: #999; text-align: center;">
        This is an automated email, please do not reply.
      </p>
    </div>
  `;

  const mailOptions = {
    from: process.env.SENDER_EMAIL || 'noreply@yourcompany.com',
    to: recipientEmail,
    subject: subjectLine,
    html: emailHtml,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Account creation email sent to ${recipientEmail}: %s`, info.messageId);
  } catch (error) {
    console.error(`Error sending account creation email to ${recipientEmail}:`, error);
    throw new Error('Failed to send account creation email.');
  }
};

module.exports = { sendEmail, sendReviewEmail: exports.sendReviewEmail, sendAccountCreationEmail: exports.sendAccountCreationEmail };
