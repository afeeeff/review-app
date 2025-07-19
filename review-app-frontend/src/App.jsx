import React, { useState, useEffect, Fragment, useCallback } from 'react';
import ReviewSubmissionFlow from './ReviewSubmissionFlow.jsx';
import ClientDashboard from './ClientDashboard.jsx'; // New combined dashboard component

// Main App component
const App = () => {
  // State to manage the current top-level view: 'login', 'startReview', 'dashboard'
  const [currentView, setCurrentView] = useState('login');
  // State for login form inputs
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  // State for showing login error messages
  const [loginError, setLoginError] = useState('');

  // State to store the logged-in client's ID and full user data
  const [clientId, setClientId] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('jwtToken'));
  const [userData, setUserData] = useState(null); // Includes email, role, companyId, branchId, customerName, customerMobile

  // State for managing active tab within the dashboard: 'takeReview' or 'dashboard'
  const [activeDashboardTab, setActiveDashboardTab] = useState('takeReview'); // Default to 'takeReview'

  // State to control visibility of 'Dashboard' tab during review submission flow
  const [hideDashboardTabs, setHideDashboardTabs] = useState(false);

  // State for profile dropdown visibility
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  // State for profile modal visibility and type ('view' or 'changePassword')
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileModalType, setProfileModalType] = useState('view'); // 'view' or 'changePassword'

  // States for Change Password form
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordChangeMessage, setPasswordChangeMessage] = useState('');
  const [passwordChangeError, setPasswordChangeError] = useState('');


  // Global states for loading, error, and success messages (for general dashboard feedback)
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Base URL for your backend API
  const API_BASE_URL =
    window.location.hostname === 'localhost'
      ? 'http://localhost:5000/api'
      : 'https://review-app-backend-ekjk.onrender.com/api';

  // Handle logout
  const handleLogout = useCallback(() => {
    console.log("App.jsx: Logging out user.");
    localStorage.removeItem('jwtToken');
    localStorage.removeItem('clientUserData');
    setUserData(null);
    setClientId(null);
    setToken(null);
    setCurrentView('login');
    setUsername('');
    setPassword('');
    setLoginError('');
    setError('');
    setSuccessMessage('');
    setHideDashboardTabs(false); // Reset tab visibility on logout
    setShowProfileDropdown(false); // Hide dropdown on logout
    setShowProfileModal(false); // Hide modal on logout
  }, []);

  // Callback from ReviewSubmissionFlow to update tab visibility
  const handleReviewFlowStatusChange = useCallback((hide) => {
    setHideDashboardTabs(hide);
  }, []);

  // Effect to check for stored token and user data on component mount
  useEffect(() => {
    const storedToken = localStorage.getItem('jwtToken');
    const storedUserData = localStorage.getItem('clientUserData');

    if (storedToken && storedUserData) {
      try {
        const parsedUserData = JSON.parse(storedUserData);
        if (parsedUserData.role === 'client' && parsedUserData.clientId && parsedUserData.token) {
          setClientId(parsedUserData.clientId);
          setToken(storedToken);
          setUserData(parsedUserData);
          setCurrentView('startReview'); // Go to startReview screen after successful auto-login
        } else {
          console.warn("App.jsx: Stored user data is invalid or not a client, clearing localStorage.");
          localStorage.removeItem('jwtToken');
          localStorage.removeItem('clientUserData');
          setUserData(null);
          setClientId(null);
          setToken(null);
          setCurrentView('login');
        }
      } catch (error) {
        console.error('App.jsx: Failed to parse stored user data:', error);
        localStorage.removeItem('jwtToken');
        localStorage.removeItem('clientUserData');
        setUserData(null);
        setClientId(null);
        setToken(null);
        setCurrentView('login');
      }
    }
  }, []);

  // Helper function to parse response, handling non-JSON
  const parseResponse = async (response) => {
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return response.json();
    }
    return response.text().then(text => ({ message: text || 'An unknown error occurred.' }));
  };

  // Handle client login
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: username, password }),
      });

      const data = await parseResponse(response);

      if (response.ok) {
        if (data.role === 'client' && data._id && data.token) {
          localStorage.setItem('jwtToken', data.token);
          localStorage.setItem('clientUserData', JSON.stringify({ ...data, clientId: data._id }));
          setClientId(data._id);
          setToken(data.token);
          setUserData({ ...data, clientId: data._id });
          setCurrentView('startReview'); // Go to startReview screen after successful login
          setLoginError('');
        } else {
          setLoginError('Access Denied: Not a Client account or missing required data.');
          setUserData(null);
          setClientId(null);
          setToken(null);
          localStorage.removeItem('jwtToken');
          localStorage.removeItem('clientUserData');
        }
      } else {
        setLoginError(data.message || 'Login failed. Please check your credentials.');
        setUserData(null);
        setClientId(null);
        setToken(null);
        localStorage.removeItem('jwtToken');
        localStorage.removeItem('clientUserData');
      }
    } catch (error) {
      console.error('Login API error:', error);
      setLoginError('Could not connect to the server. Please ensure the backend is running.');
    } finally {
      setIsLoading(false);
    }
  };

  // Function to get initials for profile icon
  const getInitials = (name, email) => {
    if (name) {
      const parts = name.split(' ');
      if (parts.length > 1) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return parts[0][0].toUpperCase();
    }
    if (email) {
      return email[0].toUpperCase();
    }
    return '?';
  };

  // Handle dummy password change
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordChangeMessage('');
    setPasswordChangeError('');
    setIsLoading(true); // Set loading for the password change request

    if (newPassword !== confirmNewPassword) {
      setPasswordChangeError('New passwords do not match.');
      setIsLoading(false);
      return;
    }
    if (newPassword.length < 6) {
      setPasswordChangeError('New password must be at least 6 characters long.');
      setIsLoading(false);
      return;
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}/auth/change-password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`, // Send the user's token
        },
        body: JSON.stringify({ oldPassword, newPassword }),
      });

      const data = await parseResponse(response);

      if (response.ok) {
        setPasswordChangeMessage(data.message || 'Password changed successfully!');
        setOldPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
        // Optionally close modal after a short delay
        setTimeout(() => setShowProfileModal(false), 1500);
      } else {
        setPasswordChangeError(data.message || 'Failed to change password. Please check your old password.');
      }
    } catch (error) {
      console.error('Change password API error:', error);
      setPasswordChangeError('Network error or server unavailable. Failed to change password.');
    } finally {
      setIsLoading(false);
    }
  };


  // Render the login view
  const renderLogin = () => (
    <div className="min-h-screen flex items-center justify-center p-4 font-sans"> {/* Removed bg-gradient-to-br from here */}
      <div className="bg-white p-10 rounded-2xl shadow-xl w-full max-w-md transform transition-all duration-500 hover:scale-[1.02] border border-blue-200"> {/* Light card */}
        <h2 className="text-4xl font-extrabold text-center text-blue-700 mb-8 tracking-tight">Client Login</h2>
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label htmlFor="username" className="block text-lg font-medium text-gray-700 mb-2">Email</label>
            <input
              type="email"
              id="username"
              className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-lg transition duration-200 bg-gray-50 text-gray-800 placeholder-gray-400"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-lg font-medium text-gray-700 mb-2">Password</label>
            <input
              type="password"
              id="password"
              className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-lg transition duration-200 bg-gray-50 text-gray-800 placeholder-gray-400"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          {loginError && (
            <p className="text-red-600 text-sm font-medium text-center bg-red-100 p-3 rounded-lg border border-red-300">{loginError}</p>
          )}
          <button
            type="submit"
            className="w-full flex justify-center py-3 px-6 border border-transparent rounded-lg shadow-md text-xl font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-300 ease-in-out transform hover:scale-105"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white mr-3" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Logging In...
              </>
            ) : (
              'Login'
            )}
          </button>
        </form>
      </div>
    </div>
  );

  // Render the "Start Taking Review" screen
  const renderStartReviewScreen = () => (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 font-sans">
      <div className="bg-white p-10 rounded-2xl shadow-xl w-full max-w-lg text-center border border-blue-200">
        <h2 className="text-4xl font-extrabold text-blue-700 mb-6">Welcome, {userData?.customerName || userData?.email}!</h2>
        <p className="text-lg text-gray-700 mb-8">Ready to provide feedback on your recent service experience?</p>
        <button
          onClick={() => setCurrentView('dashboard')} // Transition to the dashboard view
          className="py-3 px-8 bg-blue-600 text-white font-bold text-xl rounded-lg shadow-md hover:bg-blue-700 transition-all duration-300 ease-in-out transform hover:scale-105"
        >
          Start Taking Review
        </button>
      </div>
    </div>
  );


  // Render the main dashboard view
  const renderDashboard = () => (
    <div className="min-h-screen flex flex-col font-sans"> {/* Removed bg-gray-100 here */}
      {/* Header */}
      <header className="bg-white text-gray-800 p-5 shadow-md flex flex-col sm:flex-row justify-between items-center z-10 border-b border-gray-200">
        <h1 className="text-3xl font-extrabold tracking-tight text-blue-700">Instant Reviews</h1>
        <div className="relative"> {/* Added relative for dropdown positioning */}
          <button
            onClick={() => setShowProfileDropdown(!showProfileDropdown)}
            className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-500 text-white text-xl font-bold uppercase shadow-md hover:bg-blue-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
            title={userData?.customerName || userData?.email}
          >
            {getInitials(userData?.customerName, userData?.email)}
          </button>
          {showProfileDropdown && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-20 border border-gray-200">
              <div className="block px-4 py-2 text-sm text-gray-700 border-b border-gray-200 font-semibold">
                {userData?.customerName || userData?.email}
              </div>
              <button
                onClick={() => {
                  setProfileModalType('view');
                  setShowProfileModal(true);
                  setShowProfileDropdown(false);
                }}
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                View Profile
              </button>
              <button
                onClick={() => {
                  setProfileModalType('changePassword');
                  setShowProfileModal(true);
                  setShowProfileDropdown(false);
                  // Clear password fields and messages when opening
                  setOldPassword('');
                  setNewPassword('');
                  setConfirmNewPassword('');
                  setPasswordChangeMessage('');
                  setPasswordChangeError('');
                }}
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Change Password
              </button>
              <button
                onClick={handleLogout}
                className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-700"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-center sm:justify-start h-auto sm:h-16 py-2 sm:py-0">
            <button
              onClick={() => {
                setActiveDashboardTab('takeReview');
                setHideDashboardTabs(false); // Ensure tabs are visible when navigating to Take Review manually
              }}
              className={`flex-1 sm:flex-none px-6 py-3 text-lg font-semibold rounded-t-lg transition-colors duration-200
                ${activeDashboardTab === 'takeReview'
                  ? 'border-b-4 border-blue-600 text-blue-700 bg-blue-50'
                  : 'text-gray-600 hover:text-blue-600 hover:bg-gray-100'
                } focus:outline-none mb-2 sm:mb-0 sm:mr-4`}
            >
              Take New Review
            </button>
            {!hideDashboardTabs && ( // Conditionally render this tab
              <button
                onClick={() => setActiveDashboardTab('dashboard')}
                className={`flex-1 sm:flex-none px-6 py-3 text-lg font-semibold rounded-t-lg transition-colors duration-200
                  ${activeDashboardTab === 'dashboard'
                    ? 'border-b-4 border-green-600 text-green-700 bg-green-50'
                    : 'text-gray-600 hover:text-green-600 hover:bg-gray-100'
                  } focus:outline-none`}
              >
                Dashboard
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 p-6 sm:p-8 lg:p-10"> {/* Removed bg-gray-100 here */}
        {error && <div className="bg-red-100 border border-red-400 text-red-700 px-5 py-3 rounded-lg relative mb-5 text-base" role="alert">
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>}
        {successMessage && <div className="bg-green-100 border border-green-400 text-green-700 px-5 py-3 rounded-lg relative mb-5 text-base" role="alert">
          <strong className="font-bold">Success!</strong>
          <span className="block sm:inline"> {successMessage}</span>
        </div>}

        {activeDashboardTab === 'takeReview' && (
          <ReviewSubmissionFlow
            userData={userData}
            API_BASE_URL={API_BASE_URL}
            token={token}
            clientId={clientId}
            handleLogout={handleLogout}
            setGlobalSuccessMessage={setSuccessMessage}
            setGlobalError={setError}
            onFlowStatusChange={handleReviewFlowStatusChange} // Pass the callback
          />
        )}

        {activeDashboardTab === 'dashboard' && (
          <ClientDashboard
            clientId={clientId}
            token={token}
            API_BASE_URL={API_BASE_URL}
            handleLogout={handleLogout}
            setIsLoading={setIsLoading}
            setError={setError}
            setSuccessMessage={setSuccessMessage}
            isLoading={isLoading}
            error={error}
            successMessage={successMessage}
          />
        )}
      </main>

      {/* Profile Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md relative">
            <button
              onClick={() => setShowProfileModal(false)}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 text-2xl font-bold"
            >
              &times;
            </button>
            {profileModalType === 'view' && (
              <>
                <h3 className="text-2xl font-bold text-blue-700 mb-6 text-center">Your Profile</h3>
                <div className="space-y-4 text-lg text-gray-700">
                  <p><span className="font-semibold">Name:</span> {userData?.customerName || 'N/A'}</p>
                  <p><span className="font-semibold">Email:</span> {userData?.email || 'N/A'}</p>
                  <p><span className="font-semibold">Mobile:</span> {userData?.customerMobile || 'N/A'}</p>
                  {userData?.company?.name && <p><span className="font-semibold">Company:</span> {userData.company.name}</p>}
                  {userData?.branch?.name && <p><span className="font-semibold">Branch:</span> {userData.branch.name}</p>}
                </div>
              </>
            )}

            {profileModalType === 'changePassword' && (
              <>
                <h3 className="text-2xl font-bold text-blue-700 mb-6 text-center">Change Password</h3>
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div>
                    <label htmlFor="oldPassword" className="block text-sm font-medium text-gray-700 mb-1">Old Password:</label>
                    <input
                      type="password"
                      id="oldPassword"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">New Password:</label>
                    <input
                      type="password"
                      id="newPassword"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
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
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      required
                    />
                  </div>
                  {passwordChangeError && <p className="text-red-600 text-sm text-center">{passwordChangeError}</p>}
                  {passwordChangeMessage && <p className="text-green-600 text-sm text-center">{passwordChangeMessage}</p>}
                  <button
                    type="submit"
                    className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    disabled={isLoading} // Disable button during loading
                  >
                    {isLoading ? 'Changing...' : 'Change Password'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <Fragment>
      {/* Tailwind CSS CDN and Inter font link are expected to be in index.html */}
      {/* Main container for the entire application with background styles */}
      <div
        className="min-h-screen w-full"
        style={{
          backgroundImage: `url('/bg.png')`, // Correct path for public folder
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'fixed',
        }}
      >
        {(() => {
          switch (currentView) {
            case 'login':
              return renderLogin();
            case 'startReview': // New case for the start review screen
              return renderStartReviewScreen();
            case 'dashboard':
              return renderDashboard();
            default:
              return null;
          }
        })()}
      </div>

      {/* Global styles for table responsiveness, etc. - can be moved to index.css if preferred */}
      <style>
        {`
          body {
            font-family: 'Inter', sans-serif;
            margin: 0; /* Remove default body margin */
            padding: 0; /* Remove default body padding */
            overflow-y: scroll; /* Allow scrolling if content overflows */
          }
          
          /* Custom styles for table responsiveness for light theme */
          @media screen and (max-width: 768px) {
            table, thead, tbody, th, td, tr {
              display: block;
            }
            thead tr {
              position: absolute;
              top: -9999px;
              left: -9999px;
            }
            tr {
              border: 1px solid #e2e8f0; /* Lighter border for row separation */
              margin-bottom: 1rem;
              border-radius: 0.75rem;
              overflow: hidden;
              background-color: #ffffff; /* White row background */
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
            }
            td {
              border: none;
              border-bottom: 1px solid #edf2f7; /* Lighter border for cells */
              position: relative;
              padding-left: 55%; /* Increased space for label */
              text-align: left; /* Align content to left */
              font-size: 1rem;
              color: #4a5568; /* Darker text for light background */
              padding-top: 0.75rem;
              padding-bottom: 0.75rem;
              word-wrap: break-word; /* Ensure long words break */
              white-space: normal; /* Allow text to wrap */
            }
            td:last-child {
              border-bottom: 0;
            }
            td:before {
              position: absolute;
              top: 50%;
              left: 1rem;
              width: 50%; /* Adjust width for label */
              padding-right: 1rem;
              white-space: nowrap;
              text-align: left;
              font-weight: 600; /* Semi-bold */
              color: #718096; /* Medium gray for labels */
              transform: translateY(-50%);
              content: attr(data-label); /* Use data-label for content */
            }
            /* Specific adjustments for content within cells */
            td[data-label="Invoice Data"] div p {
                display: block; /* Force each invoice data line to stack */
                margin-bottom: 0.25rem; /* Small margin between lines */
            }
            td[data-label="Invoice Data"] div p:last-child {
                margin-bottom: 0;
            }
            td[data-label="Invoice Data"] .text-sm {
                font-size: 0.85rem; /* Slightly smaller font for invoice data on mobile */
            }
            td[data-label="Voice Audio"] audio {
                width: 100%; /* Ensure audio player takes full width */
                max-width: 100%; /* Ensure audio player takes full width */
            }
          }

          /* General shadow classes for a more professional look */
          .shadow-3xl {
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); /* Lighter shadow for light theme */
          }
        `}
      </style>
    </Fragment>
  );
};

export default App;
