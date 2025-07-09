import React, { useState, useEffect } from 'react';

// ClientReviewsDashboard Component
const ClientReviewsDashboard = ({ clientId, token, API_BASE_URL, handleLogout, goToDashboard, companyId, branchId }) => {
  const [clientReviews, setClientReviews] = useState([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);
  const [reviewsError, setReviewsError] = useState('');
  const [startDate, setStartDate] = useState(''); // State for start date filter
  const [endDate, setEndDate] = useState('');     // State for end date filter
  const [clientDetails, setClientDetails] = useState(null); // State for client details

  // Helper function to parse response, handling non-JSON
  const parseResponse = async (response) => {
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return response.json();
    }
    return response.text().then(text => ({ message: text || 'An unknown error occurred.' }));
  };

  // Function to fetch client-specific reviews
  const fetchClientReviews = async (id, start = '', end = '') => {
    if (!id || !token) {
      setReviewsError('Not authorized. Please log in.');
      return;
    }
    setIsLoadingReviews(true);
    setReviewsError('');

    try {
      let url = `${API_BASE_URL}/reviews/${id}`;
      const queryParams = [];

      if (start) {
        queryParams.push(`startDate=${start}`);
      }
      if (end) {
        queryParams.push(`endDate=${end}`);
      }

      if (queryParams.length > 0) {
        url += `?${queryParams.join('&')}`;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await parseResponse(response);

      if (response.ok) {
        setClientReviews(data);
        // If reviews are fetched, extract client's company and branch details from the first review
        // assuming all reviews belong to the same client/company/branch.
        if (data.length > 0) {
          setClientDetails({
            email: data[0].client?.email, // Should now correctly get email if backend populates 'client' with 'email'
            companyName: data[0].company?.name,
            branchName: data[0].branch?.name,
          });
        } else {
          // If no reviews, try to fetch client details directly if needed, or clear previous
          // This part might need a separate API call if client details are not always available via reviews
          // For now, we'll clear it if no reviews are found.
          setClientDetails(null);
        }
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

  // Fetch reviews when component mounts or clientId/token/date filters change
  useEffect(() => {
    if (clientId && token) {
      console.log("Fetching reviews for clientId:", clientId, "with startDate:", startDate, "endDate:", endDate);
      fetchClientReviews(clientId, startDate, endDate);
    }
  }, [clientId, token, startDate, endDate]); // Dependencies for useEffect now include dates

  // Function to get appropriate emoji for rating buttons (duplicated for self-containment)
  const getRatingEmoji = (rating) => {
    if (rating === 1) return '😡';
    if (rating === 2) return '😠';
    if (rating === 3) return '😞';
    if (rating === 4) return '😐';
    if (rating === 5) return '�';
    if (rating === 6) return '🙂';
    if (rating === 7) return '😊';
    if (rating === 8) return '😄';
    if (rating === 9) return '🤩';
    if (rating === 10) return '✨';
    return '';
  };

  // Helper function to format date to DD/MM/YYYY
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-GB', options); // 'en-GB' forces DD/MM/YYYY
  };

  return (
    <div className="min-h-screen flex flex-col items-center bg-gradient-to-br from-purple-400 to-indigo-600 p-4 pt-10">
      <h2 className="text-5xl font-extrabold text-center text-white mb-12 drop-shadow-lg">Your Collected Reviews</h2>

      {/* Client Details Section */}
      <div className="w-full max-w-4xl bg-white p-6 rounded-xl shadow-lg mb-8 border-t-4 border-blue-500 text-center">
        <p className="text-2xl font-bold text-gray-800 mb-2">
          Client: {clientDetails?.email || 'N/A'}
        </p>
        <p className="text-lg text-gray-600">
          {clientDetails?.companyName && `Company: ${clientDetails.companyName}`}
          {clientDetails?.companyName && clientDetails?.branchName && ' | '}
          {clientDetails?.branchName && `Branch: ${clientDetails.branchName}`}
        </p>
      </div>

      {/* Date Filter Section */}
      <div className="w-full max-w-4xl bg-white p-6 rounded-xl shadow-lg mb-8 flex flex-col md:flex-row items-center justify-center space-y-4 md:space-y-0 md:space-x-6 border-t-4 border-teal-500">
        <div className="flex items-center space-x-3 w-full md:w-auto">
          <label htmlFor="startDate" className="text-gray-700 font-semibold text-lg">From:</label>
          <input
            type="date"
            id="startDate"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-base"
          />
        </div>
        <div className="flex items-center space-x-3 w-full md:w-auto">
          <label htmlFor="endDate" className="text-gray-700 font-semibold text-lg">To:</label>
          <input
            type="date"
            id="endDate"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-base"
          />
        </div>
      </div>

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
          <p className="text-gray-600 text-center text-lg py-8">No reviews collected yet for this client matching your criteria.</p>
        ) : (
          <div className="overflow-x-auto"> {/* Added for horizontal scrolling on small screens */}
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rating</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transcribed Text</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Voice Audio</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice Data</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {clientReviews.map((review) => (
                  <tr key={review._id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {review.rating} {getRatingEmoji(review.rating)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {review.customerName} ({review.customerMobile})
                    </td>
                    <td className="px-6 py-4 max-w-xs overflow-hidden text-ellipsis text-sm text-gray-500">
                      {review.transcribedText || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {review.voiceData ? (
                        <audio controls src={review.voiceData} className="w-24 h-8"></audio> 
                      ) : 'N/A'}
                    </td>
                    <td className="px-6 py-4 max-w-xs overflow-hidden text-ellipsis text-sm text-gray-500">
                      {review.invoiceData ? (
                        <div className="text-xs">
                          {review.invoiceData.jobCardNumber && `Job Card: ${review.invoiceData.jobCardNumber}`}<br/>
                          {review.invoiceData.invoiceNumber && `Invoice No: ${review.invoiceData.invoiceNumber}`}<br/>
                          {review.invoiceData.invoiceDate && `Invoice Date: ${formatDate(review.invoiceData.invoiceDate)}`}
                          {review.invoiceFileUrl && (
                            <a
                              href={review.invoiceFileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline block mt-1"
                            >
                              View File
                            </a>
                          )}
                        </div>
                      ) : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(review.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
