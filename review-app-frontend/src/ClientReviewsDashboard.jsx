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
    <div className="w-full max-w-7xl bg-gray-900 p-8 rounded-2xl shadow-3xl border border-gray-700 mx-auto font-inter">
      <h3 className="text-4xl font-bold text-center text-white mb-8">My Reviews</h3>

      {/* Client Details Section */}
      {clientDetails && (
        <div className="bg-gray-800 p-6 rounded-xl shadow-md mb-8 text-center border-t-4 border-blue-700 text-gray-100">
          <p className="text-xl font-semibold text-gray-300">Reviews for:</p>
          <p className="text-3xl font-bold text-blue-400 mt-1">{clientDetails.email}</p>
          <p className="text-lg text-gray-400">
            {clientDetails.companyName && `Company: ${clientDetails.companyName}`}
            {clientDetails.branchName && ` | Branch: ${clientDetails.branchName}`}
          </p>
        </div>
      )}

      {/* Date Filter Section */}
      <div className="w-full bg-gray-800 p-6 rounded-xl shadow-lg mb-8 flex flex-col md:flex-row items-center justify-center space-y-4 md:space-y-0 md:space-x-6 border-t-4 border-teal-700">
        <div className="flex items-center space-x-3 w-full md:w-auto">
          <label htmlFor="startDate" className="text-gray-300 font-semibold text-lg">From:</label>
          <input
            type="date"
            id="startDate"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="p-3 border border-gray-600 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 text-base bg-gray-900 text-gray-100"
          />
        </div>
        <div className="flex items-center space-x-3 w-full md:w-auto">
          <label htmlFor="endDate" className="text-gray-300 font-semibold text-lg">To:</label>
          <input
            type="date"
            id="endDate"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="p-3 border border-gray-600 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 text-base bg-gray-900 text-gray-100"
          />
        </div>
      </div>

      {isLoadingReviews ? (
        <div className="flex flex-col items-center justify-center py-12 text-blue-400 text-xl">
          <svg className="animate-spin h-10 w-10 text-blue-400 mb-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Loading Reviews...
        </div>
      ) : reviewsError ? (
        <p className="text-red-400 text-center text-lg py-12 bg-red-900 bg-opacity-30 p-4 rounded-lg border border-red-700">{reviewsError}</p>
      ) : clientReviews.length === 0 ? (
        <p className="text-gray-400 text-center text-xl py-12 bg-gray-800 p-4 rounded-lg border border-gray-700">No reviews collected yet for this client matching your criteria.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl shadow-lg border border-gray-700">
          <table className="min-w-full divide-y divide-gray-700">
            <thead className="bg-gray-800">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-300 uppercase tracking-wider">Rating</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-300 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-300 uppercase tracking-wider">Transcribed Text</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-300 uppercase tracking-wider">Voice Audio</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-300 uppercase tracking-wider">Invoice Data</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-300 uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody className="bg-gray-900 divide-y divide-gray-800">
              {clientReviews.map((review) => (
                <tr key={review._id} className="hover:bg-gray-800 transition-colors duration-200">
                  <td className="px-6 py-4 text-lg font-medium text-white" data-label="Rating">
                    {review.rating} <span className="text-2xl">{getRatingEmoji(review.rating)}</span>
                  </td>
                  <td className="px-6 py-4 text-base text-gray-300" data-label="Customer">
                    <p className="font-semibold">{review.customerName}</p>
                    <p className="text-sm text-gray-400">{review.customerMobile}</p>
                  </td>
                  <td className="px-6 py-4 text-base text-gray-300" data-label="Transcribed Text">
                    {review.transcribedText || 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-base text-gray-300" data-label="Voice Audio">
                    {review.voiceData ? (
                      <audio controls src={review.voiceData} className="w-full max-w-[150px] h-10 rounded-lg"></audio>
                    ) : 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-base text-gray-300" data-label="Invoice Data">
                    {review.invoiceData ? (
                      <div className="text-sm space-y-1">
                        {review.invoiceData.jobCardNumber && <p><span className="font-semibold">Job Card:</span> {review.invoiceData.jobCardNumber}</p>}
                        {review.invoiceData.invoiceNumber && <p><span className="font-semibold">Invoice No:</span> {review.invoiceData.invoiceNumber}</p>}
                        {review.invoiceData.invoiceDate && <p><span className="font-semibold">Inv Date:</span> {formatDate(review.invoiceData.invoiceDate)}</p>}
                        {review.invoiceData.vin && <p><span className="font-semibold">VIN:</span> {review.invoiceData.vin}</p>}
                        {review.invoiceData.customerNameFromInvoice && <p><span className="font-semibold">Cust Name (Inv):</span> {review.invoiceData.customerNameFromInvoice}</p>}
                        {review.invoiceData.customerMobileFromInvoice && <p><span className="font-semibold">Cust Mobile (Inv):</span> {review.invoiceData.customerMobileFromInvoice}</p>}
                        {review.invoiceFileUrl && (
                          <a
                            href={review.invoiceFileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:underline block mt-2 font-medium"
                          >
                            View Invoice File
                          </a>
                        )}
                      </div>
                    ) : 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-base text-gray-300" data-label="Date">
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
