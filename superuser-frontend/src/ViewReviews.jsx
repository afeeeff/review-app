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
  companies, // Companies are passed from App.jsx for filtering
}) => {
  const [reviews, setReviews] = useState([]);
  const [filterCompanyId, setFilterCompanyId] = useState('');
  const [filterBranchId, setFilterBranchId] = useState('');
  const [filterClientId, setFilterClientId] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  // States for the filter dropdowns (these are local to ViewReviews)
  const [branchesForReviewFilter, setBranchesForReviewFilter] = useState([]);
  const [clientsForReviewFilter, setClientsForReviewFilter] = useState([]);

  // Helper to get auth headers
  const getAuthHeaders = useCallback(() => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${userData?.token}`,
  }), [userData?.token]);

  // Function to fetch clients and branches specifically for the review filters
  const fetchClientsAndBranchesForReviewFilters = useCallback(async (companyId, branchId) => {
    setError('');
    // No need to set global isLoading here, as this is for filter dropdowns

    try {
      // Fetch branches based on selected company
      if (companyId) {
        const branchResponse = await fetch(`${API_BASE_URL}/superuser/companies/${companyId}/branches`, {
          headers: getAuthHeaders(),
        });
        const branchData = await branchResponse.json();
        if (branchResponse.ok) {
          setBranchesForReviewFilter(branchData);
          console.log("ViewReviews: Branches fetched for review filter (company", companyId, "):", branchData);
        } else {
          setError(branchData.message || 'Failed to fetch branches for filter.');
          setBranchesForReviewFilter([]);
          console.error("ViewReviews: Failed to fetch branches for review filter (company", companyId, "):", branchData.message);
        }
      } else {
        setBranchesForReviewFilter([]); // Clear branches if no company selected
      }

      // Determine client fetch URL based on company and branch selection
      let clientUrl = `${API_BASE_URL}/superuser/clients`; // Default to all clients
      if (branchId) {
        clientUrl = `${API_BASE_URL}/superuser/branches/${branchId}/clients`;
      } else if (companyId) {
        clientUrl = `${API_BASE_URL}/superuser/companies/${companyId}/clients`;
      } else {
        // If no company or branch selected, fetch all clients for the filter dropdown
        clientUrl = `${API_BASE_URL}/superuser/clients`;
      }

      const clientResponse = await fetch(clientUrl, {
        headers: getAuthHeaders(),
      });
      const clientData = await clientResponse.json();
      if (clientResponse.ok) {
        setClientsForReviewFilter(clientData);
        console.log("ViewReviews: Clients fetched for review filter (company/branch", companyId, branchId, "):", clientData);
      } else {
        setError(clientData.message || 'Failed to fetch clients for filter.');
        setClientsForReviewFilter([]);
        console.error("ViewReviews: Failed to fetch clients for review filter (company/branch", companyId, branchId, "):", clientData.message);
      }
    } catch (err) {
      console.error('ViewReviews: Error fetching clients/branches for review filters:', err);
      setError('Network error fetching filter data.');
    }
  }, [API_BASE_URL, getAuthHeaders, setError]); // Added dependencies

  // --- Reviews API Calls ---
  const fetchAllReviews = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      let url = `${API_BASE_URL}/superuser/reviews?`;
      if (filterCompanyId) {
        url += `companyId=${filterCompanyId}&`;
      }
      if (filterBranchId) {
        url += `branchId=${filterBranchId}&`;
      }
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
        console.log("ViewReviews: Reviews fetched:", data);
      } else {
        setError(data.message || 'Failed to fetch reviews.');
        setReviews([]);
        console.error("ViewReviews: Failed to fetch reviews:", data.message);
      }
    } catch (err) {
      console.error('ViewReviews: Error fetching reviews:', err);
      setError('Network error fetching reviews.');
      setReviews([]);
    } finally {
      setIsLoading(false);
    }
  }, [API_BASE_URL, filterCompanyId, filterBranchId, filterClientId, filterStartDate, filterEndDate, getAuthHeaders, setIsLoading, setError]); // Added dependencies

  // Effect to trigger review fetching and filter dropdown data fetching
  useEffect(() => {
    if (userData?.token) {
      fetchAllReviews();
      fetchClientsAndBranchesForReviewFilters(filterCompanyId, filterBranchId);
    }
  }, [filterCompanyId, filterBranchId, filterClientId, filterStartDate, filterEndDate, userData?.token, fetchAllReviews, fetchClientsAndBranchesForReviewFilters]); // Added dependencies

  return (
    <div className="p-6 bg-yellow-50 rounded-lg shadow-inner">
      <h4 className="text-xl font-semibold text-yellow-800 mb-4">All Reviews</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div>
          <label htmlFor="filterCompany" className="block text-sm font-medium text-gray-700">Filter by Company:</label>
          <select
            id="filterCompany"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            value={filterCompanyId}
            onChange={(e) => {
              setFilterCompanyId(e.target.value);
              setFilterBranchId(''); // Reset branch filter
              setFilterClientId(''); // Reset client filter
              // fetchClientsAndBranchesForReviewFilters will be called by useEffect
            }}
          >
            <option value="">All Companies</option>
            {companies.map(company => (
              <option key={company._id} value={company._id}>{company.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="filterBranch" className="block text-sm font-medium text-gray-700">Filter by Branch:</label>
          <select
            id="filterBranch"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            value={filterBranchId}
            onChange={(e) => {
              setFilterBranchId(e.target.value);
              setFilterClientId(''); // Reset client filter
              // fetchClientsAndBranchesForReviewFilters will be called by useEffect
            }}
            disabled={!filterCompanyId}
          >
            <option value="">All Branches</option>
            {branchesForReviewFilter.map(branch => (
              <option key={branch._id} value={branch._id}>{branch.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="filterClient" className="block text-sm font-medium text-gray-700">Filter by Client:</label>
          <select
            id="filterClient"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            value={filterClientId}
            onChange={(e) => setFilterClientId(e.target.value)}
            disabled={!filterCompanyId && !filterBranchId}
          >
            <option value="">All Clients</option>
            {clientsForReviewFilter.map(client => (
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
        {/* Removed explicit "Apply Filters" button as useEffect handles it */}
      </div>

      {isLoading && <p className="text-center text-indigo-600">Loading reviews...</p>}
      {reviews.length === 0 && !isLoading && !error && (
        <p className="text-gray-600 text-center py-4">No reviews found matching the criteria.</p>
      )}
      {reviews.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rating</th>
                <th scope="col" className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer Name</th>
                <th scope="col" className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer Mobile</th>
                <th scope="col" className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client Email</th>
                <th scope="col" className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                <th scope="col" className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Branch</th>
                <th scope="col" className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Review Text</th>
                <th scope="col" className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Voice Audio</th>
                <th scope="col" className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice Data</th>
                <th scope="col" className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {reviews.map((review) => (
                <tr key={review._id}>
                  <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-900">{review.rating}</td>
                  <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-500">{review.customerName}</td>
                  <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-500">{review.customerMobile}</td>
                  <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-500">{review.client?.email || 'N/A'}</td>
                  <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-500">{review.company?.name || 'N/A'}</td>
                  <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-500">{review.branch?.name || 'N/A'}</td>
                  <td className="px-2 py-4 text-sm text-gray-500 max-w-[150px] overflow-hidden text-ellipsis break-words">{review.transcribedText || review.textReview || 'N/A'}</td>
                  <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-500">
                    {review.voiceData ? (
                      <audio controls src={review.voiceData} className="w-24 h-8" />
                    ) : 'N/A'}
                  </td>
                  <td className="px-2 py-4 text-sm text-gray-500 max-w-[150px] overflow-hidden text-ellipsis break-words">
                    {review.invoiceData ? (
                      <div>
                        {review.invoiceData.jobCardNumber && `Job Card: ${review.invoiceData.jobCardNumber}`}<br />
                        {review.invoiceData.invoiceNumber && `Invoice No: ${review.invoiceData.invoiceNumber}`}<br />
                        {review.invoiceData.invoiceDate && `Inv Date: ${review.invoiceData.invoiceDate}`}<br />
                        {review.invoiceData.vin && `VIN: ${review.invoiceData.vin}`}<br />
                        {review.invoiceData.customerNameFromInvoice && `Cust Name (Inv): ${review.invoiceData.customerNameFromInvoice}`}<br />
                        {review.invoiceData.customerMobileFromInvoice && `Cust Mobile (Inv): ${review.invoiceData.customerMobileFromInvoice}`}<br />
                        {review.invoiceFileUrl && (
                          <a href={review.invoiceFileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">View File</a>
                        )}
                      </div>
                    ) : 'N/A'}
                  </td>
                  <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-500">
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
