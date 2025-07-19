import React, { useState, useEffect } from 'react';
import ManageEntities from './ManageEntities.jsx';
import Dashboard from './Dashboard.jsx';

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
  // State for managing active tab in the dashboard ('manage' or 'dashboard')
  // Changed default to 'dashboard' as per user request
  const [activeTab, setActiveTab] = useState('dashboard'); 
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
  // State to hold all companies (needed for filters)
  const [companies, setCompanies] = useState([]);

  // Base URL for your backend API
  const API_BASE_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:5000/api'
    : 'https://review-app-backend-ekjk.onrender.com/api';

  // Helper to get auth headers
  const getAuthHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${userData?.token}`,
  });

  // Effect to check for stored token on component mount
  useEffect(() => {
    const storedUserData = localStorage.getItem('superuserUserData');
    if (storedUserData) {
      try {
        const parsedUserData = JSON.parse(storedUserData);
        if (parsedUserData && parsedUserData.token && parsedUserData.role === 'superuser') {
          setUserData(parsedUserData);
          setCurrentView('dashboard');
          // Set activeTab to 'dashboard' on successful re-login from stored data
          setActiveTab('dashboard'); 
        } else {
          localStorage.removeItem('superuserUserData');
          setUserData(null);
          setCurrentView('login');
        }
      } catch {
        localStorage.removeItem('superuserUserData');
        setUserData(null);
        setCurrentView('login');
      }
    } else {
      setCurrentView('login');
    }
  }, []);

  // Effect to fetch initial companies when dashboard is loaded and user is authenticated
  useEffect(() => {
    if (currentView === 'dashboard' && userData?.token) {
      fetchAllCompanies();
    } else if (currentView === 'dashboard' && !userData?.token) {
      setCurrentView('login');
      setUserData(null);
      localStorage.removeItem('superuserUserData');
    }
  }, [currentView, userData?.token]);

  // Fetch all companies (used by filters)
  const fetchAllCompanies = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/superuser/companies`, { headers: getAuthHeaders() });
      const data = await response.json();
      if (response.ok) {
        setCompanies(data);
      } else {
        if (response.status === 401 || response.status === 403) {
          setError('Session expired or unauthorized. Please log in again.');
          handleLogout();
        } else {
          setError(data.message || 'Failed to fetch companies.');
        }
      }
    } catch {
      setError('Network error fetching companies.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle login form submission
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (response.ok) {
        if (data.role === 'superuser' && typeof data.token === 'string' && data.token.length > 0) {
          localStorage.setItem('superuserUserData', JSON.stringify(data));
          setUserData(data);
          setCurrentView('dashboard');
          setActiveTab('dashboard'); // Ensure dashboard tab is active after login
          setLoginError('');
        } else {
          const errorMessage = data.role !== 'superuser'
            ? 'Access Denied: Not a Superuser account.'
            : 'Login successful but token missing or invalid. Please contact support.';
          setLoginError(errorMessage);
          setUserData(null);
          localStorage.removeItem('superuserUserData');
        }
      } else {
        setLoginError(data.message || 'Login failed. Please check your credentials.');
        setUserData(null);
        localStorage.removeItem('superuserUserData');
      }
    } catch {
      setLoginError('Network error or server unavailable. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem('superuserUserData');
    setUserData(null);
    setCurrentView('login');
    setEmail('');
    setPassword('');
    setCompanies([]);
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotPasswordEmail }),
      });
      const data = await response.json();
      if (response.ok) {
        setForgotPasswordMessage(data.message || 'OTP sent to your email.');
        setCurrentView('resetPassword');
      } else {
        setForgotPasswordError(data.message || 'Failed to send OTP. Please try again.');
      }
    } catch {
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: forgotPasswordEmail,
          otp: otp,
          newPassword: newPassword,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        setForgotPasswordMessage(data.message || 'Password has been reset successfully. You can now log in with your new password.');
        setForgotPasswordEmail('');
        setOtp('');
        setNewPassword('');
        setConfirmNewPassword('');
        setCurrentView('login');
      } else {
        setForgotPasswordError(data.message || 'Failed to reset password. Please check your OTP or try again.');
      }
    } catch {
      setForgotPasswordError('Network error or server unavailable. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ---- RENDER ----
  return (
    <div className="font-sans antialiased text-gray-900 min-h-screen">
      {/* LOGIN PAGE */}
      {currentView === 'login' && (
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
          <div className="font-extrabold text-4xl mb-8 text-blue-700 tracking-wide">Superuser Login</div>
          <form className="w-full max-w-sm bg-white p-8 rounded-2xl shadow-xl border border-gray-200" onSubmit={handleLogin}>
            <div className="mb-5">
              <input
                type="email"
                placeholder="Email"
                value={email}
                required
                className="w-full px-4 py-2 text-lg rounded-lg border-2 border-blue-200 focus:outline-none focus:border-blue-500 transition-all duration-200"
                onChange={e => setEmail(e.target.value)}
              />
            </div>
            <div className="mb-6">
              <input
                type="password"
                placeholder="Password"
                value={password}
                required
                className="w-full px-4 py-2 text-lg rounded-lg border-2 border-blue-200 focus:outline-none focus:border-blue-500 transition-all duration-200"
                onChange={e => setPassword(e.target.value)}
              />
            </div>
            {loginError && <div className="text-red-600 mb-4 font-semibold text-center">{loginError}</div>}
            <button
              type="submit"
              className="w-full py-3 bg-blue-600 text-white font-bold text-lg rounded-lg shadow-md hover:bg-blue-700 transition-all duration-200 transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              disabled={isLoading}
            >
              {isLoading ? 'Logging in...' : 'Login'}
            </button>
            <div className="mt-4 text-center">
              <span
                className="cursor-pointer text-blue-600 hover:underline text-base font-medium"
                onClick={() => setCurrentView('forgotPassword')}
              >
                Forgot Password?
              </span>
            </div>
          </form>
        </div>
      )}
      {/* FORGOT PASSWORD PAGE */}
      {currentView === 'forgotPassword' && (
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
          <div className="font-extrabold text-3xl mb-7 text-blue-700 tracking-wide">Forgot Password</div>
          <form className="w-full max-w-sm bg-white p-8 rounded-2xl shadow-xl border border-gray-200" onSubmit={handleRequestOTP}>
            <div className="mb-6">
              <input
                type="email"
                placeholder="Enter your email"
                value={forgotPasswordEmail}
                required
                className="w-full px-4 py-2 text-lg rounded-lg border-2 border-blue-200 focus:outline-none focus:border-blue-500 transition-all duration-200"
                onChange={e => setForgotPasswordEmail(e.target.value)}
              />
            </div>
            {forgotPasswordError && <div className="text-red-600 mb-4 font-semibold text-center">{forgotPasswordError}</div>}
            {forgotPasswordMessage && <div className="text-green-600 mb-4 font-semibold text-center">{forgotPasswordMessage}</div>}
            <button
              type="submit"
              className="w-full py-3 bg-blue-600 text-white font-bold text-lg rounded-lg shadow-md hover:bg-blue-700 transition-all duration-200 transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              disabled={isLoading}
            >
              {isLoading ? 'Requesting OTP...' : 'Request OTP'}
            </button>
            <div className="mt-4 text-center">
              <span
                className="cursor-pointer text-blue-600 hover:underline text-base font-medium"
                onClick={() => setCurrentView('login')}
              >
                Back to Login
              </span>
            </div>
          </form>
        </div>
      )}
      {/* RESET PASSWORD PAGE */}
      {currentView === 'resetPassword' && (
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
          <div className="font-extrabold text-3xl mb-7 text-blue-700 tracking-wide">Reset Password</div>
          <form className="w-full max-w-sm bg-white p-8 rounded-2xl shadow-xl border border-gray-200" onSubmit={handleResetPassword}>
            <div className="mb-4">
              <input
                type="text"
                placeholder="Enter OTP"
                value={otp}
                required
                className="w-full px-4 py-2 text-lg rounded-lg border-2 border-blue-200 focus:outline-none focus:border-blue-500 transition-all duration-200"
                onChange={e => setOtp(e.target.value)}
              />
            </div>
            <div className="mb-4">
              <input
                type="password"
                placeholder="New Password"
                value={newPassword}
                required
                className="w-full px-4 py-2 text-lg rounded-lg border-2 border-blue-200 focus:outline-none focus:border-blue-500 transition-all duration-200"
                onChange={e => setNewPassword(e.target.value)}
              />
            </div>
            <div className="mb-6">
              <input
                type="password"
                placeholder="Confirm New Password"
                value={confirmNewPassword}
                required
                className="w-full px-4 py-2 text-lg rounded-lg border-2 border-blue-200 focus:outline-none focus:border-blue-500 transition-all duration-200"
                onChange={e => setConfirmNewPassword(e.target.value)}
              />
            </div>
            {forgotPasswordError && <div className="text-red-600 mb-4 font-semibold text-center">{forgotPasswordError}</div>}
            {forgotPasswordMessage && <div className="text-green-600 mb-4 font-semibold text-center">{forgotPasswordMessage}</div>}
            <button
              type="submit"
              className="w-full py-3 bg-blue-600 text-white font-bold text-lg rounded-lg shadow-md hover:bg-blue-700 transition-all duration-200 transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              disabled={isLoading}
            >
              {isLoading ? 'Resetting...' : 'Reset Password'}
            </button>
            <div className="mt-4 text-center">
              <span
                className="cursor-pointer text-blue-600 hover:underline text-base font-medium"
                onClick={() => setCurrentView('login')}
              >
                Back to Login
              </span>
            </div>
          </form>
        </div>
      )}
      {/* DASHBOARD / MAIN NAVIGATION */}
      {currentView === 'dashboard' && (
        <>
          {/* Tab Bar */}
          <div className="bg-white shadow-lg border-b border-gray-200 py-4 px-8 mb-0">
            <div className="flex justify-between items-center mb-3">
              <h1 className="font-extrabold text-3xl text-gray-800 tracking-wide">Superuser Dashboard</h1>
              <button
                className="px-6 py-2 bg-red-500 text-white font-bold text-base rounded-lg shadow-md hover:bg-red-600 transition-all duration-200 transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2"
                onClick={handleLogout}
              >
                Logout
              </button>
            </div>
            <div className="flex border-b-2 border-gray-200">
              {/* Dashboard tab is now first */}
              <button
                className={`py-3 px-6 text-lg font-semibold transition-all duration-300 ease-in-out rounded-t-lg 
                  ${activeTab === 'dashboard'
                    ? 'text-blue-700 border-b-4 border-blue-700 bg-blue-50'
                    : 'text-gray-600 hover:text-blue-600 hover:'
                  }`}
                onClick={() => setActiveTab('dashboard')}
              >
                Dashboard
              </button>
              <button
                className={`py-3 px-6 text-lg font-semibold transition-all duration-300 ease-in-out rounded-t-lg 
                  ${activeTab === 'manage'
                    ? 'text-blue-700 border-b-4 border-blue-700 bg-blue-50'
                    : 'text-gray-600 hover:text-blue-600 hover:'
                  }`}
                onClick={() => setActiveTab('manage')}
              >
                Manage Entities
              </button>
            </div>
          </div>
          {/* Tab Content */}
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
              companies={companies}
            />
          )}
        </>
      )}
    </div>
  );
};

export default App;
