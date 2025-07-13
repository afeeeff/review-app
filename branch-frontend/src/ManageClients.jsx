import React, { useState, useEffect, useCallback } from 'react';

const ManageClients = ({
  userData,
  API_BASE_URL,
  isLoading,
  error,
  successMessage,
  setIsLoading,
  setError,
  setSuccessMessage,
  clients, // Passed from App.jsx (all clients for the branch)
  fetchAllClientsForBranch, // Passed from App.jsx
}) => {
  // States for forms (Add/Edit) - Client
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientPassword, setNewClientPassword] = useState('');
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerMobile, setNewCustomerMobile] = useState('');
  const [newClientNotificationEmails, setNewClientNotificationEmails] = useState('');
  const [editingClient, setEditingClient] = useState(null); // null or client object
  const [showAddClientForm, setShowAddClientForm] = useState(false);

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
          notificationEmails: parseEmailsString(newClientNotificationEmails),
        }),
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
        fetchAllClientsForBranch(); // Refresh list via prop
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
    setNewClientPassword(''); // Password not pre-filled for security
    setNewCustomerName(client.customerName || '');
    setNewCustomerMobile(client.customerMobile || '');
    setNewClientNotificationEmails(formatEmailsArray(client.notificationEmails));
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
      const response = await fetch(`${API_BASE_URL}/branch/clients/${editingClient._id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          clientEmail: newClientEmail,
          ...(newClientPassword && { clientPassword: newClientPassword }), // Only send if password is provided
          customerName: newCustomerName,
          customerMobile: newCustomerMobile,
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
        fetchAllClientsForBranch(); // Refresh list via prop
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
        fetchAllClientsForBranch(); // Refresh list via prop
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

  return (
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

      <div className="mb-8 p-6 bg-purple-50 rounded-lg shadow-inner">
        <div className="flex justify-between items-center mb-4">
          <h4 className="text-xl font-semibold text-purple-800">Your Clients</h4>
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
                setNewClientNotificationEmails('');
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

        {clients.length === 0 && !isLoading && <p className="text-gray-600">No clients found for your branch.</p>}
        {clients.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer Mobile</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notification Emails</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {clients.map((client) => (
                  <tr key={client._id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{client.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{client.customerName || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{client.customerMobile || 'N/A'}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{formatEmailsArray(client.notificationEmails)}</td>
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
    </div>
  );
};

export default ManageClients;
