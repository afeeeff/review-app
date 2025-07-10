import React, { useState, useEffect, useRef } from 'react';
import ClientReviewsDashboard from './ClientReviewsDashboard.jsx';

// Main App component
const App = () => {
  // State to manage the current view: 'login', 'dashboard', 'invoiceUpload', 'customerReview', 'voiceRecording', 'submissionSuccess', 'reviewsDashboard'
  const [currentView, setCurrentView] = useState('login');
  // State to manage login form inputs
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  // State for showing login error messages
  const [loginError, setLoginError] = useState('');

  // States for invoice upload and extracted data
  const [invoiceFile, setInvoiceFile] = useState(null);
  const [isProcessingInvoice, setIsProcessingInvoice] = useState(false);
  const [invoiceProcessingError, setInvoiceProcessingError] = useState('');
  const [extractedInvoiceData, setExtractedInvoiceData] = useState(null);
  const [uploadedInvoiceFileUrl, setUploadedInvoiceFileUrl] = useState(null);
  const [invoiceDateError, setInvoiceDateError] = useState('');

  // States for customer details (now pre-filled from invoice, but kept for clarity)
  const [customerName, setCustomerName] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');
  const [customerDetailsError, setCustomerDetailsError] = useState(''); // Still used for validation if data is missing

  // State to hold the current rating selected by the customer
  const [customerRating, setCustomerRating] = useState(0);
  // State to control the visibility of the voice recording prompt (now used for the dedicated screen)
  const [showVoicePrompt, setShowVoicePrompt] = useState(false);
  // State to indicate if a review is being submitted
  const [isSubmitting, setIsSubmitting] = useState(false);
  // State for success message after review submission
  const [submissionMessage, setSubmissionMessage] = useState('');
  // State to store the type of feedback (positive, neutral, negative) for the submission success page
  const [feedbackType, setFeedbackType] = useState('');
  // State to store the logged-in client's ID (important for fetching their reviews)
  const [clientId, setClientId] = useState(null);
  // State to store the JWT token and full user data
  const [token, setToken] = useState(localStorage.getItem('jwtToken')); // Initialize from localStorage
  const [userData, setUserData] = useState(null); // To store full user data including companyId, branchId

  // NEW STATE: For selected spoken language
  const [selectedLanguage, setSelectedLanguage] = useState('en-US'); // Default to English (US)

  // Voice recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingError, setRecordingError] = useState('');
  const [audioBlob, setAudioBlob] = useState(null); // Stores the final audio Blob
  const audioContextRef = useRef(null); // Ref for AudioContext
  const mediaStreamSourceRef = useRef(null); // Ref for MediaStreamAudioSourceNode
  const analyserNodeRef = useRef(null); // Ref for AnalyserNode (optional, for visualization)
  const scriptProcessorNodeRef = useRef(null); // Ref for ScriptProcessorNode
  const audioChunksRef = useRef([]); // Ref to store raw audio data chunks
  const mediaRecorderRef = useRef(null); // Keep for potential fallback or other uses
  const audioStreamRef = useRef(null); // Ref to hold the MediaStream object

  // Base URL for your backend API
  const API_BASE_URL =
  window.location.hostname === 'localhost'
    ? 'http://localhost:5000/api'
    : 'https://review-app-backend-ekjk.onrender.com'; // Make sure this matches your backend port

  // Effect to check for token and user data on component mount and set initial view
  useEffect(() => {
    const storedToken = localStorage.getItem('jwtToken');
    const storedUserData = localStorage.getItem('clientUserData'); // NEW: Get stored user data

    if (storedToken && storedUserData) {
      try {
        const parsedUserData = JSON.parse(storedUserData);
        // Ensure clientId is set from parsedUserData, which should now contain 'clientId'
        setClientId(parsedUserData.clientId);
        setToken(storedToken);
        setUserData(parsedUserData); // Set full user data
        setCurrentView('dashboard');
      } catch (error) {
        console.error('Failed to parse stored user data:', error);
        // Clear invalid data if parsing fails
        localStorage.removeItem('jwtToken');
        localStorage.removeItem('clientUserData');
        setToken(null);
        setClientId(null);
        setUserData(null);
        setCurrentView('login');
      }
    }
  }, []);

  // Helper function to parse response, handling non-JSON
  const parseResponse = async (response) => {
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return response.json();
    }
    return response.text().then(text => ({ message: text || 'An unknown error occurred.' }));
  };

  // Handle client login
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    try {
      // Changed endpoint from /api/client/login to /api/auth/login
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: username, password }), // Use 'email' for backend
      });

      const data = await parseResponse(response);

      if (response.ok) {
        // FIX: Use data._id from the backend response as clientId
        setClientId(data._id);
        setToken(data.token);
        // Store full user data including role, companyId, branchId,
        // and explicitly add clientId based on data._id for consistency in localStorage
        localStorage.setItem('jwtToken', data.token);
        localStorage.setItem('clientUserData', JSON.stringify({ ...data, clientId: data._id }));
        setUserData({ ...data, clientId: data._id }); // Update userData state with clientId
        setCurrentView('dashboard');
      } else {
        setLoginError(data.message || 'Login failed. Please try again.');
      }
    } catch (error) {
      console.error('Login API error:', error);
      setLoginError('Could not connect to the server. Please ensure the backend is running.');
    }
  };

  // Function to handle logout
  const handleLogout = () => {
    setToken(null);
    setClientId(null);
    setUserData(null); // Clear full user data
    localStorage.removeItem('jwtToken');
    localStorage.removeItem('clientUserData'); // Clear stored user data
    setCurrentView('login');
    setUsername('');
    setPassword('');
    setLoginError('');
    // Clear invoice related states on logout
    setInvoiceFile(null);
    setExtractedInvoiceData(null);
    setUploadedInvoiceFileUrl(null);
    setInvoiceProcessingError('');
  };

  // Function to handle navigation to invoice upload page
  const goToInvoiceUpload = () => {
    setCurrentView('invoiceUpload');
    setInvoiceFile(null);
    setExtractedInvoiceData(null);
    setUploadedInvoiceFileUrl(null);
    setInvoiceProcessingError('');
    setCustomerName(''); // Clear customer details for new flow
    setCustomerMobile('');
  };

  // Handle invoice file selection
  const handleInvoiceFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Basic file type validation
      const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        setInvoiceProcessingError('Only JPG, PNG, or PDF files are allowed.');
        setInvoiceFile(null);
        return;
      }
      setInvoiceFile(file);
      setInvoiceProcessingError('');
      setExtractedInvoiceData(null); // Clear previous data
      setUploadedInvoiceFileUrl(null);
    }
  };

  // Handle invoice upload and OCR processing
  const handleProcessInvoice = async () => {
    if (!invoiceFile) {
      setInvoiceProcessingError('Please select an invoice file to upload.');
      return;
    }
    if (!token) {
      setInvoiceProcessingError('Not authorized. Please log in again.');
      handleLogout();
      return;
    }

    setIsProcessingInvoice(true);
    setInvoiceProcessingError('');

    const formData = new FormData();
    formData.append('invoiceFile', invoiceFile);

    try {
      const response = await fetch(`${API_BASE_URL}/reviews/process-invoice`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await parseResponse(response);

      if (response.ok) {
        setExtractedInvoiceData(data.invoiceData);
        setUploadedInvoiceFileUrl(data.invoiceFileUrl);
        // Pre-fill customer name and mobile from extracted data if available
        setCustomerName(data.invoiceData.customerNameFromInvoice || '');
        setCustomerMobile(data.invoiceData.customerMobileFromInvoice || '');
      } else {
        setInvoiceProcessingError(data.message || 'Failed to process invoice.');
      }
    } catch (error) {
      console.error('Invoice processing API error:', error);
      setInvoiceProcessingError('An error occurred during invoice processing. Please ensure the backend is running.');
    } finally {
      setIsProcessingInvoice(false);
    }
  };

  // Function to handle confirmation of extracted details and proceed to review
  const handleConfirmDetailsAndProceed = () => {
    const invoiceDate = extractedInvoiceData?.invoiceDate || '';
    const isValidDateFormat = /^\d{2}\/\d{2}\/\d{4}$/.test(invoiceDate);

    if (!isValidDateFormat) {
      setInvoiceDateError('Date must be in DD/MM/YYYY format.');
      return;
    } else {
      setInvoiceDateError('');
    }

    if (!customerName.trim() || !customerMobile.trim()) {
      setCustomerDetailsError('Customer name and mobile must be present (extracted or manually entered).');
      return;
    }

    if (!/^\d{10}$/.test(customerMobile.trim())) {
      setCustomerDetailsError('Please enter a valid 10-digit mobile number.');
      return;
    }

    setCustomerDetailsError('');
    setCurrentView('customerReview');
    setCustomerRating(0);
    setShowVoicePrompt(false);
    setSubmissionMessage('');
    setFeedbackType('');
    setAudioBlob(null);
    setRecordingError('');
  };


  // Function to handle navigation to the Reviews Dashboard page
  const goToReviewsDashboard = () => {
    setCurrentView('reviewsDashboard');
  };

  // Function to handle navigation back to main dashboard
  const goToDashboard = () => {
    setCurrentView('dashboard');
    setCustomerRating(0);
    setSubmissionMessage('');
    setFeedbackType('');
    setRecordingError(false); // Reset recording error
    setIsRecording(false);
    setIsSubmitting(false); // Reset submitting state
    // Ensure microphone stream is stopped when leaving the review page
    stopRecording(); // Use the unified stop method
    // Clear invoice states when going back to dashboard
    setInvoiceFile(null);
    setExtractedInvoiceData(null);
    setUploadedInvoiceFileUrl(null);
    setInvoiceProcessingError('');
  };

  // Handle customer rating selection
  const handleRatingSelect = (rating) => {
    setCustomerRating(rating);
    setAudioBlob(null);
    setRecordingError('');
    // Stop any ongoing recording if rating changes
    stopRecording(); // Use the unified stop method

    if (rating >= 1 && rating <= 8) {
      setCurrentView('voiceRecording'); // NEW: Go to dedicated voice recording screen
      setShowVoicePrompt(true); // Keep this to indicate voice prompt is active
    } else {
      setShowVoicePrompt(false);
      handleSubmitReview(rating, null); // Directly submit with no voice
    }
  };

  // --- WAV Encoding Utility (Improved) ---
  const writeString = (view, offset, string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  const floatTo16BitPCM = (output, offset, input) => {
    for (let i = 0; i < input.length; i++, offset += 2) {
      let s = Math.max(-1, Math.min(1, input[i]));
      output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
  };

  const encodeWAV = (samples, sampleRate) => {
    const numChannels = 1; // Mono
    const bytesPerSample = 2; // 16-bit PCM

    const buffer = new ArrayBuffer(44 + samples.length * bytesPerSample);
    const view = new DataView(buffer);

    /* RIFF identifier */
    writeString(view, 0, 'RIFF');
    /* file length */
    view.setUint32(4, 36 + samples.length * bytesPerSample, true);
    /* RIFF type */
    writeString(view, 8, 'WAVE');
    /* format chunk identifier */
    writeString(view, 12, 'fmt ');
    /* format chunk length */
    view.setUint32(16, 16, true);
    /* sample format (1 for PCM) */
    view.setUint16(20, 1, true);
    /* channel count */
    view.setUint16(22, numChannels, true);
    /* sample rate */
    view.setUint32(24, sampleRate, true);
    /* byte rate (sample rate * block align) */
    view.setUint32(28, sampleRate * numChannels * bytesPerSample, true);
    /* block align (channel count * bytes per sample) */
    view.setUint16(32, numChannels * bytesPerSample, true);
    /* bits per sample */
    view.setUint16(34, bytesPerSample * 8, true);
    /* data chunk identifier */
    writeString(view, 36, 'data');
    /* data chunk length */
    view.setUint32(40, samples.length * bytesPerSample, true);

    floatTo16BitPCM(view, 44, samples);

    return new Blob([view], { type: 'audio/wav' });
  };


  // --- Voice Recording Functions (using Web Audio API) ---
  const startRecording = async () => {
    setRecordingError('');
    audioChunksRef.current = []; // Clear previous raw audio chunks
    setAudioBlob(null);

    // Ensure any previous AudioContext is closed and nullified
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        await audioContextRef.current.close();
      } catch (e) {
        console.error("Error closing previous AudioContext:", e);
      } finally {
        audioContextRef.current = null;
      }
    }

    try {
      // Attempt to create AudioContext with a specific sample rate (16000 Hz)
      // This is the ideal scenario for matching the backend's ASR config.
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
      if (!audioContextRef.current) {
        throw new Error('Failed to create AudioContext.');
      }
      let inputSampleRate = audioContextRef.current.sampleRate; // Get actual sample rate

      // If the browser didn't honor the requested sample rate, log it.
      // The resampling logic in stopRecording will handle the conversion.
      if (inputSampleRate !== 16000) {
        console.warn(`AudioContext created at native sample rate ${inputSampleRate}Hz, not 16000Hz. Resampling will occur.`);
      } else {
        console.log(`AudioContext created at 16000Hz.`);
      }

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream; // Store the stream reference

      // Create nodes and connect them
      // Using ScriptProcessorNode is deprecated, but for simplicity and direct control over raw audio, it's used here.
      // For production, consider AudioWorkletNode.
      mediaStreamSourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
      scriptProcessorNodeRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);

      scriptProcessorNodeRef.current.onaudioprocess = (event) => {
        const audioData = event.inputBuffer.getChannelData(0);
        audioChunksRef.current.push(new Float32Array(audioData));
      };

      // Connect nodes only if they are successfully created
      if (mediaStreamSourceRef.current && scriptProcessorNodeRef.current && audioContextRef.current.destination) {
        mediaStreamSourceRef.current.connect(scriptProcessorNodeRef.current);
        scriptProcessorNodeRef.current.connect(audioContextRef.current.destination);
      } else {
        throw new Error('Audio nodes could not be created or connected.');
      }

      setIsRecording(true);
      console.log('Recording started with Web Audio API...');
      console.log('Input Sample Rate:', inputSampleRate);

    } catch (err) {
      console.error('Error accessing microphone with Web Audio API:', err);
      // Specific error messages for common getUserMedia failures
      if (err.name === 'NotAllowedError') {
        setRecordingError('Microphone access denied. Please allow microphone permissions in your browser settings.');
      } else if (err.name === 'NotFoundError') {
        setRecordingError('No microphone found. Please ensure a microphone is connected.');
      } else if (err.name === 'NotReadableError') {
        setRecordingError('Microphone is in use by another application or device. Please close other apps and try again.');
      } else if (err.name === 'OverconstrainedError') {
        setRecordingError('Microphone constraints could not be satisfied. Try different microphone settings.');
      } else {
        setRecordingError(`Could not access microphone: ${err.message}. Please ensure it is connected and permissions are granted.`);
      }
      setIsRecording(false);
      // Ensure stream and context are stopped/closed on error
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(track => track.stop());
        audioStreamRef.current = null;
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        try {
          audioContextRef.current.close();
        } catch (e) {
          console.error("Error closing AudioContext on error:", e);
        }
      }
      audioContextRef.current = null; // Always nullify after attempt to close or on error
      mediaStreamSourceRef.current = null; // Ensure these are also nullified
      scriptProcessorNodeRef.current = null;
    }
  };

  const stopRecording = () => {
    if (!isRecording) return; // Only stop if currently recording

    setIsRecording(false);
    console.log('Recording stopped.');

    // Disconnect and nullify Web Audio API nodes
    if (scriptProcessorNodeRef.current) {
      scriptProcessorNodeRef.current.disconnect();
      scriptProcessorNodeRef.current.onaudioprocess = null; // Remove event listener
      scriptProcessorNodeRef.current = null;
    }
    if (mediaStreamSourceRef.current) {
      mediaStreamSourceRef.current.disconnect();
      mediaStreamSourceRef.current = null;
    }
    
    let nativeSampleRate = 0;
    if (audioContextRef.current) { // Check if context exists before using it
      nativeSampleRate = audioContextRef.current.sampleRate; // Get the native sample rate
      // Only close if it's not already closed
      if (audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().then(() => {
          console.log("AudioContext closed successfully.");
        }).catch(e => {
          console.error("Error closing AudioContext:", e);
        });
      }
      audioContextRef.current = null; // Set to null immediately after attempting to close
    } else {
      console.warn("AudioContext was null when stopping recording. Cannot get sample rate or close.");
      // No need to set recordingError here, as it's a cleanup step.
    }

    // Process raw audio chunks into a single Float32Array
    const totalLength = audioChunksRef.current.reduce((acc, chunk) => acc + chunk.length, 0);
    const combinedSamples = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of audioChunksRef.current) {
      combinedSamples.set(chunk, offset);
      offset += chunk.length;
    }
    audioChunksRef.current = []; // Clear chunks after combining

    // Explicitly resample to 16000 Hz
    const targetSampleRate = 16000;
    let resampledSamples = combinedSamples;

    // Only resample if native sample rate is different from target AND combinedSamples has data
    if (nativeSampleRate !== targetSampleRate && combinedSamples.length > 0) {
        const ratio = targetSampleRate / nativeSampleRate;
        const newLength = Math.round(combinedSamples.length * ratio);
        resampledSamples = new Float32Array(newLength);
        for (let i = 0; i < newLength; ++i) {
            const index = Math.floor(i / ratio);
            const nextIndex = Math.min(Math.ceil(i / ratio), combinedSamples.length - 1); // Ensure nextIndex is within bounds
            const fraction = (i / ratio) - index;
            // Linear interpolation
            resampledSamples[i] = combinedSamples[index] * (1 - fraction) + combinedSamples[nextIndex] * fraction;
        }
        console.log(`Resampled audio from ${nativeSampleRate}Hz to ${targetSampleRate}Hz`);
    } else if (combinedSamples.length > 0) { // If no resampling but still samples
        console.log(`Audio already at target sample rate: ${targetSampleRate}Hz`);
    } else { // No samples recorded
        console.warn("No audio samples collected to process.");
        setRecordingError("No audio was recorded. Please ensure your microphone is working and you speak during recording.");
        setAudioBlob(null); // Ensure audioBlob is null if no samples
        return; // Exit if no audio to process
    }

    // Encode the resampled samples into a WAV Blob at the target 16000 Hz
    const wavBlob = encodeWAV(resampledSamples, targetSampleRate); // Pass the target sample rate (16000 Hz)
    console.log(`Generated WAV Blob size: ${wavBlob.size} bytes`); // NEW LOG
    setAudioBlob(wavBlob);

    // Stop all tracks in the MediaStream
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop());
      audioStreamRef.current = null;
    }
  };


  const handleVoiceRecordSubmit = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  useEffect(() => {
    // This effect now triggers submission only when audioBlob is ready AND recording has stopped
    if (audioBlob && !isRecording && customerRating > 0 && currentView === 'voiceRecording') {
      setIsSubmitting(true); // Set submitting state here
      handleSubmitReview(customerRating, audioBlob);
    }
  }, [audioBlob, isRecording, customerRating, currentView]);


  // Submit review to backend
  const handleSubmitReview = async (rating, voiceAudioBlob, textReview = null) => {
    // setIsSubmitting(true); // Moved to useEffect
    setSubmissionMessage(''); // Ensure this is called with the setter function

    try {
      const formData = new FormData();
      formData.append('rating', rating);
      formData.append('customerName', customerName); // Use the name from state (extracted or manually entered)
      formData.append('customerMobile', customerMobile); // Use the mobile from state (extracted or manually entered)
      formData.append('sourceLanguage', selectedLanguage); // NEW: Send selected language to backend

      // NEW: Append companyId and branchId from userData
      if (userData?.companyId) {
        formData.append('companyId', userData.companyId);
      }
      if (userData?.branchId) {
        formData.append('branchId', userData.branchId);
      }


      if (voiceAudioBlob) {
        // Voice audio is now always WAV
        formData.append('voiceAudio', voiceAudioBlob, `voice_review_${Date.now()}.wav`);
      } else {
        formData.append('textReview', textReview || (rating >= 9 ? 'Excellent service!' : ''));
      }

      // Append invoice data and URL if available
      if (uploadedInvoiceFileUrl) {
        formData.append('invoiceFileUrl', uploadedInvoiceFileUrl);
      }
      if (extractedInvoiceData) {
        // Create a new object that includes extracted data and the current customerName/Mobile
        const finalInvoiceData = {
          ...extractedInvoiceData,
          customerName: customerName, // Add the final customer name
          customerMobile: customerMobile, // Add the final customer mobile
        };
        // Stringify the object to send it as a JSON string
        formData.append('invoiceData', JSON.stringify(finalInvoiceData));
      } else {
        // If no extracted data, still send customerName and customerMobile in a basic invoiceData object
        const finalInvoiceData = {
          customerName: customerName,
          customerMobile: customerMobile,
        };
        formData.append('invoiceData', JSON.stringify(finalInvoiceData));
      }

      const response = await fetch(`${API_BASE_URL}/reviews/submit`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await parseResponse(response);

      if (response.ok) {
        if (rating >= 9) {
          setFeedbackType('positive'); // Set feedback type for styling
          setSubmissionMessage('Thank you for your excellent feedback! We appreciate your high rating.');
        } else if (rating >= 6) {
          setFeedbackType('neutral'); // Set feedback type for styling
          setSubmissionMessage('Thank you for your feedback! We are always striving to improve.');
        } else {
          setFeedbackType('negative'); // Set feedback type for styling
          setSubmissionMessage('Thank you for your feedback. We are sorry to hear about your experience and will use your input to improve.');
        }
        setCurrentView('submissionSuccess');
      } else {
        if (response.status === 401) {
          setLoginError('Session expired or unauthorized. Please log in again.');
        }
        setSubmissionMessage(data.message || 'Failed to submit review.');
        setFeedbackType('error');
        setCurrentView('submissionSuccess');
      }
    } catch (error) {
      console.error('Review submission API error:', error);
      setSubmissionMessage('An error occurred while submitting your review. Please ensure the backend is running.');
      setFeedbackType('error');
      setCurrentView('submissionSuccess');
    } finally {
      setIsSubmitting(false);
      setAudioBlob(null);
    }
  };

  // Function to get appropriate emoji for rating buttons
  const getRatingEmoji = (rating) => {
    if (rating === 1) return '😡';
    if (rating === 2) return '😠';
    if (rating === 3) return '😞';
    if (rating === 4) return '😐';
    if (rating === 5) return '😕';
    if (rating === 6) return '🙂';
    if (rating === 7) return '😊';
    if (rating === 8) return '😊';
    if (rating === 9) return '🤩';
    if (rating === 10) return '✨';
    return '';
  };

  // Helper function to render a group of rating buttons
  const renderRatingButtons = (start, end) => {
    return Array.from({ length: end - start + 1 }, (_, i) => start + i).map((rating) => {
      let bgColor = 'bg-gray-100';
      let textColor = 'text-gray-800';
      let ringColor = 'ring-gray-300';

      if (rating <= 3) {
        bgColor = 'bg-red-200';
        ringColor = 'ring-red-400';
      } else if (rating <= 7) {
        bgColor = 'bg-yellow-200';
        ringColor = 'ring-yellow-400';
      } else {
        bgColor = 'bg-green-200';
        ringColor = 'ring-green-400';
      }

      if (customerRating === rating) {
        bgColor = rating <= 3 ? 'bg-red-600' : rating <= 7 ? 'bg-yellow-600' : 'bg-green-600';
        textColor = 'text-white';
        ringColor = 'ring-blue-500';
      }

      return (
        <button
          key={rating}
          onClick={() => handleRatingSelect(rating)}
          className={`
            flex flex-col items-center justify-center w-28 h-28 md:w-24 md:h-24 lg:w-28 lg:h-28
            rounded-full text-3xl font-bold
            shadow-xl hover:shadow-2xl transform hover:scale-110
            transition-all duration-300 ease-in-out
            ${bgColor} ${textColor}
            ${customerRating === rating ? `ring-4 ring-offset-2 ${ringColor}` : 'border-2 border-gray-300'}
          `}
        >
          <span className="text-5xl">{getRatingEmoji(rating)}</span>
          <span className="text-xl font-semibold mt-1">{rating}</span>
        </button>
      );
    });
  };

  // Define getSuccessPageStyling once outside the switch
  const getSuccessPageStyling = () => {
    switch (feedbackType) {
      case 'positive':
        return {
          bgColor: 'from-green-600 to-emerald-800', // Darker green for background
          textColor: 'text-white',
          emoji: '✨',
          messageColor: 'text-green-200', // Lighter green for message
          buttonBg: 'bg-green-700 hover:bg-green-800',
          title: 'Fantastic Feedback!',
        };
      case 'neutral':
        return {
          bgColor: 'from-yellow-500 to-orange-700', // Darker yellow/orange
          textColor: 'text-white', // Changed to white for better contrast
          emoji: '👍',
          messageColor: 'text-yellow-100', // Lighter yellow for message
          buttonBg: 'bg-orange-600 hover:bg-orange-700',
          title: 'Feedback Received!',
        };
      case 'negative':
        return {
          bgColor: 'from-red-600 to-rose-800', // Darker red/rose
          textColor: 'text-white',
          emoji: '😔',
          messageColor: 'text-red-200', // Lighter red for message
          buttonBg: 'bg-rose-700 hover:bg-rose-800',
          title: 'We Appreciate Your Honesty!',
        };
      case 'error': // Styling for submission error
        return {
          bgColor: 'from-red-700 to-red-900', // Even darker red for errors
          textColor: 'text-white',
          emoji: '❌',
          messageColor: 'text-red-300', // Lighter red for message
          buttonBg: 'bg-red-800 hover:bg-red-900',
          title: 'Submission Error!',
        };
      default:
        return {
          bgColor: 'from-gray-700 to-gray-900', // Darker gray default
          textColor: 'text-white',
          emoji: '✅',
          messageColor: 'text-gray-300',
          buttonBg: 'bg-blue-600 hover:bg-blue-700',
          title: 'Feedback Submitted!',
        };
    }
  };


  // Render different views based on currentView state
  const renderContent = () => {
    // If not logged in, always show login page
    if (!token && currentView !== 'login') {
      setCurrentView('login');
    }

    return (
      <>
        

        {/* Custom CSS for animations (Tailwind doesn't have these by default) */}
        <style>
          {`
          @keyframes bounce-slow {
            0%, 100% {
              transform: translateY(0);
            }
            50% {
              transform: translateY(-15px);
            }
          }

          .animate-bounce-slow {
            animation: bounce-slow 3s infinite ease-in-out;
          }

          @keyframes pulse-slow {
            0%, 100% {
              transform: scale(1);
              opacity: 1;
            }
            50% {
              transform: scale(1.05);
              opacity: 0.8;
            }
          }

          .animate-pulse-slow {
            animation: pulse-slow 3s infinite ease-in-out;
          }

          @keyframes fade-in {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          .animate-fade-in {
            animation: fade-in 0.8s ease-out forwards;
          }

          @keyframes bounce-once {
            0%, 100% {
              transform: translateY(0);
            }
            20% {
              transform: translateY(-20px);
            }
            40% {
              transform: translateY(0);
            }
            60% {
              transform: translateY(-10px);
            }
            80% {
              transform: translateY(0);
            }
          }

          .animate-bounce-once {
            animation: bounce-once 1.2s ease-out;
          }
          `}
        </style>

        {(() => { // Using an IIFE to handle the switch logic
          switch (currentView) {
            case 'login':
              return (
                <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-700 p-4">
                  <div className="bg-white p-10 rounded-2xl shadow-2xl w-full max-w-md transform transition-all duration-500 hover:scale-105">
                    <h2 className="text-4xl font-extrabold text-center text-gray-900 mb-8 tracking-wide">Client Login</h2>
                    <form onSubmit={handleLogin} className="space-y-6">
                      <div>
                        <label htmlFor="username" className="block text-base font-medium text-gray-700 mb-2">Email</label> {/* Changed to Email */}
                        <input
                          type="email" // Changed to type email
                          id="username"
                          className="mt-1 block w-full px-5 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 text-lg transition duration-200"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <label htmlFor="password" className="block text-base font-medium text-gray-700 mb-2">Password</label>
                        <input
                          type="password"
                          id="password"
                          className="mt-1 block w-full px-5 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 text-lg transition duration-200"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                        />
                      </div>
                      {loginError && (
                        <p className="text-red-600 text-sm font-medium text-center -mt-2">{loginError}</p>
                      )}
                      <button
                        type="submit"
                        className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-lg text-xl font-bold text-white bg-gradient-to-r from-blue-600 to-purple-700 hover:from-blue-700 hover:to-purple-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transform transition-all duration-300 ease-in-out hover:scale-105"
                      >
                        Login
                      </button>
                    </form>
                  </div>
                </div>
              );

            case 'dashboard':
              return (
                <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-green-400 to-teal-600 p-4">
                  <h2 className="text-5xl font-extrabold text-center text-white mb-12 drop-shadow-lg">Client Dashboard</h2>
                  <div className="flex flex-col md:flex-row space-y-8 md:space-y-0 md:space-x-10 w-full max-w-4xl">
                    <button
                      onClick={goToInvoiceUpload} // Changed to goToInvoiceUpload
                      className="flex-1 bg-gradient-to-br from-yellow-400 to-orange-500 text-white py-10 px-8 rounded-3xl shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-400 ease-in-out flex flex-col items-center justify-center text-center border-4 border-yellow-200 hover:border-orange-300"
                    >
                      <span className="text-8xl mb-4 animate-bounce-slow">📝</span> {/* Animated Emoji */}
                      <span className="text-3xl font-bold tracking-wide">Customer Review</span>
                    </button>
                    <button
                      onClick={goToReviewsDashboard}
                      className="flex-1 bg-gradient-to-br from-purple-500 to-pink-600 text-white py-10 px-8 rounded-3xl shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-400 ease-in-out flex flex-col items-center justify-center text-center border-4 border-purple-300 hover:border-pink-400"
                    >
                      <span className="text-8xl mb-4 animate-pulse-slow">📊</span> {/* Animated Emoji */}
                      <span className="text-3xl font-bold tracking-wide">Reviews Dashboard</span>
                    </button>
                  </div>

                  <button
                    onClick={handleLogout}
                    className="mt-16 px-8 py-4 bg-red-600 text-white rounded-xl shadow-lg hover:bg-red-700 transform transition-all duration-300 ease-in-out hover:scale-105 font-semibold text-xl"
                  >
                    Logout
                  </button>
                </div>
              );

            case 'invoiceUpload':
              return (
                <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-400 to-purple-600 p-4">
                  <h2 className="text-5xl font-extrabold text-center text-white mb-10 drop-shadow-md">Upload Invoice for Details</h2>
                  <div className="bg-white p-10 rounded-2xl shadow-2xl w-full max-w-2xl transform transition-all duration-500 hover:scale-105">
                    <div className="space-y-6">
                      <div>
                        <label htmlFor="invoiceFile" className="block text-base font-medium text-gray-700 mb-2">
                          Select Invoice (PDF, JPG, PNG)
                        </label>
                        <input
                          type="file"
                          id="invoiceFile"
                          accept=".pdf, .jpg, .jpeg, .png"
                          className="mt-1 block w-full text-lg text-gray-900 file:mr-4 file:py-2 file:px-4
                            file:rounded-full file:border-0 file:text-sm file:font-semibold
                            file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                          onChange={handleInvoiceFileChange}
                        />
                      </div>
                      {invoiceProcessingError && (
                        <p className="text-red-600 text-sm font-medium text-center">{invoiceProcessingError}</p>
                      )}
                      {!extractedInvoiceData && (
                        <button
                          onClick={handleProcessInvoice}
                          disabled={!invoiceFile || isProcessingInvoice}
                          className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-lg shadow-lg text-xl font-bold text-white bg-gradient-to-r from-green-600 to-teal-700 hover:from-green-700 hover:to-teal-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transform transition-all duration-300 ease-in-out hover:scale-105"
                        >
                          {isProcessingInvoice ? (
                            <>
                              <svg className="animate-spin h-5 w-5 text-white mr-3" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Processing Invoice...
                            </>
                          ) : (
                            'Upload & Extract Details'
                          )}
                        </button>
                      )}

                      {extractedInvoiceData && (
                        <div className="mt-8 p-6 bg-gray-50 rounded-lg border border-gray-200 shadow-inner">
                          <h3 className="text-2xl font-bold text-gray-900 mb-4 text-center">Extracted Invoice Details</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-lg">
                            <div className="col-span-1">
                              <p className="font-semibold text-gray-700">Job Card Number:</p>
                              <input
                                type="text"
                                value={extractedInvoiceData.jobCardNumber || ''}
                                onChange={(e) => setExtractedInvoiceData(prev => ({ ...prev, jobCardNumber: e.target.value }))}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-base"
                                placeholder="N/A"
                              />
                            </div>
                            <div className="col-span-1">
                              <p className="font-semibold text-gray-700">Invoice Number:</p>
                              <input
                                type="text"
                                value={extractedInvoiceData.invoiceNumber || ''}
                                onChange={(e) => setExtractedInvoiceData(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-base"
                                placeholder="N/A"
                              />
                            </div>
                            <div className="col-span-1">
                              <p className="font-semibold text-gray-700">Invoice Date:</p>
                              <input
                                type="text"
                                value={extractedInvoiceData.invoiceDate || ''}
                                onChange={(e) => {
                                  const newDate = e.target.value;
                                  const isValid = /^\d{2}\/\d{2}\/\d{4}$/.test(newDate);
                                  setExtractedInvoiceData(prev => ({ ...prev, invoiceDate: newDate }));
                                  setInvoiceDateError(isValid || newDate === '' ? '' : 'Date must be in DD/MM/YYYY format.');
                                }}
                                pattern="\d{2}/\d{2}/\d{4}" // Client-side validation pattern
                                title="Please enter date in DD/MM/YYYY format"
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-base"
                                placeholder="N/A"
                              />
                              {invoiceDateError && (
                                <p className="text-red-600 text-sm font-medium mt-1">{invoiceDateError}</p>
                              )}

                            </div>
                            <div className="col-span-1">
                              <p className="font-semibold text-gray-700">VIN:</p>
                              <input
                                type="text"
                                value={extractedInvoiceData.vin || ''}
                                onChange={(e) => setExtractedInvoiceData(prev => ({ ...prev, vin: e.target.value }))}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-base"
                                placeholder="N/A"
                              />
                            </div>
                            <div className="col-span-2">
                              <p className="font-semibold text-gray-700">Customer Name (from Invoice):</p>
                              <input
                                type="text"
                                value={customerName}
                                onChange={(e) => setCustomerName(e.target.value)}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-base"
                                placeholder="Enter name if not extracted"
                              />
                            </div>
                            <div className="col-span-2">
                              <p className="font-semibold text-gray-700">Customer Mobile (from Invoice):</p>
                              <input
                                type="tel"
                                value={customerMobile}
                                onChange={(e) => setCustomerMobile(e.target.value)}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-base"
                                placeholder="Enter mobile if not extracted"
                              />
                            </div>
                            {customerDetailsError && (
                              <p className="text-red-600 text-sm font-medium col-span-2 text-center">{customerDetailsError}</p>
                            )}
                          </div>
                          <button
                            onClick={handleConfirmDetailsAndProceed}
                            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-lg text-xl font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-700 hover:from-purple-700 hover:to-indigo-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transform transition-all duration-300 ease-in-out hover:scale-105 mt-6"
                          >
                            Confirm Details & Proceed to Review
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={goToDashboard}
                    className="mt-10 px-8 py-4 bg-gray-600 text-white rounded-xl shadow-lg hover:bg-gray-700 transform transition-all duration-300 ease-in-out hover:scale-105 font-semibold text-xl"
                  >
                    Back to Dashboard
                  </button>
                </div>
              );

            case 'customerReview':
              return (
                <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-300 to-purple-500 p-4">
                  <h2 className="text-5xl font-extrabold text-center text-white mb-10 drop-shadow-md">How was your service?</h2>

                  {/* Display extracted customer details */}
                  {customerName && customerMobile && (
                    <div className="bg-white p-6 rounded-xl shadow-md mb-8 text-center border-t-4 border-blue-500">
                      <p className="text-xl font-semibold text-gray-800">Reviewing for:</p>
                      <p className="text-2xl font-bold text-blue-700">{customerName}</p>
                      <p className="text-lg text-gray-600">{customerMobile}</p>
                      {extractedInvoiceData && (
                        <div className="mt-4 text-sm text-gray-500">
                          <p>Job Card: {extractedInvoiceData.jobCardNumber || 'N/A'}</p>
                          <p>Invoice No: {extractedInvoiceData.invoiceNumber || 'N/A'}</p>
                          <p>Invoice Date: {extractedInvoiceData.invoiceDate || 'N/A'}</p>
                          <p>VIN: {extractedInvoiceData.vin || 'N/A'}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Rating Buttons */}
                  <div className="flex flex-col items-center w-full max-w-5xl mb-10">
                    {/* Row 1: 1, 2, 3 */}
                    <div className="flex justify-center gap-6 mb-6 w-full">
                      {renderRatingButtons(1, 3)}
                    </div>
                    {/* Row 2: 4, 5, 6, 7 */}
                    <div className="flex justify-center gap-6 mb-6 w-full">
                      {renderRatingButtons(4, 7)}
                    </div>
                    {/* Row 3: 8, 9, 10 */}
                    <div className="flex justify-center gap-6 w-full">
                      {renderRatingButtons(8, 10)}
                    </div>
                  </div>

                  <button
                    onClick={() => setCurrentView('invoiceUpload')} // Go back to invoice upload
                    className="mt-10 px-8 py-4 bg-gray-600 text-white rounded-xl shadow-lg hover:bg-gray-700 transform transition-all duration-300 ease-in-out hover:scale-105 font-semibold text-xl"
                  >
                    Back to Invoice Upload
                  </button>
                </div>
              );

            case 'voiceRecording': // NEW: Dedicated voice recording screen
              return (
                <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-teal-400 to-cyan-600 p-4">
                  <h2 className="text-5xl font-extrabold text-center text-white mb-10 drop-shadow-md">Record Your Feedback</h2>

                  {customerName && customerMobile && (
                    <div className="bg-white p-6 rounded-xl shadow-md mb-8 text-center border-t-4 border-blue-500">
                      <p className="text-xl font-semibold text-gray-800">Reviewing for:</p>
                      <p className="text-2xl font-bold text-blue-700">{customerName}</p>
                      <p className="text-lg text-gray-600">{customerMobile}</p>
                      {extractedInvoiceData && (
                        <div className="mt-4 text-sm text-gray-500">
                          <p>Job Card: {extractedInvoiceData.jobCardNumber || 'N/A'}</p>
                          <p>Invoice No: {extractedInvoiceData.invoiceNumber || 'N/A'}</p>
                          <p>Invoice Date: {extractedInvoiceData.invoiceDate || 'N/A'}</p>
                          <p>VIN: {extractedInvoiceData.vin || 'N/A'}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Language Selection Dropdown */}
                  <div className="bg-white p-6 rounded-xl shadow-md w-full max-w-lg text-center mb-8 border-t-4 border-purple-500">
                    <label htmlFor="language-select" className="block text-2xl font-semibold text-gray-800 mb-4">
                      Select Spoken Language:
                    </label>
                    <select
                      id="language-select"
                      value={selectedLanguage}
                      onChange={(e) => setSelectedLanguage(e.target.value)}
                      className="block w-full px-4 py-3 text-xl border border-gray-300 rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500 transition duration-200"
                    >
                      <option value="en-US">English (US)</option>
                      <option value="en-IN">English (India)</option>
                      <option value="hi-IN">Hindi (India)</option>
                      <option value="ta-IN">Tamil (India)</option>
                      <option value="te-IN">Telugu (India)</option>
                      <option value="kn-IN">Kannada (India)</option>
                      <option value="ml-IN">Malayalam (India)</option>
                    </select>
                  </div>

                  <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-lg text-center border-t-4 border-blue-500">
                    {isSubmitting ? (
                      <div className="flex flex-col items-center justify-center py-8 text-blue-600 text-2xl font-medium">
                        <svg className="animate-spin h-10 w-10 text-blue-500 mb-4" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Submitting your feedback...</span>
                        <p className="text-lg text-gray-600 mt-2">Please wait, this may take a moment for transcription and translation.</p>
                      </div>
                    ) : (
                      <>
                        <p className="text-2xl font-semibold text-gray-800 mb-6">Click to record your valuable feedback:</p>
                        {recordingError && (
                          <p className="text-red-600 text-sm mb-4">{recordingError}</p>
                        )}
                        <button
                          onClick={handleVoiceRecordSubmit}
                          disabled={isSubmitting}
                          className={`w-full flex items-center justify-center py-4 px-6 rounded-xl shadow-lg focus:outline-none focus:ring-4 focus:ring-offset-2 transition-all duration-300 ease-in-out text-xl font-bold transform hover:scale-105
                            ${isRecording ? 'bg-red-600 hover:bg-red-700 focus:ring-red-300' : 'bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 focus:ring-green-300'}
                            text-white`}
                        >
                          {isRecording ? (
                            <>
                              <span className="relative flex h-3 w-3 mr-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                              </span>
                              Stop Recording
                            </>
                          ) : (
                            <>
                              <span className="mr-3 text-3xl">🎤</span> Start Voice Recording
                            </>
                          )}
                        </button>
                        <p className="text-base text-gray-600 mt-4">
                          (Click "Start" to begin, "Stop" to finish and submit.)
                        </p>
                      </>
                    )}
                  </div>

                  <button
                    onClick={() => setCurrentView('customerReview')} // Go back to rating selection
                    disabled={isSubmitting}
                    className="mt-10 px-8 py-4 bg-gray-600 text-white rounded-xl shadow-lg hover:bg-gray-700 transform transition-all duration-300 ease-in-out hover:scale-105 font-semibold text-xl"
                  >
                    Go Back to Rating
                  </button>
                </div>
              );

            case 'submissionSuccess':
              const { bgColor, textColor, emoji, messageColor, buttonBg, title } = getSuccessPageStyling();

              return (
                <div className={`min-h-screen flex flex-col items-center justify-center bg-gradient-to-br ${bgColor} p-4 text-center`}>
                  <div className={`bg-white bg-opacity-20 backdrop-filter backdrop-blur-lg p-12 rounded-3xl shadow-3xl transform transition-all duration-700 ease-in-out scale-100 animate-fade-in border-t-8 border-b-8 border-opacity-50 ${feedbackType === 'positive' ? 'border-green-300' : feedbackType === 'neutral' ? 'border-yellow-300' : feedbackType === 'negative' ? 'border-red-300' : 'border-gray-300'}`}>
                    <span className={`text-9xl mb-6 block ${textColor} animate-bounce-once`}>{emoji}</span>
                    <h2 className={`text-5xl font-extrabold mb-6 ${textColor} drop-shadow-lg`}>{title}</h2>
                    <p className={`text-2xl font-medium mb-10 ${messageColor} max-w-2xl mx-auto leading-relaxed`}>
                      {submissionMessage}
                    </p>
                    <button
                      onClick={goToDashboard}
                      className={`py-4 px-10 rounded-full text-2xl font-bold text-white shadow-xl transform transition-all duration-300 ease-in-out hover:scale-105 ${buttonBg}`}
                    >
                      Back to Dashboard
                    </button>
                  </div>
                </div>
              );

            case 'reviewsDashboard':
              // Add console logs here to check the props being passed
              console.log("App.jsx: Rendering ClientReviewsDashboard with clientId:", clientId);
              console.log("App.jsx: Rendering ClientReviewsDashboard with token:", token);
              console.log("App.jsx: Rendering ClientReviewsDashboard with companyId:", userData?.companyId);
              console.log("App.jsx: Rendering ClientReviewsDashboard with branchId:", userData?.branchId);

              return (
                <ClientReviewsDashboard
                  clientId={clientId}
                  token={token}
                  API_BASE_URL={API_BASE_URL}
                  handleLogout={handleLogout}
                  goToDashboard={goToDashboard}
                  // NEW: Pass companyId and branchId to ClientReviewsDashboard
                  companyId={userData?.companyId}
                  branchId={userData?.branchId}
                />
              );

            default:
              return null;
          }
        })()}
      </>
    );
  };

  return renderContent();
};

export default App;
