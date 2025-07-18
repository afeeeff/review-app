import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';

// --- STYLING ---
const COLORS_PANELS = {
  tnps: '#1565c0',
  responders: '#607d8b',
  promoters: '#388e3c',
  neutral: '#ffb300',
  detractors: '#d32f2f'
};
const PIE_COLORS = ['#388e3c', '#ffb300', '#d32f2f']; // Green, Amber, Red (for Promoters, Neutral, Detractors)
const FONT_FAMILY = '"Inter", "Segoe UI", "Roboto", Arial, sans-serif';

const Dashboard = ({
  userData, API_BASE_URL, isLoading, error, successMessage,
  setIsLoading, setError, setSuccessMessage,
  branches, // Passed from App.jsx for branch filter dropdown
  filteredClients, // Passed from App.jsx for client filter dropdown
  fetchClientsForCompanyAdminFilters, // Passed from App.jsx to update filteredClients
}) => {
  // Filter states
  const [filterBranchId, setFilterBranchId] = useState('');
  const [filterClientId, setFilterClientId] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  // Data
  const [reviews, setReviews] = useState([]);
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

  // Helper to get auth headers
  const getAuthHeaders = useCallback(() => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${userData?.token}`,
  }), [userData?.token]);

  // Fetch reviews (filtered) for the company admin scope
  const fetchCompanyReviews = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      let url = `${API_BASE_URL}/company/reviews?`;
      if (filterBranchId) {
        url += `branchId=${filterBranchId}&`;
      }
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
        console.log("Dashboard (Company Admin): Reviews fetched:", data);
      } else {
        setError(data.message || 'Failed to fetch reviews.');
        setReviews([]);
        console.error("Dashboard (Company Admin): Failed to fetch reviews:", data.message);
      }
    } catch (err) {
      console.error('Dashboard (Company Admin): Error fetching reviews:', err);
      setError('Network error fetching reviews.');
      setReviews([]);
    } finally {
      setIsLoading(false);
    }
  }, [API_BASE_URL, filterBranchId, filterClientId, filterStartDate, filterEndDate, getAuthHeaders, setIsLoading, setError]);

  // Effect to trigger review fetching and client dropdown data fetching
  useEffect(() => {
    if (userData?.token && userData?.companyId) {
      fetchCompanyReviews();
      // Fetch clients for the filter dropdowns based on current branch selection
      fetchClientsForCompanyAdminFilters(filterBranchId);
    }
  }, [filterBranchId, filterClientId, filterStartDate, filterEndDate, userData, fetchCompanyReviews, fetchClientsForCompanyAdminFilters]);

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


  // --- STYLES (from Superuser Dashboard) ---
  const statsPanelStyle = {
    display: "flex", gap: "17px", margin: "32px 0 36px 0", flexWrap: "wrap"
  };
  const statCard = color => ({
    flex: '1 1 190px',
    minWidth: 190,
    background: "#f7fafc",
    borderRadius: "14px",
    boxShadow: "0 2px 10px rgba(60,130,214,0.045)",
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
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* FILTER PANEL (Similar to Superuser Dashboard) */}
      <div style={{
        background: "#e3f2fd", borderRadius: 13, padding: '18px 15px 12px 15px',
        marginBottom: 18, boxShadow: '0 2px 12px #1976d111', border: "1.4px solid #bbdefb", maxWidth: '100%'
      }}>
        <div style={{
          fontWeight: 800, fontSize: 20, marginBottom: 15, color: "#1a237e", letterSpacing: "1.2px"
        }}>Dashboard Overview</div>
        <div style={{
          display: "flex", gap: 18, flexWrap: "wrap",
          marginBottom: 4, alignItems: "center"
        }}>
          {/* Company filter is removed as this is company admin dashboard */}
          <div>
            <label style={{ fontWeight: 600, color: "#1976d2" }}>Branch:</label>
            <select style={{
              marginLeft: 5, minWidth: 125, padding: "7px 9px",
              background: "#edf9fe", borderRadius: 5, border: "1.1px solid #64b5f6", fontWeight: 500
            }}
              value={filterBranchId} onChange={e => {
                setFilterBranchId(e.target.value);
                setFilterClientId(''); // Reset client filter when branch changes
              }}>
              <option value="">All Branches</option>
              {branches?.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontWeight: 600, color: "#009688" }}>Client:</label>
            <select style={{
              marginLeft: 5, minWidth: 125, padding: "7px 9px",
              background: "#f7feff", borderRadius: 5, border: "1.1px solid #4dd0e1", fontWeight: 500
            }}
              value={filterClientId} onChange={e => setFilterClientId(e.target.value)}
              disabled={filteredClients.length === 0 && filterBranchId !== ''} // Disable if no clients for selected branch
              >
              <option value="">All Clients</option>
              {filteredClients?.map(cl => <option key={cl._id} value={cl._id}>{cl.email}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontWeight: 600, color: "#ffa000" }}>From:</label>
            <input type="date" style={{
              marginLeft: 4, padding: "8px", borderRadius: 6,
              background: "#fffde7", border: "1.1px solid #ffd600", fontWeight: 500
            }}
              value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} />
          </div>
          <div>
            <label style={{ fontWeight: 600, color: "#d84315" }}>To:</label>
            <input type="date" style={{
              marginLeft: 4, padding: "8px", borderRadius: 6,
              background: "#ffebee", border: "1.1px solid #ef9a9a", fontWeight: 500
            }}
              value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} />
          </div>
        </div>
      </div>

      {/* STATISTICS PANEL (Similar to Superuser Dashboard) */}
      <div style={statsPanelStyle}>
        <div style={statCard(COLORS_PANELS.tnps)}>
          <div style={cardHeading(COLORS_PANELS.tnps)}>Service TNPS</div>
          <div style={cardValue(COLORS_PANELS.tnps)}>{tnps}</div>
          <div style={{ fontWeight: 500, color: '#1976d2', fontSize: 13, opacity: 0.8, marginTop: 2 }}>
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
          <div style={{ fontSize: 13, color: '#388e3c', fontWeight: 600 }}>TNPS 9–10</div>
        </div>
        <div style={statCard(COLORS_PANELS.detractors)}>
          <div style={cardHeading(COLORS_PANELS.detractors)}>Detractors %</div>
          <div style={cardValue(COLORS_PANELS.detractors)}>
            {detractors.pct}%<sup style={{ fontSize: 15, color: "#7f1138", marginLeft: 4 }}>{detractors.count}</sup>
          </div>
          <div style={{ fontSize: 13, color: '#d32f2f', fontWeight: 600 }}>TNPS 1–6</div>
        </div>
        <div style={statCard(COLORS_PANELS.neutral)}>
          <div style={cardHeading(COLORS_PANELS.neutral)}>Passives %</div>
          <div style={cardValue(COLORS_PANELS.neutral)}>
            {neutral.pct}%<sup style={{ fontSize: 15, color: "#178d57", marginLeft: 4 }}>{neutral.count}</sup>
          </div>
          <div style={{ fontSize: 13, color: '#ffb300', fontWeight: 600 }}>TNPS 7–8</div>
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
        {/* Bar Chart */}
        <div style={{
          flex: "3", minWidth: 350, background: "#fafbfe",
          borderRadius: 15, padding: "17px", boxShadow: "0 2px 12px #90caf933"
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
        {/* Pie Chart */}
        <div style={{
          flex: "2", minWidth: 270, background: "#f9fafc",
          borderRadius: 15, padding: "18px 8px", boxShadow: "0 2px 12px #ffb30022", position: "relative"
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

      {/* ================= REVIEW TABLE SECTION ================ */}
      <div style={{
        margin: "50px 0 30px 0", fontSize: 20, color: "#1565c0",
        fontWeight: 800, paddingTop: 25
      }}>All Reviews ({reviews.length})</div>
      {(isLoading || (!reviews || reviews.length === 0)) && (
        <div style={{
          textAlign: 'center', margin: '26px', fontSize: 16,
          color: COLORS_PANELS.tnps, fontWeight: 600
        }}>
          {isLoading ? 'Loading...' : 'No reviews found to display.'}
        </div>
      )}
      {!isLoading && reviews.length > 0 && (
        <div style={{
          overflowX: 'auto',
          background: "#fff", borderRadius: 11,
          boxShadow: "0 2px 18px #1976d111",
          padding: 16
        }}>
          <table style={{
            minWidth: 1170, borderCollapse: 'collapse', fontFamily: FONT_FAMILY
          }}>
            <thead>
              <tr style={{
                background: "#e3f2fd", fontWeight: "bold", fontSize: 15, color: "#1976d2"
              }}>
                <th style={{ padding: "10px 7px" }}>Rating</th>
                <th style={{ padding: "10px 7px" }}>Customer Name</th>
                <th style={{ padding: "10px 7px" }}>Customer Mobile</th>
                <th style={{ padding: "10px 7px" }}>Client Email</th>
                <th style={{ padding: "10px 7px" }}>Branch</th>
                <th style={{ padding: "10px 7px" }}>Transcribed Text</th>
                <th style={{ padding: "10px 7px" }}>Voice Audio</th>
                <th style={{ padding: "10px 7px" }}>Invoice Data</th>
                <th style={{ padding: "10px 7px" }}>Date</th>
              </tr>
            </thead>
            <tbody>
              {reviews.map((review, i) => (
                <tr key={review._id || i} style={{ background: i % 2 === 0 ? "#f5fafd" : "#fff" }}>
                  <td style={{ padding: "7px 5px", fontWeight: 700, color: "#388e3c" }}>{review.rating}</td>
                  <td style={{ padding: "7px 5px" }}>{review.customerName}</td>
                  <td style={{ padding: "7px 5px" }}>{review.customerMobile}</td>
                  <td style={{ padding: "7px 5px" }}>{review.client?.email || 'N/A'}</td>
                  <td style={{ padding: "7px 5px" }}>{review.branch?.name || 'N/A'}</td>
                  <td style={{ padding: "7px 5px" }}>{review.transcribedText || review.textReview || 'N/A'}</td>
                  <td style={{ padding: "7px 5px" }}>
                    {review.voiceData ? (
                      <audio controls style={{ width: 130 }}>
                        <source src={review.voiceData} type="audio/mpeg" />
                        Your browser does not support the audio element.
                      </audio>
                    ) : 'N/A'}
                  </td>
                  <td style={{ padding: "7px 5px", fontSize: 13 }}>
                    {review.invoiceData ? (
                      <div style={{ whiteSpace: 'pre-line', lineHeight: 1.4, }}>
                        {review.invoiceData.jobCardNumber && <>Job Card: {review.invoiceData.jobCardNumber}<br /></>}
                        {review.invoiceData.invoiceNumber && <>Invoice No: {review.invoiceData.invoiceNumber}<br /></>}
                        {review.invoiceData.invoiceDate && <>Inv Date: {review.invoiceData.invoiceDate}<br /></>}
                        {review.invoiceData.vin && <>VIN: {review.invoiceData.vin}<br /></>}
                        {review.invoiceData.customerNameFromInvoice && <>Cust Name (Inv): {review.invoiceData.customerNameFromInvoice}<br /></>}
                        {review.invoiceData.customerMobileFromInvoice && <>Cust Mobile (Inv): {review.invoiceData.customerMobileFromInvoice}<br /></>}
                        {review.invoiceFileUrl &&
                          (<a href={review.invoiceFileUrl} target='_blank' rel='noopener noreferrer' style={{ color: "#1976d2" }}>View File</a>)}
                      </div>
                    ) : 'N/A'}
                  </td>
                  <td style={{ padding: "7px 5px" }}>
                    {review.createdAt ? new Date(review.createdAt).toLocaleDateString() : 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Error below the grid */}
      {error && (
        <div style={{
          color: COLORS_PANELS.detractors, margin: "19px 0", fontWeight: 600, fontSize: 15.5
        }}>{error}</div>
      )}
    </div>
  );
};

export default Dashboard;
