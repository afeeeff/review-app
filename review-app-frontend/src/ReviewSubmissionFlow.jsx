import React, { useState, useEffect, useRef, useCallback } from 'react';

const ReviewSubmissionFlow = ({
  userData,
  API_BASE_URL,
  token,
  clientId,
  handleLogout,
  setGlobalSuccessMessage,
  setGlobalError,
  onFlowStatusChange, // Callback to notify parent about flow status
}) => {
  // Internal states for the review submission flow
  const [currentStep, setCurrentStep] = useState('invoiceUpload'); // 'invoiceUpload', 'customerReview', 'voiceRecording', 'submissionSuccess'
  const [invoiceFile, setInvoiceFile] = useState(null);
  const [isProcessingInvoice, setIsProcessingInvoice] = useState(false);
  const [invoiceProcessingError, setInvoiceProcessingError] = useState('');
  const [extractedInvoiceData, setExtractedInvoiceData] = useState(null);
  const [uploadedInvoiceFileUrl, setUploadedInvoiceFileUrl] = useState(null);
  const [invoiceDateError, setInvoiceDateError] = useState('');

  const [customerName, setCustomerName] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');
  const [customerDetailsError, setCustomerDetailsError] = useState('');

  const [customerRating, setCustomerRating] = useState(0);
  const [selectedLanguage, setSelectedLanguage] = useState('en-US');

  const [isRecording, setIsRecording] = useState(false);
  const [recordingError, setRecordingError] = useState('');
  const [audioBlob, setAudioBlob] = useState(null);
  const audioContextRef = useRef(null);
  const mediaStreamSourceRef = useRef(null);
  const scriptProcessorNodeRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioStreamRef = useRef(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionMessage, setSubmissionMessage] = useState('');
  const [feedbackType, setFeedbackType] = useState(''); // 'positive', 'neutral', 'negative', 'error'

  // Effect to notify parent about the flow status (whether tabs should be hidden)
  // Tabs should be hidden if we are past the initial invoice upload selection,
  // or if an invoice is selected and extracted data is present.
  useEffect(() => {
    let hideTabs = false;
    if (currentStep !== 'invoiceUpload') {
      hideTabs = true;
    } else if (invoiceFile && extractedInvoiceData) {
      hideTabs = true;
    } else if (invoiceFile && isProcessingInvoice) {
      hideTabs = true; // Hide tabs while processing too
    }

    // Ensure onFlowStatusChange is a function before calling it
    if (typeof onFlowStatusChange === 'function') {
      onFlowStatusChange(hideTabs);
    }
  }, [currentStep, invoiceFile, extractedInvoiceData, isProcessingInvoice, onFlowStatusChange]);


  // Helper function to parse response, handling non-JSON
  const parseResponse = async (response) => {
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return response.json();
    }
    return response.text().then(text => ({ message: text || 'An unknown error occurred.' }));
  };

  // Handle invoice file selection
  const handleInvoiceFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        setInvoiceProcessingError('Only JPG, PNG, or PDF files are allowed.');
        setInvoiceFile(null);
        setExtractedInvoiceData(null); // Clear extracted data if file type is wrong
        return;
      }
      setInvoiceFile(file);
      setInvoiceProcessingError('');
      setExtractedInvoiceData(null); // Clear previous extracted data on new file selection
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

  // Handle confirmation of extracted details and proceed to review
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
    setCurrentStep('customerReview');
    setCustomerRating(0);
    setSubmissionMessage('');
    setFeedbackType('');
    setAudioBlob(null);
    setRecordingError('');
  };

  // Handle customer rating selection
  const handleRatingSelect = (rating) => {
    setCustomerRating(rating);
    setAudioBlob(null);
    setRecordingError('');
    stopRecording(); // Stop any ongoing recording if rating changes

    if (rating >= 1 && rating <= 8) {
      setCurrentStep('voiceRecording');
    } else {
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
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
      if (!audioContextRef.current) {
        throw new Error('Failed to create AudioContext.');
      }
      let inputSampleRate = audioContextRef.current.sampleRate;

      if (inputSampleRate !== 16000) {
        console.warn(`AudioContext created at native sample rate ${inputSampleRate}Hz, not 16000Hz. Resampling will occur.`);
      } else {
        console.log(`AudioContext created at 16000Hz.`);
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;

      mediaStreamSourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
      scriptProcessorNodeRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);

      scriptProcessorNodeRef.current.onaudioprocess = (event) => {
        const audioData = event.inputBuffer.getChannelData(0);
        audioChunksRef.current.push(new Float32Array(audioData));
      };

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
      audioContextRef.current = null;
      mediaStreamSourceRef.current = null;
      scriptProcessorNodeRef.current = null;
    }
  };

  const stopRecording = () => {
    if (!isRecording) return;

    setIsRecording(false);
    console.log('Recording stopped.');

    if (scriptProcessorNodeRef.current) {
      scriptProcessorNodeRef.current.disconnect();
      scriptProcessorNodeRef.current.onaudioprocess = null;
      scriptProcessorNodeRef.current = null;
    }
    if (mediaStreamSourceRef.current) {
      mediaStreamSourceRef.current.disconnect();
      mediaStreamSourceRef.current = null;
    }
    
    let nativeSampleRate = 0;
    if (audioContextRef.current) {
      nativeSampleRate = audioContextRef.current.sampleRate;
      if (audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().then(() => {
          console.log("AudioContext closed successfully.");
        }).catch(e => {
          console.error("Error closing AudioContext:", e);
        });
      }
      audioContextRef.current = null;
    } else {
      console.warn("AudioContext was null when stopping recording. Cannot get sample rate or close.");
    }

    const totalLength = audioChunksRef.current.reduce((acc, chunk) => acc + chunk.length, 0);
    const combinedSamples = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of audioChunksRef.current) {
      combinedSamples.set(chunk, offset);
      offset += chunk.length;
    }
    audioChunksRef.current = [];

    const targetSampleRate = 16000;
    let resampledSamples = combinedSamples;

    if (nativeSampleRate !== targetSampleRate && combinedSamples.length > 0) {
        const ratio = targetSampleRate / nativeSampleRate;
        const newLength = Math.round(combinedSamples.length * ratio);
        resampledSamples = new Float32Array(newLength);
        for (let i = 0; i < newLength; ++i) {
            const index = Math.floor(i / ratio);
            const nextIndex = Math.min(Math.ceil(i / ratio), combinedSamples.length - 1);
            const fraction = (i / ratio) - index;
            resampledSamples[i] = combinedSamples[index] * (1 - fraction) + combinedSamples[nextIndex] * fraction;
        }
        console.log(`Resampled audio from ${nativeSampleRate}Hz to ${targetSampleRate}Hz`);
    } else if (combinedSamples.length > 0) {
        console.log(`Audio already at target sample rate: ${targetSampleRate}Hz`);
    } else {
        console.warn("No audio samples collected to process.");
        setRecordingError("No audio was recorded. Please ensure your microphone is working and you speak during recording.");
        setAudioBlob(null);
        return;
    }

    const wavBlob = encodeWAV(resampledSamples, targetSampleRate);
    console.log(`Generated WAV Blob size: ${wavBlob.size} bytes`);
    setAudioBlob(wavBlob);

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
    if (audioBlob && !isRecording && customerRating > 0 && currentStep === 'voiceRecording') {
      setIsSubmitting(true);
      handleSubmitReview(customerRating, audioBlob);
    }
  }, [audioBlob, isRecording, customerRating, currentStep]);


  // Submit review to backend
  const handleSubmitReview = async (rating, voiceAudioBlob, textReview = null) => {
    setSubmissionMessage('');
    setGlobalError(''); // Clear global error
    setGlobalSuccessMessage(''); // Clear global success

    try {
      const formData = new FormData();
      formData.append('rating', rating);
      formData.append('customerName', customerName);
      formData.append('customerMobile', customerMobile);
      formData.append('sourceLanguage', selectedLanguage);

      if (userData?.companyId) {
        formData.append('companyId', userData.companyId);
      }
      if (userData?.branchId) {
        formData.append('branchId', userData.branchId);
      }

      if (voiceAudioBlob) {
        formData.append('voiceAudio', voiceAudioBlob, `voice_review_${Date.now()}.wav`);
      } else {
        formData.append('textReview', textReview || (rating >= 9 ? 'Excellent service!' : ''));
      }

      if (uploadedInvoiceFileUrl) {
        formData.append('invoiceFileUrl', uploadedInvoiceFileUrl);
      }
      if (extractedInvoiceData) {
        const finalInvoiceData = {
          ...extractedInvoiceData,
          customerName: customerName,
          customerMobile: customerMobile,
        };
        formData.append('invoiceData', JSON.stringify(finalInvoiceData));
      } else {
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
          setFeedbackType('positive');
          setSubmissionMessage('Thank you for your excellent feedback! We appreciate your high rating.');
        } else if (rating >= 6) {
          setFeedbackType('neutral');
          setSubmissionMessage('Thank you for your feedback! We are always striving to improve.');
        } else {
          setFeedbackType('negative');
          setSubmissionMessage('Thank you for your feedback. We are sorry to hear about your experience and will use your input to improve.');
        }
        setCurrentStep('submissionSuccess');
        setGlobalSuccessMessage('Review submitted successfully!');
      } else {
        if (response.status === 401) {
          setGlobalError('Session expired or unauthorized. Please log in again.');
          handleLogout();
        } else {
          setSubmissionMessage(data.message || 'Failed to submit review.');
          setFeedbackType('error');
          setCurrentStep('submissionSuccess');
          setGlobalError(data.message || 'Failed to submit review.');
        }
      }
    } catch (error) {
      console.error('Review submission API error:', error);
      setSubmissionMessage('An error occurred while submitting your review. Please ensure the backend is running.');
      setFeedbackType('error');
      setCurrentStep('submissionSuccess');
      setGlobalError('An error occurred while submitting your review.');
    } finally {
      setIsSubmitting(false);
      setAudioBlob(null);
    }
  };

  // Function to get appropriate emoji for rating buttons
  const getRatingEmoji = (rating) => {
    if (rating === 1) return '😡';
    if (rating === 2) return '😠';
    if (rating === 3) return '😟';
    if (rating === 4) return '😐';
    if (rating === 5) return '😕';
    if (rating === 6) return '🙂';
    if (rating === 7) return '😊';
    if (rating === 8) return '😄';
    if (rating === 9) return '🤩';
    if (rating === 10) return '✨';
    return '';
  };

  // Helper function to render a group of rating buttons
  const renderRatingButtons = (start, end) => {
    return Array.from({ length: end - start + 1 }, (_, i) => start + i).map((rating) => {
      let bgColor = 'bg-gray-200'; // Default light button
      let textColor = 'text-gray-800';
      let ringColor = 'ring-blue-400';
      let borderColor = 'border-gray-300';

      if (rating <= 3) {
        bgColor = 'bg-red-100';
        borderColor = 'border-red-300';
        ringColor = 'ring-red-400';
        textColor = 'text-red-700';
      } else if (rating >= 4 && rating <= 7) { // Adjusted range for neutral/passives
        bgColor = 'bg-yellow-100'; // Lighter yellow for 4-7
        borderColor = 'border-yellow-300';
        ringColor = 'ring-yellow-400';
        textColor = 'text-yellow-700';
      } else { // 8-10 (promoters)
        bgColor = 'bg-green-100';
        borderColor = 'border-green-300';
        ringColor = 'ring-green-400';
        textColor = 'text-green-700';
      }

      if (customerRating === rating) {
        bgColor = rating <= 3 ? 'bg-red-500' : (rating >= 4 && rating <= 7) ? 'bg-yellow-500' : 'bg-green-500';
        textColor = 'text-white';
        ringColor = 'ring-blue-500'; // Active state ring
        borderColor = 'border-transparent';
      }

      return (
        <button
          key={rating}
          onClick={() => handleRatingSelect(rating)}
          className={`
            flex flex-col items-center justify-center w-32 h-32 md:w-36 md:h-36 lg:w-40 lg:h-40
            rounded-2xl text-4xl font-bold
            shadow-lg hover:shadow-xl transform hover:scale-105
            transition-all duration-300 ease-in-out
            ${bgColor} ${textColor}
            ${customerRating === rating ? `ring-4 ring-offset-2 ring-offset-gray-100 ${ringColor}` : `border ${borderColor}`}
          `}
        >
          <span className="text-6xl">{getRatingEmoji(rating)}</span>
          <span className="text-2xl font-semibold mt-2">{rating}</span>
        </button>
      );
    });
  };

  const getSuccessPageStyling = () => {
    switch (feedbackType) {
      case 'positive':
        return {
          bgColor: 'from-green-200 to-green-50', // Lighter green gradient
          textColor: 'text-green-800',
          emoji: '✨',
          messageColor: 'text-green-700',
          buttonBg: 'bg-green-600 hover:bg-green-700',
          title: 'Fantastic Feedback!',
        };
      case 'neutral':
        return {
          bgColor: 'from-amber-200 to-amber-50', // Lighter amber gradient
          textColor: 'text-amber-800',
          emoji: '👍',
          messageColor: 'text-amber-700',
          buttonBg: 'bg-amber-600 hover:bg-amber-700',
          title: 'Feedback Received!',
        };
      case 'negative':
        return {
          bgColor: 'from-red-200 to-red-50', // Lighter red gradient
          textColor: 'text-red-800',
          emoji: '😔',
          messageColor: 'text-red-700',
          buttonBg: 'bg-red-600 hover:bg-red-700',
          title: 'We Appreciate Your Honesty!',
        };
      case 'error':
        return {
          bgColor: 'from-gray-200 to-white', // Light for errors
          textColor: 'text-red-600',
          emoji: '❌',
          messageColor: 'text-red-700',
          buttonBg: 'bg-gray-500 hover:bg-gray-600',
          title: 'Submission Error!',
        };
      default:
        return {
          bgColor: 'from-blue-200 to-blue-50', // Default light blue
          textColor: 'text-blue-800',
          emoji: '✅',
          messageColor: 'text-blue-700',
          buttonBg: 'bg-blue-600 hover:bg-blue-600', // Changed to blue-600
          title: 'Feedback Submitted!',
        };
    }
  };

  // Function to reset the flow to the beginning (invoice upload)
  const resetFlow = () => {
    setCurrentStep('invoiceUpload');
    setInvoiceFile(null);
    setIsProcessingInvoice(false);
    setInvoiceProcessingError('');
    setExtractedInvoiceData(null);
    setUploadedInvoiceFileUrl(null);
    setInvoiceDateError('');
    setCustomerName('');
    setCustomerMobile('');
    setCustomerDetailsError('');
    setCustomerRating(0);
    setSelectedLanguage('en-US');
    setIsRecording(false);
    setRecordingError('');
    setAudioBlob(null);
    setIsSubmitting(false);
    setSubmissionMessage('');
    setFeedbackType('');
    stopRecording(); // Ensure microphone is stopped
    // When flow resets, ensure parent is notified to show tabs again
    if (typeof onFlowStatusChange === 'function') {
      onFlowStatusChange(false);
    }
  };


  return (
    // Removed bg-gray-100 from here to allow App.jsx's background to show through
    <div className="min-h-screen flex flex-col items-center justify-center p-4 font-sans">
      {currentStep === 'invoiceUpload' && (
        <div className="w-full max-w-4xl mx-auto flex flex-col items-center">
          <h2 className="text-5xl font-extrabold text-orange-500 text-center mb-10 tracking-tight"> {/* Changed text color here */}
            Initiate Customer Feedback
          </h2>
          <div className="bg-white p-10 rounded-2xl shadow-xl w-full border border-blue-200 transition-all duration-500 transform hover:scale-[1.01]"> {/* Light card */}
            <div className="space-y-6">
              <div>
                <label htmlFor="invoiceFile" className="block text-lg font-medium text-gray-700 mb-2">
                  Select Invoice (PDF, JPG, PNG)
                </label>
                <input
                  type="file"
                  id="invoiceFile"
                  accept=".pdf, .jpg, .jpeg, .png"
                  className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-lg transition duration-200 bg-gray-50 text-gray-800 placeholder-gray-400"
                  onChange={handleInvoiceFileChange}
                />
              </div>
              {invoiceProcessingError && (
                <p className="text-red-600 text-sm font-medium text-center bg-red-100 p-3 rounded-lg border border-red-300">{invoiceProcessingError}</p>
              )}
              {!extractedInvoiceData && (
                <button
                  onClick={handleProcessInvoice}
                  disabled={!invoiceFile || isProcessingInvoice}
                  className="w-full flex items-center justify-center py-3 px-6 border border-transparent rounded-lg shadow-md text-xl font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-300 ease-in-out transform hover:scale-105"
                >
                  {isProcessingInvoice ? (
                    <>
                      <svg className="animate-spin h-6 w-6 text-white mr-3" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing Invoice...
                    </>
                  ) : (
                    'Next'
                  )}
                </button>
              )}

              {extractedInvoiceData && (
                <div className="mt-8 p-6 bg-blue-50 rounded-xl border border-blue-200 shadow-inner text-gray-800"> {/* Lighter nested card */}
                  <h3 className="text-2xl font-bold text-blue-700 mb-5 text-center">Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-base">
                    {/* Job Card Number */}
                    <div className="flex flex-col">
                      <label htmlFor="jobCardNumber" className="font-semibold text-gray-600 mb-1 text-sm">Job Card Number:</label>
                      <input
                        type="text"
                        id="jobCardNumber"
                        value={extractedInvoiceData.jobCardNumber || ''}
                        onChange={(e) => setExtractedInvoiceData(prev => ({ ...prev, jobCardNumber: e.target.value }))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-base bg-white text-gray-800 placeholder-gray-400"
                        placeholder="N/A"
                      />
                    </div>
                    {/* Invoice Number */}
                    <div className="flex flex-col">
                      <label htmlFor="invoiceNumber" className="font-semibold text-gray-600 mb-1 text-sm">Invoice Number:</label>
                      <input
                        type="text"
                        id="invoiceNumber"
                        value={extractedInvoiceData.invoiceNumber || ''}
                        onChange={(e) => setExtractedInvoiceData(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-base bg-white text-gray-800 placeholder-gray-400"
                        placeholder="N/A"
                      />
                    </div>
                    {/* Invoice Date */}
                    <div className="flex flex-col">
                      <label htmlFor="invoiceDate" className="font-semibold text-gray-600 mb-1 text-sm">Invoice Date (DD/MM/YYYY):</label>
                      <input
                        type="text"
                        id="invoiceDate"
                        value={extractedInvoiceData.invoiceDate || ''}
                        onChange={(e) => {
                          const newDate = e.target.value;
                          const isValid = /^\d{2}\/\d{2}\/\d{4}$/.test(newDate);
                          setExtractedInvoiceData(prev => ({ ...prev, invoiceDate: newDate }));
                          setInvoiceDateError(isValid || newDate === '' ? '' : 'Date must be in DD/MM/YYYY format.');
                        }}
                        pattern="\d{2}/\d{2}/\d{4}"
                        title="Please enter date in DD/MM/YYYY format"
                        className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-base bg-white text-gray-800 placeholder-gray-400"
                        placeholder="N/A"
                      />
                      {invoiceDateError && (
                        <p className="text-red-600 text-xs font-medium mt-1">{invoiceDateError}</p>
                      )}
                    </div>
                    {/* VIN */}
                    <div className="flex flex-col">
                      <label htmlFor="vin" className="font-semibold text-gray-600 mb-1 text-sm">VIN:</label>
                      <input
                        type="text"
                        id="vin"
                        value={extractedInvoiceData.vin || ''}
                        onChange={(e) => setExtractedInvoiceData(prev => ({ ...prev, vin: e.target.value }))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-base bg-white text-gray-800 placeholder-gray-400"
                        placeholder="N/A"
                      />
                    </div>
                    {/* Customer Name */}
                    <div className="col-span-full flex flex-col">
                      <label htmlFor="customerName" className="font-semibold text-gray-600 mb-1 text-sm">Customer Name (from Invoice):</label>
                      <input
                        type="text"
                        id="customerName"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-base bg-white text-gray-800 placeholder-gray-400"
                        placeholder="Enter name if not extracted"
                      />
                    </div>
                    {/* Customer Mobile */}
                    <div className="col-span-full flex flex-col">
                      <label htmlFor="customerMobile" className="font-semibold text-gray-600 mb-1 text-sm">Customer Mobile (from Invoice):</label>
                      <input
                        type="tel"
                        id="customerMobile"
                        value={customerMobile}
                        onChange={(e) => setCustomerMobile(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-base bg-white text-gray-800 placeholder-gray-400"
                        placeholder="Enter mobile if not extracted"
                      />
                    </div>
                    {customerDetailsError && (
                      <p className="text-red-600 text-sm font-medium col-span-full text-center bg-red-100 p-2 rounded-lg border border-red-300">{customerDetailsError}</p>
                    )}
                  </div>
                  <button
                    onClick={handleConfirmDetailsAndProceed}
                    className="w-full flex justify-center py-3 px-6 border border-transparent rounded-lg shadow-md text-xl font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-300 ease-in-out transform hover:scale-105 mt-8"
                  >
                    Confirm Customer Details
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {currentStep === 'customerReview' && (
        <div className="w-full max-w-6xl mx-auto flex flex-col items-center">
          <h2 className="text-5xl font-extrabold text-orange-500 text-center mb-10 tracking-tight"> {/* Changed text color here */}
            How was your service experience?
          </h2>

          {customerName && customerMobile && (
            <div className="bg-white p-6 rounded-xl shadow-lg mb-8 text-center border-t-4 border-blue-500 text-gray-800 w-full max-w-2xl">
              <p className="text-xl font-semibold text-gray-600">Reviewing for:</p>
              <p className="text-3xl font-bold text-blue-700 mt-2">{customerName}</p>
              <p className="text-lg text-gray-700">{customerMobile}</p>
              {extractedInvoiceData && (
                <div className="mt-5 text-sm text-gray-600 space-y-1">
                  <p>Job Card: <span className="font-medium text-gray-700">{extractedInvoiceData.jobCardNumber || 'N/A'}</span></p>
                  <p>Invoice No: <span className="font-medium text-gray-700">{extractedInvoiceData.invoiceNumber || 'N/A'}</span></p>
                  <p>Invoice Date: <span className="font-medium text-gray-700">{extractedInvoiceData.invoiceDate || 'N/A'}</span></p>
                  <p>VIN: <span className="font-medium text-gray-700">{extractedInvoiceData.vin || 'N/A'}</span></p>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col items-center w-full max-w-7xl mb-10 space-y-6">
            <div className="flex justify-center flex-wrap gap-6 w-full">
              {renderRatingButtons(1, 5)}
            </div>
            <div className="flex justify-center flex-wrap gap-6 w-full">
              {renderRatingButtons(6, 10)}
            </div>
          </div>

          <button
            onClick={() => setCurrentStep('invoiceUpload')}
            className="mt-8 px-8 py-3 bg-gray-300 text-gray-800 rounded-lg shadow-md hover:bg-gray-400 transition-all duration-300 ease-in-out hover:scale-105 font-semibold text-lg border border-gray-400"
          >
            Back to Invoice Upload
          </button>
        </div>
      )}

      {currentStep === 'voiceRecording' && (
        <div className="w-full max-w-5xl mx-auto flex flex-col items-center">
          <h2 className="text-5xl font-extrabold text-orange-500 text-center mb-10 tracking-tight"> {/* Changed text color here */}
            Share Your Valuable Feedback
          </h2>

          {customerName && customerMobile && (
            <div className="bg-white p-6 rounded-xl shadow-lg mb-8 text-center border-t-4 border-blue-500 text-gray-800 w-full max-w-2xl">
              <p className="text-xl font-semibold text-gray-600">Reviewing for:</p>
              <p className="text-3xl font-bold text-blue-700 mt-2">{customerName}</p>
              <p className="text-lg text-gray-700">{customerMobile}</p>
              {extractedInvoiceData && (
                <div className="mt-5 text-sm text-gray-600 space-y-1">
                  <p>Job Card: <span className="font-medium text-gray-700">{extractedInvoiceData.jobCardNumber || 'N/A'}</span></p>
                  <p>Invoice No: <span className="font-medium text-gray-700">{extractedInvoiceData.invoiceNumber || 'N/A'}</span></p>
                  <p>Invoice Date: <span className="font-medium text-gray-700">{extractedInvoiceData.invoiceDate || 'N/A'}</span></p>
                  <p>VIN: <span className="font-medium text-gray-700">{extractedInvoiceData.vin || 'N/A'}</span></p>
                </div>
              )}
            </div>
          )}

          <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-3xl text-center mb-8 border border-blue-200 text-gray-800">
            <label htmlFor="language-select" className="block text-2xl font-semibold text-gray-700 mb-5">
              Select Spoken Language:
            </label>
            <select
              id="language-select"
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="block w-full px-5 py-3 text-xl border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 transition duration-200 bg-gray-50 text-gray-800 appearance-none cursor-pointer"
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

          <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-3xl text-center mb-8 border border-blue-200 text-gray-800">
            {isSubmitting ? (
              <div className="flex flex-col items-center justify-center py-8 text-blue-600 text-2xl font-medium">
                <svg className="animate-spin h-10 w-10 text-blue-500 mb-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Submitting your feedback...</span>
                <p className="text-lg text-gray-600 mt-3">Please wait, this may take a moment for transcription and analysis.</p>
              </div>
            ) : (
              <>
                <p className="text-2xl font-semibold text-gray-700 mb-6">Click to record your valuable feedback:</p>
                {recordingError && (
                  <p className="text-red-600 text-sm mb-5 bg-red-100 p-3 rounded-lg border border-red-300">{recordingError}</p>
                )}
                <button
                  onClick={handleVoiceRecordSubmit}
                  disabled={isSubmitting}
                  className={`w-full flex items-center justify-center py-4 px-6 rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 transition-all duration-300 ease-in-out text-2xl font-bold transform hover:scale-105
                    ${isRecording ? 'bg-red-500 hover:bg-red-600 focus:ring-red-400' : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'}
                    text-white`}
                >
                  {isRecording ? (
                    <>
                      <span className="relative flex h-3 w-3 mr-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-300 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-400"></span>
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
            onClick={() => setCurrentStep('customerReview')}
            disabled={isSubmitting}
            className="mt-10 px-8 py-3 bg-gray-300 text-gray-800 rounded-lg shadow-md hover:bg-gray-400 transition-all duration-300 ease-in-out hover:scale-105 font-semibold text-lg border border-gray-400"
          >
            Go Back to Rating
          </button>
        </div>
      )}

      {currentStep === 'submissionSuccess' && (
        <div className={`min-h-screen flex flex-col items-center justify-center bg-gradient-to-br ${getSuccessPageStyling().bgColor} p-8 text-center font-sans`}>
          <div className={`bg-white bg-opacity-90 backdrop-filter backdrop-blur-lg p-14 rounded-3xl shadow-3xl transform transition-all duration-700 ease-in-out scale-100 animate-fade-in border-t-8 border-b-8 border-opacity-50 ${feedbackType === 'positive' ? 'border-green-500' : feedbackType === 'neutral' ? 'border-amber-500' : feedbackType === 'negative' ? 'border-red-500' : 'border-gray-300'}`}> {/* Light card with border */}
            <span className={`text-8xl mb-7 block ${getSuccessPageStyling().textColor} animate-bounce-once`}>{getSuccessPageStyling().emoji}</span>
            <h2 className={`text-5xl font-extrabold mb-7 ${getSuccessPageStyling().textColor} drop-shadow-md`}>{getSuccessPageStyling().title}</h2>
            <p className={`text-2xl font-medium mb-10 ${getSuccessPageStyling().messageColor} max-w-3xl mx-auto leading-relaxed`}>
              {submissionMessage}
            </p>
            <button
              onClick={resetFlow}
              className={`py-4 px-10 rounded-full text-2xl font-bold text-white shadow-xl transition-all duration-300 ease-in-out hover:scale-105 ${getSuccessPageStyling().buttonBg}`}
            >
              Take Another Review
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReviewSubmissionFlow;
