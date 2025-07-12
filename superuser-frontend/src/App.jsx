import React, { useState, useEffect } from 'react';
import ManageEntities from './ManageEntities.jsx';
import ViewReviews from './ViewReviews.jsx';

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

  // Global states for loading, error, and success messages
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

  // State to hold all companies (needed for filters in both manage & reviews)
  const [companies, setCompanies] = useState([]);

  // Base URL for your backend API
  const API_BASE_URL =
    window.location.hostname === 'localhost'
      ? 'http://localhost:5000/api'
      : 'https://review-app-backend-ekjk.onrender.com/api'; // IMPORTANT: Ensure this includes /api

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

  // Effect to fetch initial companies when dashboard is loaded and user is authenticated
  useEffect(() => {
    if (currentView === 'dashboard' && userData?.token) {
      fetchAllCompanies();
    }
  }, [currentView, userData?.token]); // Depend on userData.token to re-fetch on login

  // Fetch all companies (used by both ManageEntities and ViewReviews for filters)
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
          // Fetch companies immediately after successful login
          fetchAllCompanies();
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
    setCompanies([]); // Clear companies on logout
    setError('');
    setSuccessMessage('');
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
                      companies={companies}
                      fetchAllCompanies={fetchAllCompanies}
                    />
                  )}
                  {activeTab === 'reviews' && (
                    <ViewReviews
                      userData={userData}
                      API_BASE_URL={API_BASE_URL}
                      isLoading={isLoading}
                      error={error}
                      successMessage={successMessage}
                      setIsLoading={setIsLoading}
                      setError={setError}
                      setSuccessMessage={setSuccessMessage}
                      companies={companies} // Pass companies for filtering
                    />
                  )}
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
