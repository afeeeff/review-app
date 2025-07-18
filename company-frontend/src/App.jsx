import React, { useState, useEffect, useCallback, Fragment } from 'react';
import ManageEntities from './ManageEntities.jsx';
import Dashboard from './Dashboard.jsx'; // Now this will be the combined Dashboard

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
  // State for managing active tab in the dashboard: 'dashboard' or 'manage'
  const [activeTab, setActiveTab] = useState('dashboard'); // Default to 'dashboard' as per request

  // States for managing entities data (branches and clients specific to this company)
  const [branches, setBranches] = useState([]);
  const [allClients, setAllClients] = useState([]); // All clients for management tab
  const [filteredClients, setFilteredClients] = useState([]); // Clients for review/statistics filter dropdown

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
  const getAuthHeaders = useCallback(() => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${userData?.token}`,
  }), [userData?.token]);

  // Handle logout - Moved to higher scope
  const handleLogout = useCallback(() => {
    console.log("App.jsx: Logging out user.");
    localStorage.removeItem('companyAdminUserData');
    setUserData(null);
    setCurrentView('login');
    setEmail('');
    setPassword('');
    setBranches([]);
    setAllClients([]);
    setFilteredClients([]);
    setError('');
    setSuccessMessage('');
    setForgotPasswordEmail('');
    setOtp('');
    setNewPassword('');
    setConfirmNewPassword('');
    setForgotPasswordError('');
    setForgotPasswordSuccess('');
    setOtpSent(false);
  }, []);

  // --- API Calls for Branches & Clients (Company Admin Scope) - Moved to higher scope ---

  const fetchAllBranches = useCallback(async () => {
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
        // If 401/403, force logout
        if (response.status === 401 || response.status === 403) {
          handleLogout();
        }
      }
    } catch (err) {
      console.error('Error fetching branches:', err);
      setError('Network error fetching branches.');
    } finally {
      setIsLoading(false);
    }
  }, [API_BASE_URL, getAuthHeaders, setIsLoading, setError, handleLogout]);

  // Fetches clients for management tab (can be all for company, or by branch)
  const fetchClientsByBranch = useCallback(async (branchId) => {
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
        if (response.status === 401 || response.status === 403) {
          handleLogout();
        }
      }
    } catch (err) {
      console.error('Error fetching clients:', err);
      setError('Network error fetching clients.');
      setAllClients([]);
    } finally {
      setIsLoading(false);
    }
  }, [API_BASE_URL, getAuthHeaders, setIsLoading, setError, handleLogout]);

  // Fetches all clients for the client management tab initially
  const fetchAllClientsForManagement = useCallback(async () => {
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
        if (response.status === 401 || response.status === 403) {
          handleLogout();
        }
      }
    } catch (err) {
      console.error('Error fetching all clients for management:', err);
      setError('Network error fetching all clients for management.');
      setAllClients([]);
    }
  }, [API_BASE_URL, getAuthHeaders, setError, handleLogout]);


  // Function to fetch clients specifically for the review/statistics filters
  const fetchClientsForCompanyAdminFilters = useCallback(async (branchId) => {
    setError('');
    // No global isLoading for this, as it's for filter dropdowns
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
        if (clientResponse.status === 401 || clientResponse.status === 403) {
          handleLogout();
        }
      }
    } catch (err) {
      console.error('Error fetching clients for review/statistics filters:', err);
      setError('Network error fetching filter data.');
    }
  }, [API_BASE_URL, getAuthHeaders, setError, handleLogout]);


  // Effect to check for stored token on component mount
  useEffect(() => {
    const storedUserData = localStorage.getItem('companyAdminUserData');

    if (storedUserData) {
      try {
        const parsedUserData = JSON.parse(storedUserData);
        // Basic validation: ensure it's a company_admin token and companyId exists
        if (parsedUserData.role === 'company_admin' && parsedUserData.companyId && parsedUserData.token) {
          setUserData(parsedUserData);
          setCurrentView('dashboard');
          setActiveTab('dashboard'); // Set active tab to dashboard on successful re-login
        } else {
          // If a non-company_admin token is found or companyId/token is missing, clear it
          console.warn("App.jsx: Stored user data is invalid or not company admin, clearing localStorage.");
          localStorage.removeItem('companyAdminUserData');
          setUserData(null);
          setCurrentView('login');
        }
      } catch (error) {
        console.error('App.jsx: Failed to parse stored user data:', error);
        localStorage.removeItem('companyAdminUserData');
        setUserData(null);
        setCurrentView('login');
      }
    }
  }, []);

  // Effect to fetch initial data when dashboard is loaded and user is authenticated
  useEffect(() => {
    if (currentView === 'dashboard' && userData?.token && userData?.companyId) {
      // Fetch branches always, as they are needed for filters across tabs
      fetchAllBranches();
      // Fetch all clients for management tab
      fetchAllClientsForManagement();
      // Fetch clients for filter dropdowns (initially all for company)
      fetchClientsForCompanyAdminFilters('');
    }
  }, [currentView, userData?.token, userData?.companyId, fetchAllBranches, fetchAllClientsForManagement, fetchClientsForCompanyAdminFilters]); // Depend on currentView and userData to trigger fetches


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
        if (data.role === 'company_admin' && data.companyId && typeof data.token === 'string' && data.token.length > 0) {
          // Store token and user data in local storage
          localStorage.setItem('companyAdminUserData', JSON.stringify(data));
          setUserData(data);
          setCurrentView('dashboard');
          setActiveTab('dashboard'); // Set active tab to dashboard after successful login
          setLoginError('');
        } else {
          setLoginError('Access Denied: Not a Company Admin account or missing company association/token.');
          setUserData(null);
          localStorage.removeItem('companyAdminUserData');
        }
      } else {
        setLoginError(data.message || 'Login failed. Please check your credentials.');
        setUserData(null);
        localStorage.removeItem('companyAdminUserData');
      }
    } catch (error) {
      console.error('Login API error:', error);
      setLoginError('Network error or server unavailable. Please try again.');
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
            {/* Dashboard Tab */}
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-6 py-3 text-lg font-semibold ${
                activeTab === 'dashboard'
                  ? 'border-b-4 border-green-600 text-green-700'
                  : 'text-gray-600 hover:text-gray-900 hover:border-gray-300'
              } focus:outline-none transition-colors duration-200`}
            >
              Dashboard
            </button>
            {/* Manage Entities Tab */}
            <button
              onClick={() => setActiveTab('manage')}
              className={`px-6 py-3 text-lg font-semibold ${
                activeTab === 'manage'
                  ? 'border-b-4 border-green-600 text-green-700'
                  : 'text-gray-600 hover:text-gray-900 hover:border-gray-300'
              } focus:outline-none transition-colors duration-200`}
            >
              Manage Entities
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>}
        {successMessage && <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Success!</strong>
          <span className="block sm:inline"> {successMessage}</span>
        </div>}

        {activeTab === 'dashboard' && (
          <Dashboard
            userData={userData}
            API_BASE_URL={API_BASE_URL}
            isLoading={isLoading}
            error={error}
            successMessage={successMessage}
            setIsLoading={setIsLoading}
            setError={setError}
            setSuccessMessage={setSuccessMessage}
            branches={branches} // Pass branches for filter dropdown
            filteredClients={filteredClients} // Pass filtered clients for dropdown
            fetchClientsForCompanyAdminFilters={fetchClientsForCompanyAdminFilters} // Pass function to update filtered clients
          />
        )}
        {activeTab === 'manage' && (
          <ManageEntities
            userData={userData}
            API_BASE_URL={API_BASE_URL}
            isLoading={isLoading}
            error={error}
            successMessage={successMessage}
            setIsLoading={setIsLoading}
            setError={setError}
            setSuccessMessage={setSuccessMessage}
            branches={branches} // Pass branches for management and client forms
            fetchAllBranches={fetchAllBranches} // Pass function to refresh branches
            allClients={allClients} // Pass allClients for management table
            fetchAllClientsForManagement={fetchAllClientsForManagement} // Pass function to refresh all clients
            fetchClientsByBranch={fetchClientsByBranch} // Pass function to fetch clients by branch
          />
        )}
      </main>
    </div>
  );

  return (
    <Fragment> {/* Use Fragment to wrap global styles and conditional content */}
      {/* Tailwind CSS CDN */}
      <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet" />
      {/* Inter font from Google Fonts */}
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <style>
        {`
          body {
            font-family: 'Inter', sans-serif;
          }
          /* Custom styles for table responsiveness in ViewReviews and potentially ManageEntities */
          @media screen and (max-width: 768px) {
            table, thead, tbody, th, td, tr {
              display: block;
            }
            thead tr {
              position: absolute;
              top: -9999px;
              left: -9999px;
            }
            tr { border: 1px solid #ccc; margin-bottom: 0.5rem; border-radius: 0.5rem; }
            td {
              border: none;
              border-bottom: 1px solid #eee;
              position: relative;
              padding-left: 50%;
              text-align: right;
            }
            td:before {
              position: absolute;
              top: 6px;
              left: 6px;
              width: 45%;
              padding-right: 10px;
              white-space: nowrap;
              text-align: left;
              font-weight: bold;
              color: #4a5568; /* Tailwind gray-700 */
            }
            .max-w-\[150px\] {
              max-width: 100% !important; /* Override fixed width on small screens */
            }
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
    </Fragment>
  );
};

export default App;
