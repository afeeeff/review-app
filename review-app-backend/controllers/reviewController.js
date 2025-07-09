// review-app-backend/controllers/reviewController.js

const Review = require('../models/Review');
const { Storage } = require('@google-cloud/storage');
const { ImageAnnotatorClient } = require('@google-cloud/vision'); // Import Vision API
const { SpeechClient } = require('@google-cloud/speech'); // Import Speech-to-Text API
const { TranslationServiceClient } = require('@google-cloud/translate').v3beta1; // Import Translation API
const path = require('path');
const emailService = require('../services/emailService'); // Import the new email service
const mongoose = require('mongoose'); // Import mongoose for ObjectId

// Initialize Google Cloud Storage client
const storage = new Storage({
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
});
const bucket = storage.bucket(process.env.GCS_BUCKET_NAME);

// Initialize Google Cloud Vision API client
const visionClient = new ImageAnnotatorClient({
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
});

// Initialize Google Cloud Speech-to-Text client
const speechClient = new SpeechClient({
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
});

// Initialize Google Cloud Translation API client
const translationClient = new TranslationServiceClient({
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
});


// Helper function to extract data from invoice text using regex
const extractInvoiceData = (text) => {
  const data = {
    jobCardNumber: null,
    invoiceNumber: null,
    invoiceDate: null,
    vin: null,
    customerNameFromInvoice: null,
    customerMobileFromInvoice: null,
  };

  let match;

  // 1. Job Card Number (REFINED REGEX for multi-line capture)
  // Looks for "Job Card Number" followed by any characters (including newlines) non-greedily
  // until it finds a string starting with "RJC" and then captures it.
  // This accounts for the OCR output where "Invoice No" appears between the label and the value.
  const jobCardRegex = /Job Card Number[\s\S]*?(RJC[A-Z0-9]+)/i;
  match = text.match(jobCardRegex);
  if (match && match[1]) data.jobCardNumber = match[1].trim();
  console.log('Job Card Number Match:', match ? data.jobCardNumber : 'Not Found');

  // 2. Invoice Number (REFINED REGEX for multi-line capture)
  // Looks for "Invoice No" followed by any characters (including newlines) non-greedily
  // until it finds a string starting with "CIN" and then captures it.
  // This accounts for the OCR output where the RJC number appears between the label and the value.
  const invoiceNoRegex = /Invoice No[\s\S]*?(CIN[A-Z0-9]+)/i;
  match = text.match(invoiceNoRegex);
  if (match && match[1]) {
    data.invoiceNumber = match[1].trim();
  } else {
    data.invoiceNumber = null;
  }
  console.log('Invoice Number Match:', match && match[1] ? `'${match[1].trim()}'` : 'Not Found (or empty)');

  // 3. Invoice Date (IMPROVED REGEX for format and robustness)
  // Matches "Invoice Date" followed by any characters (including newlines and colons) non-greedily
  // until it finds a date in DD/MM/YYYY format. This explicitly ignores time.
  // OCR output: "Invoice Date\n:\n02/04/2025, 6:55 pm"
  const invoiceDateRegex = /Invoice Date[\s\S]*?(\d{2}\/\d{2}\/\d{4})/i; // Captures only DD/MM/YYYY
  match = text.match(invoiceDateRegex);
  if (match && match[1]) data.invoiceDate = match[1].trim();
  console.log('Invoice Date Match:', match ? data.invoiceDate : 'Not Found');

  // 4. VIN (REVERTED TO A MORE ROBUST REGEX - as it was working previously)
  // This regex is more general, looking for "VIN" then anything until a 17-char VIN.
  // This helps if there are extra words or line breaks between "VIN" and the actual number.
  const vinRegex = /VIN[\s\S]*?([A-Z0-9]{17})/i;
  match = text.match(vinRegex);
  if (match && match[1]) data.vin = match[1].trim();
  console.log('VIN Match:', match ? match[1] : 'Not Found');

  // 5. Customer Name (from "Name of Recipient:") (Remains the same)
  // Matches "Name of Recipient :" followed by any characters until a newline.
  const customerNameRegex = /Name of Recipient\s*:\s*([^\n\r]+)/i;
  match = text.match(customerNameRegex);
  if (match && match[1]) data.customerNameFromInvoice = match[1].trim();
  console.log('Customer Name Match:', match ? match[1] : 'Not Found');

  // 6. Customer Mobile (Remains the same, as it was working correctly)
  // Looks for "Mobile" followed by a colon and then captures a 10-digit number.
  const customerMobileRegex = /Mobile\s*:\s*(\d{10})/i;
  match = text.match(customerMobileRegex);
  if (match && match[1]) {
    data.customerMobileFromInvoice = match[1].trim();
  } else {
    data.customerMobileFromInvoice = null;
  }
  console.log('Customer Mobile Match:', match ? match[1] : 'Not Found');

  return data;
};

// Controller for processing invoice upload and extracting data
exports.processInvoice = async (req, res) => {
  try {
    const clientId = req.user.id; // From JWT middleware
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: 'No invoice file uploaded.' });
    }

    // 1. Upload invoice file to GCS (manual upload as per multer.memoryStorage())
    const uniqueFilename = `invoices/${file.fieldname}-${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
    const gcsFile = bucket.file(uniqueFilename);

    // Use a Promise to wait for the GCS upload to finish
    const invoiceUploadPromise = new Promise((resolve, reject) => {
      const stream = gcsFile.createWriteStream({
        metadata: {
          contentType: file.mimetype,
        },
      });

      stream.on('error', (err) => {
        console.error('GCS Invoice Upload Stream Error:', err);
        reject(new Error(`Failed to upload invoice to GCS: ${err.message}`));
      });

      stream.on('finish', () => {
        const invoiceFileUrl = `https://storage.googleapis.com/${bucket.name}/${gcsFile.name}`;
        console.log(`Invoice file uploaded to GCS: ${invoiceFileUrl}`);
        resolve(invoiceFileUrl);
      });

      stream.end(file.buffer);
    });

    const invoiceFileUrl = await invoiceUploadPromise; // AWAIT THE UPLOAD
    const gcsUri = `gs://${bucket.name}/${gcsFile.name}`; // Correct GCS URI format for Vision API

    let extractedText = '';
    if (file.mimetype === 'application/pdf') {
      // For PDF, use batch document text detection with correct GCS URI
      const [result] = await visionClient.batchAnnotateFiles({
        requests: [
          {
            inputConfig: {
              gcsSource: { uri: gcsUri }, // Use gs:// URI here
              mimeType: 'application/pdf',
            },
            features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
          },
        ],
      });

      // Concatenate text from all pages
      extractedText = result.responses[0].responses
        .map(response => response.fullTextAnnotation.text)
        .join('\n');

    } else if (file.mimetype.startsWith('image/')) {
      // For images, use document text detection (can use buffer directly)
      const [result] = await visionClient.documentTextDetection({
        image: { content: file.buffer.toString('base64') }, // Send image buffer directly
      });
      extractedText = result.fullTextAnnotation.text;
    } else {
      return res.status(400).json({ message: 'Unsupported file type for OCR processing.' });
    }

    console.log('Extracted Text from Invoice:\n', extractedText);

    // 2. Extract structured data from the text
    const invoiceData = extractInvoiceData(extractedText);
    console.log('Extracted Invoice Data:', invoiceData);

    // Respond with extracted data and invoice file URL
    res.status(200).json({
      message: 'Invoice processed successfully',
      invoiceFileUrl: invoiceFileUrl,
      invoiceData: invoiceData,
    });

  } catch (error) {
    console.error('Error processing invoice:', error);
    // Enhanced error logging
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
    if (error.code) console.error('Error Code:', error.code);
    if (error.errors) console.error('Validation Errors:', error.errors);
    if (error.details) console.error('Error Details:', error.details);

    res.status(500).json({ message: `Failed to process invoice: ${error.message}` });
  }
};


// Controller for submitting a new review (updated to accept invoice data and company/branch IDs)
exports.submitReview = async (req, res) => {
  try {
    const clientId = req.user.id; // From JWT middleware
    const companyId = req.user.company; // Get company ID from authenticated user's token
    const branchId = req.user.branch;   // Get branch ID from authenticated user's token

    // Get review data and invoice data from req.body
    const {
      rating,
      textReview,
      customerName,
      customerMobile,
      invoiceFileUrl,
      invoiceData: invoiceDataString, // Received as string, parse it
      sourceLanguage
    } = req.body;

    const voiceAudioFile = req.file; // This is the voice audio file from multer

    let voiceData = null;
    let transcribedText = null; // Initialize transcribedText

    let finalInvoiceData = {};
    if (invoiceDataString) {
      finalInvoiceData = JSON.parse(invoiceDataString);
    }

    // Handle voice audio upload to GCS if a file is present (for voice review)
    if (voiceAudioFile) { // This req.file is for the voice audio, not the invoice
      const file = voiceAudioFile; // Use voiceAudioFile here

      // NEW LOGS: Inspect the audio file buffer before GCS upload
      console.log(`Audio file received: name=${file.originalname}, mimetype=${file.mimetype}, size=${file.size} bytes`);
      if (file.buffer && file.buffer.length > 0) {
        console.log(`Audio buffer length: ${file.buffer.length} bytes`);
      } else {
        console.warn('Audio buffer is empty or missing! Cannot upload to GCS.');
        // If buffer is empty, we should ideally stop here or return an error
        return res.status(400).json({ message: 'No audio data received for voice review.' });
      }


      // Force .wav extension as frontend now sends WAV
      const uniqueFilename = `audio/${file.fieldname}-${Date.now()}-${Math.round(Math.random() * 1E9)}.wav`;
      const gcsFile = bucket.file(uniqueFilename);

      // Use a Promise to wait for the GCS upload to finish
      const voiceUploadPromise = new Promise((resolve, reject) => {
        const stream = gcsFile.createWriteStream({
          metadata: {
            contentType: 'audio/wav', // Explicitly set content type to audio/wav
          },
        });

        stream.on('error', (err) => {
          console.error('GCS Voice Upload Stream Error:', err);
          reject(new Error(`GCS voice upload failed: ${err.message}`));
        });

        stream.on('finish', () => {
          const uploadedVoiceDataUrl = `https://storage.googleapis.com/${bucket.name}/${gcsFile.name}`;
          console.log(`Voice file uploaded to GCS: ${uploadedVoiceDataUrl}`);
          resolve(uploadedVoiceDataUrl);
        });

        stream.end(file.buffer);
      });

      voiceData = await voiceUploadPromise; // AWAIT THE UPLOAD
      console.log(`Voice file uploaded to GCS (URL after await): ${voiceData}`);
      console.log(`Attempting transcription for source language: ${sourceLanguage}`);

      // Transcribe audio using Google Cloud Speech-to-Text
      try {
        const audio = {
          uri: `gs://${bucket.name}/${gcsFile.name}`, // GCS URI for transcription
        };
        const config = {
          encoding: 'LINEAR16', // Set encoding to LINEAR16 (for WAV)
          sampleRateHertz: 16000, // Explicitly set to 16000 Hz to match frontend's WAV output
          audioChannelCount: 1, // Explicitly set to 1 (mono)
          languageCode: sourceLanguage, // Use the selected source language
          enableAutomaticPunctuation: true,
          model: 'default',
          maxAlternatives: 1,
          enableWordTimeOffsets: true,
        };
        console.log('Speech-to-Text config:', config);
        const request = {
          audio: audio,
          config: config,
        };

        const [operation] = await speechClient.longRunningRecognize(request);
        const [response] = await operation.promise();
        const transcription = response.results
          .map(result => result.alternatives[0].transcript)
          .join('\n');

        transcribedText = transcription;
        console.log('Audio Transcribed Text (Original Language - before translation):', transcribedText);

        // Translate transcribed text to English if source language is not English
        console.log(`Checking translation condition: sourceLanguage=${sourceLanguage}, transcribedText exists=${!!transcribedText}`);
        if (sourceLanguage !== 'en-US' && sourceLanguage !== 'en-IN' && transcribedText) {
          const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
          const location = 'global';
          const translateRequest = {
            parent: `projects/${projectId}/locations/${location}`,
            contents: [transcribedText],
            mimeType: 'text/plain',
            sourceLanguageCode: sourceLanguage,
            targetLanguageCode: 'en',
          };
          console.log(`Attempting translation from ${sourceLanguage} to English.`);

          try {
            const [translationResponse] = await translationClient.translateText(translateRequest);
            if (translationResponse.translations && translationResponse.translations.length > 0) {
              transcribedText = translationResponse.translations[0].translatedText; // THIS LINE IS THE TRANSLATION
              console.log('Audio Transcribed Text (Translated to English):', transcribedText);
            } else {
              console.warn('Translation API did not return any translations.');
            }
          } catch (translationApiError) {
            console.error('Error during Google Cloud Translation API call:', translationApiError);
            transcribedText = `Translation failed: ${translationApiError.message}. Original: "${transcribedText}"`;
          }
        }
      } catch (transcriptionError) {
        console.error('Error transcribing audio:', transcriptionError);
        transcribedText = `Transcription failed: ${transcriptionError.message}`;
      }
    } else {
      console.log('No voice audio file uploaded.');
    }

    // Determine feedback type based on rating
    let feedbackType;
    if (parseInt(rating) >= 9) {
      feedbackType = 'positive';
    } else if (parseInt(rating) >= 6) {
      feedbackType = 'neutral';
    } else {
      feedbackType = 'negative';
    }

    // Ensure invoiceData is an object and add customerName/Mobile to it
    const updatedInvoiceData = { ...finalInvoiceData };
    
    // Override or set customerNameFromInvoice and customerMobileFromInvoice with the final values
    updatedInvoiceData.customerNameFromInvoice = customerName;
    updatedInvoiceData.customerMobileFromInvoice = customerMobile;

    // Validate and format invoiceDate for consistency
    if (updatedInvoiceData.invoiceDate) {
      const dateParts = updatedInvoiceData.invoiceDate.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      if (dateParts) {
        // If it matches DD/MM/YYYY, keep it as is
        updatedInvoiceData.invoiceDate = `${dateParts[1]}/${dateParts[2]}/${dateParts[3]}`;
      } else {
        // Attempt to parse if it contains time or other variations
        const parsedDate = new Date(updatedInvoiceData.invoiceDate);
        if (!isNaN(parsedDate.getTime())) {
          // Format to DD/MM/YYYY
          const day = String(parsedDate.getDate()).padStart(2, '0');
          const month = String(parsedDate.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
          const year = parsedDate.getFullYear();
          updatedInvoiceData.invoiceDate = `${day}/${month}/${year}`;
        } else {
          // If parsing fails, set to null
          updatedInvoiceData.invoiceDate = null;
          console.warn(`Invalid invoice date format received: ${finalInvoiceData.invoiceDate}. Setting to null.`);
        }
      }
    }


    console.log('Saving review to DB. Customer Name:', customerName, 'Customer Mobile:', customerMobile);
    console.log('Final Invoice Data being saved:', updatedInvoiceData);

    const newReview = new Review({
      client: clientId, // Use 'client' field now
      company: companyId, // Save company ID from token
      branch: branchId,   // Save branch ID from token
      customerName,
      customerMobile,
      rating: parseInt(rating),
      voiceData, // This is where the GCS URL will be stored
      textReview: textReview || (voiceAudioFile ? null : (parseInt(rating) >= 9 && !voiceData ? 'Excellent service!' : null)), // FIX: Use voiceData instead of voiceAudioFile
      transcribedText, // This holds the potentially translated text
      invoiceFileUrl,
      invoiceData: updatedInvoiceData,
      feedbackType,
    });

    await newReview.save();
    console.log(`Review saved: ${newReview._id}. Voice URL: ${newReview.voiceData}. Invoice URL: ${newReview.invoiceFileUrl}. Transcribed Text: ${newReview.transcribedText}`);

    // --- NEW: Email Trigger for ratings 1-8 ---
    if (parseInt(rating) >= 1 && parseInt(rating) <= 8) {
      console.log(`Rating is ${rating}, triggering email notification.`);
      await emailService.sendReviewEmail({
        rating: parseInt(rating),
        transcribedText: transcribedText,
        voiceAudioUrl: voiceData || '',
        invoiceData: updatedInvoiceData,
        customerName: customerName,
        customerMobile: customerMobile,
      });
    }
    // --- END NEW EMAIL TRIGGER ---

    res.status(201).json({
      message: 'Review submitted successfully!',
      reviewId: newReview._id,
      voiceFileUrl: newReview.voiceData,
      invoiceFileUrl: newReview.invoiceFileUrl,
      invoiceData: newReview.invoiceData,
      transcribedText: newReview.transcribedText
    });
  } catch (error) {
    console.error('Error submitting review (top-level catch):');
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
    if (error.code) console.error('Error Code:', error.code);
    if (error.errors) console.error('Validation Errors:', error.errors);
    if (error.details) console.error('Error Details:', error.details);

    if (error.message.includes('Only audio, image (JPG/PNG), or PDF files are allowed!')) {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: `Failed to submit review: ${error.message}`, error: error.message });
  }
};


// Controller for fetching reviews for a specific client
exports.getClientReviews = async (req, res) => {
  try {
    const authenticatedClientId = req.user.id; // Get authenticated client ID from token
    const requestedClientId = req.params.clientId; // Client ID from URL
    const { startDate, endDate } = req.query;

    // Ensure the authenticated client is requesting their own reviews
    if (authenticatedClientId.toString() !== requestedClientId.toString()) {
      return res.status(403).json({ message: 'Not authorized to view these reviews.' });
    }

    let query = { client: authenticatedClientId };

    // Add date filtering to the query
    if (startDate || endDate) {
      query.createdAt = {}; // Initialize createdAt as an object for range queries
      if (startDate) {
        // Convert startDate (YYYY-MM-DD) to the beginning of the day in UTC
        // Use setUTCHours to ensure it's the start of the day in UTC, avoiding timezone issues
        const startOfDay = new Date(startDate);
        startOfDay.setUTCHours(0, 0, 0, 0);
        query.createdAt.$gte = startOfDay;
      }
      if (endDate) {
        // Convert endDate (YYYY-MM-DD) to the end of the day in UTC
        // Add one day and then subtract one millisecond to get to the end of the day in UTC
        const endOfDay = new Date(endDate);
        endOfDay.setUTCHours(23, 59, 59, 999); // Set to end of the day
        query.createdAt.$lte = endOfDay;
      }
    }

    // Fetch reviews for the authenticated client, populating company and branch details
    // FIX: Use the constructed 'query' object here
    const reviews = await Review.find(query)
      .populate('client', 'email')
      .populate('company', 'name') // Populate company name
      .populate('branch', 'name')   // Populate branch name
      .sort({ createdAt: -1 });

    res.status(200).json(reviews);
  } catch (error) {
    console.error('Error fetching client reviews:', error);
    res.status(500).json({ message: 'Failed to fetch reviews', error: error.message });
  }
};
