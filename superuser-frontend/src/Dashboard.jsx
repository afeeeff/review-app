import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend
} from 'recharts';

// --- STYLING (Moved outside the component for better scope management) ---
const COLORS_PANELS = {
  tnps: '#1565c0',
  responders: '#607d8b',
  promoters: '#388e3c',
  neutral: '#ffb300',
  detractors: '#d32f2f'
};
const PIE_COLORS = ['#388e3c', '#ffb300', '#d32f2f'];
const FONT_FAMILY = '"Inter", "Segoe UI", "Roboto", Arial, sans-serif';

const statsPanelStyle = {
  display: "flex", gap: "17px", margin: "32px 0 36px 0", flexWrap: "wrap"
};
const statCard = color => ({
  flex: '1 1 190px',
  minWidth: 190,
  background: "#ffffff", // White background for Superuser Dashboard cards
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

const Dashboard = ({
  userData, API_BASE_URL, isLoading, error, successMessage,
  setIsLoading, setError, setSuccessMessage, companies
}) => {
  // Filter states
  const [filterCompanyId, setFilterCompanyId] = useState('');
  const [filterBranchId, setFilterBranchId] = useState('');
  const [filterClientId, setFilterClientId] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [branchesForFilter, setBranchesForFilter] = useState([]);
  const [clientsForFilter, setClientsForFilter] = useState([]);
  // Data
  const [reviews, setReviews] = useState([]);
  const [ratingDistributionData, setRatingDistributionData] = useState([]);
  const [feedbackTypeData, setFeedbackTypeData] = useState([]);
  const [reviewsOverTimeData, setReviewsOverTimeData] = useState([]);
  const [averageRating, setAverageRating] = useState(0);
  // Stats
  const [responders, setResponders] = useState(0);
  const [promoters, setPromoters] = useState({ count: 0, pct: 0 });
  const [detractors, setDetractors] = useState({ count: 0, pct: 0 });
  const [neutral, setNeutral] = useState({ count: 0, pct: 0 });
  const [tnps, setTnps] = useState(0);

  // Auth headers
  const getAuthHeaders = useCallback(() => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${userData?.token}`,
  }), [userData?.token]);

  // Helper function to format date to DD/MM/YYYY
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-GB', options);
  };

  // Function to get appropriate emoji for rating buttons (for table display)
  const getRatingEmoji = (rating) => {
    if (rating === 1) return '😡';
    if (rating === 2) return '😠';
    if (rating === 3) return '😞';
    if (rating === 4) return '😐';
    if (rating === 5) return '😕';
    if (rating === 6) return '🙂';
    if (rating === 7) return '😊';
    if (rating === 8) return '�';
    if (rating === 9) return '🤩';
    if (rating === 10) return '✨';
    return '';
  };

  // Fetch dropdown data (branches & clients) based on filters
  const fetchClientsAndBranchesForFilter = useCallback(async (companyId, branchId) => {
    setError('');
    try {
      if (companyId) {
        const resp = await fetch(`${API_BASE_URL}/superuser/companies/${companyId}/branches`, { headers: getAuthHeaders() });
        setBranchesForFilter(resp.ok ? await resp.json() : []);
      } else {
        setBranchesForFilter([]);
        setFilterBranchId(''); // Clear branch filter when company changes
      }

      let clientUrl = `${API_BASE_URL}/superuser/clients`;
      if (branchId) {
        clientUrl = `${API_BASE_URL}/superuser/branches/${branchId}/clients`;
      } else if (companyId) {
        clientUrl = `${API_BASE_URL}/superuser/companies/${companyId}/clients`;
      }
      
      const respC = await fetch(clientUrl, { headers: getAuthHeaders() });
      setClientsForFilter(respC.ok ? await respC.json() : []);
    } catch {
      setError('Network error fetching filter data.');
    }
  }, [API_BASE_URL, getAuthHeaders, setError]);

  // Fetch reviews (filtered)
  const fetchReviews = useCallback(async () => {
    setIsLoading(true); setError('');
    try {
      let url = `${API_BASE_URL}/superuser/reviews?`;
      if (filterCompanyId) url += `companyId=${filterCompanyId}&`;
      if (filterBranchId) url += `branchId=${filterBranchId}&`;
      if (filterClientId) url += `clientId=${filterClientId}&`;
      if (filterStartDate) url += `startDate=${filterStartDate}&`;
      if (filterEndDate) url += `endDate=${filterEndDate}&`;
      const resp = await fetch(url, { headers: getAuthHeaders() });
      const data = await resp.json();
      if (resp.ok) {
        setReviews(data);
      } else {
        setError(data.message || 'Failed to fetch reviews.');
        setReviews([]);
      }
    } catch {
      setError('Network error fetching reviews.');
      setReviews([]);
    } finally {
      setIsLoading(false);
    }
  }, [
    API_BASE_URL, filterCompanyId, filterBranchId, filterClientId, filterStartDate,
    filterEndDate, getAuthHeaders, setIsLoading, setError
  ]);

  useEffect(() => {
    if (userData?.token) {
      fetchReviews();
      fetchClientsAndBranchesForFilter(filterCompanyId, filterBranchId);
    }
  }, [
    filterCompanyId, filterBranchId, filterClientId,
    filterStartDate, filterEndDate, userData?.token,
    fetchReviews, fetchClientsAndBranchesForFilter
  ]);

  // Compute stats/charts
  useEffect(() => {
    if (!reviews || reviews.length === 0) {
      setResponders(0); setPromoters({ count: 0, pct: 0 }); setDetractors({ count: 0, pct: 0 });
      setNeutral({ count: 0, pct: 0 }); setTnps(0); setAverageRating(0);
      setRatingDistributionData([]); setFeedbackTypeData([]); setReviewsOverTimeData([]); return;
    }
    const total = reviews.length;
    const promotersCount = reviews.filter(r => r.rating === 9 || r.rating === 10).length;
    const detractorsCount = reviews.filter(r => r.rating >= 1 && r.rating <= 6).length;
    const neutralCount = reviews.filter(r => r.rating === 7 || r.rating === 8).length;
    setResponders(total);
    setPromoters({ count: promotersCount, pct: total ? ((promotersCount / total) * 100).toFixed(1) : 0 });
    setDetractors({ count: detractorsCount, pct: total ? ((detractorsCount / total) * 100).toFixed(1) : 0 });
    setNeutral({ count: neutralCount, pct: total ? ((neutralCount / total) * 100).toFixed(1) : 0 });
    setTnps(total ? ((promotersCount - detractorsCount) / total * 100).toFixed(1) : 0);
    const rc = {}; let sum = 0;
    reviews.forEach(r => { rc[r.rating] = (rc[r.rating] || 0) + 1; sum += r.rating; });
    setRatingDistributionData(Array.from({ length: 10 }, (_, i) => ({ rating: i + 1, count: rc[i + 1] || 0 })));
    setAverageRating(total ? (sum / total).toFixed(2) : 0);
    setFeedbackTypeData([
      { name: 'Promoters (9–10)', value: promotersCount },
      { name: 'Neutral (7–8)', value: neutralCount },
      { name: 'Detractors (1–6)', value: detractorsCount }
    ]);

    // Calculate Reviews Over Time (Line Chart)
    const dailyReviewCounts = {};
    reviews.forEach(review => {
      const date = new Date(review.createdAt).toLocaleDateString('en-CA'); // YYYY-MM-DD
      dailyReviewCounts[date] = (dailyReviewCounts[date] || 0) + 1;
    });

    const sortedDates = Object.keys(dailyReviewCounts).sort();
    const processedReviewsOverTimeData = sortedDates.map(date => ({
      date: date,
      count: dailyReviewCounts[date],
    }));
    setReviewsOverTimeData(processedReviewsOverTimeData);
  }, [reviews]);

  // Function to export reviews as Excel (CSV)
  const exportReviewsAsExcel = () => {
    if (reviews.length === 0) {
      alert("No reviews to export.");
      return;
    }

    const headers = [
      "Customer Name", "Customer Mobile", "VIN", "Job Card Number", "Invoice Number",
      "Invoice Date", "Transcribed Text", "Date", "Rating", "Feedback Type",
      "Company Name", "Branch Name", "Client Email" // Added company, branch, client details
    ];

    const csvContent = [
      headers.join(','), // CSV header row
      ...reviews.map(review => {
        const customerData = review.customerName || 'N/A';
        const customerMobile = review.customerMobile || 'N/A';
        const vin = review.invoiceData?.vin || 'N/A';
        const jobCardNumber = review.invoiceData?.jobCardNumber || 'N/A';
        const invoiceNumber = review.invoiceData?.invoiceNumber || 'N/A';
        const invoiceDate = review.invoiceData?.invoiceDate ? formatDate(review.invoiceData.invoiceDate) : 'N/A';
        // Handle commas and quotes in transcribed text for CSV
        const transcribedText = review.transcribedText ? `"${review.transcribedText.replace(/"/g, '""')}"` : 'N/A';
        const createdAt = review.createdAt ? formatDate(review.createdAt) : 'N/A';
        const rating = review.rating || 'N/A';
        const feedbackType = review.feedbackType ? review.feedbackType.charAt(0).toUpperCase() + review.feedbackType.slice(1) : 'N/A';
        const companyName = review.company?.name || 'N/A';
        const branchName = review.branch?.name || 'N/A';
        const clientEmail = review.client?.email || 'N/A';


        return [
          customerData, customerMobile, vin, jobCardNumber, invoiceNumber,
          invoiceDate, transcribedText, createdAt, rating, feedbackType,
          companyName, branchName, clientEmail
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `superuser_reviews_${new Date().toISOString().slice(0,10)}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // --- RENDER ---
  return (
    // The outermost div should have a solid background to ensure visibility against App.jsx's background
    <div className="w-full px-8 py-10 font-sans bg-white">
      {/* FILTER PANEL */}
      <div style={{
        background: "#e3f2fd", borderRadius: 13, padding: '18px 15px 12px 15px',
        marginBottom: 18, boxShadow: '0 2px 12px #1976d111', border: "1.4px solid #bbdefb", width: '100%'
      }}>
        <div style={{
          fontWeight: 800, fontSize: 20, marginBottom: 15, color: "#1a237e", letterSpacing: "1.2px"
        }}>Dashboard</div>
        <div style={{
          display: "flex", gap: 18, flexWrap: "wrap",
          marginBottom: 4, alignItems: "center"
        }}>
          <div>
            <label style={{ fontWeight: 600, color: "#1260a2" }}>Company:</label>
            <select style={{
              marginLeft: 5, minWidth: 137, padding: "7px 9px",
              background: "#f9fbff", borderRadius: 5, border: "1.1px solid #90caf9", fontWeight: 500
            }}
              value={filterCompanyId} onChange={e => {
                setFilterCompanyId(e.target.value);
                setFilterBranchId(''); // Reset branch filter when company changes
                setFilterClientId(''); // Reset client filter when company changes
              }}>
              <option value="">All Companies</option>
              {companies?.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontWeight: 600, color: "#1976d2" }}>Branch:</label>
            <select style={{
              marginLeft: 5, minWidth: 125, padding: "7px 9px",
              background: "#edf9fe", borderRadius: 5, border: "1.1px solid #64b5f6", fontWeight: 500
            }}
              value={filterBranchId} onChange={e => {
                setFilterBranchId(e.target.value);
                setFilterClientId(''); // Reset client filter when branch changes
              }}
              disabled={branchesForFilter.length === 0 && filterCompanyId !== ''} // Disable if no branches for selected company
              >
              <option value="">All Branches</option>
              {branchesForFilter?.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontWeight: 600, color: "#009688" }}>Client:</label>
            <select style={{
              marginLeft: 5, minWidth: 125, padding: "7px 9px",
              background: "#f7feff", borderRadius: 5, border: "1.1px solid #4dd0e1", fontWeight: 500
            }}
              value={filterClientId} onChange={e => setFilterClientId(e.target.value)}
              disabled={clientsForFilter.length === 0 && (filterCompanyId !== '' || filterBranchId !== '')} // Disable if no clients for selected company/branch
              >
              <option value="">All Clients</option>
              {clientsForFilter?.map(cl => <option key={cl._id} value={cl._id}>{cl.email}</option>)}
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

      {/* STATISTICS PANEL */}
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
                outerRadius={80} // Adjusted outerRadius to give more space for labels
                fill="#8884d8"
                dataKey="value"
                // Custom label rendering function
                label={({ name, value, percent, cx, cy, midAngle, outerRadius }) => {
                  const RADIAN = Math.PI / 180;
                  const radius = outerRadius + 20; // Distance of the label from the center
                  const x = cx + radius * Math.cos(-midAngle * RADIAN);
                  const y = cy + radius * Math.sin(-midAngle * RADIAN);

                  return (
                    <text
                      x={x}
                      y={y}
                      fill="#283593" // Darker text for visibility
                      textAnchor={x > cx ? "start" : "end"}
                      dominantBaseline="central"
                      style={{
                        fontWeight: 600,
                        fontSize: 12, // Slightly smaller font size
                        textShadow: "0 1px 2px rgba(0,0,0,0.1)", // Subtle shadow for contrast
                      }}
                    >
                      {`${name}: ${value} (${(percent * 100).toFixed(1)}%)`}
                    </text>
                  );
                }}
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
        margin: "50px 0 30px 0", fontSize: 20, color: "#1565c0",
        fontWeight: 800, paddingTop: 25, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px"
      }}>
        Reviews Dump ({reviews.length})
        <button
          onClick={exportReviewsAsExcel}
          className="bg-gray-700 hover:bg-gray-800 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out flex items-center transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-75"
        >
          <svg xmlns="[http://www.w3.org/2000/svg](http://www.w3.org/2000/svg)" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
          Export
        </button>
      </div>
      {(isLoading || (!reviews || reviews.length === 0)) && (
        <div style={{
          textAlign: 'center', margin: '26px', fontSize: 16,
          color: COLORS_PANELS.tnps, fontWeight: 600
        }}>
          {isLoading ? 'Loading...' : 'No reviews found to display.'}
        </div>
      )}
      {!isLoading && reviews.length > 0 && (
        <div className="overflow-x-auto rounded-xl shadow-lg border border-gray-200 w-full"> {/* Use w-full here */}
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-600 uppercase tracking-wider">Customer Data</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-600 uppercase tracking-wider">Transcribed Text</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-600 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-600 uppercase tracking-wider">Rating</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-600 uppercase tracking-wider">Voice Audio</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {reviews.map((review) => (
                <tr key={review._id} className="hover:bg-gray-50 transition-colors duration-200">
                  {/* Customer Data Column */}
                  <td className="px-6 py-4 text-base text-gray-700" data-label="Customer Data">
                    <p className="font-semibold">{review.customerName || 'N/A'}</p>
                    <p className="text-sm text-gray-500">Mobile: {review.customerMobile || 'N/A'}</p>
                    {review.invoiceData ? (
                      <div className="text-xs mt-2 space-y-1">
                        {review.invoiceData.vin && <p><span className="font-semibold">VIN:</span> {review.invoiceData.vin}</p>}
                        {review.invoiceData.jobCardNumber && <p><span className="font-semibold">Job Card:</span> {review.invoiceData.jobCardNumber}</p>}
                        {review.invoiceData.invoiceNumber && <p><span className="font-semibold">Invoice No:</span> {review.invoiceData.invoiceNumber}</p>}
                        {review.invoiceData.invoiceDate && <p><span className="font-semibold">Inv Date:</span> {formatDate(review.invoiceData.invoiceDate)}</p>}
                        {review.invoiceFileUrl && (
                          <a
                            href={review.invoiceFileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline block mt-2 font-medium"
                          >
                            View File
                          </a>
                        )}
                      </div>
                    ) : 'N/A'}
                  </td>
                  {/* Transcribed Text Column */}
                  <td className="px-6 py-4 max-w-xs overflow-hidden text-ellipsis text-sm text-gray-700" data-label="Transcribed Text">
                    {review.transcribedText || 'N/A'}
                  </td>
                  {/* Date Column */}
                  <td className="px-6 py-4 whitespace-nowrap text-base text-gray-700" data-label="Date">
                    {review.createdAt ? new Date(review.createdAt).toLocaleDateString() : 'N/A'}
                  </td>
                  {/* Rating Column */}
                  <td className="px-6 py-4 text-lg font-medium text-gray-900" data-label="Rating">
                    {review.rating} <span className="text-2xl">{getRatingEmoji(review.rating)}</span>
                  </td>
                  {/* Voice Audio Column */}
                  <td className="px-6 py-4 text-base text-gray-700" data-label="Voice Audio">
                    {review.voiceData ? (
                      <audio controls src={review.voiceData} className="w-full max-w-[150px] h-10 rounded-lg"></audio>
                    ) : 'N/A'}
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
