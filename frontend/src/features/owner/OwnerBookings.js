import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';
import './OwnerBookings.css';
import { API_ORIGIN } from '../../config';

const OwnerBookings = () => {
  const [activeTab, setActiveTab] = useState('accepted');
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });
  const { token } = useSelector((state) => state.owner);

  useEffect(() => {
    fetchBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, pagination.page]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      let endpoint = '';

      switch (activeTab) {
        case 'accepted':
          endpoint = '/api/bookings/owner/accepted';
          break;
        case 'completed':
          endpoint = '/api/bookings/owner/completed';
          break;
        case 'cancelled':
          endpoint = '/api/bookings/owner/cancelled';
          break;
        default:
          endpoint = '/api/bookings/owner/accepted';
      }

      const response = await axios.get(
        `${API_ORIGIN}${endpoint}?page=${pagination.page}&limit=${pagination.limit}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        setBookings(response.data.bookings);
        setPagination(prev => ({
          ...prev,
          total: response.data.pagination.total,
          totalPages: response.data.pagination.totalPages
        }));
      }
    } catch (err) {
      console.error('Error fetching bookings:', err);
      setError(err.response?.data?.message || 'Failed to fetch bookings');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setPagination(prev => ({ ...prev, page: 1 }));
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
      case 'ACCEPTED':
        return 'status-accepted';
      case 'CANCELLED':
        return 'status-cancelled';
      case 'COMPLETED':
        return 'status-completed';
      default:
        return '';
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination(prev => ({ ...prev, page: newPage }));
    }
  };

  if (loading && bookings.length === 0) {
    return (
      <div className="owner-bookings-container">
        <div className="loading">Loading bookings...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="owner-bookings-container">
        <div className="error-message">{error}</div>
      </div>
    );
  }

  return (
    <div className="owner-bookings-container">
      <h1>Bookings</h1>
      <p className="subtitle">View all your property bookings</p>

      {/* Tabs */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'accepted' ? 'active' : ''}`}
          onClick={() => handleTabChange('accepted')}
        >
          Accepted
        </button>
        <button
          className={`tab ${activeTab === 'completed' ? 'active' : ''}`}
          onClick={() => handleTabChange('completed')}
        >
          Completed
        </button>
        <button
          className={`tab ${activeTab === 'cancelled' ? 'active' : ''}`}
          onClick={() => handleTabChange('cancelled')}
        >
          Cancelled
        </button>
      </div>

      {/* Bookings List */}
      {bookings.length === 0 ? (
        <div className="no-bookings">
          <p>No {activeTab} bookings found.</p>
        </div>
      ) : (
        <>
          <div className="bookings-list">
            {bookings.map((booking) => (
              <div key={booking._id} className="booking-card">
                <div className="booking-header">
                  <h3>{booking.property_name}</h3>
                  <span className={`status-badge ${getStatusClass(booking.status)}`}>
                    {booking.status}
                  </span>
                </div>

                <div className="booking-details">
                  <div className="detail-row">
                    <span className="detail-label">Guest:</span>
                    <span className="detail-value">{booking.traveler_name}</span>
                  </div>

                  <div className="detail-row">
                    <span className="detail-label">Email:</span>
                    <span className="detail-value">{booking.traveler_email}</span>
                  </div>

                  {booking.traveler_phone && (
                    <div className="detail-row">
                      <span className="detail-label">Phone:</span>
                      <span className="detail-value">{booking.traveler_phone}</span>
                    </div>
                  )}

                  <div className="detail-row">
                    <span className="detail-label">Check-in:</span>
                    <span className="detail-value">{formatDate(booking.start_date)}</span>
                  </div>

                  <div className="detail-row">
                    <span className="detail-label">Check-out:</span>
                    <span className="detail-value">{formatDate(booking.end_date)}</span>
                  </div>

                  <div className="detail-row">
                    <span className="detail-label">Guests:</span>
                    <span className="detail-value">{booking.num_guests}</span>
                  </div>

                  <div className="detail-row">
                    <span className="detail-label">Total Price:</span>
                    <span className="detail-value price">${booking.total_price}</span>
                  </div>

                  {activeTab === 'accepted' && (
                    <div className="detail-row">
                      <span className="detail-label">Accepted on:</span>
                      <span className="detail-value">{formatDate(booking.accepted_at)}</span>
                    </div>
                  )}

                  {activeTab === 'cancelled' && (
                    <div className="detail-row">
                      <span className="detail-label">Cancelled on:</span>
                      <span className="detail-value">{formatDate(booking.cancelled_at)}</span>
                    </div>
                  )}

                  {booking.special_requests && (
                    <div className="detail-row special-requests">
                      <span className="detail-label">Special Requests:</span>
                      <span className="detail-value">{booking.special_requests}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="pagination">
              <button
                className="pagination-btn"
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
              >
                Previous
              </button>

              <span className="pagination-info">
                Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
              </span>

              <button
                className="pagination-btn"
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default OwnerBookings;