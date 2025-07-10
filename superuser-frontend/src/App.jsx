import React, { useState, useEffect } from 'react';


// Main App component for the Superuser Interface
const App = () => {
  // State for managing the current view: 'login', 'dashboard', 'forgotPassword', 'resetPassword'
  const [currentView, setCurrentView] = useState('login');
  // State for login form inputs
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // State for login error messages
  const [loginError, setLoginError] = useState('');
  // State to store the authenticated user's data (including token, role, etc.)
  const [userData, setUserData] = useState(null);
  // State for managing active tab in the dashboard: 'manage' or 'reviews'
  const [activeTab, setActiveTab] = useState('manage');

  // States for managing entities data
  const [companies, setCompanies] = useState([]);
  const [branches, setBranches] = useState([]);
  const [allClients, setAllClients] = useState([]); // All clients for general purposes (e.g., client management)
  const [filteredClients, setFilteredClients] = useState([]); // Clients for the review filter dropdown

  // States for forms (Add/Edit) - Company
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newCompanyAdminEmail, setNewCompanyAdminEmail] = useState('');
  const [newCompanyAdminPassword, setNewCompanyAdminPassword] = useState('');
  const [newCompanyNotificationEmails, setNewCompanyNotificationEmails] = useState(''); // NEW: For company notification emails
  const [editingCompany, setEditingCompany] = useState(null); // null or company object
  const [showAddCompanyForm, setShowAddCompanyForm] = useState(false);

  // States for forms (Add/Edit) - Branch
  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchAdminEmail, setNewBranchAdminEmail] = useState('');
  const [newBranchAdminPassword, setNewBranchAdminPassword] = useState('');
  const [newBranchNotificationEmails, setNewBranchNotificationEmails] = useState(''); // NEW: For branch notification emails
  const [selectedCompanyForBranch, setSelectedCompanyForBranch] = useState(''); // For creating new branch
  const [editingBranch, setEditingBranch] = useState(null); // null or branch object
  const [showAddBranchForm, setShowAddBranchForm] = useState(false);

  // States for forms (Add/Edit) - Client
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientPassword, setNewClientPassword] = useState('');
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerMobile, setNewCustomerMobile] = useState('');
  const [newClientNotificationEmails, setNewClientNotificationEmails] = useState(''); // NEW: For client notification emails
  const [selectedCompanyForClient, setSelectedCompanyForClient] = useState(''); // For creating new client
  const [selectedBranchForClient, setSelectedBranchForClient] = useState(''); // For creating new client
  const [editingClient, setEditingClient] = useState(null); // null or client object
  const [showAddClientForm, setShowAddClientForm] = useState(false);

  // States for reviews viewing
  const [reviews, setReviews] = useState([]);
  const [filterCompanyId, setFilterCompanyId] = useState('');
  const [filterBranchId, setFilterBranchId] = useState('');
  const [filterClientId, setFilterClientId] = useState(''); // New state for client filter
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  // Loading and error states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // NEW: States for Forgot Password / OTP
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [forgotPasswordMessage, setForgotPasswordMessage] = useState('');
  const [forgotPasswordError, setForgotPasswordError] = useState('');


  // Base URL for your backend API
  const API_BASE_URL = 'http://localhost:5000/api'; // IMPORTANT: Change this to your backend URL in production

  // Helper to get auth headers
  const getAuthHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${userData?.token}`,
  });

  // Effect to check for stored token on component mount
  useEffect(() => {
    const storedToken = localStorage.getItem('superuserToken');
    const storedUserData = localStorage.getItem('superuserUserData');

    if (storedToken && storedUserData) {
      try {
        const parsedUserData = JSON.parse(storedUserData);
        // Basic validation: ensure it's a superuser token
        if (parsedUserData.role === 'superuser') {
          setUserData(parsedUserData);
          setCurrentView('dashboard');
        } else {
          // If a non-superuser token is found, clear it
          localStorage.removeItem('superuserToken');
          localStorage.removeItem('superuserUserData');
        }
      } catch (error) {
        console.error('Failed to parse stored user data:', error);
        localStorage.removeItem('superuserToken');
        localStorage.removeItem('superuserUserData');
      }
    }
  }, []);

  // Effect to fetch initial data when dashboard is loaded and user is authenticated
  useEffect(() => {
    if (currentView === 'dashboard' && userData?.token) {
      if (activeTab === 'manage') {
        fetchAllCompanies();
        fetchAllClientsForManagement(); // Fetch all clients for client management tab
      } else if (activeTab === 'reviews') {
        fetchAllCompanies(); // Always fetch companies for review filters
        // Fetch clients and branches based on current filter selections
        fetchClientsAndBranchesForReviewFilters(filterCompanyId, filterBranchId);
        fetchAllReviews(); // Fetch reviews when reviews tab is active
      }
    }
  }, [currentView, userData, activeTab, filterCompanyId, filterBranchId, filterClientId, filterStartDate, filterEndDate]); // Re-fetch if view, user, active tab, or filters change

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
        if (data.role === 'superuser') {
          // Store token and user data in local storage
          localStorage.setItem('superuserToken', data.token);
          localStorage.setItem('superuserUserData', JSON.stringify(data));
          setUserData(data);
          setCurrentView('dashboard');
        } else {
          setLoginError('Access Denied: Not a Superuser account.');
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
    localStorage.removeItem('superuserToken');
    localStorage.removeItem('superuserUserData');
    setUserData(null);
    setCurrentView('login');
    setEmail('');
    setPassword('');
    // Clear all entity data as well
    setCompanies([]);
    setBranches([]);
    setAllClients([]); // Clear all clients
    setFilteredClients([]); // Clear filtered clients
    setReviews([]); // Clear reviews on logout
  };

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


  // --- API Calls for Companies, Branches, Clients ---

  const fetchAllCompanies = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/superuser/companies`, {
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      if (response.ok) {
        setCompanies(data);
      } else {
        setError(data.message || 'Failed to fetch companies.');
      }
    } catch (err) {
      console.error('Error fetching companies:', err);
      setError('Network error fetching companies.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBranchesByCompany = async (companyId) => {
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/superuser/companies/${companyId}/branches`, {
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      if (response.ok) {
        setBranches(data);
      } else {
        setError(data.message || 'Failed to fetch branches.');
        setBranches([]); // Clear branches on error
      }
    } catch (err) {
      console.error('Error fetching branches:', err);
      setError('Network error fetching branches.');
      setBranches([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetches clients for management tab (can be all, or by company/branch)
  const fetchClientsByBranchOrCompany = async (parentId, type) => {
    setIsLoading(true);
    setError('');
    try {
      let url = '';
      if (type === 'branch') {
        url = `${API_BASE_URL}/superuser/branches/${parentId}/clients`;
      } else if (type === 'company') {
        url = `${API_BASE_URL}/superuser/companies/${parentId}/clients`;
      } else {
        url = `${API_BASE_URL}/superuser/clients`; // Fetch all clients for superuser
      }

      const response = await fetch(url, {
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      if (response.ok) {
        setAllClients(data); // Update the 'allClients' state
      } else {
        setError(data.message || 'Failed to fetch clients.');
        setAllClients([]); // Clear clients on error
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
      const response = await fetch(`${API_BASE_URL}/superuser/clients`, {
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

  // NEW: Function to fetch clients and branches specifically for the review filters
  const fetchClientsAndBranchesForReviewFilters = async (companyId, branchId) => {
    setError('');
    setIsLoading(true); // Indicate loading for filters

    try {
      // Fetch branches based on selected company
      if (companyId) {
        const branchResponse = await fetch(`${API_BASE_URL}/superuser/companies/${companyId}/branches`, {
          headers: getAuthHeaders(),
        });
        const branchData = await branchResponse.json();
        if (branchResponse.ok) {
          setBranches(branchData);
        } else {
          setError(branchData.message || 'Failed to fetch branches for filter.');
          setBranches([]);
        }
      } else {
        setBranches([]); // Clear branches if no company selected
      }

      // Determine client fetch URL based on company and branch selection
      let clientUrl = `${API_BASE_URL}/superuser/clients`; // Default to all clients
      if (branchId) {
        clientUrl = `${API_BASE_URL}/superuser/branches/${branchId}/clients`;
      } else if (companyId) {
        clientUrl = `${API_BASE_URL}/superuser/companies/${companyId}/clients`;
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
      console.error('Error fetching clients/branches for review filters:', err);
      setError('Network error fetching filter data.');
    } finally {
      setIsLoading(false);
    }
  };


  // --- Company CRUD Operations ---
  const handleCreateCompany = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccessMessage('');

    if (!newCompanyName || !newCompanyAdminEmail || !newCompanyAdminPassword) {
      setError('Company name, admin email, and admin password are required.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/superuser/companies`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          companyName: newCompanyName,
          adminEmail: newCompanyAdminEmail,
          adminPassword: newCompanyAdminPassword,
          notificationEmails: parseEmailsString(newCompanyNotificationEmails), // NEW: Send as array
        }),
      });
      const data = await response.json();
      if (response.ok) {
        setSuccessMessage('Company created successfully!');
        setNewCompanyName('');
        setNewCompanyAdminEmail('');
        setNewCompanyAdminPassword('');
        setNewCompanyNotificationEmails(''); // Clear field
        setShowAddCompanyForm(false); // Hide form after creation
        fetchAllCompanies(); // Refresh list
      } else {
        setError(data.message || 'Failed to create company.');
      }
    } catch (err) {
      console.error('Error creating company:', err);
      setError('Network error creating company.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditCompany = (company) => {
    setEditingCompany(company);
    setNewCompanyName(company.name);
    setNewCompanyAdminEmail(company.companyAdmin?.email || ''); // Pre-fill admin email
    setNewCompanyAdminPassword(''); // Password should not be pre-filled for security
    setNewCompanyNotificationEmails(formatEmailsArray(company.notificationEmails)); // NEW: Pre-fill notification emails
    setShowAddCompanyForm(true); // Show form for editing
  };

  const handleUpdateCompany = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccessMessage('');

    if (!editingCompany || !newCompanyName || !newCompanyAdminEmail) {
      setError('All fields are required for update.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/superuser/companies/${editingCompany._id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          companyName: newCompanyName,
          adminEmail: newCompanyAdminEmail,
          // Only send password if it's explicitly changed
          ...(newCompanyAdminPassword && { adminPassword: newCompanyAdminPassword }),
          notificationEmails: parseEmailsString(newCompanyNotificationEmails), // NEW: Send as array
        }),
      });
      const data = await response.json();
      if (response.ok) {
        setSuccessMessage('Company updated successfully!');
        setEditingCompany(null);
        setNewCompanyName('');
        setNewCompanyAdminEmail('');
        setNewCompanyAdminPassword('');
        setNewCompanyNotificationEmails(''); // Clear field
        setShowAddCompanyForm(false); // Hide form after update
        fetchAllCompanies(); // Refresh list
      } else {
        setError(data.message || 'Failed to update company.');
      }
    } catch (err) {
      console.error('Error updating company:', err);
      setError('Network error updating company.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCompany = async (companyId) => {
    if (!window.confirm('Are you sure you want to delete this company and ALL its associated branches, clients, and reviews? This action cannot be undone.')) {
      return;
    }
    setIsLoading(true);
    setError('');
    setSuccessMessage('');
    try {
      const response = await fetch(`${API_BASE_URL}/superuser/companies/${companyId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      if (response.ok) {
        setSuccessMessage('Company deleted successfully!');
        fetchAllCompanies(); // Refresh list
        setBranches([]); // Clear branches and allClients as they might be deleted
        setAllClients([]);
      } else {
        setError(data.message || 'Failed to delete company.');
      }
    } catch (err) {
      console.error('Error deleting company:', err);
      setError('Network error deleting company.');
    } finally {
      setIsLoading(false);
    }
  };

  // --- Branch CRUD Operations ---
  const handleCreateBranch = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccessMessage('');

    if (!selectedCompanyForBranch || !newBranchName || !newBranchAdminEmail || !newBranchAdminPassword) {
      setError('All branch creation fields are required.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/superuser/companies/${selectedCompanyForBranch}/branches`, {
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
        // Refresh branches for the selected company
        fetchBranchesByCompany(selectedCompanyForBranch);
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
    setSelectedCompanyForBranch(branch.company._id || branch.company); // Pre-fill company ID
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
      const response = await fetch(`${API_BASE_URL}/superuser/branches/${editingBranch._id}`, {
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
        // Refresh branches for the selected company
        fetchBranchesByCompany(selectedCompanyForBranch);
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

  const handleDeleteBranch = async (branchId, companyId) => {
    if (!window.confirm('Are you sure you want to delete this branch and ALL its associated clients and reviews? This action cannot be undone.')) {
      return;
    }
    setIsLoading(true);
    setError('');
    setSuccessMessage('');
    try {
      const response = await fetch(`${API_BASE_URL}/superuser/branches/${branchId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      if (response.ok) {
        setSuccessMessage('Branch deleted successfully!');
        fetchBranchesByCompany(companyId); // Refresh branches for the current company
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

  // --- Client CRUD Operations ---
  const handleCreateClient = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccessMessage('');

    if (!newClientEmail || !newClientPassword || !newCustomerName || !newCustomerMobile || (!selectedCompanyForClient && !selectedBranchForClient)) {
      setError('All client creation fields and a parent company/branch are required.');
      setIsLoading(false);
      return;
    }

    let url = '';
    let payload = {
      clientEmail: newClientEmail,
      clientPassword: newClientPassword,
      customerName: newCustomerName,
      customerMobile: newCustomerMobile,
      notificationEmails: parseEmailsString(newClientNotificationEmails), // NEW: Send as array
    };

    if (selectedBranchForClient) {
      url = `${API_BASE_URL}/superuser/branches/${selectedBranchForClient}/clients`;
    } else if (selectedCompanyForClient) {
      url = `${API_BASE_URL}/superuser/companies/${selectedCompanyForClient}/clients`;
    }

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
        setShowAddClientForm(false); // Hide form after creation
        // Refresh clients based on current selection
        if (selectedBranchForClient) {
          fetchClientsByBranchOrCompany(selectedBranchForClient, 'branch');
        } else if (selectedCompanyForClient) {
          fetchClientsByBranchOrCompany(selectedCompanyForClient, 'company');
        } else {
          fetchAllClientsForManagement(); // Fetch all clients
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
    setSelectedCompanyForClient(client.company?._id || client.company || '');
    setSelectedBranchForClient(client.branch?._id || client.branch || '');
    setShowAddClientForm(true); // Show form for editing
  };

  const handleUpdateClient = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccessMessage('');

    if (!editingClient || !newClientEmail || !newCustomerName || !newCustomerMobile || (!selectedCompanyForClient && !selectedBranchForClient)) {
      setError('All fields are required for update and a parent company/branch must be selected.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/superuser/clients/${editingClient._id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          clientEmail: newClientEmail,
          ...(newClientPassword && { clientPassword: newClientPassword }),
          customerName: newCustomerName, // Send updated customerName
          customerMobile: newCustomerMobile, // Send updated customerMobile
          branchId: selectedBranchForClient || null, // Pass null if no branch selected
          companyId: selectedCompanyForClient || null,
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
        setShowAddClientForm(false); // Hide form after update
        // Refresh clients based on current selection
        if (selectedBranchForClient) {
          fetchClientsByBranchOrCompany(selectedBranchForClient, 'branch');
        } else if (selectedCompanyForClient) {
          fetchClientsByBranchOrCompany(selectedCompanyForClient, 'company');
        } else {
          fetchAllClientsForManagement(); // Fetch all clients
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

  const handleDeleteClient = async (clientId, parentType, parentId) => {
    if (!window.confirm('Are you sure you want to delete this client and ALL their associated reviews? This action cannot be undone.')) {
      return;
    }
    setIsLoading(true);
    setError('');
    setSuccessMessage('');
    try {
      const response = await fetch(`${API_BASE_URL}/superuser/clients/${clientId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      if (response.ok) {
        setSuccessMessage('Client deleted successfully!');
        // Refresh clients based on current selection
        if (parentType === 'branch') {
          fetchClientsByBranchOrCompany(parentId, 'branch');
        } else if (parentType === 'company') {
          fetchClientsByBranchOrCompany(parentId, 'company');
        } else {
          fetchAllClientsForManagement(); // Fetch all clients
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

  // --- Reviews API Calls ---
  const fetchAllReviews = async () => {
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
      if (filterClientId) { // New filter parameter
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
      console.error('Error fetching reviews:', err);
      setError('Network error fetching reviews.');
      setReviews([]);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Forgot Password / OTP Functions ---

  const handleRequestOTP = async (e) => {
    e.preventDefault();
    setForgotPasswordMessage('');
    setForgotPasswordError('');
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/request-password-reset-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: forgotPasswordEmail }),
      });

      const data = await response.json();

      if (response.ok) {
        setForgotPasswordMessage(data.message || 'OTP sent to your email.');
        setCurrentView('resetPassword'); // Move to OTP entry/password reset view
      } else {
        setForgotPasswordError(data.message || 'Failed to send OTP. Please try again.');
      }
    } catch (error) {
      console.error('Request OTP API error:', error);
      setForgotPasswordError('Network error or server unavailable. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setForgotPasswordMessage('');
    setForgotPasswordError('');
    setIsLoading(true);

    if (newPassword !== confirmNewPassword) {
      setForgotPasswordError('New passwords do not match.');
      setIsLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setForgotPasswordError('New password must be at least 6 characters long.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/reset-password-with-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: forgotPasswordEmail,
          otp: otp,
          newPassword: newPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setForgotPasswordMessage(data.message || 'Password has been reset successfully. You can now log in with your new password.');
        // Clear form fields
        setForgotPasswordEmail('');
        setOtp('');
        setNewPassword('');
        setConfirmNewPassword('');
        setCurrentView('login'); // Go back to login page
      } else {
        setForgotPasswordError(data.message || 'Failed to reset password. Please check your OTP or try again.');
      }
    } catch (error) {
      console.error('Reset password API error:', error);
      setForgotPasswordError('Network error or server unavailable. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // --- Render Functions for Manage Entities Tab ---
  const renderCompanyManagement = () => (
    <div className="mb-8 p-6 bg-blue-50 rounded-lg shadow-inner">
      <div className="flex justify-between items-center mb-4">
        <h4 className="text-xl font-semibold text-blue-800">Companies</h4>
        <button
          onClick={() => {
            setShowAddCompanyForm(!showAddCompanyForm);
            // Clear form fields when toggling to add mode
            if (!showAddCompanyForm) {
              setEditingCompany(null);
              setNewCompanyName('');
              setNewCompanyAdminEmail('');
              setNewCompanyAdminPassword('');
              setNewCompanyNotificationEmails(''); // Clear field
            }
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200"
        >
          {showAddCompanyForm ? 'Hide Add Company Form' : 'Add New Company'}
        </button>
      </div>
      {showAddCompanyForm && (
        <form onSubmit={editingCompany ? handleUpdateCompany : handleCreateCompany} className="space-y-4 border p-4 rounded-lg bg-white mb-6">
          <h5 className="text-lg font-semibold text-gray-800">{editingCompany ? 'Edit Company Details' : 'Create New Company'}</h5>
          <div>
            <label htmlFor="companyName" className="block text-sm font-medium text-gray-700">Company Name:</label>
            <input
              type="text"
              id="companyName"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              value={newCompanyName}
              onChange={(e) => setNewCompanyName(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="companyAdminEmail" className="block text-sm font-medium text-gray-700">Admin Email:</label>
            <input
              type="email"
              id="companyAdminEmail"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              value={newCompanyAdminEmail}
              onChange={(e) => setNewCompanyAdminEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="companyAdminPassword" className="block text-sm font-medium text-gray-700">Admin Password: {editingCompany ? '(Leave blank to keep current)' : ''}</label>
            <input
              type="password"
              id="companyAdminPassword"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              value={newCompanyAdminPassword}
              onChange={(e) => setNewCompanyAdminPassword(e.target.value)}
              required={!editingCompany} // Required only for new creation
            />
          </div>
          {/* NEW: Notification Emails Input */}
          <div>
            <label htmlFor="companyNotificationEmails" className="block text-sm font-medium text-gray-700">Notification Emails (comma-separated):</label>
            <input
              type="text"
              id="companyNotificationEmails"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              value={newCompanyNotificationEmails}
              onChange={(e) => setNewCompanyNotificationEmails(e.target.value)}
              placeholder="email1@example.com, email2@example.com"
            />
          </div>
          <button
            type="submit"
            className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            disabled={isLoading}
          >
            {isLoading ? 'Processing...' : (editingCompany ? 'Update Company' : 'Create Company')}
          </button>
        </form>
      )}
      {companies.length === 0 && !isLoading && !error && (
        <p className="text-gray-600 text-center py-4">No companies found. Add a new company to get started.</p>
      )}
      {companies.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company Name</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Admin Email</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notification Emails</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {companies.map((company) => (
                <tr key={company._id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{company.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{company.companyAdmin?.email || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatEmailsArray(company.notificationEmails)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button onClick={() => handleEditCompany(company)} className="text-indigo-600 hover:text-indigo-900 mr-4">Edit</button>
                    <button onClick={() => handleDeleteCompany(company._id)} className="text-red-600 hover:text-red-900">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const renderBranchManagement = () => (
    <div className="mb-8 p-6 bg-green-50 rounded-lg shadow-inner">
      <div className="flex justify-between items-center mb-4">
        <h4 className="text-xl font-semibold text-green-800">Branches</h4>
        <button
          onClick={() => {
            setShowAddBranchForm(!showAddBranchForm);
            if (!showAddBranchForm) {
              setEditingBranch(null);
              setNewBranchName('');
              setNewBranchAdminEmail('');
              setNewBranchAdminPassword('');
              setNewBranchNotificationEmails(''); // Clear field
              setSelectedCompanyForBranch(''); // Clear selected company
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
            <label htmlFor="selectCompanyForBranch" className="block text-sm font-medium text-gray-700">Select Company:</label>
            <select
              id="selectCompanyForBranch"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              value={selectedCompanyForBranch}
              onChange={(e) => {
                setSelectedCompanyForBranch(e.target.value);
                // When company changes, clear branches and clients
                setBranches([]);
                setAllClients([]);
              }}
              required
              disabled={!!editingBranch} // Disable company selection when editing a branch
            >
              <option value="">-- Select a Company --</option>
              {companies.map(company => (
                <option key={company._id} value={company._id}>{company.name}</option>
              ))}
            </select>
          </div>
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
            <label htmlFor="branchNotificationEmails" className="block text-sm font-medium text-gray-700">Notification Emails (comma-separated):</label>
            <input
              type="text"
              id="branchNotificationEmails"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              value={newBranchNotificationEmails}
              onChange={(e) => setNewBranchNotificationEmails(e.target.value)}
              placeholder="email1@example.com, email2@example.com"
            />
          </div>
          <button
            type="submit"
            className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            disabled={isLoading}
          >
            {isLoading ? 'Processing...' : (editingBranch ? 'Update Branch' : 'Create Branch')}
          </button>
        </form>
      )}
      {selectedCompanyForBranch && (
        <button
          onClick={() => fetchBranchesByCompany(selectedCompanyForBranch)}
          className="mb-4 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors duration-200"
          disabled={isLoading}
        >
          Load Branches for Selected Company
        </button>
      )}
      {branches.length === 0 && !isLoading && !error && selectedCompanyForBranch && (
        <p className="text-gray-600 text-center py-4">No branches found for this company. Add a new branch.</p>
      )}
      {branches.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Branch Name</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Admin Email</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notification Emails</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {branches.map((branch) => (
                <tr key={branch._id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{branch.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{branch.branchAdmin?.email || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatEmailsArray(branch.notificationEmails)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button onClick={() => handleEditBranch(branch)} className="text-indigo-600 hover:text-indigo-900 mr-4">Edit</button>
                    <button onClick={() => handleDeleteBranch(branch._id, branch.company._id || branch.company)} className="text-red-600 hover:text-red-900">Delete</button>
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
            if (!showAddClientForm) {
              setEditingClient(null);
              setNewClientEmail('');
              setNewClientPassword('');
              setNewCustomerName('');
              setNewCustomerMobile('');
              setNewClientNotificationEmails(''); // Clear field
              setSelectedCompanyForClient('');
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
            <label htmlFor="selectCompanyForClient" className="block text-sm font-medium text-gray-700">Select Company (Optional):</label>
            <select
              id="selectCompanyForClient"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              value={selectedCompanyForClient}
              onChange={(e) => {
                setSelectedCompanyForClient(e.target.value);
                setSelectedBranchForClient(''); // Clear branch when company changes
                setBranches([]); // Clear branches list
              }}
            >
              <option value="">-- Select a Company --</option>
              {companies.map(company => (
                <option key={company._id} value={company._id}>{company.name}</option>
              ))}
            </select>
          </div>
          {selectedCompanyForClient && (
            <div>
              <label htmlFor="selectBranchForClient" className="block text-sm font-medium text-gray-700">Select Branch (Optional):</label>
              <select
                id="selectBranchForClient"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                value={selectedBranchForClient}
                onChange={(e) => setSelectedBranchForClient(e.target.value)}
              >
                <option value="">-- Select a Branch --</option>
                {branches.filter(branch => (branch.company._id || branch.company) === selectedCompanyForClient).map(branch => (
                  <option key={branch._id} value={branch._id}>{branch.name}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => fetchBranchesByCompany(selectedCompanyForClient)}
                className="mt-2 px-3 py-1 bg-blue-500 text-white text-xs rounded-md hover:bg-blue-600"
                disabled={isLoading}
              >
                Load Branches
              </button>
            </div>
          )}
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
            <label htmlFor="customerName" className="block text-sm font-medium text-gray-700">Customer Name:</label>
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
            <label htmlFor="customerMobile" className="block text-sm font-medium text-gray-700">Customer Mobile:</label>
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
            <label htmlFor="clientNotificationEmails" className="block text-sm font-medium text-gray-700">Notification Emails (comma-separated):</label>
            <input
              type="text"
              id="clientNotificationEmails"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              value={newClientNotificationEmails}
              onChange={(e) => setNewClientNotificationEmails(e.target.value)}
              placeholder="email1@example.com, email2@example.com"
            />
          </div>
          <button
            type="submit"
            className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
            disabled={isLoading}
          >
            {isLoading ? 'Processing...' : (editingClient ? 'Update Client' : 'Create Client')}
          </button>
        </form>
      )}
      <div className="flex space-x-4 mb-4">
        <select
          value={filterCompanyId}
          onChange={(e) => {
            setFilterCompanyId(e.target.value);
            setFilterBranchId(''); // Reset branch filter when company changes
            fetchClientsByBranchOrCompany(e.target.value, 'company');
          }}
          className="mt-1 block w-1/2 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        >
          <option value="">Filter by Company</option>
          {companies.map(company => (
            <option key={company._id} value={company._id}>{company.name}</option>
          ))}
        </select>
        <select
          value={filterBranchId}
          onChange={(e) => {
            setFilterBranchId(e.target.value);
            fetchClientsByBranchOrCompany(e.target.value, 'branch');
          }}
          className="mt-1 block w-1/2 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          disabled={!filterCompanyId}
        >
          <option value="">Filter by Branch</option>
          {branches.filter(branch => (branch.company._id || branch.company) === filterCompanyId).map(branch => (
            <option key={branch._id} value={branch._id}>{branch.name}</option>
          ))}
        </select>
        <button
          onClick={fetchAllClientsForManagement}
          className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors duration-200"
        >
          Show All Clients
        </button>
      </div>

      {allClients.length === 0 && !isLoading && !error && (
        <p className="text-gray-600 text-center py-4">No clients found. Add a new client or adjust filters.</p>
      )}
      {allClients.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client Email</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer Name</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer Mobile</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Branch</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notification Emails</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {allClients.map((client) => (
                <tr key={client._id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{client.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{client.customerName || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{client.customerMobile || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{client.company?.name || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{client.branch?.name || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatEmailsArray(client.notificationEmails)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button onClick={() => handleEditClient(client)} className="text-indigo-600 hover:text-indigo-900 mr-4">Edit</button>
                    <button onClick={() => handleDeleteClient(client._id, client.branch ? 'branch' : (client.company ? 'company' : null), client.branch?._id || client.company?._id)} className="text-red-600 hover:text-red-900">Delete</button>
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
    <div>
      {renderCompanyManagement()}
      {renderBranchManagement()}
      {renderClientManagement()}
    </div>
  );

  const renderViewReviews = () => (
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
              fetchClientsAndBranchesForReviewFilters(e.target.value, ''); // Fetch branches and clients for new company
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
              fetchClientsAndBranchesForReviewFilters(filterCompanyId, e.target.value); // Fetch clients for new branch
            }}
            disabled={!filterCompanyId}
          >
            <option value="">All Branches</option>
            {branches.map(branch => (
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
            disabled={!filterCompanyId && !filterBranchId} // Disable if no company or branch selected
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
        <div className="col-span-full flex justify-end">
          <button
            onClick={fetchAllReviews}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200"
            disabled={isLoading}
          >
            {isLoading ? 'Loading...' : 'Apply Filters'}
          </button>
        </div>
      </div>

      {reviews.length === 0 && !isLoading && !error && (
        <p className="text-gray-600 text-center py-4">No reviews found matching the criteria.</p>
      )}
      {reviews.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rating</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer Name</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer Mobile</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client Email</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Branch</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Review Text</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Voice Audio</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice Data</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {reviews.map((review) => (
                <tr key={review._id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{review.rating}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{review.customerName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{review.customerMobile}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{review.client?.email || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{review.company?.name || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{review.branch?.name || 'N/A'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">{review.transcribedText || review.textReview || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {review.voiceData ? (
                      <audio controls src={review.voiceData} className="w-32" />
                    ) : 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {review.invoiceData ? (
                      <div>
                        {review.invoiceData.jobCardNumber && `Job Card: ${review.invoiceData.jobCardNumber}`}<br />
                        {review.invoiceData.invoiceNumber && `Invoice No: ${review.invoiceData.invoiceNumber}`}<br />
                        {review.invoiceData.invoiceDate && `Invoice Date: ${review.invoiceData.invoiceDate}`}<br />
                        {review.invoiceData.vin && `VIN: ${review.invoiceData.vin}`}<br />
                        {review.invoiceData.customerNameFromInvoice && `Cust Name (Inv): ${review.invoiceData.customerNameFromInvoice}`}<br />
                        {review.invoiceData.customerMobileFromInvoice && `Cust Mobile (Inv): ${review.invoiceData.customerMobileFromInvoice}`}<br />
                        {review.invoiceFileUrl && (
                          <a href={review.invoiceFileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">View File</a>
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
            return (
              <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-700 p-4">
                <div className="bg-white p-10 rounded-2xl shadow-2xl w-full max-w-md">
                  <h2 className="text-4xl font-extrabold text-center text-gray-900 mb-8 tracking-wide">Superuser Login</h2>
                  <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                      <label htmlFor="email" className="block text-base font-medium text-gray-700 mb-2">Email</label>
                      <input
                        type="email"
                        id="email"
                        className="mt-1 block w-full px-5 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 text-lg transition duration-200"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
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
                      disabled={isLoading}
                    >
                      {isLoading ? 'Logging In...' : 'Login'}
                    </button>
                    <div className="text-center mt-4">
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentView('forgotPassword');
                          setLoginError(''); // Clear login error
                          setForgotPasswordMessage(''); // Clear any previous messages
                          setForgotPasswordError(''); // Clear any previous errors
                          setForgotPasswordEmail(''); // Clear email field
                        }}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Forgot Password?
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            );

          case 'forgotPassword':
            return (
              <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-700 p-4">
                <div className="bg-white p-10 rounded-2xl shadow-2xl w-full max-w-md">
                  <h2 className="text-4xl font-extrabold text-center text-gray-900 mb-8 tracking-wide">Forgot Password</h2>
                  <form onSubmit={handleRequestOTP} className="space-y-6">
                    <div>
                      <label htmlFor="forgotPasswordEmail" className="block text-base font-medium text-gray-700 mb-2">Enter your email</label>
                      <input
                        type="email"
                        id="forgotPasswordEmail"
                        className="mt-1 block w-full px-5 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 text-lg transition duration-200"
                        value={forgotPasswordEmail}
                        onChange={(e) => setForgotPasswordEmail(e.target.value)}
                        required
                      />
                    </div>
                    {forgotPasswordError && (
                      <p className="text-red-600 text-sm font-medium text-center -mt-2">{forgotPasswordError}</p>
                    )}
                    {forgotPasswordMessage && (
                      <p className="text-green-600 text-sm font-medium text-center -mt-2">{forgotPasswordMessage}</p>
                    )}
                    <button
                      type="submit"
                      className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-lg text-xl font-bold text-white bg-gradient-to-r from-blue-600 to-purple-700 hover:from-blue-700 hover:to-purple-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transform transition-all duration-300 ease-in-out hover:scale-105"
                      disabled={isLoading}
                    >
                      {isLoading ? 'Sending OTP...' : 'Send OTP'}
                    </button>
                    <div className="text-center mt-4">
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentView('login');
                          setForgotPasswordMessage('');
                          setForgotPasswordError('');
                          setForgotPasswordEmail('');
                        }}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Back to Login
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            );

          case 'resetPassword':
            return (
              <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-700 p-4">
                <div className="bg-white p-10 rounded-2xl shadow-2xl w-full max-w-md">
                  <h2 className="text-4xl font-extrabold text-center text-gray-900 mb-8 tracking-wide">Reset Password</h2>
                  <form onSubmit={handleResetPassword} className="space-y-6">
                    <div>
                      <label htmlFor="resetEmail" className="block text-base font-medium text-gray-700 mb-2">Email</label>
                      <input
                        type="email"
                        id="resetEmail"
                        className="mt-1 block w-full px-5 py-3 border border-gray-300 rounded-lg shadow-sm bg-gray-100 focus:outline-none text-lg"
                        value={forgotPasswordEmail}
                        readOnly // Email should not be editable here
                      />
                    </div>
                    <div>
                      <label htmlFor="otp" className="block text-base font-medium text-gray-700 mb-2">OTP</label>
                      <input
                        type="text"
                        id="otp"
                        className="mt-1 block w-full px-5 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 text-lg transition duration-200"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="newPassword" className="block text-base font-medium text-gray-700 mb-2">New Password</label>
                      <input
                        type="password"
                        id="newPassword"
                        className="mt-1 block w-full px-5 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 text-lg transition duration-200"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="confirmNewPassword" className="block text-base font-medium text-gray-700 mb-2">Confirm New Password</label>
                      <input
                        type="password"
                        id="confirmNewPassword"
                        className="mt-1 block w-full px-5 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 text-lg transition duration-200"
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        required
                      />
                    </div>
                    {forgotPasswordError && (
                      <p className="text-red-600 text-sm font-medium text-center -mt-2">{forgotPasswordError}</p>
                    )}
                    {forgotPasswordMessage && (
                      <p className="text-green-600 text-sm font-medium text-center -mt-2">{forgotPasswordMessage}</p>
                    )}
                    <button
                      type="submit"
                      className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-lg text-xl font-bold text-white bg-gradient-to-r from-blue-600 to-purple-700 hover:from-blue-700 hover:to-purple-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transform transition-all duration-300 ease-in-out hover:scale-105"
                      disabled={isLoading}
                    >
                      {isLoading ? 'Resetting Password...' : 'Reset Password'}
                    </button>
                    <div className="text-center mt-4">
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentView('login');
                          setForgotPasswordMessage('');
                          setForgotPasswordError('');
                          setForgotPasswordEmail('');
                          setOtp('');
                          setNewPassword('');
                          setConfirmNewPassword('');
                        }}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Back to Login
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            );

          case 'dashboard':
            return (
              <div className="min-h-screen bg-gray-100">
                <nav className="bg-white shadow-lg">
                  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                      <div className="flex items-center">
                        <h1 className="text-2xl font-bold text-gray-900">Superuser Dashboard</h1>
                      </div>
                      <div className="flex items-center">
                        <button
                          onClick={handleLogout}
                          className="ml-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors duration-200"
                        >
                          Logout
                        </button>
                      </div>
                    </div>
                    <div className="border-t border-gray-200">
                      <div className="flex space-x-4">
                        <button
                          onClick={() => setActiveTab('manage')}
                          className={`px-6 py-3 text-lg font-medium ${
                            activeTab === 'manage'
                              ? 'border-b-4 border-indigo-600 text-indigo-700'
                              : 'text-gray-600 hover:text-gray-900 hover:border-gray-300'
                          } focus:outline-none transition-colors duration-200`}
                        >
                          Manage Entities
                        </button>
                        <button
                          onClick={() => setActiveTab('reviews')}
                          className={`px-6 py-3 text-lg font-medium ${
                            activeTab === 'reviews'
                              ? 'border-b-4 border-indigo-600 text-indigo-700'
                              : 'text-gray-600 hover:text-gray-900 hover:border-gray-300'
                          } focus:outline-none transition-colors duration-200`}
                        >
                          View Reviews
                        </button>
                      </div>
                    </div>
                  </div>
                </nav>

                {/* Main Content Area - Adjusted to take full width */}
                <main className="w-full px-4 sm:px-6 lg:px-8 py-6"> {/* Removed max-w-7xl, added responsive padding */}
                  {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
                    <strong className="font-bold">Error!</strong>
                    <span className="block sm:inline"> {error}</span>
                  </div>}
                  {successMessage && <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4" role="alert">
                    <strong className="font-bold">Success!</strong>
                    <span className="block sm:inline"> {successMessage}</span>
                  </div>}

                  {activeTab === 'manage' && renderManageEntities()}
                  {activeTab === 'reviews' && renderViewReviews()}
                </main>
              </div>
            );

          default:
            return null;
        }
      })()}
    </div>
  );
};

export default App;
