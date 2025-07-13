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
  branches, // Passed from App.jsx
  fetchAllBranches, // Passed from App.jsx
  allClients, // Passed from App.jsx
  fetchAllClientsForManagement, // Passed from App.jsx
  fetchClientsByBranch, // Passed from App.jsx
}) => {
  // States for forms (Add/Edit) - Branch
  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchAdminEmail, setNewBranchAdminEmail] = useState('');
  const [newBranchAdminPassword, setNewBranchAdminPassword] = useState('');
  const [newBranchNotificationEmails, setNewBranchNotificationEmails] = useState('');
  const [editingBranch, setEditingBranch] = useState(null);
  const [showAddBranchForm, setShowAddBranchForm] = useState(false);

  // States for forms (Add/Edit) - Client
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientPassword, setNewClientPassword] = useState('');
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerMobile, setNewCustomerMobile] = useState('');
  const [newClientNotificationEmails, setNewClientNotificationEmails] = useState('');
  const [selectedBranchForClient, setSelectedBranchForClient] = useState(''); // For creating new client under a branch
  const [editingClient, setEditingClient] = useState(null);
  const [showAddClientForm, setShowAddClientForm] = useState(false);

  // NEW: State for filtering clients table by branch
  const [filterBranchForClientTable, setFilterBranchForClientTable] = useState('');


  // Helper to get auth headers (re-defined here as it's used extensively in this component)
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
        fetchAllBranches(); // Refresh list via prop
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
    setNewBranchNotificationEmails(formatEmailsArray(branch.notificationEmails));
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
      const response = await fetch(`${API_BASE_URL}/company/branches/${editingBranch._id}`, {
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
        fetchAllBranches(); // Refresh list via prop
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
        fetchAllBranches(); // Refresh branches for the current company via prop
        fetchAllClientsForManagement(); // Refresh all clients as some might be deleted via prop
        setFilterBranchForClientTable(''); // Reset client table filter
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
      notificationEmails: parseEmailsString(newClientNotificationEmails),
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
        setNewClientNotificationEmails('');
        setSelectedBranchForClient('');
        setShowAddClientForm(false);
        // Refresh clients based on current filter selection
        if (filterBranchForClientTable) {
          fetchClientsByBranch(filterBranchForClientTable);
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
    setNewClientPassword('');
    setNewCustomerName(client.customerName || '');
    setNewCustomerMobile(client.customerMobile || '');
    setNewClientNotificationEmails(formatEmailsArray(client.notificationEmails));
    setSelectedBranchForClient(client.branch?._id || client.branch || '');
    setShowAddClientForm(true);
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
          branchId: selectedBranchForClient || null,
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
        setSelectedBranchForClient('');
        setShowAddClientForm(false);
        // Refresh clients based on current filter selection
        if (filterBranchForClientTable) {
          fetchClientsByBranch(filterBranchForClientTable);
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
        // Refresh clients based on current filter selection
        if (filterBranchForClientTable) {
          fetchClientsByBranch(filterBranchForClientTable);
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

  // Effect to re-fetch clients when the filterBranchForClientTable changes
  useEffect(() => {
    if (userData?.token) {
      if (filterBranchForClientTable) {
        fetchClientsByBranch(filterBranchForClientTable);
      } else {
        fetchAllClientsForManagement();
      }
    }
  }, [filterBranchForClientTable, userData?.token, fetchClientsByBranch, fetchAllClientsForManagement]);


  // Render functions for branches and clients
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
              setNewBranchNotificationEmails('');
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
                setNewBranchNotificationEmails('');
                setShowAddBranchForm(false);
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notification Emails</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                {/* Removed Clients column */}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {branches.map((branch) => (
                <tr key={branch._id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{branch.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{branch.branchAdmin?.email || 'N/A'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{formatEmailsArray(branch.notificationEmails)}</td>
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
              setNewClientNotificationEmails('');
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
            <label htmlFor="selectBranchForClient" className="block text-sm font-medium text-gray-700">Assign to Branch (Optional):</label>
            <select
              id="selectBranchForClient"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              value={selectedBranchForClient}
              onChange={(e) => {
                setSelectedBranchForClient(e.target.value);
                // No need to re-fetch clients for the table here, as the filter dropdown below handles it
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
                setNewClientNotificationEmails('');
                setSelectedBranchForClient('');
                setShowAddClientForm(false);
              }}
              className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              disabled={isLoading}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* NEW: Filter for Clients Table */}
      <div className="mt-8 mb-4">
        <label htmlFor="filterClientTableByBranch" className="block text-sm font-medium text-gray-700">Filter Clients by Branch:</label>
        <select
          id="filterClientTableByBranch"
          className="mt-1 block w-full md:w-1/2 lg:w-1/3 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          value={filterBranchForClientTable}
          onChange={(e) => setFilterBranchForClientTable(e.target.value)}
        >
          <option value="">All Branches (All Clients)</option>
          {branches.map(branch => (
            <option key={branch._id} value={branch._id}>{branch.name}</option>
          ))}
        </select>
      </div>


      <h4 className="text-xl font-semibold text-purple-800 mt-8 mb-4">Your Clients {filterBranchForClientTable ? `(for ${branches.find(b => b._id === filterBranchForClientTable)?.name})` : '(All)'}</h4>
      {allClients.length === 0 && !isLoading && <p className="text-gray-600">No clients found for your company {filterBranchForClientTable ? `in the selected branch.` : '.'}</p>}
      {allClients.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer Mobile</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Branch</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notification Emails</th>
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
                  <td className="px-6 py-4 text-sm text-gray-500">{formatEmailsArray(client.notificationEmails)}</td>
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

  return (
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
};

export default ManageEntities;
