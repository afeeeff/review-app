import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';

// Define colors for the pie chart segments (Positive, Neutral, Negative)
const PIE_COLORS = ['#4CAF50', '#FFC107', '#F44336']; // Green, Amber, Red

const ClientStatistics = ({
  clientId,
  token,
  API_BASE_URL,
  handleLogout, // Passed from App.jsx for session expiry
}) => {
  const [reviews, setReviews] = useState([]); // Raw reviews data for processing
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [statsError, setStatsError] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  // Chart Data States
  const [ratingDistributionData, setRatingDistributionData] = useState([]);
  const [feedbackTypeData, setFeedbackTypeData] = useState([]);
  const [reviewsOverTimeData, setReviewsOverTimeData] = useState([]);
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);

  // Helper function to parse response, handling non-JSON
  const parseResponse = async (response) => {
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return response.json();
    }
    return response.text().then(text => ({ message: text || 'An unknown error occurred.' }));
  };

  // Function to fetch client-specific reviews for statistics
  const fetchClientReviewsForStatistics = useCallback(async () => {
    if (!clientId || !token) {
      setStatsError('Not authorized. Please log in.');
      return;
    }
    setIsLoadingStats(true);
    setStatsError('');

    try {
      let url = `${API_BASE_URL}/reviews/${clientId}`;
      const queryParams = [];

      if (filterStartDate) {
        queryParams.push(`startDate=${filterStartDate}`);
      }
      if (filterEndDate) {
        queryParams.push(`endDate=${filterEndDate}`);
      }

      if (queryParams.length > 0) {
        url += `?${queryParams.join('&')}`;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await parseResponse(response);

      if (response.ok) {
        setReviews(data); // Store raw reviews for processing
        console.log("ClientStatistics: Reviews fetched for statistics:", data);
      } else {
        if (response.status === 401) {
          setStatsError('Session expired or unauthorized. Please log in again.');
          handleLogout(); // Trigger logout from parent
        } else {
          setStatsError(data.message || 'Failed to fetch reviews for statistics.');
        }
        setReviews([]);
        console.error("ClientStatistics: Failed to fetch reviews for statistics:", data.message);
      }
    } catch (err) {
      console.error('ClientStatistics: Error fetching reviews for statistics:', err);
      setStatsError('Network error fetching reviews for statistics.');
      setReviews([]);
    } finally {
      setIsLoadingStats(false);
    }
  }, [clientId, token, filterStartDate, filterEndDate, API_BASE_URL, handleLogout]);

  // Effect to trigger review fetching
  useEffect(() => {
    fetchClientReviewsForStatistics();
  }, [filterStartDate, filterEndDate, fetchClientReviewsForStatistics]);

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
      if (review.feedbackType && ['positive', 'neutral', 'negative'].includes(review.feedbackType)) {
        feedbackCounts[review.feedbackType] = (feedbackCounts[review.feedbackType] || 0) + 1;
      }
    });

    const processedFeedbackTypeData = Object.keys(feedbackCounts).map(type => ({
      name: type.charAt(0).toUpperCase() + type.slice(1),
      value: feedbackCounts[type],
    })).filter(item => item.value > 0);
    setFeedbackTypeData(processedFeedbackTypeData);

    // 3. Reviews Over Time (Line Chart)
    const dailyReviewCounts = {};
    reviewsToProcess.forEach(review => {
      const date = new Date(review.createdAt).toLocaleDateString('en-CA');
      dailyReviewCounts[date] = (dailyReviewCounts[date] || 0) + 1;
    });

    const sortedDates = Object.keys(dailyReviewCounts).sort();
    const processedReviewsOverTimeData = sortedDates.map(date => ({
      date: date,
      count: dailyReviewCounts[date],
    }));
    setReviewsOverTimeData(processedReviewsOverTimeData);
  };


  return (
    <div className="w-full max-w-6xl bg-white p-8 rounded-2xl shadow-xl border-t-4 border-purple-500 mx-auto">
      <h3 className="text-3xl font-bold text-center text-gray-800 mb-6">My Statistics</h3>

      {/* Filter Section */}
      <div className="w-full bg-white p-6 rounded-xl shadow-lg mb-8 flex flex-col md:flex-row items-center justify-center space-y-4 md:space-y-0 md:space-x-6 border-t-4 border-teal-500">
        <div className="flex items-center space-x-3 w-full md:w-auto">
          <label htmlFor="filterStartDateStats" className="text-gray-700 font-semibold text-lg">From:</label>
          <input
            type="date"
            id="filterStartDateStats"
            className="p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-base"
            value={filterStartDate}
            onChange={(e) => setFilterStartDate(e.target.value)}
          />
        </div>
        <div className="flex items-center space-x-3 w-full md:w-auto">
          <label htmlFor="filterEndDateStats" className="text-gray-700 font-semibold text-lg">To:</label>
          <input
            type="date"
            id="filterEndDateStats"
            className="p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-base"
            value={filterEndDate}
            onChange={(e) => setFilterEndDate(e.target.value)}
          />
        </div>
      </div>

      {isLoadingStats ? (
        <div className="flex items-center justify-center py-8 text-blue-600 text-xl">
          <svg className="animate-spin h-8 w-8 text-blue-500 mr-3" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Loading Statistics...
        </div>
      ) : statsError ? (
        <p className="text-red-600 text-center text-lg py-8">{statsError}</p>
      ) : reviews.length === 0 ? (
        <p className="text-gray-600 text-center text-lg py-8">No reviews found to generate statistics for this client. Adjust your filters.</p>
      ) : (
        <div className="space-y-8 mt-8">
          {/* Summary Statistics */}
          <div className="bg-white p-6 rounded-lg shadow-md flex flex-col md:flex-row justify-around items-center text-center space-y-4 md:space-y-0">
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

export default ClientStatistics;
