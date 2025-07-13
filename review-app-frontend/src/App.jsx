import React, { useState, useEffect, Fragment, useCallback } from 'react';
import ReviewSubmissionFlow from './ReviewSubmissionFlow.jsx'; // New component for review submission
import ClientReviewsDashboard from './ClientReviewsDashboard.jsx'; // Modified to be just the table
import ClientStatistics from './ClientStatistics.jsx'; // Standalone statistics component

// Main App component
const App = () => {
  // State to manage the current top-level view: 'login' or 'dashboard'
  const [currentView, setCurrentView] = useState('login');
  // State for login form inputs
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  // State for showing login error messages
  const [loginError, setLoginError] = useState('');

  // State to store the logged-in client's ID and full user data
  const [clientId, setClientId] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('jwtToken'));
  const [userData, setUserData] = useState(null); // Includes email, role, companyId, branchId

  // State for managing active tab within the dashboard: 'takeReview', 'myReviews', 'myStatistics'
  const [activeDashboardTab, setActiveDashboardTab] = useState('takeReview'); // Default to 'takeReview'

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
          setCurrentView('dashboard');
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
          setCurrentView('dashboard');
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

  // Render the login view
  const renderLogin = () => (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-700 p-4">
      <div className="bg-white p-10 rounded-2xl shadow-2xl w-full max-w-md transform transition-all duration-500 hover:scale-105">
        <h2 className="text-4xl font-extrabold text-center text-gray-900 mb-8 tracking-wide">Client Login</h2>
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label htmlFor="username" className="block text-base font-medium text-gray-700 mb-2">Email</label>
            <input
              type="email"
              id="username"
              className="mt-1 block w-full px-5 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 text-lg transition duration-200"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
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
        </form>
      </div>
    </div>
  );

  // Render the main dashboard view
  const renderDashboard = () => (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white p-4 shadow-lg flex flex-col sm:flex-row justify-between items-center z-10">
        <div className="text-center sm:text-left mb-3 sm:mb-0">
          <h1 className="text-3xl font-extrabold tracking-tight">Client Dashboard</h1>
          {userData && (
            <p className="text-sm sm:text-base opacity-90 mt-1">
              Logged in as: <span className="font-semibold">{userData.email}</span>
              {userData.company?.name && ` | Company: ${userData.company.name}`}
              {userData.branch?.name && ` | Branch: ${userData.branch.name}`}
            </p>
          )}
        </div>
        <button
          onClick={handleLogout}
          className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105 text-base font-semibold"
        >
          Logout
        </button>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-white shadow-md z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-center sm:justify-start h-auto sm:h-16 py-2 sm:py-0">
            <button
              onClick={() => setActiveDashboardTab('takeReview')}
              className={`flex-1 sm:flex-none px-6 py-3 text-lg font-medium rounded-md sm:rounded-none transition-colors duration-200
                ${activeDashboardTab === 'takeReview'
                  ? 'border-b-4 border-blue-600 text-blue-700 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                } focus:outline-none mb-2 sm:mb-0 sm:mr-2`}
            >
              Take Review
            </button>
            <button
              onClick={() => setActiveDashboardTab('myReviews')}
              className={`flex-1 sm:flex-none px-6 py-3 text-lg font-medium rounded-md sm:rounded-none transition-colors duration-200
                ${activeDashboardTab === 'myReviews'
                  ? 'border-b-4 border-purple-600 text-purple-700 bg-purple-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                } focus:outline-none mb-2 sm:mb-0 sm:mr-2`}
            >
              My Reviews
            </button>
            <button
              onClick={() => setActiveDashboardTab('myStatistics')}
              className={`flex-1 sm:flex-none px-6 py-3 text-lg font-medium rounded-md sm:rounded-none transition-colors duration-200
                ${activeDashboardTab === 'myStatistics'
                  ? 'border-b-4 border-green-600 text-green-700 bg-green-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                } focus:outline-none`}
            >
              My Statistics
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 bg-gray-50">
        {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>}
        {successMessage && <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4" role="alert">
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
          />
        )}

        {activeDashboardTab === 'myReviews' && (
          <ClientReviewsDashboard
            clientId={clientId}
            token={token}
            API_BASE_URL={API_BASE_URL}
            handleLogout={handleLogout}
          />
        )}

        {activeDashboardTab === 'myStatistics' && (
          <ClientStatistics
            clientId={clientId}
            token={token}
            API_BASE_URL={API_BASE_URL}
            handleLogout={handleLogout}
          />
        )}
      </main>
    </div>
  );

  return (
    <Fragment>
      {/* Tailwind CSS CDN */}
      <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet" />
      {/* Inter font from Google Fonts */}
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      {/* Recharts for charts */}
      <script src="https://cdnjs.cloudflare.com/ajax/libs/recharts/2.1.8/recharts.min.js"></script>

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
            tr { border: 1px solid #e2e8f0; margin-bottom: 0.75rem; border-radius: 0.5rem; overflow: hidden; } /* Added a border for row separation */
            td {
              border: none;
              border-bottom: 1px solid #edf2f7; /* Lighter border for cells */
              position: relative;
              padding-left: 45%; /* Adjust padding for label */
              text-align: right;
              font-size: 0.9rem; /* Slightly smaller font for mobile cells */
            }
            td:last-child {
              border-bottom: 0;
            }
            td:before {
              position: absolute;
              top: 12px; /* Adjust vertical alignment */
              left: 10px; /* Adjust horizontal alignment */
              width: 40%; /* Adjust width for label */
              padding-right: 10px;
              white-space: nowrap;
              text-align: left;
              font-weight: bold;
              color: #4a5568; /* Tailwind gray-700 */
              content: attr(data-label); /* Use data-label for content */
            }
            /* Specific data-labels for each column */
            td:nth-of-type(1):before { content: "Rating"; }
            td:nth-of-type(2):before { content: "Customer"; }
            td:nth-of-type(3):before { content: "Transcribed Text"; }
            td:nth-of-type(4):before { content: "Voice Audio"; }
            td:nth-of-type(5):before { content: "Invoice Data"; }
            td:nth-of-type(6):before { content: "Date"; }

            /* Animations */
            @keyframes bounce-slow {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-15px); }
            }
            .animate-bounce-slow { animation: bounce-slow 3s infinite ease-in-out; }

            @keyframes pulse-slow {
              0%, 100% { transform: scale(1); opacity: 1; }
              50% { transform: scale(1.05); opacity: 0.8; }
            }
            .animate-pulse-slow { animation: pulse-slow 3s infinite ease-in-out; }

            @keyframes fade-in {
              from { opacity: 0; transform: translateY(20px); }
              to { opacity: 1; transform: translateY(0); }
            }
            .animate-fade-in { animation: fade-in 0.8s ease-out forwards; }

            @keyframes bounce-once {
              0%, 100% { transform: translateY(0); }
              20% { transform: translateY(-20px); }
              40% { transform: translateY(0); }
              60% { transform: translateY(-10px); }
              80% { transform: translateY(0); }
            }
            .animate-bounce-once { animation: bounce-once 1.2s ease-out; }
          }
        `}
      </style>

      {currentView === 'login' && renderLogin()}
      {currentView === 'dashboard' && renderDashboard()}
    </Fragment>
  );
};

export default App;
