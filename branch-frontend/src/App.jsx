import React, { useState, useEffect, useCallback, Fragment } from 'react';
import ManageClients from './ManageClients.jsx';
import Dashboard from './Dashboard.jsx'; // Now this will be the combined Dashboard

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
  // State for managing active tab in the dashboard: 'dashboard' or 'manage'
  // Changed default to 'dashboard' as per user request
  const [activeTab, setActiveTab] = useState('dashboard');

  // States for managing clients specific to this branch
  const [clients, setClients] = useState([]); // All clients for management tab
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

  // Handle logout
  const handleLogout = useCallback(() => {
    console.log("App.jsx: Logging out user.");
    localStorage.removeItem('branchAdminUserData');
    setUserData(null);
    setCurrentView('login');
    setEmail('');
    setPassword('');
    setClients([]);
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

  // --- API Calls for Clients (Branch Admin Scope) ---

  const fetchAllClientsForBranch = useCallback(async () => {
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
        if (response.status === 401 || response.status === 403) {
          handleLogout();
        }
      }
    } catch (err) {
      console.error('Error fetching clients for branch:', err);
      setError('Network error fetching clients for branch.');
      setClients([]);
    } finally {
      setIsLoading(false);
    }
  }, [API_BASE_URL, getAuthHeaders, setIsLoading, setError, handleLogout]);

  // Function to fetch clients specifically for the review/statistics filters (Branch Admin)
  const fetchClientsForBranchAdminFilters = useCallback(async () => {
    setError('');
    // No global isLoading for this, as it's for filter dropdowns
    try {
      const clientUrl = `${API_BASE_URL}/branch/clients`; // Branch admin can only see clients within their branch

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
      console.error('Error fetching clients for review/statistics filters (Branch Admin):', err);
      setError('Network error fetching filter data.');
    }
  }, [API_BASE_URL, getAuthHeaders, setError, handleLogout]);


  // Effect to check for stored token on component mount
  useEffect(() => {
    const storedUserData = localStorage.getItem('branchAdminUserData');

    if (storedUserData) {
      try {
        const parsedUserData = JSON.parse(storedUserData);
        // Basic validation: ensure it's a branch_admin token and has company/branch IDs
        if (parsedUserData.role === 'branch_admin' && parsedUserData.companyId && parsedUserData.branchId && parsedUserData.token) {
          setUserData(parsedUserData);
          setCurrentView('dashboard');
          setActiveTab('dashboard'); // Set active tab to dashboard on successful re-login
        } else {
          // If not a branch_admin token or missing IDs, clear it
          console.warn("App.jsx: Stored user data is invalid or not branch admin, clearing localStorage.");
          localStorage.removeItem('branchAdminUserData');
          setUserData(null);
          setCurrentView('login');
        }
      } catch (error) {
        console.error('App.jsx: Failed to parse stored user data:', error);
        localStorage.removeItem('branchAdminUserData');
        setUserData(null);
        setCurrentView('login');
      }
    }
  }, []);

  // Effect to fetch initial data when dashboard is loaded and user is authenticated
  useEffect(() => {
    if (currentView === 'dashboard' && userData?.token && userData?.branchId) {
      if (activeTab === 'manage') {
        fetchAllClientsForBranch(); // Fetch clients for this branch for management
      }
      // Always fetch filteredClients for dropdowns as they are used in both reviews and statistics
      fetchClientsForBranchAdminFilters();
    }
  }, [currentView, userData?.token, userData?.branchId, activeTab, fetchAllClientsForBranch, fetchClientsForBranchAdminFilters]);


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
        if (data.role === 'branch_admin' && data.companyId && data.branchId && typeof data.token === 'string' && data.token.length > 0) {
          // Store token and user data in local storage
          localStorage.setItem('branchAdminUserData', JSON.stringify(data));
          setUserData(data);
          setCurrentView('dashboard');
          setActiveTab('dashboard'); // Set active tab to dashboard after successful login
          setLoginError('');
        } else {
          setLoginError('Access Denied: Not a Branch Admin account or missing branch/company association/token.');
          setUserData(null);
          localStorage.removeItem('branchAdminUserData');
        }
      } else {
        setLoginError(data.message || 'Login failed. Please check your credentials.');
        setUserData(null);
        localStorage.removeItem('branchAdminUserData');
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
            {/* Dashboard Tab */}
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-6 py-3 text-lg font-semibold ${
                activeTab === 'dashboard'
                  ? 'border-b-4 border-purple-600 text-purple-700'
                  : 'text-gray-600 hover:text-gray-900 hover:border-gray-300'
              } focus:outline-none transition-colors duration-200`}
            >
              Dashboard
            </button>
            {/* Manage Clients Tab */}
            <button
              onClick={() => setActiveTab('manage')}
              className={`px-6 py-3 text-lg font-semibold ${
                activeTab === 'manage'
                  ? 'border-b-4 border-purple-600 text-purple-700'
                  : 'text-gray-600 hover:text-gray-900 hover:border-gray-300'
              } focus:outline-none transition-colors duration-200`}
            >
              Manage Clients
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
            filteredClients={filteredClients} // Pass filtered clients for dropdown
            fetchClientsForBranchAdminFilters={fetchClientsForBranchAdminFilters} // Pass function to update filtered clients
          />
        )}
        {activeTab === 'manage' && (
          <ManageClients
            userData={userData}
            API_BASE_URL={API_BASE_URL}
            isLoading={isLoading}
            error={error}
            successMessage={successMessage}
            setIsLoading={setIsLoading}
            setError={setError}
            setSuccessMessage={setSuccessMessage}
            clients={clients} // Pass all clients for the branch to ManageClients
            fetchAllClientsForBranch={fetchAllClientsForBranch} // Pass function to refresh clients
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
          /* Custom styles for table responsiveness */
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
