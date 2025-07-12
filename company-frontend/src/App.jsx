import React, { useState, useEffect } from 'react';


// Main App component for the Company Admin Interface
const App = () => {
  // State for managing the current view: 'login', 'dashboard', 'forgotPassword'
  const [currentView, setCurrentView] = useState('login');
  // State for login form inputs
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // State for login error messages
  const [loginError, setLoginError] = useState('');
  // State to store the authenticated user's data (including token, role, companyId, etc.)
  const [userData, setUserData] = useState(null);
  // State for managing active tab in the dashboard: 'manage' or 'reviews'
  const [activeTab, setActiveTab] = useState('manage');

  // States for managing entities data (branches and clients specific to this company)
  const [branches, setBranches] = useState([]);
  const [allClients, setAllClients] = useState([]); // All clients for management tab
  const [filteredClients, setFilteredClients] = useState([]); // Clients for review filter dropdown

  // States for forms (Add/Edit) - Branch
  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchAdminEmail, setNewBranchAdminEmail] = useState('');
  const [newBranchAdminPassword, setNewBranchAdminPassword] = useState('');
  const [newBranchNotificationEmails, setNewBranchNotificationEmails] = useState(''); // NEW: For branch notification emails
  const [editingBranch, setEditingBranch] = useState(null); // null or branch object
  const [showAddBranchForm, setShowAddBranchForm] = useState(false); // NEW: State for showing Add Branch form

  // States for forms (Add/Edit) - Client
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientPassword, setNewClientPassword] = useState('');
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerMobile, setNewCustomerMobile] = useState('');
  const [newClientNotificationEmails, setNewClientNotificationEmails] = useState(''); // NEW: For client notification emails
  const [selectedBranchForClient, setSelectedBranchForClient] = useState(''); // For creating new client under a branch
  const [editingClient, setEditingClient] = useState(null); // null or client object
  const [showAddClientForm, setShowAddClientForm] = useState(false); // NEW: State for showing Add Client form

  // States for reviews viewing
  const [reviews, setReviews] = useState([]);
  const [filterBranchId, setFilterBranchId] = useState('');
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
  const API_BASE_URL =
  window.location.hostname === 'localhost'
    ? 'http://localhost:5000/api'
    : 'https://review-app-backend-ekjk.onrender.com/api'; // IMPORTANT: Change this to your backend URL in production

  // Helper to get auth headers
  const getAuthHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${userData?.token}`,
  });

  // Helper to parse comma-separated emails string into an array
  const parseEmailsString = (emailsString) => {
    if (!emailsString) return [];
    return emailsString.split(',').map(email => email.trim()).filter(email => email !== '');
  };

  // Helper to format an array of emails into a comma-separated string
  const formatEmailsArray = (emailsArray) => {
    if (!emailsArray || emailsArray.length === 0) return '';
    return emailsArray.join(', ');
  };

  // Effect to check for stored token on component mount
  useEffect(() => {
    const storedToken = localStorage.getItem('companyAdminToken');
    const storedUserData = localStorage.getItem('companyAdminUserData');

    if (storedToken && storedUserData) {
      try {
        const parsedUserData = JSON.parse(storedUserData);
        // Basic validation: ensure it's a company_admin token
        if (parsedUserData.role === 'company_admin' && parsedUserData.companyId) {
          setUserData(parsedUserData);
          setCurrentView('dashboard');
        } else {
          // If a non-company_admin token is found or companyId is missing, clear it
          localStorage.removeItem('companyAdminToken');
          localStorage.removeItem('companyAdminUserData');
        }
      } catch (error) {
        console.error('Failed to parse stored user data:', error);
        localStorage.removeItem('companyAdminToken');
        localStorage.removeItem('companyAdminUserData');
      }
    }
  }, []);

  // Effect to fetch initial data when dashboard is loaded and user is authenticated
  useEffect(() => {
    if (currentView === 'dashboard' && userData?.token && userData?.companyId) {
      if (activeTab === 'manage') {
        fetchAllBranches(); // Fetch branches for this company
        fetchAllClientsForManagement(); // Fetch all clients for client management tab
      } else if (activeTab === 'reviews') {
        fetchAllBranches(); // Also fetch branches for filter dropdown
        // Fetch clients based on current branch filter (or all for company if no branch filter)
        fetchClientsForCompanyAdminFilters(filterBranchId);
        fetchCompanyReviews(); // Fetch reviews for this company
      }
    }
  }, [currentView, userData, activeTab, filterBranchId, filterClientId, filterStartDate, filterEndDate]); // Re-fetch if view, user, active tab, or filters change

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
        if (data.role === 'company_admin' && data.companyId) {
          // Store token and user data in local storage
          localStorage.setItem('companyAdminToken', data.token);
          localStorage.setItem('companyAdminUserData', JSON.stringify(data));
          setUserData(data);
          setCurrentView('dashboard');
        } else {
          setLoginError('Access Denied: Not a Company Admin account or missing company association.');
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
    localStorage.removeItem('companyAdminToken');
    localStorage.removeItem('companyAdminUserData');
    setUserData(null);
    setCurrentView('login');
    setEmail('');
    setPassword('');
    // Clear all entity data as well
    setBranches([]);
    setAllClients([]); // Clear all clients
    setFilteredClients([]); // Clear filtered clients
    setReviews([]);
  };

  // --- API Calls for Branches & Clients (Company Admin Scope) ---

  const fetchAllBranches = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/company/branches`, {
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      if (response.ok) {
        setBranches(data);
      } else {
        setError(data.message || 'Failed to fetch branches.');
      }
    } catch (err) {
      console.error('Error fetching branches:', err);
      setError('Network error fetching branches.');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetches clients for management tab (can be all for company, or by branch)
  const fetchClientsByBranch = async (branchId) => {
    setIsLoading(true);
    setError('');
    try {
      let url = '';
      if (branchId) {
        url = `${API_BASE_URL}/company/branches/${branchId}/clients`;
      } else {
        url = `${API_BASE_URL}/company/clients`; // Fetch all clients for the company
      }
      const response = await fetch(url, {
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      if (response.ok) {
        setAllClients(data); // Update the 'allClients' state for management
      } else {
        setError(data.message || 'Failed to fetch clients.');
        setAllClients([]);
      }
    } catch (err) {
      console.error('Error fetching clients:', err);
      setError('Network error fetching clients.');
      setAllClients([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetches all clients for the client management tab initially
  const fetchAllClientsForManagement = async () => {
    setError('');
    try {
      const url = `${API_BASE_URL}/company/clients`; // Fetch all clients directly under the company
      const response = await fetch(url, {
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      if (response.ok) {
        setAllClients(data);
      } else {
        setError(data.message || 'Failed to fetch all clients for management.');
        setAllClients([]);
      }
    } catch (err) {
      console.error('Error fetching all clients for management:', err);
      setError('Network error fetching all clients for management.');
      setAllClients([]);
    }
  };


  // NEW: Function to fetch clients specifically for the review filters
  const fetchClientsForCompanyAdminFilters = async (branchId) => {
    setError('');
    setIsLoading(true); // Indicate loading for filters

    try {
      let clientUrl = `${API_BASE_URL}/company/clients`; // Default to all clients for the company
      if (branchId) {
        clientUrl = `${API_BASE_URL}/company/branches/${branchId}/clients`;
      }

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
      console.error('Error fetching clients for review filters:', err);
      setError('Network error fetching filter data.');
    } finally {
      setIsLoading(false);
    }
  };


  // --- Branch CRUD Operations (by Company Admin) ---
  const handleCreateBranch = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccessMessage('');

    if (!newBranchName || !newBranchAdminEmail || !newBranchAdminPassword) {
      setError('All branch creation fields are required.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/company/branches`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          branchName: newBranchName,
          adminEmail: newBranchAdminEmail,
          adminPassword: newBranchAdminPassword,
          notificationEmails: parseEmailsString(newBranchNotificationEmails), // NEW: Send as array
        }),
      });
      const data = await response.json();
      if (response.ok) {
        setSuccessMessage('Branch created successfully!');
        setNewBranchName('');
        setNewBranchAdminEmail('');
        setNewBranchAdminPassword('');
        setNewBranchNotificationEmails(''); // Clear field
        setShowAddBranchForm(false); // Hide form after creation
        fetchAllBranches(); // Refresh list
      } else {
        setError(data.message || 'Failed to create branch.');
      }
    } catch (err) {
      console.error('Error creating branch:', err);
      setError('Network error creating branch.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditBranch = (branch) => {
    setEditingBranch(branch);
    setNewBranchName(branch.name);
    setNewBranchAdminEmail(branch.branchAdmin?.email || '');
    setNewBranchAdminPassword('');
    setNewBranchNotificationEmails(formatEmailsArray(branch.notificationEmails)); // NEW: Pre-fill notification emails
    setShowAddBranchForm(true); // Show form for editing
  };

  const handleUpdateBranch = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccessMessage('');

    if (!editingBranch || !newBranchName || !newBranchAdminEmail) {
      setError('All fields are required for update.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/company/branches/${editingBranch._id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          branchName: newBranchName,
          adminEmail: newBranchAdminEmail,
          ...(newBranchAdminPassword && { adminPassword: newBranchAdminPassword }),
          notificationEmails: parseEmailsString(newBranchNotificationEmails), // NEW: Send as array
        }),
      });
      const data = await response.json();
      if (response.ok) {
        setSuccessMessage('Branch updated successfully!');
        setEditingBranch(null);
        setNewBranchName('');
        setNewBranchAdminEmail('');
        setNewBranchAdminPassword('');
        setNewBranchNotificationEmails(''); // Clear field
        setShowAddBranchForm(false); // Hide form after update
        fetchAllBranches(); // Refresh list
      } else {
        setError(data.message || 'Failed to update branch.');
      }
    } catch (err) {
      console.error('Error updating branch:', err);
      setError('Network error updating branch.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteBranch = async (branchId) => {
    if (!window.confirm('Are you sure you want to delete this branch and ALL its associated clients and reviews? This action cannot be undone.')) {
      return;
    }
    setIsLoading(true);
    setError('');
    setSuccessMessage('');
    try {
      const response = await fetch(`${API_BASE_URL}/company/branches/${branchId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      if (response.ok) {
        setSuccessMessage('Branch deleted successfully!');
        fetchAllBranches(); // Refresh branches for the current company
        setAllClients([]); // Clear allClients as they might be deleted
      } else {
        setError(data.message || 'Failed to delete branch.');
      }
    } catch (err) {
      console.error('Error deleting branch:', err);
      setError('Network error deleting branch.');
    } finally {
      setIsLoading(false);
    }
  };

  // --- Client CRUD Operations (by Company Admin) ---
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

    let url = `${API_BASE_URL}/company/clients`; // Default to company-level client creation
    if (selectedBranchForClient) {
      url = `${API_BASE_URL}/company/branches/${selectedBranchForClient}/clients`;
    }

    let payload = {
      clientEmail: newClientEmail,
      clientPassword: newClientPassword,
      customerName: newCustomerName,
      customerMobile: newCustomerMobile,
      notificationEmails: parseEmailsString(newClientNotificationEmails), // NEW: Send as array
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (response.ok) {
        setSuccessMessage('Client created successfully!');
        setNewClientEmail('');
        setNewClientPassword('');
        setNewCustomerName('');
        setNewCustomerMobile('');
        setNewClientNotificationEmails(''); // Clear field
        setSelectedBranchForClient('');
        setShowAddClientForm(false); // Hide form after creation
        // Refresh clients based on current selection
        if (selectedBranchForClient) {
          fetchClientsByBranch(selectedBranchForClient);
        } else {
          fetchAllClientsForManagement();
        }
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
    setNewClientNotificationEmails(formatEmailsArray(client.notificationEmails)); // NEW: Pre-fill notification emails
    setSelectedBranchForClient(client.branch?._id || client.branch || '');
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
      const response = await fetch(`${API_BASE_URL}/company/clients/${editingClient._id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          clientEmail: newClientEmail,
          ...(newClientPassword && { clientPassword: newClientPassword }),
          customerName: newCustomerName,
          customerMobile: newCustomerMobile,
          branchId: selectedBranchForClient || null, // Pass null if no branch selected
          notificationEmails: parseEmailsString(newClientNotificationEmails), // NEW: Send as array
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
        setNewClientNotificationEmails(''); // Clear field
        setSelectedBranchForClient('');
        setShowAddClientForm(false); // Hide form after update
        // Refresh clients based on current selection
        if (selectedBranchForClient) {
          fetchClientsByBranch(selectedBranchForClient);
        } else {
          fetchAllClientsForManagement();
        }
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

  const handleDeleteClient = async (clientId, currentBranchId) => {
    if (!window.confirm('Are you sure you want to delete this client and ALL their associated reviews? This action cannot be undone.')) {
      return;
    }
    setIsLoading(true);
    setError('');
    setSuccessMessage('');
    try {
      const response = await fetch(`${API_BASE_URL}/company/clients/${clientId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      if (response.ok) {
        setSuccessMessage('Client deleted successfully!');
        // Refresh clients based on current selection
        if (currentBranchId) {
          fetchClientsByBranch(currentBranchId);
        } else {
          fetchAllClientsForManagement();
        }
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

  // --- Reviews API Calls (Company Admin Scope) ---
  const fetchCompanyReviews = async () => {
    setIsLoading(true);
    setError('');
    try {
      let url = `${API_BASE_URL}/company/reviews?`;
      if (filterBranchId) {
        url += `branchId=${filterBranchId}&`;
      }
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
      console.error('Error fetching company reviews:', err);
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

  const renderBranchManagement = () => (
    <div className="mb-8 p-6 bg-green-50 rounded-lg shadow-inner">
      <div className="flex justify-between items-center mb-4">
        <h4 className="text-xl font-semibold text-green-800">Branches</h4>
        <button
          onClick={() => {
            setShowAddBranchForm(!showAddBranchForm);
            // Clear form fields when toggling to add mode
            if (!showAddBranchForm) {
              setEditingBranch(null);
              setNewBranchName('');
              setNewBranchAdminEmail('');
              setNewBranchAdminPassword('');
              setNewBranchNotificationEmails(''); // Clear field
            }
          }}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors duration-200"
        >
          {showAddBranchForm ? 'Hide Add Branch Form' : 'Add New Branch'}
        </button>
      </div>

      {showAddBranchForm && (
        <form onSubmit={editingBranch ? handleUpdateBranch : handleCreateBranch} className="space-y-4 border p-4 rounded-lg bg-white mb-6">
          <h5 className="text-lg font-semibold text-gray-800">{editingBranch ? 'Edit Branch Details' : 'Create New Branch'}</h5>
          <div>
            <label htmlFor="branchName" className="block text-sm font-medium text-gray-700">Branch Name:</label>
            <input
              type="text"
              id="branchName"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              value={newBranchName}
              onChange={(e) => setNewBranchName(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="branchAdminEmail" className="block text-sm font-medium text-gray-700">Admin Email:</label>
            <input
              type="email"
              id="branchAdminEmail"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              value={newBranchAdminEmail}
              onChange={(e) => setNewBranchAdminEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="branchAdminPassword" className="block text-sm font-medium text-gray-700">Admin Password: {editingBranch ? '(Leave blank to keep current)' : ''}</label>
            <input
              type="password"
              id="branchAdminPassword"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              value={newBranchAdminPassword}
              onChange={(e) => setNewBranchAdminPassword(e.target.value)}
              required={!editingBranch}
            />
          </div>
          {/* NEW: Notification Emails Input */}
          <div>
            <label htmlFor="branchNotificationEmails" className="block text-sm font-medium text-gray-700">
              Notification Emails (comma-separated):
            </label>
            <textarea
              id="branchNotificationEmails"
              rows="3"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              value={newBranchNotificationEmails}
              onChange={(e) => setNewBranchNotificationEmails(e.target.value)}
              placeholder="e.g., email1@example.com, email2@example.com"
            ></textarea>
          </div>
          <div className="flex space-x-2">
            <button
              type="submit"
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              disabled={isLoading}
            >
              {isLoading ? 'Processing...' : (editingBranch ? 'Update Branch' : 'Add Branch')}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingBranch(null);
                setNewBranchName('');
                setNewBranchAdminEmail('');
                setNewBranchAdminPassword('');
                setNewBranchNotificationEmails(''); // Clear field
                setShowAddBranchForm(false); // Hide form on cancel
              }}
              className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              disabled={isLoading}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <h4 className="text-xl font-semibold text-green-800 mt-8 mb-4">Your Branches</h4>
      {branches.length === 0 && !isLoading && <p className="text-gray-600">No branches found for your company.</p>}
      {branches.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Branch Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Admin Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notification Emails</th> {/* NEW */}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Clients</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {branches.map((branch) => (
                <tr key={branch._id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{branch.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{branch.branchAdmin?.email || 'N/A'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{formatEmailsArray(branch.notificationEmails)}</td> {/* NEW */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleEditBranch(branch)}
                      className="text-indigo-600 hover:text-indigo-900 mr-4"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteBranch(branch._id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <button
                      onClick={() => {
                        setSelectedBranchForClient(branch._id);
                        fetchClientsByBranch(branch._id);
                      }}
                      className="text-purple-600 hover:text-purple-900"
                    >
                      View Clients ({branch.name})
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
              setNewClientNotificationEmails(''); // Clear field
              setSelectedBranchForClient('');
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
            <label htmlFor="selectBranchForClient" className="block text-sm font-medium text-gray-700">Select Branch (Optional):</label>
            <select
              id="selectBranchForClient"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              value={selectedBranchForClient}
              onChange={(e) => {
                setSelectedBranchForClient(e.target.value);
                setAllClients([]); // Clear clients when branch selection changes
                if (e.target.value) {
                  fetchClientsByBranch(e.target.value);
                } else {
                  fetchAllClientsForManagement(); // If no branch selected, fetch all clients for company
                }
              }}
            >
              <option value="">-- Assign Directly to Company --</option>
              {branches.map(branch => (
                <option key={branch._id} value={branch._id}>{branch.name}</option>
              ))}
            </select>
            {branches.length === 0 && (
              <p className="text-sm text-gray-500 mt-1">No branches available. Clients will be assigned directly to your company.</p>
            )}
          </div>

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
          {/* NEW: Notification Emails Input */}
          <div>
            <label htmlFor="clientNotificationEmails" className="block text-sm font-medium text-gray-700">
              Notification Emails (comma-separated):
            </label>
            <textarea
              id="clientNotificationEmails"
              rows="3"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              value={newClientNotificationEmails}
              onChange={(e) => setNewClientNotificationEmails(e.target.value)}
              placeholder="e.g., email1@example.com, email2@example.com"
            ></textarea>
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
                setNewClientNotificationEmails(''); // Clear field
                setSelectedBranchForClient('');
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

      <h4 className="text-xl font-semibold text-purple-800 mt-8 mb-4">Your Clients {selectedBranchForClient ? `(for ${branches.find(b => b._id === selectedBranchForClient)?.name})` : '(All)'}</h4>
      {allClients.length === 0 && !isLoading && <p className="text-gray-600">No clients found for your company {selectedBranchForClient ? `in the selected branch.` : '.'}</p>}
      {allClients.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer Mobile</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Branch</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notification Emails</th> {/* NEW */}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {allClients.map((client) => (
                <tr key={client._id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{client.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{client.customerName || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{client.customerMobile || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{client.branch?.name || 'N/A'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{formatEmailsArray(client.notificationEmails)}</td> {/* NEW */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleEditClient(client)}
                      className="text-indigo-600 hover:text-indigo-900 mr-4"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteClient(client._id, client.branch?._id)}
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
      <h3 className="text-2xl font-semibold text-gray-800 mb-4">Manage Branches & Clients</h3>

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

      {renderBranchManagement()}
      {renderClientManagement()}
    </div>
  );

  // Render the Reviews Viewing content
  const renderViewReviews = () => (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h3 className="text-2xl font-semibold text-gray-800 mb-4">View Company Reviews</h3>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div>
          <label htmlFor="filterBranch" className="block text-sm font-medium text-gray-700">Filter by Branch:</label>
          <select
            id="filterBranch"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            value={filterBranchId}
            onChange={(e) => {
              setFilterBranchId(e.target.value);
              setFilterClientId(''); // Reset client filter when branch changes
              fetchClientsForCompanyAdminFilters(e.target.value); // Fetch clients for new branch
            }}
          >
            <option value="">All Branches</option>
            {branches.map(branch => (
              <option key={branch._id} value={branch._id}>{branch.name}</option>
            ))}
          </select>
        </div>
        {/* NEW: Filter by Client */}
        <div>
          <label htmlFor="filterClient" className="block text-sm font-medium text-gray-700">Filter by Client:</label>
          <select
            id="filterClient"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            value={filterClientId}
            onChange={(e) => setFilterClientId(e.target.value)}
            disabled={filteredClients.length === 0 && filterBranchId !== ''} // Disable if no clients for selected branch, but enable if no branch selected (show all company clients)
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
        onClick={fetchCompanyReviews}
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

      <h4 className="text-xl font-semibold text-gray-800 mb-4">Your Company's Reviews ({reviews.length})</h4>
      {reviews.length === 0 && !isLoading && !error && <p className="text-gray-600">No reviews found for your company matching your criteria.</p>}
      {reviews.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rating</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Branch</th>
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{review.branch?.name || 'N/A'}</td>
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
        <h2 className="text-3xl font-bold text-center text-green-800 mb-6">Company Admin Login</h2>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email:</label>
            <input
              type="email"
              id="email"
              className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm"
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
              className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm"
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
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-lg font-semibold text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition duration-300 ease-in-out"
            disabled={isLoading}
          >
            {isLoading ? 'Logging In...' : 'Login'}
          </button>
          <div className="text-center mt-4">
            <button
              type="button"
              onClick={() => setCurrentView('forgotPassword')}
              className="text-sm text-green-600 hover:text-green-800 hover:underline"
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
        <h2 className="text-3xl font-bold text-center text-green-800 mb-6">Forgot Password</h2>
        {!otpSent ? (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div>
              <label htmlFor="forgotEmail" className="block text-sm font-medium text-gray-700 mb-1">Enter your email:</label>
              <input
                type="email"
                id="forgotEmail"
                className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm"
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
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-lg font-semibold text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition duration-300 ease-in-out"
              disabled={isLoading}
            >
              {isLoading ? 'Sending OTP...' : 'Request OTP'}
            </button>
            <div className="text-center mt-4">
              <button
                type="button"
                onClick={() => setCurrentView('login')}
                className="text-sm text-green-600 hover:text-green-800 hover:underline"
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
                className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm"
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
                className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm"
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
                className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm"
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
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-lg font-semibold text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition duration-300 ease-in-out"
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
                className="text-sm text-green-600 hover:text-green-800 hover:underline"
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
      <header className="bg-green-700 text-white p-4 shadow-md flex justify-between items-center">
        <h1 className="text-2xl font-bold">Company Admin Dashboard</h1>
        <div className="flex items-center space-x-4">
          <span className="text-lg">Welcome, {userData?.email} ({userData?.company?.name || 'Company Admin'})</span>
          <button
            onClick={handleLogout}
            className="bg-green-800 hover:bg-green-900 text-white px-4 py-2 rounded-md transition duration-300 ease-in-out"
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
                  ? 'border-b-4 border-green-600 text-green-700'
                  : 'text-gray-600 hover:text-gray-900 hover:border-gray-300'
              } focus:outline-none transition-colors duration-200`}
            >
              Manage Branches & Clients
            </button>
            <button
              onClick={() => setActiveTab('reviews')}
              className={`px-6 py-3 text-lg font-medium ${
                activeTab === 'reviews'
                  ? 'border-b-4 border-green-600 text-green-700'
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
