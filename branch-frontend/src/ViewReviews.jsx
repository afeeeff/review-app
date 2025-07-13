import React, { useState, useEffect, useCallback } from 'react';

const ViewReviews = ({
  userData,
  API_BASE_URL,
  isLoading,
  error,
  successMessage,
  setIsLoading,
  setError,
  setSuccessMessage,
  filteredClients, // Passed from App.jsx for client filter dropdown
  fetchClientsForBranchAdminFilters, // Passed from App.jsx to update filteredClients
}) => {
  const [reviews, setReviews] = useState([]);
  const [filterClientId, setFilterClientId] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  // Helper to get auth headers
  const getAuthHeaders = useCallback(() => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${userData?.token}`,
  }), [userData?.token]);

  // --- Reviews API Calls (Branch Admin Scope) ---
  const fetchBranchReviews = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      let url = `${API_BASE_URL}/branch/reviews?`;
      if (filterClientId) {
        url += `clientId=${filterClientId}&`;
      }
      if (filterStartDate) {
        url += `startDate=${filterStartDate}&`;
      }
      if (filterEndDate) {
        url += `endDate=${filterEndDate}&`;
      }

      const response = await fetch(url, {
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      if (response.ok) {
        setReviews(data);
      } else {
        setError(data.message || 'Failed to fetch reviews.');
        setReviews([]);
      }
    } catch (err) {
      console.error('Error fetching branch reviews:', err);
      setError('Network error fetching reviews.');
      setReviews([]);
    } finally {
      setIsLoading(false);
    }
  }, [API_BASE_URL, filterClientId, filterStartDate, filterEndDate, getAuthHeaders, setIsLoading, setError]);

  // Effect to trigger review fetching and client dropdown data fetching
  useEffect(() => {
    if (userData?.token && userData?.branchId) {
      fetchBranchReviews();
      fetchClientsForBranchAdminFilters(); // Fetch clients for the filter dropdown
    }
  }, [filterClientId, filterStartDate, filterEndDate, userData, fetchBranchReviews, fetchClientsForBranchAdminFilters]);


  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h3 className="text-2xl font-semibold text-gray-800 mb-4">View Branch Reviews</h3>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div>
          <label htmlFor="filterClient" className="block text-sm font-medium text-gray-700">Filter by Client:</label>
          <select
            id="filterClient"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            value={filterClientId}
            onChange={(e) => setFilterClientId(e.target.value)}
            disabled={filteredClients.length === 0}
          >
            <option value="">All Clients</option>
            {filteredClients.map(client => (
              <option key={client._id} value={client._id}>{client.email}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="filterStartDate" className="block text-sm font-medium text-gray-700">Start Date:</label>
          <input
            type="date"
            id="filterStartDate"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            value={filterStartDate}
            onChange={(e) => setFilterStartDate(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="filterEndDate" className="block text-sm font-medium text-gray-700">End Date:</label>
          <input
            type="date"
            id="filterEndDate"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            value={filterEndDate}
            onChange={(e) => setFilterEndDate(e.target.value)}
          />
        </div>
      </div>

      <button
        onClick={fetchBranchReviews}
        className="mb-6 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        disabled={isLoading}
      >
        {isLoading ? 'Loading Reviews...' : 'Apply Filters'}
      </button>

      {isLoading && (
        <div className="text-center text-indigo-600 font-semibold mb-4">Loading Reviews...</div>
      )}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}

      <h4 className="text-xl font-semibold text-gray-800 mb-4">Your Branch's Reviews ({reviews.length})</h4>
      {reviews.length === 0 && !isLoading && !error && <p className="text-gray-600">No reviews found for your branch matching your criteria.</p>}
      {reviews.length > 0 && (
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
              {reviews.map((review) => (
                <tr key={review._id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{review.rating}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {review.customerName} ({review.customerMobile})<br/>
                    <span className="text-xs text-gray-400">Client: {review.client?.email || 'N/A'}</span>
                  </td>
                  <td className="px-6 py-4 max-w-xs overflow-hidden text-ellipsis text-sm text-gray-500">{review.transcribedText || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {review.voiceData ? (
                      <a href={review.voiceData} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-900">Listen</a>
                    ) : 'N/A'}
                  </td>
                  <td className="px-6 py-4 max-w-xs overflow-hidden text-ellipsis text-sm text-gray-500">
                    {review.invoiceData ? (
                      <div className="text-xs">
                        {review.invoiceData.jobCardNumber && `Job Card: ${review.invoiceData.jobCardNumber}`}<br/>
                        {review.invoiceData.invoiceNumber && `Invoice No: ${review.invoiceData.invoiceNumber}`}<br/>
                        {review.invoiceData.invoiceDate && `Date: ${new Date(review.invoiceData.invoiceDate).toLocaleDateString()}`}<br/>
                        {review.invoiceFileUrl && (
                            <a href={review.invoiceFileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 font-semibold mt-1 inline-block">Download Invoice</a>
                        )}
                      </div>
                    ) : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(review.createdAt).toLocaleDateString()}
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

export default ViewReviews;
