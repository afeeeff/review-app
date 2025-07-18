import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';

// --- STYLING ---
// Define colors for the statistics panels and charts for a light theme
const COLORS_PANELS = {
  tnps: '#1976d2', // Blue
  responders: '#455a64', // Darker Gray-blue
  promoters: '#388e3c', // Green
  neutral: '#ffb300', // Amber
  detractors: '#d32f2f' // Red
};
const PIE_COLORS = ['#4CAF50', '#FFC107', '#F44336']; // Green, Amber, Red (for Positive, Neutral, Negative)
const FONT_FAMILY = '"Inter", "Segoe UI", "Roboto", Arial, sans-serif';

const ClientDashboard = ({
  clientId,
  token,
  API_BASE_URL,
  handleLogout, // Passed from App.jsx for session expiry
  setIsLoading, // Global loading state setter
  setError,     // Global error state setter
  setSuccessMessage, // Global success message setter
  isLoading,    // Global loading state
  error,        // Global error state
  successMessage // Global success message
}) => {
  // Filter states
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  // Data
  const [reviews, setReviews] = useState([]); // Raw reviews data for processing
  const [clientDetails, setClientDetails] = useState(null); // State for client details

  // Chart Data States
  const [ratingDistributionData, setRatingDistributionData] = useState([]);
  const [feedbackTypeData, setFeedbackTypeData] = useState([]);
  const [reviewsOverTimeData, setReviewsOverTimeData] = useState([]);
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);

  // Stats
  const [responders, setResponders] = useState(0);
  const [promoters, setPromoters] = useState({ count: 0, pct: 0 });
  const [detractors, setDetractors] = useState({ count: 0, pct: 0 });
  const [neutral, setNeutral] = useState({ count: 0, pct: 0 });
  const [tnps, setTnps] = useState(0);

  // Helper function to parse response, handling non-JSON
  const parseResponse = async (response) => {
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return response.json();
    }
    return response.text().then(text => ({ message: text || 'An unknown error occurred.' }));
  };

  // Function to fetch client-specific reviews for both statistics and table
  const fetchClientReviews = useCallback(async () => {
    if (!clientId || !token) {
      setError('Not authorized. Please log in.');
      return;
    }
    setIsLoading(true);
    setError('');

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
        if (data.length > 0) {
          setClientDetails({
            email: data[0].client?.email,
            companyName: data[0].company?.name,
            branchName: data[0].branch?.name,
          });
        } else {
          setClientDetails(null);
        }
        console.log("ClientDashboard: Reviews fetched:", data);
      } else {
        if (response.status === 401) {
          setError('Session expired or unauthorized. Please log in again.');
          handleLogout(); // Trigger logout from parent
        } else {
          setError(data.message || 'Failed to fetch reviews.');
        }
        setReviews([]);
        console.error("ClientDashboard: Failed to fetch reviews:", data.message);
      }
    } catch (err) {
      console.error('ClientDashboard: Error fetching reviews:', err);
      setError('Network error fetching reviews.');
      setReviews([]);
    } finally {
      setIsLoading(false);
    }
  }, [clientId, token, filterStartDate, filterEndDate, API_BASE_URL, handleLogout, setIsLoading, setError]);

  // Effect to trigger review fetching when filters or auth data change
  useEffect(() => {
    fetchClientReviews();
  }, [filterStartDate, filterEndDate, fetchClientReviews]);

  // Process reviews data for charts and statistics whenever reviews state changes
  useEffect(() => {
    if (!reviews || reviews.length === 0) {
      setResponders(0); setPromoters({ count: 0, pct: 0 }); setDetractors({ count: 0, pct: 0 });
      setNeutral({ count: 0, pct: 0 }); setTnps(0); setAverageRating(0); setTotalReviews(0);
      setRatingDistributionData([]); setFeedbackTypeData([]); setReviewsOverTimeData([]);
      return;
    }

    const total = reviews.length;
    setTotalReviews(total);

    // Calculate TNPS and other stats
    const promotersCount = reviews.filter(r => r.rating === 9 || r.rating === 10).length;
    const detractorsCount = reviews.filter(r => r.rating >= 1 && r.rating <= 6).length;
    const neutralCount = reviews.filter(r => r.rating === 7 || r.rating === 8).length;

    setResponders(total);
    setPromoters({ count: promotersCount, pct: total ? ((promotersCount / total) * 100).toFixed(1) : 0 });
    setDetractors({ count: detractorsCount, pct: total ? ((detractorsCount / total) * 100).toFixed(1) : 0 });
    setNeutral({ count: neutralCount, pct: total ? ((neutralCount / total) * 100).toFixed(1) : 0 });
    setTnps(total ? ((promotersCount - detractorsCount) / total * 100).toFixed(1) : 0);

    // Calculate Rating Distribution (Bar Chart)
    const ratingCounts = {};
    let totalRatingSum = 0;
    reviews.forEach(review => {
      ratingCounts[review.rating] = (ratingCounts[review.rating] || 0) + 1;
      totalRatingSum += review.rating;
    });

    const processedRatingData = Array.from({ length: 10 }, (_, i) => i + 1).map(rating => ({
      rating: rating,
      count: ratingCounts[rating] || 0,
    }));
    setRatingDistributionData(processedRatingData);
    setAverageRating(total ? (totalRatingSum / total).toFixed(2) : 0);

    // Calculate Feedback Type Distribution (Pie Chart)
    const feedbackCounts = {
      positive: 0,
      neutral: 0,
      negative: 0,
    };
    reviews.forEach(review => {
      if (review.feedbackType && ['positive', 'neutral', 'negative'].includes(review.feedbackType)) {
        feedbackCounts[review.feedbackType] = (feedbackCounts[review.feedbackType] || 0) + 1;
      }
    });

    const processedFeedbackTypeData = Object.keys(feedbackCounts).map(type => ({
      name: type.charAt(0).toUpperCase() + type.slice(1), // Capitalize first letter
      value: feedbackCounts[type],
    })).filter(item => item.value > 0); // Only include types with reviews
    setFeedbackTypeData(processedFeedbackTypeData);

    // Calculate Reviews Over Time (Line Chart)
    const dailyReviewCounts = {};
    reviews.forEach(review => {
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

  }, [reviews]);

  // Function to get appropriate emoji for rating buttons (for table display)
  const getRatingEmoji = (rating) => {
    if (rating === 1) return '😡';
    if (rating === 2) return '😠';
    if (rating === 3) return '😞';
    if (rating === 4) return '😐';
    if (rating === 5) return '😕';
    if (rating === 6) return '🙂';
    if (rating === 7) return '😊';
    if (rating === 8) return '😄';
    if (rating === 9) return '🤩';
    if (rating === 10) return '✨';
    return '';
  };

  // Helper function to format date to DD/MM/YYYY
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-GB', options);
  };

  // --- STYLES (Adapted for light theme) ---
  const statsPanelStyle = {
    display: "flex", gap: "17px", margin: "32px 0 36px 0", flexWrap: "wrap"
  };
  const statCard = color => ({
    flex: '1 1 190px',
    minWidth: 190,
    background: "#ffffff", // White background
    borderRadius: "14px",
    boxShadow: "0 2px 10px rgba(0, 0, 0, 0.05)", // Lighter shadow
    textAlign: "center", padding: "22px 9px 14px 9px",
    borderTop: `5px solid ${color}`,
    fontFamily: FONT_FAMILY
  });
  const cardHeading = color => ({
    fontWeight: 800, fontSize: "17.5px", marginBottom: "10px", color,
    letterSpacing: '.2px',
    fontFamily: FONT_FAMILY
  });
  const cardValue = color => ({
    fontSize: 33, color, fontWeight: 900, letterSpacing: ".3px"
  });

  return (
    <div className="w-full max-w-7xl bg-gray-100 p-8 rounded-2xl shadow-lg border border-gray-200 mx-auto font-sans">
      <h3 className="text-4xl font-bold text-center text-blue-700 mb-8">My Dashboard</h3>

      {/* Client Details Section */}
      {clientDetails && (
        <div className="bg-white p-6 rounded-xl shadow-md mb-8 text-center border-t-4 border-blue-500 text-gray-800">
          <p className="text-xl font-semibold text-gray-600">Dashboard for:</p>
          <p className="text-3xl font-bold text-blue-700 mt-1">{clientDetails.email}</p>
          <p className="text-lg text-gray-700">
            {clientDetails.companyName && `Company: ${clientDetails.companyName}`}
            {clientDetails.branchName && ` | Branch: ${clientDetails.branchName}`}
          </p>
        </div>
      )}

      {/* Date Filter Section */}
      <div className="w-full bg-white p-6 rounded-xl shadow-lg mb-8 flex flex-col md:flex-row items-center justify-center space-y-4 md:space-y-0 md:space-x-6 border-t-4 border-teal-500">
        <div className="flex items-center space-x-3 w-full md:w-auto">
          <label htmlFor="startDate" className="text-gray-700 font-semibold text-lg">From:</label>
          <input
            type="date"
            id="startDate"
            value={filterStartDate}
            onChange={(e) => setFilterStartDate(e.target.value)}
            className="p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 text-base bg-gray-50 text-gray-800"
          />
        </div>
        <div className="flex items-center space-x-3 w-full md:w-auto">
          <label htmlFor="endDate" className="text-gray-700 font-semibold text-lg">To:</label>
          <input
            type="date"
            id="endDate"
            value={filterEndDate}
            onChange={(e) => setFilterEndDate(e.target.value)}
            className="p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 text-base bg-gray-50 text-gray-800"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-12 text-blue-600 text-xl">
          <svg className="animate-spin h-10 w-10 text-blue-500 mb-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Loading Dashboard Data...
        </div>
      ) : error ? (
        <p className="text-red-600 text-center text-lg py-12 bg-red-100 p-4 rounded-lg border border-red-300">{error}</p>
      ) : reviews.length === 0 ? (
        <p className="text-gray-600 text-center text-xl py-12 bg-white p-4 rounded-lg border border-gray-200">No reviews found for this client matching your criteria.</p>
      ) : (
        <>
          {/* STATISTICS PANEL (Similar to Superuser Dashboard) */}
          <div style={statsPanelStyle}>
            <div style={statCard(COLORS_PANELS.tnps)}>
              <div style={cardHeading(COLORS_PANELS.tnps)}>Service TNPS</div>
              <div style={cardValue(COLORS_PANELS.tnps)}>{tnps}</div>
              <div style={{ fontWeight: 500, color: COLORS_PANELS.tnps, fontSize: 13, opacity: 0.8, marginTop: 2 }}>
                (Promoters% – Detractors%)
              </div>
            </div>
            <div style={statCard(COLORS_PANELS.responders)}>
              <div style={cardHeading(COLORS_PANELS.responders)}>Responders</div>
              <div style={cardValue(COLORS_PANELS.responders)}>{responders}</div>
            </div>
            <div style={statCard(COLORS_PANELS.promoters)}>
              <div style={cardHeading(COLORS_PANELS.promoters)}>Promoters %</div>
              <div style={cardValue(COLORS_PANELS.promoters)}>
                {promoters.pct}%<sup style={{ fontSize: 15, color: "#252F47", marginLeft: 4 }}>{promoters.count}</sup>
              </div>
              <div style={{ fontSize: 13, color: COLORS_PANELS.promoters, fontWeight: 600 }}>TNPS 9–10</div>
            </div>
            <div style={statCard(COLORS_PANELS.detractors)}>
              <div style={cardHeading(COLORS_PANELS.detractors)}>Detractors %</div>
              <div style={cardValue(COLORS_PANELS.detractors)}>
                {detractors.pct}%<sup style={{ fontSize: 15, color: "#7f1138", marginLeft: 4 }}>{detractors.count}</sup>
              </div>
              <div style={{ fontSize: 13, color: COLORS_PANELS.detractors, fontWeight: 600 }}>TNPS 1–6</div>
            </div>
            <div style={statCard(COLORS_PANELS.neutral)}>
              <div style={cardHeading(COLORS_PANELS.neutral)}>Passives %</div>
              <div style={cardValue(COLORS_PANELS.neutral)}>
                {neutral.pct}%<sup style={{ fontSize: 15, color: "#178d57", marginLeft: 4 }}>{neutral.count}</sup>
              </div>
              <div style={{ fontSize: 13, color: COLORS_PANELS.neutral, fontWeight: 600 }}>TNPS 7–8</div>
            </div>
          </div>

          {/* Average Rating */}
          <div style={{
            fontSize: 17, color: COLORS_PANELS.promoters, marginBottom: 19,
            fontWeight: 700, letterSpacing: ".5px"
          }}>
            <span style={{ color: "#253" }}>Average Rating:</span>{" "}
            {averageRating}
          </div>

          {/* CHARTS: Responsive */}
          <div style={{
            display: "flex", gap: 34, alignItems: "stretch",
            flexWrap: "wrap", justifyContent: "space-between", maxWidth: '100%'
          }}>
            {/* Rating Distribution Bar Chart */}
            <div style={{
              flex: "3", minWidth: 350, background: "#ffffff", // White background
              borderRadius: 15, padding: "17px", boxShadow: "0 2px 12px rgba(0, 0, 0, 0.08)" // Lighter shadow
            }}>
              <div style={{
                fontWeight: 700, fontSize: 18, marginBottom: 12,
                color: COLORS_PANELS.tnps, letterSpacing: ".2px"
              }}>Ratings Distribution (1–10)</div>
              <ResponsiveContainer width="100%" height={246}>
                <BarChart data={ratingDistributionData}>
                  <XAxis dataKey="rating" tick={{ fontWeight: 'bold', fill: COLORS_PANELS.tnps, fontSize: 15 }} />
                  <YAxis allowDecimals={false} tick={{ fontWeight: 'bold', fill: '#222', fontSize: 15 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill={COLORS_PANELS.promoters} radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            {/* Feedback Type Pie Chart */}
            <div style={{
              flex: "2", minWidth: 270, background: "#ffffff", // White background
              borderRadius: 15, padding: "18px 8px", boxShadow: "0 2px 12px rgba(0, 0, 0, 0.08)", position: "relative" // Lighter shadow
            }}>
              <div style={{
                fontWeight: 700, fontSize: 18, marginBottom: 13, color: "#607d8b",
                letterSpacing: ".2px"
              }}>Review Breakdown</div>
              <ResponsiveContainer width="99%" height={238}>
                <PieChart>
                  <Pie
                    data={feedbackTypeData}
                    cx="50%" cy="50%"
                    labelLine={false}
                    label={({ name, value, percent, cx, cy, midAngle, outerRadius }) => {
                      const RADIAN = Math.PI / 180;
                      const radius = outerRadius + 20;
                      const x = cx + radius * Math.cos(-midAngle * RADIAN);
                      const y = cy + radius * Math.sin(-midAngle * RADIAN);
                      return (
                        <text
                          x={x}
                          y={y}
                          fill="#283593"
                          textAnchor={x > cx ? "start" : "end"}
                          dominantBaseline="central"
                          style={{
                            fontWeight: 600,
                            fontSize: 14.8,
                            textShadow: "0 2px 8px #fff",
                            paintOrder: "stroke",
                            stroke: "#fff",
                            strokeWidth: 3
                          }}
                        >
                          {name}: {value} ({(percent * 100).toFixed(1)}%)
                        </text>
                      );
                    }}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={52} outerRadius={82}
                    paddingAngle={2}
                    isAnimationActive
                  >
                    {feedbackTypeData.map((e, idx) =>
                      <Cell key={e.name} fill={PIE_COLORS[idx % PIE_COLORS.length]} stroke="#fff" strokeWidth={2} />
                    )}
                  </Pie>
                  <Tooltip formatter={(val, name, p) =>
                    [val, p && p && p.payload ? p.payload.name : name]
                  } />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Reviews Over Time Line Chart */}
          <div className="bg-white p-6 rounded-lg shadow-md mt-8">
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

          {/* ================= REVIEW TABLE SECTION ================ */}
          <div style={{
            margin: "50px 0 30px 0", fontSize: 20, color: COLORS_PANELS.tnps,
            fontWeight: 800, paddingTop: 25
          }}>All Reviews ({reviews.length})</div>
          {reviews.length > 0 && (
            <div className="overflow-x-auto rounded-xl shadow-lg border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-600 uppercase tracking-wider">Rating</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-600 uppercase tracking-wider">Customer</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-600 uppercase tracking-wider">Transcribed Text</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-600 uppercase tracking-wider">Voice Audio</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-600 uppercase tracking-wider">Invoice Data</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-600 uppercase tracking-wider">Date</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reviews.map((review) => (
                    <tr key={review._id} className="hover:bg-gray-50 transition-colors duration-200">
                      <td className="px-6 py-4 text-lg font-medium text-gray-900" data-label="Rating">
                        {review.rating} <span className="text-2xl">{getRatingEmoji(review.rating)}</span>
                      </td>
                      <td className="px-6 py-4 text-base text-gray-700" data-label="Customer">
                        <p className="font-semibold">{review.customerName}</p>
                        <p className="text-sm text-gray-500">{review.customerMobile}</p>
                      </td>
                      <td className="px-6 py-4 text-base text-gray-700" data-label="Transcribed Text">
                        {review.transcribedText || 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-base text-gray-700" data-label="Voice Audio">
                        {review.voiceData ? (
                          <audio controls src={review.voiceData} className="w-full max-w-[150px] h-10 rounded-lg"></audio>
                        ) : 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-base text-gray-700" data-label="Invoice Data">
                        {review.invoiceData ? (
                          <div className="text-sm space-y-1">
                            {review.invoiceData.jobCardNumber && <p><span className="font-semibold">Job Card:</span> {review.invoiceData.jobCardNumber}</p>}
                            {review.invoiceData.invoiceNumber && <p><span className="font-semibold">Invoice No:</span> {review.invoiceData.invoiceNumber}</p>}
                            {review.invoiceData.invoiceDate && <p><span className="font-semibold">Inv Date:</span> {formatDate(review.invoiceData.invoiceDate)}</p>}
                            {review.invoiceData.vin && <p><span className="font-semibold">VIN:</span> {review.invoiceData.vin}</p>}
                            {review.invoiceData.customerNameFromInvoice && <p><span className="font-semibold">Cust Name (Inv):</span> {review.invoiceData.customerNameFromInvoice}</p>}
                            {review.invoiceData.customerMobileFromInvoice && <p><span className="font-semibold">Cust Mobile (Inv):</span> {review.invoiceData.customerMobileFromInvoice}</p>}
                            {review.invoiceFileUrl && (
                              <a
                                href={review.invoiceFileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline block mt-2 font-medium"
                              >
                                View Invoice File
                              </a>
                            )}
                          </div>
                        ) : 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-base text-gray-700" data-label="Date">
                        {formatDate(review.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ClientDashboard;
