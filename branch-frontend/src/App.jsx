import React, { useState, useEffect } from 'react';

// Main App component for the Branch Admin Interface
const App = () => {
  // State for managing the current view: 'login', 'dashboard', 'forgotPassword'
  const [currentView, setCurrentView] = useState('login');
  // State for login form inputs
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // State for login error messages
  const [loginError, setLoginError] = useState('');
  // State to store the authenticated user's data (including token, role, companyId, branchId, etc.)
  const [userData, setUserData] = useState(null);
  // State for managing active tab in the dashboard: 'manage' or 'reviews'
  const [activeTab, setActiveTab] = useState('manage');

  // States for managing clients specific to this branch
  const [clients, setClients] = useState([]); // All clients for management tab
  const [filteredClients, setFilteredClients] = useState([]); // Clients for review filter dropdown

  // States for forms (Add/Edit)
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientPassword, setNewClientPassword] = useState('');
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerMobile, setNewCustomerMobile] = useState('');
  const [editingClient, setEditingClient] = useState(null); // null or client object
  const [showAddClientForm, setShowAddClientForm] = useState(false); // NEW: State for showing Add Client form

  // States for reviews viewing
  const [reviews, setReviews] = useState([]);
  const [filterClientId, setFilterClientId] = useState(''); // NEW: Client filter state
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  // States for Forgot Password functionality
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [forgotPasswordError, setForgotPasswordError] = useState('');
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState('');
  const [otpSent, setOtpSent] = useState(false); // To track if OTP has been sent

  // Loading and error states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Base URL for your backend API
  const API_BASE_URL = 'http://localhost:5000/api'; // IMPORTANT: Change this to your backend URL in production

  // Helper to get auth headers
  const getAuthHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${userData?.token}`,
  });

  // Effect to check for stored token on component mount
  useEffect(() => {
    const storedToken = localStorage.getItem('branchAdminToken');
    const storedUserData = localStorage.getItem('branchAdminUserData');

    if (storedToken && storedUserData) {
      try {
        const parsedUserData = JSON.parse(storedUserData);
        // Basic validation: ensure it's a branch_admin token and has company/branch IDs
        if (parsedUserData.role === 'branch_admin' && parsedUserData.companyId && parsedUserData.branchId) {
          setUserData(parsedUserData);
          setCurrentView('dashboard');
        } else {
          // If not a branch_admin token or missing IDs, clear it
          localStorage.removeItem('branchAdminToken');
          localStorage.removeItem('branchAdminUserData');
        }
      } catch (error) {
        console.error('Failed to parse stored user data:', error);
        localStorage.removeItem('branchAdminToken');
        localStorage.removeItem('branchAdminUserData');
      }
    }
  }, []);

  // Effect to fetch initial data when dashboard is loaded and user is authenticated
  useEffect(() => {
    if (currentView === 'dashboard' && userData?.token) {
      if (activeTab === 'manage') {
        fetchAllClientsForBranch(); // Fetch clients for this branch
      } else if (activeTab === 'reviews') {
        fetchClientsForBranchAdminFilters(); // Fetch clients for the review filter dropdown
        fetchBranchReviews(); // Fetch reviews for this branch
      }
    }
  }, [currentView, userData, activeTab, filterClientId, filterStartDate, filterEndDate]); // Re-fetch if view, user, active tab, or filters change

  // Handle login form submission
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError(''); // Clear previous errors
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        if (data.role === 'branch_admin' && data.companyId && data.branchId) {
          // Store token and user data in local storage
          localStorage.setItem('branchAdminToken', data.token);
          localStorage.setItem('branchAdminUserData', JSON.stringify(data));
          setUserData(data);
          setCurrentView('dashboard');
        } else {
          setLoginError('Access Denied: Not a Branch Admin account or missing branch/company association.');
        }
      } else {
        setLoginError(data.message || 'Login failed. Please check your credentials.');
      }
    } catch (error) {
      console.error('Login API error:', error);
      setLoginError('Network error or server unavailable. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem('branchAdminToken');
    localStorage.removeItem('branchAdminUserData');
    setUserData(null);
    setCurrentView('login');
    setEmail('');
    setPassword('');
    // Clear all entity data as well
    setClients([]);
    setFilteredClients([]); // Clear filtered clients
    setReviews([]);
  };

  // --- API Calls for Clients (Branch Admin Scope) ---

  const fetchAllClientsForBranch = async () => {
    setIsLoading(true);
    setError('');
    try {
      const url = `${API_BASE_URL}/branch/clients`;
      const response = await fetch(url, {
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      if (response.ok) {
        setClients(data); // For management tab
      } else {
        setError(data.message || 'Failed to fetch clients.');
        setClients([]);
      }
    } catch (err) {
      console.error('Error fetching clients for branch:', err);
      setError('Network error fetching clients for branch.');
      setClients([]);
    } finally {
      setIsLoading(false);
    }
  };

  // NEW: Function to fetch clients specifically for the review filters (Branch Admin)
  const fetchClientsForBranchAdminFilters = async () => {
    setError('');
    setIsLoading(true); // Indicate loading for filters

    try {
      // Branch admin can only see clients within their branch, so no additional branchId filter needed here
      const clientUrl = `${API_BASE_URL}/branch/clients`;

      const clientResponse = await fetch(clientUrl, {
        headers: getAuthHeaders(),
      });
      const clientData = await clientResponse.json();
      if (clientResponse.ok) {
        setFilteredClients(clientData); // Update the 'filteredClients' state for the dropdown
      } else {
        setError(clientData.message || 'Failed to fetch clients for filter.');
        setFilteredClients([]);
      }
    } catch (err) {
      console.error('Error fetching clients for review filters (Branch Admin):', err);
      setError('Network error fetching filter data.');
    } finally {
      setIsLoading(false);
    }
  };


  // --- Client CRUD Operations (by Branch Admin) ---
  const handleCreateClient = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccessMessage('');

    if (!newClientEmail || !newClientPassword || !newCustomerName || !newCustomerMobile) {
      setError('All client creation fields are required.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/branch/clients`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          clientEmail: newClientEmail,
          clientPassword: newClientPassword,
          customerName: newCustomerName,
          customerMobile: newCustomerMobile,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        setSuccessMessage('Client created successfully!');
        setNewClientEmail('');
        setNewClientPassword('');
        setNewCustomerName('');
        setNewCustomerMobile('');
        setShowAddClientForm(false); // Hide form after creation
        fetchAllClientsForBranch(); // Refresh list
      } else {
        setError(data.message || 'Failed to create client.');
      }
    } catch (err) {
      console.error('Error creating client:', err);
      setError('Network error creating client.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditClient = (client) => {
    setEditingClient(client);
    setNewClientEmail(client.email);
    setNewClientPassword(''); // Password not pre-filled
    setNewCustomerName(client.customerName || '');
    setNewCustomerMobile(client.customerMobile || '');
    setShowAddClientForm(true); // Show form for editing
  };

  const handleUpdateClient = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccessMessage('');

    if (!editingClient || !newClientEmail || !newCustomerName || !newCustomerMobile) {
      setError('All fields are required for update.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/branch/clients/${editingClient._id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          clientEmail: newClientEmail,
          ...(newClientPassword && { clientPassword: newClientPassword }),
          customerName: newCustomerName,
          customerMobile: newCustomerMobile,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        setSuccessMessage('Client updated successfully!');
        setEditingClient(null);
        setNewClientEmail('');
        setNewClientPassword('');
        setNewCustomerName('');
        setNewCustomerMobile('');
        setShowAddClientForm(false); // Hide form after update
        fetchAllClientsForBranch(); // Refresh list
      } else {
        setError(data.message || 'Failed to update client.');
      }
    } catch (err) {
      console.error('Error updating client:', err);
      setError('Network error updating client.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteClient = async (clientId) => {
    if (!window.confirm('Are you sure you want to delete this client and ALL their associated reviews? This action cannot be undone.')) {
      return;
    }
    setIsLoading(true);
    setError('');
    setSuccessMessage('');
    try {
      const response = await fetch(`${API_BASE_URL}/branch/clients/${clientId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      if (response.ok) {
        setSuccessMessage('Client deleted successfully!');
        fetchAllClientsForBranch(); // Refresh list
      } else {
        setError(data.message || 'Failed to delete client.');
      }
    } catch (err) {
      console.error('Error deleting client:', err);
      setError('Network error deleting client.');
    } finally {
      setIsLoading(false);
    }
  };

  // --- Reviews API Calls (Branch Admin Scope) ---
  const fetchBranchReviews = async () => {
    setIsLoading(true);
    setError('');
    try {
      let url = `${API_BASE_URL}/branch/reviews?`;
      if (filterClientId) { // NEW: Add client filter
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
  };

  // --- Forgot Password Logic ---
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setForgotPasswordError('');
    setForgotPasswordSuccess('');
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/request-password-reset-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotPasswordEmail }),
      });
      const data = await response.json();

      if (response.ok) {
        setForgotPasswordSuccess(data.message);
        setOtpSent(true);
      } else {
        setForgotPasswordError(data.message || 'Failed to request OTP.');
      }
    } catch (err) {
      console.error('Request OTP error:', err);
      setForgotPasswordError('Network error. Could not send OTP.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setForgotPasswordError('');
    setForgotPasswordSuccess('');
    setIsLoading(true);

    if (newPassword !== confirmNewPassword) {
      setForgotPasswordError('New password and confirm password do not match.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/reset-password-with-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: forgotPasswordEmail,
          otp: otp,
          newPassword: newPassword,
        }),
      });
      const data = await response.json();

      if (response.ok) {
        setForgotPasswordSuccess(data.message);
        setOtpSent(false); // Reset OTP state
        setForgotPasswordEmail('');
        setOtp('');
        setNewPassword('');
        setConfirmNewPassword('');
        setCurrentView('login'); // Go back to login page
      } else {
        setForgotPasswordError(data.message || 'Failed to reset password.');
      }
    } catch (err) {
      console.error('Reset password error:', err);
      setForgotPasswordError('Network error. Could not reset password.');
    } finally {
      setIsLoading(false);
    }
  };


  // --- Render Functions for Manage Entities Tab ---

  const renderClientManagement = () => (
    <div className="mb-8 p-6 bg-purple-50 rounded-lg shadow-inner">
      <div className="flex justify-between items-center mb-4">
        <h4 className="text-xl font-semibold text-purple-800">Clients</h4>
        <button
          onClick={() => {
            setShowAddClientForm(!showAddClientForm);
            // Clear form fields when toggling to add mode
            if (!showAddClientForm) {
              setEditingClient(null);
              setNewClientEmail('');
              setNewClientPassword('');
              setNewCustomerName('');
              setNewCustomerMobile('');
            }
          }}
          className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors duration-200"
        >
          {showAddClientForm ? 'Hide Add Client Form' : 'Add New Client'}
        </button>
      </div>

      {showAddClientForm && (
        <form onSubmit={editingClient ? handleUpdateClient : handleCreateClient} className="space-y-4 border p-4 rounded-lg bg-white mb-6">
          <h5 className="text-lg font-semibold text-gray-800">{editingClient ? 'Edit Client Details' : 'Create New Client'}</h5>
          <div>
            <label htmlFor="clientEmail" className="block text-sm font-medium text-gray-700">Client Email:</label>
            <input
              type="email"
              id="clientEmail"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              value={newClientEmail}
              onChange={(e) => setNewClientEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="clientPassword" className="block text-sm font-medium text-gray-700">Client Password: {editingClient ? '(Leave blank to keep current)' : ''}</label>
            <input
              type="password"
              id="clientPassword"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              value={newClientPassword}
              onChange={(e) => setNewClientPassword(e.target.value)}
              required={!editingClient}
            />
          </div>
          <div>
            <label htmlFor="customerName" className="block text-sm font-medium text-gray-700">Customer Name (for Client):</label>
            <input
              type="text"
              id="customerName"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              value={newCustomerName}
              onChange={(e) => setNewCustomerName(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="customerMobile" className="block text-sm font-medium text-gray-700">Customer Mobile (for Client):</label>
            <input
              type="text"
              id="customerMobile"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              value={newCustomerMobile}
              onChange={(e) => setNewCustomerMobile(e.target.value)}
              required
            />
          </div>
          <div className="flex space-x-2">
            <button
              type="submit"
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
              disabled={isLoading}
            >
              {isLoading ? 'Processing...' : (editingClient ? 'Update Client' : 'Add Client')}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingClient(null);
                setNewClientEmail('');
                setNewClientPassword('');
                setNewCustomerName('');
                setNewCustomerMobile('');
                setShowAddClientForm(false); // Hide form on cancel
              }}
              className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              disabled={isLoading}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <h4 className="text-xl font-semibold text-purple-800 mt-8 mb-4">Your Clients</h4>
      {clients.length === 0 && !isLoading && <p className="text-gray-600">No clients found for your branch.</p>}
      {clients.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer Mobile</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {clients.map((client) => (
                <tr key={client._id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{client.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{client.customerName || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{client.customerMobile || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleEditClient(client)}
                      className="text-indigo-600 hover:text-indigo-900 mr-4"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteClient(client._id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );


  const renderManageEntities = () => (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h3 className="text-2xl font-semibold text-gray-800 mb-4">Manage Clients</h3>

      {isLoading && (
        <div className="text-center text-indigo-600 font-semibold mb-4">Loading...</div>
      )}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}
      {successMessage && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Success!</strong>
          <span className="block sm:inline"> {successMessage}</span>
        </div>
      )}

      {renderClientManagement()}
    </div>
  );

  // Render the Reviews Viewing content
  const renderViewReviews = () => (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h3 className="text-2xl font-semibold text-gray-800 mb-4">View Branch Reviews</h3>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {/* NEW: Filter by Client */}
        <div>
          <label htmlFor="filterClient" className="block text-sm font-medium text-gray-700">Filter by Client:</label>
          <select
            id="filterClient"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            value={filterClientId}
            onChange={(e) => setFilterClientId(e.target.value)}
            disabled={filteredClients.length === 0} // Disable if no clients for this branch
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

  // Render the login view
  const renderLogin = () => (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-3xl font-bold text-center text-purple-800 mb-6">Branch Admin Login</h2>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email:</label>
            <input
              type="email"
              id="email"
              className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password:</label>
            <input
              type="password"
              id="password"
              className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {loginError && (
            <p className="text-red-600 text-sm text-center">{loginError}</p>
          )}
          <button
            type="submit"
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-lg font-semibold text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition duration-300 ease-in-out"
            disabled={isLoading}
          >
            {isLoading ? 'Logging In...' : 'Login'}
          </button>
          <div className="text-center mt-4">
            <button
              type="button"
              onClick={() => setCurrentView('forgotPassword')}
              className="text-sm text-purple-600 hover:text-purple-800 hover:underline"
            >
              Forgot Password?
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  // Render Forgot Password view
  const renderForgotPassword = () => (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-3xl font-bold text-center text-purple-800 mb-6">Forgot Password</h2>
        {!otpSent ? (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div>
              <label htmlFor="forgotEmail" className="block text-sm font-medium text-gray-700 mb-1">Enter your email:</label>
              <input
                type="email"
                id="forgotEmail"
                className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                value={forgotPasswordEmail}
                onChange={(e) => setForgotPasswordEmail(e.target.value)}
                required
              />
            </div>
            {forgotPasswordError && (
              <p className="text-red-600 text-sm text-center">{forgotPasswordError}</p>
            )}
            {forgotPasswordSuccess && (
              <p className="text-green-600 text-sm text-center">{forgotPasswordSuccess}</p>
            )}
            <button
              type="submit"
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-lg font-semibold text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition duration-300 ease-in-out"
              disabled={isLoading}
            >
              {isLoading ? 'Sending OTP...' : 'Request OTP'}
            </button>
            <div className="text-center mt-4">
              <button
                type="button"
                onClick={() => setCurrentView('login')}
                className="text-sm text-purple-600 hover:text-purple-800 hover:underline"
              >
                Back to Login
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <p className="text-center text-gray-700">An OTP has been sent to {forgotPasswordEmail}.</p>
            <div>
              <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-1">Enter OTP:</label>
              <input
                type="text"
                id="otp"
                className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">New Password:</label>
              <input
                type="password"
                id="newPassword"
                className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="confirmNewPassword" className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password:</label>
              <input
                type="password"
                id="confirmNewPassword"
                className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                required
              />
            </div>
            {forgotPasswordError && (
              <p className="text-red-600 text-sm text-center">{forgotPasswordError}</p>
            )}
            {forgotPasswordSuccess && (
              <p className="text-green-600 text-sm text-center">{forgotPasswordSuccess}</p>
            )}
            <button
              type="submit"
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-lg font-semibold text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition duration-300 ease-in-out"
              disabled={isLoading}
            >
              {isLoading ? 'Resetting Password...' : 'Reset Password'}
            </button>
            <div className="text-center mt-4">
              <button
                type="button"
                onClick={() => {
                  setOtpSent(false);
                  setForgotPasswordError('');
                  setForgotPasswordSuccess('');
                  setForgotPasswordEmail('');
                  setOtp('');
                  setNewPassword('');
                  setConfirmNewPassword('');
                  setCurrentView('login');
                }}
                className="text-sm text-purple-600 hover:text-purple-800 hover:underline"
              >
                Back to Login
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );

  // Render the dashboard view
  const renderDashboard = () => (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-purple-700 text-white p-4 shadow-md flex justify-between items-center">
        <h1 className="text-2xl font-bold">Branch Admin Dashboard</h1>
        <div className="flex items-center space-x-4">
          <span className="text-lg">Welcome, {userData?.email} ({userData?.branch?.name || 'Branch Admin'})</span>
          <button
            onClick={handleLogout}
            className="bg-purple-800 hover:bg-purple-900 text-white px-4 py-2 rounded-md transition duration-300 ease-in-out"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-start h-16">
            <button
              onClick={() => setActiveTab('manage')}
              className={`px-6 py-3 text-lg font-medium ${
                activeTab === 'manage'
                  ? 'border-b-4 border-purple-600 text-purple-700'
                  : 'text-gray-600 hover:text-gray-900 hover:border-gray-300'
              } focus:outline-none transition-colors duration-200`}
            >
              Manage Clients
            </button>
            <button
              onClick={() => setActiveTab('reviews')}
              className={`px-6 py-3 text-lg font-medium ${
                activeTab === 'reviews'
                  ? 'border-b-4 border-purple-600 text-purple-700'
                  : 'text-gray-600 hover:text-gray-900 hover:border-gray-300'
              } focus:outline-none transition-colors duration-200`}
            >
              View Reviews
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {activeTab === 'manage' && renderManageEntities()}
        {activeTab === 'reviews' && renderViewReviews()}
      </main>
    </div>
  );

  return (
    <div className="font-sans antialiased text-gray-900">
      {/* Tailwind CSS CDN */}
      <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet" />
      {/* Inter font from Google Fonts */}
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <style>
        {`
          body {
            font-family: 'Inter', sans-serif;
          }
        `}
      </style>

      {(() => {
        switch (currentView) {
          case 'login':
            return renderLogin();
          case 'dashboard':
            return renderDashboard();
          case 'forgotPassword':
            return renderForgotPassword();
          default:
            return null;
        }
      })()}
    </div>
  );
};

export default App;
