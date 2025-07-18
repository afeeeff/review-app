import React, { useState, useEffect, useCallback } from 'react';

const ManageEntities = ({
  userData,
  API_BASE_URL,
  isLoading,
  error,
  successMessage,
  setIsLoading,
  setError,
  setSuccessMessage,
  companies, // Companies are passed from App.jsx
  fetchAllCompanies, // Function to refresh companies from App.jsx
}) => {
  // State to control which entity type is currently displayed (Company, Branch, Client)
  const [selectedEntityType, setSelectedEntityType] = useState(''); // Initially empty

  // States for forms (Add/Edit) - Company
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newCompanyAdminEmail, setNewCompanyAdminEmail] = useState('');
  const [newCompanyAdminPassword, setNewCompanyAdminPassword] = useState('');
  const [newCompanyNotificationEmails, setNewCompanyNotificationEmails] = useState('');
  const [editingCompany, setEditingCompany] = useState(null);
  const [showAddCompanyForm, setShowAddCompanyForm] = useState(false);

  // States for forms (Add/Edit) - Branch
  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchAdminEmail, setNewBranchAdminEmail] = useState('');
  const [newBranchAdminPassword, setNewBranchAdminPassword] = useState('');
  const [newBranchNotificationEmails, setNewBranchNotificationEmails] = useState('');
  const [selectedCompanyForBranchFilter, setSelectedCompanyForBranchFilter] = useState(''); // For filtering branches table
  const [editingBranch, setEditingBranch] = useState(null);
  const [showAddBranchForm, setShowAddBranchForm] = useState(false);
  const [managedBranches, setManagedBranches] = useState([]); // Branches displayed in the table

  // States for forms (Add/Edit) - Client
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientPassword, setNewClientPassword] = useState('');
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerMobile, setNewCustomerMobile] = useState('');
  const [newClientNotificationEmails, setNewClientNotificationEmails] = useState('');
  const [selectedCompanyForClientFilter, setSelectedCompanyForClientFilter] = useState(''); // For filtering clients table
  const [selectedBranchForClientFilter, setSelectedBranchForClientFilter] = useState(''); // For filtering clients table
  const [editingClient, setEditingClient] = useState(null);
  const [showAddClientForm, setShowAddClientForm] = useState(false);
  const [managedClients, setManagedClients] = useState([]); // Clients displayed in the table
  const [branchesForClientDropdown, setBranchesForClientDropdown] = useState([]); // Branches for client add/edit form & filter dropdown


  // Helper to get auth headers
  const getAuthHeaders = useCallback(() => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${userData?.token}`,
  }), [userData?.token]);

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

  // Fetches branches for the selected company in the branch management section
  const fetchBranchesByCompany = useCallback(async (companyId) => {
    setIsLoading(true);
    setError('');
    setManagedBranches([]); // Clear previous branches
    if (!companyId) {
      setIsLoading(false);
      return;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/superuser/companies/${companyId}/branches`, {
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      if (response.ok) {
        setManagedBranches(data); // Update managedBranches
        console.log("ManageEntities: Branches fetched for company", companyId, ":", data);
      } else {
        setError(data.message || 'Failed to fetch branches.');
        setManagedBranches([]);
        console.error("ManageEntities: Failed to fetch branches for company", companyId, ":", data.message);
      }
    } catch (err) {
      console.error('ManageEntities: Error fetching branches:', err);
      setError('Network error fetching branches.');
      setManagedBranches([]);
    } finally {
      setIsLoading(false);
    }
  }, [API_BASE_URL, getAuthHeaders, setIsLoading, setError]); // Added dependencies

  // Fetches clients based on selected company or branch in the client management section
  const fetchClientsByBranchOrCompany = useCallback(async (companyId, branchId) => {
    setIsLoading(true);
    setError('');
    setManagedClients([]); // Clear previous clients
    if (!companyId && !branchId) {
      setIsLoading(false);
      return;
    }

    let url = '';
    if (branchId) {
      url = `${API_BASE_URL}/superuser/branches/${branchId}/clients`;
    } else if (companyId) {
      url = `${API_BASE_URL}/superuser/companies/${companyId}/clients`;
    } else {
      setIsLoading(false);
      return; // Should not happen if at least one ID is provided
    }

    try {
      const response = await fetch(url, {
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      if (response.ok) {
        setManagedClients(data); // Update managedClients
        console.log("ManageEntities: Clients fetched for company/branch", companyId, branchId, ":", data);
      } else {
        setError(data.message || 'Failed to fetch clients.');
        setManagedClients([]);
        console.error("ManageEntities: Failed to fetch clients for company/branch", companyId, branchId, ":", data.message);
      }
    } catch (err) {
      console.error('ManageEntities: Error fetching clients:', err);
      setError('Network error fetching clients.');
      setManagedClients([]);
    } finally {
      setIsLoading(false);
    }
  }, [API_BASE_URL, getAuthHeaders, setIsLoading, setError]); // Added dependencies

  // Fetches branches specifically for the client form/filter dropdown
  const fetchBranchesForClientDropdown = useCallback(async (companyId) => {
    setError('');
    setBranchesForClientDropdown([]); // Clear previous branches
    if (!companyId) {
      return;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/superuser/companies/${companyId}/branches`, {
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      if (response.ok) {
        setBranchesForClientDropdown(data);
        console.log("ManageEntities: Branches fetched for client dropdown (company", companyId, "):", data);
      } else {
        setError(data.message || 'Failed to fetch branches for client dropdown.');
        setBranchesForClientDropdown([]);
        console.error("ManageEntities: Failed to fetch branches for client dropdown (company", companyId, "):", data.message);
      }
    } catch (err) {
      console.error('ManageEntities: Error fetching branches for client dropdown:', err);
      setError('Network error fetching branches for client dropdown.');
      setBranchesForClientDropdown([]);
    }
  }, [API_BASE_URL, getAuthHeaders, setError]); // Added dependencies

  // Effects to trigger data fetching based on filter changes
  useEffect(() => {
    if (selectedEntityType === 'branch' && selectedCompanyForBranchFilter) {
      fetchBranchesByCompany(selectedCompanyForBranchFilter);
    } else if (selectedEntityType === 'branch') {
      setManagedBranches([]); // Clear branches if no company is selected and branch tab is active
    }
  }, [selectedCompanyForBranchFilter, fetchBranchesByCompany, selectedEntityType]);

  useEffect(() => {
    if (selectedEntityType === 'client' && (selectedCompanyForClientFilter || selectedBranchForClientFilter)) {
      fetchClientsByBranchOrCompany(selectedCompanyForClientFilter, selectedBranchForClientFilter);
    } else if (selectedEntityType === 'client') {
      setManagedClients([]); // Clear clients if no company or branch is selected and client tab is active
    }
    // Also update the client form's branch dropdown if company filter changes
    if (selectedEntityType === 'client') {
      fetchBranchesForClientDropdown(selectedCompanyForClientFilter);
    }
  }, [selectedCompanyForClientFilter, selectedBranchForClientFilter, fetchClientsByBranchOrCompany, fetchBranchesForClientDropdown, selectedEntityType]);


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
          notificationEmails: parseEmailsString(newCompanyNotificationEmails),
        }),
      });
      const data = await response.json();
      if (response.ok) {
        setSuccessMessage('Company created successfully!');
        setNewCompanyName('');
        setNewCompanyAdminEmail('');
        setNewCompanyAdminPassword('');
        setNewCompanyNotificationEmails('');
        setShowAddCompanyForm(false);
        fetchAllCompanies(); // Refresh list in App.jsx
      } else {
        setError(data.message || 'Failed to create company.');
      }
    } catch (err) {
      console.error('ManageEntities: Error creating company:', err);
      setError('Network error creating company.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditCompany = (company) => {
    setEditingCompany(company);
    setNewCompanyName(company.name);
    setNewCompanyAdminEmail(company.companyAdmin?.email || '');
    setNewCompanyAdminPassword('');
    setNewCompanyNotificationEmails(formatEmailsArray(company.notificationEmails));
    setShowAddCompanyForm(true);
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
          ...(newCompanyAdminPassword && { adminPassword: newCompanyAdminPassword }),
          notificationEmails: parseEmailsString(newCompanyNotificationEmails),
        }),
      });
      const data = await response.json();
      if (response.ok) {
        setSuccessMessage('Company updated successfully!');
        setEditingCompany(null);
        setNewCompanyName('');
        setNewCompanyAdminEmail('');
        setNewCompanyAdminPassword('');
        setNewCompanyNotificationEmails('');
        setShowAddCompanyForm(false);
        fetchAllCompanies(); // Refresh list in App.jsx
      } else {
        setError(data.message || 'Failed to update company.');
      }
    } catch (err) {
      console.error('ManageEntities: Error updating company:', err);
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
        fetchAllCompanies(); // Refresh list in App.jsx
        setSelectedCompanyForBranchFilter(''); // Clear branch filter
        setManagedBranches([]); // Clear managed branches as they might be deleted
        setSelectedCompanyForClientFilter(''); // Clear client company filter
        setSelectedBranchForClientFilter(''); // Clear client branch filter
        setManagedClients([]); // Clear managed clients
        setBranchesForClientDropdown([]); // Clear branches for client dropdown
      } else {
        setError(data.message || 'Failed to delete company.');
      }
    } catch (err) {
      console.error('ManageEntities: Error deleting company:', err);
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

    if (!selectedCompanyForBranchFilter || !newBranchName || !newBranchAdminEmail || !newBranchAdminPassword) {
      setError('All branch creation fields and a parent company are required.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/superuser/companies/${selectedCompanyForBranchFilter}/branches`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          branchName: newBranchName,
          adminEmail: newBranchAdminEmail,
          adminPassword: newBranchAdminPassword,
          notificationEmails: parseEmailsString(newBranchNotificationEmails),
        }),
      });
      const data = await response.json();
      if (response.ok) {
        setSuccessMessage('Branch created successfully!');
        setNewBranchName('');
        setNewBranchAdminEmail('');
        setNewBranchAdminPassword('');
        setNewBranchNotificationEmails('');
        setShowAddBranchForm(false);
        fetchBranchesByCompany(selectedCompanyForBranchFilter); // Refresh branches for the selected company
      } else {
        setError(data.message || 'Failed to create branch.');
      }
    } catch (err) {
      console.error('ManageEntities: Error creating branch:', err);
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
    setNewBranchNotificationEmails(formatEmailsArray(branch.notificationEmails));
    setSelectedCompanyForBranchFilter(branch.company._id || branch.company); // Pre-fill company ID
    setShowAddBranchForm(true);
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
          notificationEmails: parseEmailsString(newBranchNotificationEmails),
        }),
      });
      const data = await response.json();
      if (response.ok) {
        setSuccessMessage('Branch updated successfully!');
        setEditingBranch(null);
        setNewBranchName('');
        setNewBranchAdminEmail('');
        setNewBranchAdminPassword('');
        setNewBranchNotificationEmails('');
        setShowAddBranchForm(false);
        fetchBranchesByCompany(selectedCompanyForBranchFilter); // Refresh branches for the current company
      } else {
        setError(data.message || 'Failed to update branch.');
      }
    } catch (err) {
      console.error('ManageEntities: Error updating branch:', err);
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
        setSelectedCompanyForClientFilter(companyId); // Keep client company filter in sync
        setSelectedBranchForClientFilter(''); // Clear client branch filter
        setManagedClients([]); // Clear managed clients as they might be deleted
        setBranchesForClientDropdown([]); // Refresh client's branch dropdown
      } else {
        setError(data.message || 'Failed to delete branch.');
      }
    } catch (err) {
      console.error('ManageEntities: Error deleting branch:', err);
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

    if (!newClientEmail || !newClientPassword || !newCustomerName || !newCustomerMobile || (!selectedCompanyForClientFilter && !selectedBranchForClientFilter)) {
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
      notificationEmails: parseEmailsString(newClientNotificationEmails),
    };

    // Prioritize creating client under a branch if selected
    if (selectedBranchForClientFilter) {
      url = `${API_BASE_URL}/superuser/branches/${selectedBranchForClientFilter}/clients`;
    } else if (selectedCompanyForClientFilter) {
      url = `${API_BASE_URL}/superuser/companies/${selectedCompanyForClientFilter}/clients`;
      payload.companyId = selectedCompanyForClientFilter; // Company ID is directly relevant here
    } else {
      setError('Please select a company or branch for the new client.');
      setIsLoading(false);
      return;
    }

    console.log('Sending client creation request to URL:', url);
    console.log('With payload:', payload);

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
        setNewClientNotificationEmails('');
        setShowAddClientForm(false);
        fetchClientsByBranchOrCompany(selectedCompanyForClientFilter, selectedBranchForClientFilter);
      } else {
        setError(data.message || 'Failed to create client.');
        console.error("ManageEntities: Failed to create client:", data.message);
      }
    } catch (err) {
      console.error('ManageEntities: Error creating client:', err);
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
    setNewClientNotificationEmails(formatEmailsArray(client.notificationEmails));
    setSelectedCompanyForClientFilter(client.company?._id || client.company || '');
    setSelectedBranchForClientFilter(client.branch?._id || client.branch || '');
    // Ensure branches for the client's company are loaded for the dropdown
    fetchBranchesForClientDropdown(client.company?._id || client.company || '');
    setShowAddClientForm(true);
  };

  const handleUpdateClient = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccessMessage('');

    if (!editingClient || !newClientEmail || !newCustomerName || !newCustomerMobile || (!selectedCompanyForClientFilter && !selectedBranchForClientFilter)) {
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
          customerName: newCustomerName,
          customerMobile: newCustomerMobile,
          branchId: selectedBranchForClientFilter || null,
          companyId: selectedCompanyForClientFilter || null,
          notificationEmails: parseEmailsString(newClientNotificationEmails),
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
        setNewClientNotificationEmails('');
        setShowAddClientForm(false);
        // Refresh clients based on current selection
        fetchClientsByBranchOrCompany(selectedCompanyForClientFilter, selectedBranchForClientFilter);
      } else {
        setError(data.message || 'Failed to update client.');
      }
    } catch (err) {
      console.error('ManageEntities: Error updating client:', err);
      setError('Network error updating client.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteClient = async (clientId, companyId, branchId) => {
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
        fetchClientsByBranchOrCompany(companyId, branchId);
      } else {
        setError(data.message || 'Failed to delete client.');
      }
    } catch (err) {
      console.error('ManageEntities: Error deleting client:', err);
      setError('Network error deleting client.');
    } finally {
      setIsLoading(false);
    }
  };

  // --- Render Functions for Manage Entities Tab ---
  const renderCompanyManagement = () => (
    <div className="mb-8 p-6 bg-blue-50 rounded-lg shadow-inner border border-blue-200">
      <div className="flex justify-between items-center mb-4">
        <h4 className="text-xl font-semibold text-blue-800 flex items-center">
          Companies
          <button
            onClick={() => {
              setShowAddCompanyForm(!showAddCompanyForm);
              // Clear form fields when toggling to add mode
              if (!showAddCompanyForm) {
                setEditingCompany(null);
                setNewCompanyName('');
                setNewCompanyAdminEmail('');
                setNewCompanyAdminPassword('');
                setNewCompanyNotificationEmails('');
              }
            }}
            className="ml-4 px-5 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 shadow-md transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            {editingCompany ? 'Edit Company' : 'Create Company'}
          </button>
        </h4>
      </div>
      {showAddCompanyForm && (
        <form onSubmit={editingCompany ? handleUpdateCompany : handleCreateCompany} className="space-y-4 border p-6 rounded-lg bg-white mb-6 shadow-lg">
          <h5 className="text-lg font-bold text-gray-800 mb-4">{editingCompany ? 'Edit Company Details' : 'Create New Company'}</h5>
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
            <label htmlFor="companyAdminPassword" className="block text-sm font-medium text-gray-700">Admin Password: {editingCompany ? '(Leave blank to keep current)(min length:6 characters)' : ''}</label>
            <input
              type="password"
              id="companyAdminPassword"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              value={newCompanyAdminPassword}
              onChange={(e) => setNewCompanyAdminPassword(e.target.value)}
              required={!editingCompany}
            />
          </div>
          {/* Notification Emails Input */}
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
          <div className="flex justify-end space-x-4 mt-6">
            <button
              type="button"
              onClick={() => {
                setShowAddCompanyForm(false);
                setEditingCompany(null);
                setNewCompanyName('');
                setNewCompanyAdminEmail('');
                setNewCompanyAdminPassword('');
                setNewCompanyNotificationEmails('');
              }}
              className="px-6 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
            >
              Discard
            </button>
            <button
              type="submit"
              className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
              disabled={isLoading}
            >
              {isLoading ? 'Processing...' : 'Save Company'}
            </button>
          </div>
        </form>
      )}
      {companies.length === 0 && !isLoading && !error && (
        <p className="text-gray-600 text-center py-4">No companies found. Add a new company to get started.</p>
      )}
      {companies.length > 0 && (
        <div className="overflow-x-auto mt-6 border border-gray-200 rounded-lg shadow-md">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Company Name</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Admin Email</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Notification Emails</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {companies.map((company) => (
                <tr key={company._id} className="hover:bg-gray-50 transition-colors duration-150">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{company.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{company.companyAdmin?.email || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatEmailsArray(company.notificationEmails)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button onClick={() => handleEditCompany(company)} className="text-indigo-600 hover:text-indigo-900 mr-4 font-semibold">Edit</button>
                    <button onClick={() => handleDeleteCompany(company._id)} className="text-red-600 hover:text-red-900 font-semibold">Delete</button>
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
    <div className="mb-8 p-6 bg-green-50 rounded-lg shadow-inner border border-green-200">
      <div className="flex justify-between items-center mb-4">
        <h4 className="text-xl font-semibold text-green-800 flex items-center">
          Branches
          <button
            onClick={() => {
              setShowAddBranchForm(!showAddBranchForm);
              if (!showAddBranchForm) {
                setEditingBranch(null);
                setNewBranchName('');
                setNewBranchAdminEmail('');
                setNewBranchAdminPassword('');
                setNewBranchNotificationEmails('');
                // Do not clear selectedCompanyForBranchFilter here, as it's used for the filter
              }
            }}
            className="ml-4 px-5 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors duration-200 shadow-md transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
          >
            {editingBranch ? 'Edit Branch' : 'Create Branch'}
          </button>
        </h4>
      </div>
      {showAddBranchForm && (
        <form onSubmit={editingBranch ? handleUpdateBranch : handleCreateBranch} className="space-y-4 border p-6 rounded-lg bg-white mb-6 shadow-lg">
          <h5 className="text-lg font-bold text-gray-800 mb-4">{editingBranch ? 'Edit Branch Details' : 'Create New Branch'}</h5>
          <div>
            <label htmlFor="selectCompanyForBranchForm" className="block text-sm font-medium text-gray-700">Select Company:</label>
            <select
              id="selectCompanyForBranchForm"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              value={selectedCompanyForBranchFilter}
              onChange={(e) => {
                setSelectedCompanyForBranchFilter(e.target.value);
                setManagedBranches([]); // Clear branches when company changes
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
          {/* Notification Emails Input */}
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
          <div className="flex justify-end space-x-4 mt-6">
            <button
              type="button"
              onClick={() => {
                setShowAddBranchForm(false);
                setEditingBranch(null);
                setNewBranchName('');
                setNewBranchAdminEmail('');
                setNewBranchAdminPassword('');
                setNewBranchNotificationEmails('');
              }}
              className="px-6 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-200"
            >
              Discard
            </button>
            <button
              type="submit"
              className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-200"
              disabled={isLoading}
            >
              {isLoading ? 'Processing...' : 'Save Branch'}
            </button>
          </div>
        </form>
      )}
      {/* Filter by Company for Branches */}
      <div className="mb-4 mt-6">
        <label htmlFor="filterCompanyForBranches" className="block text-sm font-medium text-gray-700">Filter Branches by Company:</label>
        <select
          id="filterCompanyForBranches"
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          value={selectedCompanyForBranchFilter}
          onChange={(e) => {
            setSelectedCompanyForBranchFilter(e.target.value);
            // No need to call fetchBranchesByCompany here, useEffect will handle it
          }}
        >
          <option value="">-- Select a Company to Filter --</option>
          {companies.map(company => (
            <option key={company._id} value={company._id}>{company.name}</option>
          ))}
        </select>
      </div>

      {!selectedCompanyForBranchFilter && (
        <p className="text-gray-600 text-center py-4">Select a company above to view its branches.</p>
      )}
      {selectedCompanyForBranchFilter && managedBranches.length === 0 && !isLoading && !error && (
        <p className="text-gray-600 text-center py-4">No branches found for this company. Add a new branch.</p>
      )}
      {managedBranches.length > 0 && (
        <div className="overflow-x-auto mt-6 border border-gray-200 rounded-lg shadow-md">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Branch Name</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Admin Email</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Notification Emails</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {managedBranches.map((branch) => (
                <tr key={branch._id} className="hover:bg-gray-50 transition-colors duration-150">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{branch.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{branch.branchAdmin?.email || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatEmailsArray(branch.notificationEmails)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button onClick={() => handleEditBranch(branch)} className="text-indigo-600 hover:text-indigo-900 mr-4 font-semibold">Edit</button>
                    <button onClick={() => handleDeleteBranch(branch._id, branch.company._id || branch.company)} className="text-red-600 hover:text-red-900 font-semibold">Delete</button>
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
    <div className="mb-8 p-6 bg-purple-50 rounded-lg shadow-inner border border-purple-200">
      <div className="flex justify-between items-center mb-4">
        <h4 className="text-xl font-semibold text-purple-800 flex items-center">
          Clients
          <button
            onClick={() => {
              setShowAddClientForm(!showAddClientForm);
              if (!showAddClientForm) {
                setEditingClient(null);
                setNewClientEmail('');
                setNewClientPassword('');
                setNewCustomerName('');
                setNewCustomerMobile('');
                setNewClientNotificationEmails('');
                setSelectedCompanyForClientFilter(''); // Clear selected company for form
                setSelectedBranchForClientFilter(''); // Clear selected branch for form
                setBranchesForClientDropdown([]); // Clear branches for client form
              }
            }}
            className="ml-4 px-5 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors duration-200 shadow-md transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
          >
            {editingClient ? 'Edit Client' : 'Create Client'}
          </button>
        </h4>
      </div>
      {showAddClientForm && (
        <form onSubmit={editingClient ? handleUpdateClient : handleCreateClient} className="space-y-4 border p-6 rounded-lg bg-white mb-6 shadow-lg">
          <h5 className="text-lg font-bold text-gray-800 mb-4">{editingClient ? 'Edit Client Details' : 'Create New Client'}</h5>
          <div>
            <label htmlFor="selectCompanyForClientForm" className="block text-sm font-medium text-gray-700">Select Company (Optional):</label>
            <select
              id="selectCompanyForClientForm"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              value={selectedCompanyForClientFilter}
              onChange={(e) => {
                setSelectedCompanyForClientFilter(e.target.value);
                setSelectedBranchForClientFilter(''); // Clear branch when company changes
                // No need to call fetchBranchesForClientDropdown here, useEffect will handle it
              }}
            >
              <option value="">-- Select a Company --</option>
              {companies.map(company => (
                <option key={company._id} value={company._id}>{company.name}</option>
              ))}
            </select>
          </div>
          {selectedCompanyForClientFilter && (
            <div>
              <label htmlFor="selectBranchForClientForm" className="block text-sm font-medium text-gray-700">Select Branch (Optional):</label>
              <select
                id="selectBranchForClientForm"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                value={selectedBranchForClientFilter}
                onChange={(e) => setSelectedBranchForClientFilter(e.target.value)}
              >
                <option value="">-- Select a Branch --</option>
                {branchesForClientDropdown.map(branch => ( // Use branchesForClientDropdown here
                  <option key={branch._id} value={branch._id}>{branch.name}</option>
                ))}
              </select>
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
          {/* Notification Emails Input */}
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
          <div className="flex justify-end space-x-4 mt-6">
            <button
              type="button"
              onClick={() => {
                setShowAddClientForm(false);
                setEditingClient(null);
                setNewClientEmail('');
                setNewClientPassword('');
                setNewCustomerName('');
                setNewCustomerMobile('');
                setNewClientNotificationEmails('');
              }}
              className="px-6 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors duration-200"
            >
              Discard
            </button>
            <button
              type="submit"
              className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors duration-200"
              disabled={isLoading}
            >
              {isLoading ? 'Processing...' : 'Save Client'}
            </button>
          </div>
        </form>
      )}
      <div className="flex space-x-4 mb-4 mt-6">
        <select
          value={selectedCompanyForClientFilter}
          onChange={(e) => {
            setSelectedCompanyForClientFilter(e.target.value);
            setSelectedBranchForClientFilter(''); // Reset branch filter when company changes
            // No need to call fetchClientsByBranchOrCompany here, useEffect will handle it
          }}
          className="mt-1 block w-1/2 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        >
          <option value="">Filter by Company</option>
          {companies.map(company => (
            <option key={company._id} value={company._id}>{company.name}</option>
          ))}
        </select>
        <select
          value={selectedBranchForClientFilter}
          onChange={(e) => {
            setSelectedBranchForClientFilter(e.target.value);
            // No need to call fetchClientsByBranchOrCompany here, useEffect will handle it
          }}
          className="mt-1 block w-1/2 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          disabled={!selectedCompanyForClientFilter} // Disable if no company selected
        >
          <option value="">Filter by Branch</option>
          {branchesForClientDropdown.map(branch => ( // Use branchesForClientDropdown here
            <option key={branch._id} value={branch._id}>{branch.name}</option>
          ))}
        </select>
      </div>

      {!selectedCompanyForClientFilter && !selectedBranchForClientFilter && (
        <p className="text-gray-600 text-center py-4">Select a company or branch above to view its clients.</p>
      )}
      {(selectedCompanyForClientFilter || selectedBranchForClientFilter) && managedClients.length === 0 && !isLoading && !error && (
        <p className="text-gray-600 text-center py-4">No clients found matching the selected filters. Add a new client.</p>
      )}
      {managedClients.length > 0 && (
        <div className="overflow-x-auto mt-6 border border-gray-200 rounded-lg shadow-md">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Client Email</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Customer Name</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Customer Mobile</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Company</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Branch</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Notification Emails</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {managedClients.map((client) => (
                <tr key={client._id} className="hover:bg-gray-50 transition-colors duration-150">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{client.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{client.customerName || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{client.customerMobile || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{client.company?.name || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{client.branch?.name || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatEmailsArray(client.notificationEmails)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button onClick={() => handleEditClient(client)} className="text-indigo-600 hover:text-indigo-900 mr-4 font-semibold">Edit</button>
                    <button onClick={() => handleDeleteClient(client._id, client.company?._id || client.company, client.branch?._id || client.branch)} className="text-red-600 hover:text-red-900 font-semibold">Delete</button>
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
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="mb-8 p-6 bg-white rounded-lg shadow-xl border border-gray-200">
        <label htmlFor="entityTypeSelector" className="block text-xl font-bold text-gray-800 mb-3">Select Entity Type to Manage:</label>
        <select
          id="entityTypeSelector"
          className="block w-full md:w-1/3 px-5 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 text-base font-medium text-gray-700 bg-white cursor-pointer hover:border-blue-400 transition-all duration-200"
          value={selectedEntityType}
          onChange={(e) => {
            setSelectedEntityType(e.target.value);
            // Reset forms and filters when changing entity type
            setShowAddCompanyForm(false);
            setEditingCompany(null);
            setNewCompanyName('');
            setNewCompanyAdminEmail('');
            setNewCompanyAdminPassword('');
            setNewCompanyNotificationEmails('');

            setShowAddBranchForm(false);
            setEditingBranch(null);
            setSelectedCompanyForBranchFilter('');
            setNewBranchName('');
            setNewBranchAdminEmail('');
            setNewBranchAdminPassword('');
            setNewBranchNotificationEmails('');

            setShowAddClientForm(false);
            setEditingClient(null);
            setSelectedCompanyForClientFilter('');
            setSelectedBranchForClientFilter('');
            setBranchesForClientDropdown([]);
            setNewClientEmail('');
            setNewClientPassword('');
            setNewCustomerName('');
            setNewCustomerMobile('');
            setNewClientNotificationEmails('');
          }}
        >
          <option value="">-- Select an Entity Type --</option>
          <option value="company">Companies</option>
          <option value="branch">Branches</option>
          <option value="client">Clients</option>
        </select>
      </div>

      {selectedEntityType === 'company' && renderCompanyManagement()}
      {selectedEntityType === 'branch' && renderBranchManagement()}
      {selectedEntityType === 'client' && renderClientManagement()}

      {isLoading && <div className="text-center text-blue-600 font-bold text-lg mt-8">Loading...</div>}
      {error && <div className="text-center text-red-600 font-bold text-lg mt-8">{error}</div>}
      {successMessage && <div className="text-center text-green-600 font-bold text-lg mt-8">{successMessage}</div>}
    </div>
  );
};

export default ManageEntities;
