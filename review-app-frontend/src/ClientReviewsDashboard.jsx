import React, { useState, useEffect } from 'react';

// ClientReviewsDashboard Component
const ClientReviewsDashboard = ({ clientId, token, API_BASE_URL, handleLogout, goToDashboard }) => {
  const [clientReviews, setClientReviews] = useState([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);
  const [reviewsError, setReviewsError] = useState('');

  // Helper function to parse response, handling non-JSON
  const parseResponse = async (response) => {
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return response.json();
    }
    return response.text().then(text => ({ message: text || 'An unknown error occurred.' }));
  };

  // Function to fetch client-specific reviews
  const fetchClientReviews = async (id) => {
    if (!id || !token) {
      setReviewsError('Not authorized. Please log in.');
      return;
    }
    setIsLoadingReviews(true);
    setReviewsError('');
    try {
      const response = await fetch(`${API_BASE_URL}/reviews/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await parseResponse(response);

      if (response.ok) {
        setClientReviews(data);
      } else {
        if (response.status === 401) {
          setReviewsError('Session expired or unauthorized. Please log in again.');
          handleLogout(); // Trigger logout from parent
        } else {
          setReviewsError(data.message || 'Failed to fetch reviews.');
        }
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
      setReviewsError('Could not load reviews. Please ensure the backend is running and MongoDB is accessible.');
    } finally {
      setIsLoadingReviews(false);
    }
  };

  // Fetch reviews when component mounts or clientId/token changes
  useEffect(() => {
    if (clientId && token) {
      fetchClientReviews(clientId);
    }
  }, [clientId, token]); // Dependencies for useEffect

  // Function to get appropriate emoji for rating buttons (duplicated for self-containment)
  const getRatingEmoji = (rating) => {
    if (rating === 1) return '😡';
    if (rating === 2) return '😠';
    if (rating === 3) return '😞';
    if (rating === 4) return '😐';
    if (rating === 5) return '😕';
    if (rating === 6) return '🙂';
    if (rating === 7) return '😊';
    if (rating === 8) return '😄';
    if (rating === 9) return '🤩';
    if (rating === 10) return '✨';
    return '';
  };

  return (
    <div className="min-h-screen flex flex-col items-center bg-gradient-to-br from-purple-400 to-indigo-600 p-4 pt-10">
      <h2 className="text-5xl font-extrabold text-center text-white mb-12 drop-shadow-lg">Your Collected Reviews</h2>

      <div className="w-full max-w-4xl bg-white p-8 rounded-2xl shadow-xl border-t-4 border-blue-500">
        {isLoadingReviews ? (
          <div className="flex items-center justify-center py-8 text-blue-600 text-xl">
            <svg className="animate-spin h-8 w-8 text-blue-500 mr-3" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Loading Reviews...
          </div>
        ) : reviewsError ? (
          <p className="text-red-600 text-center text-lg py-8">{reviewsError}</p>
        ) : clientReviews.length === 0 ? (
          <p className="text-gray-600 text-center text-lg py-8">No reviews collected yet for this client.</p>
        ) : (
          <div className="space-y-6">
            {clientReviews.map((review) => (
              <div key={review._id} className="bg-gray-50 p-5 rounded-lg shadow-md border border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xl font-bold text-gray-900">
                    {review.customerName}
                  </span>
                  <span className="text-sm text-gray-500">
                    {review.customerMobile}
                  </span>
                </div>
                <div className="flex items-center mb-2">
                  <span className={`text-xl font-bold mr-2 ${review.feedbackType === 'positive' ? 'text-green-700' : review.feedbackType === 'neutral' ? 'text-yellow-700' : 'text-red-700'}`}>
                    Rating: {review.rating} {getRatingEmoji(review.rating)}
                  </span>
                  <span className="text-sm text-gray-500">
                    {new Date(review.createdAt).toLocaleDateString()}
                  </span>
                </div>
                {review.textReview && (
                  <p className="text-gray-700 text-base mb-2">
                    <span className="font-semibold">Review:</span> {review.textReview}
                  </p>
                )}
                {review.voiceData && (
                  <div className="mt-2">
                    <p className="text-gray-600 text-sm italic mb-2">
                      Voice Review:
                    </p>
                    <audio controls src={review.voiceData} className="w-full rounded-lg shadow-sm"></audio>
                  </div>
                )}
                {review.transcribedText && ( // Display transcribed text
                  <div className="mt-2 p-3 bg-blue-50 rounded-md border border-blue-200">
                    <p className="font-semibold text-blue-700 mb-1">Transcribed Text:</p>
                    <p className="text-sm text-blue-900 italic">{review.transcribedText}</p>
                  </div>
                )}
                {review.invoiceFileUrl && (
                  <div className="mt-2">
                    <p className="text-gray-600 text-sm italic mb-2">
                      Invoice File:
                    </p>
                    <a
                      href={review.invoiceFileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-sm break-all"
                    >
                      View Invoice ({review.invoiceFileUrl.split('.').pop().toUpperCase()})
                    </a>
                  </div>
                )}
                {review.invoiceData && (
                  <div className="mt-2 p-3 bg-gray-100 rounded-md border border-gray-200">
                    <p className="font-semibold text-gray-700 mb-1">Invoice Details:</p>
                    <ul className="text-sm text-gray-800 list-disc list-inside space-y-0.5">
                      <li>Job Card: {review.invoiceData.jobCardNumber || 'N/A'}</li>
                      <li>Invoice No: {review.invoiceData.invoiceNumber || 'N/A'}</li>
                      <li>Invoice Date: {review.invoiceData.invoiceDate || 'N/A'}</li>
                      <li>VIN: {review.invoiceData.vin || 'N/A'}</li>
                      {review.invoiceData.customerNameFromInvoice && (
                        <li>Customer Name: {review.invoiceData.customerNameFromInvoice}</li>
                      )}
                      {review.invoiceData.customerMobileFromInvoice && (
                        <li>Customer Mobile: {review.invoiceData.customerMobileFromInvoice}</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={goToDashboard}
        className="mt-16 px-8 py-4 bg-blue-600 text-white rounded-xl shadow-lg hover:bg-blue-700 transform transition-all duration-300 ease-in-out hover:scale-105 font-semibold text-xl"
      >
        Back to Main Dashboard
      </button>
    </div>
  );
};

export default ClientReviewsDashboard;
