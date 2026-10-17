import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './OwnerDashboard.css';
import { API_ORIGIN } from '../../config';

const OwnerDashboard = () => {
  const [stats, setStats] = useState({
    totalProperties: 0,
    activeBookings: 0,
    pendingBookings: 0
  });
  const [previousBookings, setPreviousBookings] = useState([]);
  const [recentRequests, setRecentRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const { owner, token } = useSelector((state) => state.owner);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      const headers = {
        Authorization: `Bearer ${token || localStorage.getItem('ownerToken')}`
      };

      // Fetch properties count
      const propertiesRes = await axios.get(`${API_ORIGIN}/api/properties/owner`, { headers });

      // Fetch all bookings for stats
      const bookingsRes = await axios.get(`${API_ORIGIN}/api/bookings/owner`, { headers });

      // Fetch previous bookings (completed)
      const previousRes = await axios.get(`${API_ORIGIN}/api/bookings/owner/previous`, { headers });

      // Fetch recent requests (pending)
      const requestsRes = await axios.get(`${API_ORIGIN}/api/bookings/owner/recent-requests`, { headers });

      const bookings = bookingsRes.data.bookings || [];
      const activeBookings = bookings.filter(b => b.status === 'ACCEPTED').length;
      const pendingBookings = bookings.filter(b => b.status === 'PENDING').length;

      setStats({
        totalProperties: propertiesRes.data.properties?.length || 0,
        activeBookings,
        pendingBookings
      });

      setPreviousBookings(previousRes.data.bookings || []);
      setRecentRequests(requestsRes.data.bookings || []);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'PENDING': return 'status-pending';
      case 'ACCEPTED': return 'status-accepted';
      case 'CANCELLED': return 'status-cancelled';
      case 'COMPLETED': return 'status-completed';
      default: return '';
    }
  };

  if (loading) {
    return (
      <div className="owner-dashboard-container">
        <div className="loading">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="owner-dashboard-container">
      <div className="dashboard-header">
        <h1>Welcome {owner?.name || 'Owner'}</h1>
        <p className="dashboard-subtitle">Manage your properties and bookings</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-content">
            <h3>{stats.totalProperties}</h3>
            <p>Total Properties</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-content">
            <h3>{stats.activeBookings}</h3>
            <p>Active Bookings</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-content">
            <h3>{stats.pendingBookings}</h3>
            <p>Pending Requests</p>
          </div>
        </div>
      </div>

      <div className="quick-actions">
        <h2>Quick Actions</h2>
        <div className="action-buttons">
          <button 
            className="action-btn"
            onClick={() => navigate('/owner/properties')}
          >
            <span className="btn-text">View Properties</span>
          </button>

          <button 
            className="action-btn"
            onClick={() => navigate('/owner/bookings')}
          >
            <span className="btn-text">Manage Bookings</span>
          </button>

          <button 
            className="action-btn"
            onClick={() => navigate('/owner/properties/new')}
          >
            <span className="btn-text">Add New Property</span>
          </button>
        </div>
      </div>

      {/* Recent Requests Section */}
      <div className="dashboard-section">
        <h2>Recent Booking Requests</h2>
        {recentRequests.length === 0 ? (
          <p className="no-data">No pending requests at the moment</p>
        ) : (
          <div className="bookings-mini-list">
            {recentRequests.slice(0, 5).map((booking) => (
              <div key={booking.id} className="mini-booking-card">
                <div className="mini-booking-header">
                  <h4>{booking.property_name}</h4>
                  <span className={`status-badge ${getStatusClass(booking.status)}`}>
                    {booking.status}
                  </span>
                </div>
                <div className="mini-booking-details">
                  <p><strong>Guest:</strong> {booking.traveler_name}</p>
                  <p><strong>Dates:</strong> {formatDate(booking.start_date)} - {formatDate(booking.end_date)}</p>
                  <p><strong>Guests:</strong> {booking.num_guests} | <strong>Total:</strong> ${booking.total_price}</p>
                </div>
                <button 
                  className="btn-view-details"
                  onClick={() => navigate('/owner/bookings')}
                >
                  View Details
                </button>
              </div>
            ))}
          </div>
        )}
        {recentRequests.length > 5 && (
          <button 
            className="btn-view-all"
            onClick={() => navigate('/owner/bookings')}
          >
            View All Requests ({recentRequests.length})
          </button>
        )}
      </div>

      {/* Previous Bookings Section */}
      <div className="dashboard-section">
        <h2>Previous Bookings</h2>
        {previousBookings.length === 0 ? (
          <p className="no-data">No previous bookings</p>
        ) : (
          <div className="bookings-mini-list">
            {previousBookings.slice(0, 5).map((booking) => (
              <div key={booking.id} className="mini-booking-card completed">
                <div className="mini-booking-header">
                  <h4>{booking.property_name}</h4>
                  <span className={`status-badge ${getStatusClass(booking.status)}`}>
                    {booking.status}
                  </span>
                </div>
                <div className="mini-booking-details">
                  <p><strong>Guest:</strong> {booking.traveler_name}</p>
                  <p><strong>Dates:</strong> {formatDate(booking.start_date)} - {formatDate(booking.end_date)}</p>
                  <p><strong>Total:</strong> ${booking.total_price}</p>
                </div>
              </div>
            ))}
          </div>
        )}
        {previousBookings.length > 5 && (
          <button 
            className="btn-view-all"
            onClick={() => navigate('/owner/bookings')}
          >
            View All Previous Bookings ({previousBookings.length})
          </button>
        )}
      </div>
    </div>
  );
};

export default OwnerDashboard;







