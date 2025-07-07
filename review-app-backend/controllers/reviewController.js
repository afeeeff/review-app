// review-app-backend/controllers/reviewController.js

const Review = require('../models/Review');
const { Storage } = require('@google-cloud/storage');
const { ImageAnnotatorClient } = require('@google-cloud/vision'); // Import Vision API
const { SpeechClient } = require('@google-cloud/speech'); // Import Speech-to-Text API
const { TranslationServiceClient } = require('@google-cloud/translate').v3beta1; // Import Translation API
const path = require('path');

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

  // 1. Job Card Number
  // Matches "Job Card Number\nRJC4607822501814323"
  const jobCardRegex = /Job Card Number\s*([A-Z0-9]+)/i;
  match = text.match(jobCardRegex);
  if (match && match[1]) data.jobCardNumber = match[1].trim();
  console.log('Job Card Number Match:', match ? match[1] : 'Not Found');

  // 2. Invoice Number
  // Matches "Invoice No\n:" (empty field). Should be null for manual entry.
  // This regex will capture content only on the same line after ":".
  const invoiceNoRegex = /Invoice No\s*:\s*([^\n\r]*?)(?:[\r\n]|$)/i; // Capture anything on the same line after ":" non-greedily until newline or end
  match = text.match(invoiceNoRegex);
  if (match && match[1] && match[1].trim() !== '') {
    data.invoiceNumber = match[1].trim();
  } else {
    data.invoiceNumber = null; // Explicitly set to null if empty or not found on the same line
  }
  console.log('Invoice Number Match:', match && match[1] ? `'${match[1].trim()}'` : 'Not Found (or empty)'); // Added quotes for clarity

  // 3. Invoice Date
  // Matches "Invoice Date\n02/04/2025, 6:55 pm"
  const invoiceDateRegex = /Invoice Date\s*(\d{2}\/\d{2}\/\d{4}(?:,\s*\d{1,2}:\d{2}\s*(?:am|pm))?)/i;
  match = text.match(invoiceDateRegex);
  if (match && match[1]) data.invoiceDate = match[1].trim();
  console.log('Invoice Date Match:', match ? match[1] : 'Not Found');

  // 4. VIN
  // Matches "VIN\nDelivery Address\n: MYHAABCA7RBA25043" or "VIN MYHAABCA7RBA25043"
  // This regex is more general, looking for "VIN" then anything until a 17-char VIN.
  const vinRegex = /VIN[\s\S]*?([A-Z0-9]{17})/i;
  match = text.match(vinRegex);
  if (match && match[1]) data.vin = match[1].trim();
  console.log('VIN Match:', match ? match[1] : 'Not Found');

  // 5. Customer Name (from "Name of Recipient:")
  // Matches "Name of Recipient :\nVenkatesan Rajappachettiar"
  const customerNameRegex = /Name of Recipient\s*:\s*([^\n\r]+)/i;
  match = text.match(customerNameRegex);
  if (match && match[1]) data.customerNameFromInvoice = match[1].trim();
  console.log('Customer Name Match:', match ? match[1] : 'Not Found');

  // 6. Customer Mobile (from "Mobile:")
  // Matches "Mobile:\n:\n9042971318"
  // This regex is specifically for the "Mobile:\n:\n" pattern.
  const customerMobileRegex = /Mobile:\s*:\s*(\d{10})/i;
  match = text.match(customerMobileRegex);
  if (match && match[1]) {
    data.customerMobileFromInvoice = match[1].trim();
  } else {
    data.customerMobileFromInvoice = null; // Explicitly set to null if not found
  }
  console.log('Customer Mobile Match:', match ? match[1] : 'Not Found');

  return data;
};

// Controller for processing invoice upload and extracting data
exports.processInvoice = async (req, res) => {
  try {
    const { clientId } = req; // From JWT middleware
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: 'No invoice file uploaded.' });
    }

    // 1. Upload invoice file to GCS
    const uniqueFilename = `invoices/${file.fieldname}-${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
    const gcsFile = bucket.file(uniqueFilename);

    const stream = gcsFile.createWriteStream({
      metadata: {
        contentType: file.mimetype,
      },
    });

    stream.on('error', (err) => {
      console.error('GCS Invoice Upload Stream Error:', err);
      return res.status(500).json({ message: `Failed to upload invoice to GCS: ${err.message}` });
    });

    stream.on('finish', async () => {
      const invoiceFileUrl = `https://storage.googleapis.com/${bucket.name}/${gcsFile.name}`;
      // Correct GCS URI format for Vision API
      const gcsUri = `gs://${bucket.name}/${gcsFile.name}`;
      console.log(`Invoice file uploaded to GCS: ${invoiceFileUrl}`);

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
    });

    stream.end(file.buffer); // End the stream with the file buffer for GCS upload

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


// Controller for submitting a new review (updated to accept invoice data)
exports.submitReview = async (req, res) => {
  try {
    const { clientId } = req; // From JWT middleware

    // Get review data and invoice data from req.body
    const {
      rating,
      textReview,
      customerName,
      customerMobile,
      invoiceFileUrl,
      invoiceData,
      sourceLanguage // Get source language from frontend
    } = req.body;

    let voiceData = null;
    let transcribedText = null; // Initialize transcribedText

    // Handle voice audio upload to GCS if a file is present (for voice review)
    if (req.file) { // This req.file is for the voice audio, not the invoice
      const file = req.file;
      // Force .wav extension as frontend now sends WAV
      const uniqueFilename = `audio/${file.fieldname}-${Date.now()}-${Math.round(Math.random() * 1E9)}.wav`;
      const gcsFile = bucket.file(uniqueFilename);

      const stream = gcsFile.createWriteStream({
        metadata: {
          contentType: 'audio/wav', // Explicitly set content type to audio/wav
        },
      });

      stream.on('error', (err) => {
        console.error('GCS Voice Upload Stream Error:', err);
        if (!res.headersSent) {
          return res.status(500).json({ message: `GCS voice upload failed: ${err.message}` });
        }
      });

      stream.on('finish', async () => {
        voiceData = `https://storage.googleapis.com/${bucket.name}/${gcsFile.name}`;
        console.log(`Voice file uploaded to GCS: ${voiceData}`);
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

          // NEW: Translate transcribed text to English if source language is not English
          console.log(`Checking translation condition: sourceLanguage=${sourceLanguage}, transcribedText exists=${!!transcribedText}`); // NEW LOG
          if (sourceLanguage !== 'en-US' && sourceLanguage !== 'en-IN' && transcribedText) {
            const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID; // Your Google Cloud Project ID
            const location = 'global'; // Or a specific region like 'us-central1'
            const translateRequest = { // Renamed to avoid conflict with speech request
              parent: `projects/${projectId}/locations/${location}`,
              contents: [transcribedText],
              mimeType: 'text/plain', // Mime type of the text input.
              sourceLanguageCode: sourceLanguage,
              targetLanguageCode: 'en', // Target language is English
            };
            console.log(`Attempting translation from ${sourceLanguage} to English.`); // NEW LOG

            try { // NEW: Added try-catch for translation API call
              const [translationResponse] = await translationClient.translateText(translateRequest); // Renamed response
              if (translationResponse.translations && translationResponse.translations.length > 0) {
                transcribedText = translationResponse.translations[0].translatedText;
                console.log('Audio Transcribed Text (Translated to English):', transcribedText);
              } else {
                console.warn('Translation API did not return any translations.');
              }
            } catch (translationApiError) {
              console.error('Error during Google Cloud Translation API call:', translationApiError);
              // Optionally, you can set transcribedText to a default error message or keep the original transcription
              transcribedText = `Translation failed: ${translationApiError.message}. Original: "${transcribedText}"`;
            }
          }


        } catch (transcriptionError) {
          console.error('Error transcribing audio:', transcriptionError);
          transcribedText = `Transcription failed: ${transcriptionError.message}`; // Store error message
        }

        // Now save the review to DB after voice upload and transcription are complete
        await saveReviewToDb(res, {
          clientId,
          rating,
          textReview,
          customerName,
          customerMobile,
          voiceData,
          invoiceFileUrl,
          invoiceData: invoiceData ? JSON.parse(invoiceData) : null, // Parse invoiceData here
          transcribedText // Pass transcribed text to save function (now potentially translated)
        });
      });

      stream.end(file.buffer);
    } else {
      // If no voice file, directly save the review (e.g., for 9-10 ratings or text-only)
      await saveReviewToDb(res, {
        clientId,
        rating,
        textReview,
        customerName,
        customerMobile,
        voiceData: null,
        invoiceFileUrl,
        invoiceData: invoiceData ? JSON.parse(invoiceData) : null, // Parse invoiceData here
        transcribedText: null // No transcription if no voice data
      });
    }
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

// Helper function to save review to database
const saveReviewToDb = async (res, reviewData) => {
  try {
    // Determine feedback type based on rating
    let feedbackType;
    if (parseInt(reviewData.rating) >= 9) {
      feedbackType = 'positive';
    } else if (parseInt(reviewData.rating) >= 6) {
      feedbackType = 'neutral';
    } else {
      feedbackType = 'negative';
    }

    // Ensure invoiceData is an object and add customerName/Mobile to it
    const finalInvoiceData = { ...reviewData.invoiceData }; // Start with existing invoiceData
    
    // Override or set customerNameFromInvoice and customerMobileFromInvoice with the final values
    finalInvoiceData.customerNameFromInvoice = reviewData.customerName;
    finalInvoiceData.customerMobileFromInvoice = reviewData.customerMobile;

    console.log('Saving review to DB. Customer Name:', reviewData.customerName, 'Customer Mobile:', reviewData.customerMobile);
    console.log('Final Invoice Data being saved:', finalInvoiceData);

    const newReview = new Review({
      clientId: reviewData.clientId,
      customerName: reviewData.customerName, // Keep top-level for direct access
      customerMobile: reviewData.customerMobile, // Keep top-level for direct access
      rating: parseInt(reviewData.rating),
      voiceData: reviewData.voiceData,
      textReview: reviewData.textReview || (parseInt(reviewData.rating) >= 9 && !reviewData.voiceData ? 'Excellent service!' : null),
      transcribedText: reviewData.transcribedText, // Save transcribed text
      invoiceFileUrl: reviewData.invoiceFileUrl,
      invoiceData: finalInvoiceData, // Save the combined invoiceData
      feedbackType,
    });

    await newReview.save();
    console.log(`Review saved: ${newReview._id}. Voice URL: ${newReview.voiceData}. Invoice URL: ${newReview.invoiceFileUrl}. Transcribed Text: ${newReview.transcribedText}`);
    res.status(201).json({
      message: 'Review submitted successfully!',
      reviewId: newReview._id,
      voiceFileUrl: newReview.voiceData,
      invoiceFileUrl: newReview.invoiceFileUrl,
      invoiceData: newReview.invoiceData,
      transcribedText: newReview.transcribedText // Send transcribed text back to frontend
    });
  } catch (dbError) {
    console.error('MongoDB Save Error:', dbError);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Failed to save review to database.', error: dbError.message });
    }
  }
};


// Controller for fetching reviews for a specific client
exports.getClientReviews = async (req, res) => {
  try {
    const { clientId } = req; // From JWT middleware

    const reviews = await Review.find({ clientId: clientId }).sort({ createdAt: -1 });
    res.status(200).json(reviews);
  } catch (error) {
    console.error('Error fetching client reviews:', error);
    res.status(500).json({ message: 'Failed to fetch reviews', error: error.message });
  }
};
