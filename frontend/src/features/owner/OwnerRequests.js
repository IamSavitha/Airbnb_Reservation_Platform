import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';
import './OwnerRequests.css';
import { connectSocket } from '../../services/socket';
import { API_ORIGIN } from '../../config';

const OwnerRequests = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState({});
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });
  const { token, ownerInfo } = useSelector((state) => state.owner);

  useEffect(() => {
    fetchRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page]);

  // WebSocket connection for real-time updates
  useEffect(() => {
    const ownerId = ownerInfo?.id || ownerInfo?._id;
    
    if (ownerId) {
      const socket = connectSocket(ownerId, 'owner');

      if (socket) {
        // Listen for new booking requests
        const handleNewBooking = (data) => {
          console.log('Received new booking request:', data);
          fetchRequests();
        };

        socket.on('new-booking-request', handleNewBooking);

        return () => {
          socket.off('new-booking-request', handleNewBooking);
        };
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerInfo]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${API_ORIGIN}/api/bookings/owner/requests?page=${pagination.page}&limit=${pagination.limit}`,
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
      console.error('Error fetching requests:', err);
      setError(err.response?.data?.message || 'Failed to fetch booking requests');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptBooking = async (bookingId) => {
    try {
      setActionLoading(prev => ({ ...prev, [bookingId]: 'accepting' }));

      const response = await axios.put(
        `${API_ORIGIN}/api/bookings/owner/${bookingId}/accept`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        // Remove from list since it's no longer PENDING
        setBookings(prevBookings => prevBookings.filter(b => b._id !== bookingId));

        let message = 'Booking accepted successfully!';
        if (response.data.cancelledBookings > 0) {
          message += `\n${response.data.cancelledBookings} overlapping booking(s) were automatically cancelled.`;
        }
        alert(message);

        // Refresh to update pagination
        fetchRequests();
      }
    } catch (err) {
      console.error('Error accepting booking:', err);
      alert(err.response?.data?.message || 'Failed to accept booking');
    } finally {
      setActionLoading(prev => ({ ...prev, [bookingId]: null }));
    }
  };

  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this booking request?')) {
      return;
    }

    try {
      setActionLoading(prev => ({ ...prev, [bookingId]: 'cancelling' }));

      const response = await axios.put(
        `${API_ORIGIN}/api/bookings/owner/${bookingId}/cancel`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        // Remove from list since it's no longer PENDING
        setBookings(prevBookings => prevBookings.filter(b => b._id !== bookingId));
        alert('Booking request cancelled successfully!');

        // Refresh to update pagination
        fetchRequests();
      }
    } catch (err) {
      console.error('Error cancelling booking:', err);
      alert(err.response?.data?.message || 'Failed to cancel booking');
    } finally {
      setActionLoading(prev => ({ ...prev, [bookingId]: null }));
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

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination(prev => ({ ...prev, page: newPage }));
    }
  };

  if (loading && bookings.length === 0) {
    return (
      <div className="owner-requests-container">
        <div className="loading">Loading booking requests...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="owner-requests-container">
        <div className="error-message">{error}</div>
      </div>
    );
  }

  return (
    <div className="owner-requests-container">
      <h1>Booking Requests</h1>
      <p className="subtitle">Pending booking requests for your properties (Real-time updates enabled)</p>

      {bookings.length === 0 ? (
        <div className="no-bookings">
          <p>No pending booking requests at the moment.</p>
        </div>
      ) : (
        <>
          <div className="bookings-list">
            {bookings.map((booking) => (
              <div key={booking._id} className="booking-card">
                <div className="booking-header">
                  <h3>{booking.property_name}</h3>
                  <span className="status-badge status-pending">
                    PENDING
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

                  <div className="detail-row">
                    <span className="detail-label">Requested on:</span>
                    <span className="detail-value">{formatDate(booking.created_at)}</span>
                  </div>

                  {booking.special_requests && (
                    <div className="detail-row special-requests">
                      <span className="detail-label">Special Requests:</span>
                      <span className="detail-value">{booking.special_requests}</span>
                    </div>
                  )}
                </div>

                <div className="booking-actions">
                  <button
                    className="btn btn-accept"
                    onClick={() => handleAcceptBooking(booking._id)}
                    disabled={actionLoading[booking._id]}
                  >
                    {actionLoading[booking._id] === 'accepting' ? 'Processing...' : 'Accept'}
                  </button>
                  <button
                    className="btn btn-cancel"
                    onClick={() => handleCancelBooking(booking._id)}
                    disabled={actionLoading[booking._id]}
                  >
                    {actionLoading[booking._id] === 'cancelling' ? 'Processing...' : 'Cancel'}
                  </button>
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

export default OwnerRequests;