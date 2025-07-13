import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';

// Define colors for the pie chart segments (Positive, Neutral, Negative)
const PIE_COLORS = ['#4CAF50', '#FFC107', '#F44336']; // Green, Amber, Red

const Statistics = ({
  userData,
  API_BASE_URL,
  isLoading,
  error,
  successMessage,
  setIsLoading,
  setError,
  setSuccessMessage,
  filteredClients, // Passed from App.jsx for client filter dropdown
  fetchClientsForBranchAdminFilters, // Passed from App.jsx to update filteredClients
}) => {
  const [reviews, setReviews] = useState([]); // Raw reviews data for processing
  const [filterClientId, setFilterClientId] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  // Chart Data States
  const [ratingDistributionData, setRatingDistributionData] = useState([]);
  const [feedbackTypeData, setFeedbackTypeData] = useState([]);
  const [reviewsOverTimeData, setReviewsOverTimeData] = useState([]);
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);

  // Helper to get auth headers
  const getAuthHeaders = useCallback(() => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${userData?.token}`,
  }), [userData?.token]);

  // Function to fetch all reviews based on filters (Branch Admin Scope)
  const fetchBranchReviewsForStatistics = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      let url = `${API_BASE_URL}/branch/reviews?`;
      if (filterClientId) {
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
        setReviews(data); // Store raw reviews for processing
        console.log("Statistics (Branch Admin): Reviews fetched for statistics:", data);
      } else {
        setError(data.message || 'Failed to fetch reviews for statistics.');
        setReviews([]);
        console.error("Statistics (Branch Admin): Failed to fetch reviews for statistics:", data.message);
      }
    } catch (err) {
      console.error('Statistics (Branch Admin): Error fetching reviews for statistics:', err);
      setError('Network error fetching reviews for statistics.');
      setReviews([]);
    } finally {
      setIsLoading(false);
    }
  }, [API_BASE_URL, filterClientId, filterStartDate, filterEndDate, getAuthHeaders, setIsLoading, setError]);

  // Effect to trigger review fetching and client dropdown data fetching
  useEffect(() => {
    if (userData?.token && userData?.branchId) {
      fetchBranchReviewsForStatistics();
      fetchClientsForBranchAdminFilters(); // Fetch clients for the filter dropdown
    }
  }, [filterClientId, filterStartDate, filterEndDate, userData, fetchBranchReviewsForStatistics, fetchClientsForBranchAdminFilters]);

  // Process reviews data for charts whenever reviews state changes
  useEffect(() => {
    if (reviews.length > 0) {
      processReviewData(reviews);
    } else {
      // Clear chart data if no reviews
      setRatingDistributionData([]);
      setFeedbackTypeData([]);
      setReviewsOverTimeData([]);
      setAverageRating(0);
      setTotalReviews(0);
    }
  }, [reviews]);

  // Function to process raw review data into chart-friendly formats
  const processReviewData = (reviewsToProcess) => {
    // 1. Rating Distribution (Bar Chart)
    const ratingCounts = {};
    let totalRatingSum = 0;
    reviewsToProcess.forEach(review => {
      ratingCounts[review.rating] = (ratingCounts[review.rating] || 0) + 1;
      totalRatingSum += review.rating;
    });

    const processedRatingData = Array.from({ length: 10 }, (_, i) => i + 1).map(rating => ({
      rating: rating,
      count: ratingCounts[rating] || 0,
    }));
    setRatingDistributionData(processedRatingData);

    // Calculate average rating
    setAverageRating(reviewsToProcess.length > 0 ? (totalRatingSum / reviewsToProcess.length).toFixed(2) : 0);
    setTotalReviews(reviewsToProcess.length);

    // 2. Feedback Type Distribution (Pie Chart)
    const feedbackCounts = {
      positive: 0,
      neutral: 0,
      negative: 0,
    };
    reviewsToProcess.forEach(review => {
      // Ensure review.feedbackType exists and is one of the expected values
      if (review.feedbackType && ['positive', 'neutral', 'negative'].includes(review.feedbackType)) {
        feedbackCounts[review.feedbackType] = (feedbackCounts[review.feedbackType] || 0) + 1;
      }
    });

    const processedFeedbackTypeData = Object.keys(feedbackCounts).map(type => ({
      name: type.charAt(0).toUpperCase() + type.slice(1), // Capitalize first letter
      value: feedbackCounts[type],
    })).filter(item => item.value > 0); // Only include types with reviews
    setFeedbackTypeData(processedFeedbackTypeData);

    // 3. Reviews Over Time (Line Chart)
    const dailyReviewCounts = {};
    reviewsToProcess.forEach(review => {
      const date = new Date(review.createdAt).toLocaleDateString('en-CA'); // YYYY-MM-DD
      dailyReviewCounts[date] = (dailyReviewCounts[date] || 0) + 1;
    });

    // Sort dates and format for line chart
    const sortedDates = Object.keys(dailyReviewCounts).sort();
    const processedReviewsOverTimeData = sortedDates.map(date => ({
      date: date,
      count: dailyReviewCounts[date],
    }));
    setReviewsOverTimeData(processedReviewsOverTimeData);
  };


  return (
    <div className="p-6 bg-blue-50 rounded-lg shadow-inner">
      <h4 className="text-xl font-semibold text-blue-800 mb-4">Review Statistics</h4>

      {/* Filter Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div>
          <label htmlFor="filterClientStats" className="block text-sm font-medium text-gray-700">Filter by Client:</label>
          <select
            id="filterClientStats"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            value={filterClientId}
            onChange={(e) => setFilterClientId(e.target.value)}
            disabled={filteredClients.length === 0}
          >
            <option value="">All Clients</option>
            {filteredClients.map(client => (
              <option key={client._id} value={client._id}>{client.email}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="filterStartDateStats" className="block text-sm font-medium text-gray-700">Start Date:</label>
          <input
            type="date"
            id="filterStartDateStats"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            value={filterStartDate}
            onChange={(e) => setFilterStartDate(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="filterEndDateStats" className="block text-sm font-medium text-gray-700">End Date:</label>
          <input
            type="date"
            id="filterEndDateStats"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            value={filterEndDate}
            onChange={(e) => setFilterEndDate(e.target.value)}
          />
        </div>
      </div>

      {isLoading && <p className="text-center text-indigo-600">Loading statistics...</p>}
      {!isLoading && reviews.length === 0 && !error && (
        <p className="text-gray-600 text-center py-4">No reviews found to generate statistics. Adjust your filters.</p>
      )}
      {error && <p className="text-red-600 text-center py-4">{error}</p>}

      {!isLoading && reviews.length > 0 && (
        <div className="space-y-8 mt-8">
          {/* Summary Statistics */}
          <div className="bg-white p-6 rounded-lg shadow-md flex justify-around items-center text-center">
            <div>
              <p className="text-gray-500 text-sm">Total Reviews</p>
              <p className="text-3xl font-bold text-indigo-700">{totalReviews}</p>
            </div>
            <div>
              <p className="text-gray-500 text-sm">Average Rating</p>
              <p className="text-3xl font-bold text-indigo-700">{averageRating}</p>
            </div>
          </div>

          {/* Rating Distribution Bar Chart */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h5 className="text-lg font-semibold text-gray-800 mb-4">Rating Distribution (1-10)</h5>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={ratingDistributionData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="rating" label={{ value: 'Rating', position: 'insideBottom', offset: 0 }} />
                <YAxis label={{ value: 'Number of Reviews', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#8884d8" name="Number of Reviews" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Feedback Type Pie Chart */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h5 className="text-lg font-semibold text-gray-800 mb-4">Feedback Type Distribution</h5>
            {feedbackTypeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={feedbackTypeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {feedbackTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-600 text-center">No feedback type data available for charting.</p>
            )}
          </div>

          {/* Reviews Over Time Line Chart */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h5 className="text-lg font-semibold text-gray-800 mb-4">Reviews Over Time</h5>
            {reviewsOverTimeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart
                  data={reviewsOverTimeData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis label={{ value: 'Number of Reviews', angle: -90, position: 'insideLeft' }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="count" stroke="#82ca9d" activeDot={{ r: 8 }} name="Reviews" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-600 text-center">No historical review data available for charting.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Statistics;
