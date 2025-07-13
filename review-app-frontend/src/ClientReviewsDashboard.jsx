import React, { useState, useEffect, useCallback } from 'react';

// ClientReviewsDashboard Component (now only for displaying the review table)
const ClientReviewsDashboard = ({ clientId, token, API_BASE_URL, handleLogout }) => {
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
        if (data.length > 0) {
          setClientDetails({
            email: data[0].client?.email,
            companyName: data[0].company?.name,
            branchName: data[0].branch?.name,
          });
        } else {
          setClientDetails(null);
        }
      } else {
        if (response.status === 401) {
          setReviewsError('Session expired or unauthorized. Please log in again.');
          handleLogout();
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
      fetchClientReviews(clientId, startDate, endDate);
    }
  }, [clientId, token, startDate, endDate]);

  // Function to get appropriate emoji for rating buttons
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

  // Helper function to format date to DD/MM/YYYY
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-GB', options);
  };

  return (
    <div className="w-full max-w-6xl bg-white p-8 rounded-2xl shadow-xl border-t-4 border-blue-500 mx-auto">
      <h3 className="text-3xl font-bold text-center text-gray-800 mb-6">My Reviews</h3>

      {/* Date Filter Section */}
      <div className="w-full bg-white p-6 rounded-xl shadow-lg mb-8 flex flex-col md:flex-row items-center justify-center space-y-4 md:space-y-0 md:space-x-6 border-t-4 border-teal-500">
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
        <div className="overflow-x-auto">
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
  );
};

export default ClientReviewsDashboard;
