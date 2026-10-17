import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { fetchBookings, cancelBooking } from '../../features/booking/bookingSlice';
import { connectSocket } from '../../services/socket';

function TravelerBookings() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Redux state
  const { bookings, loading, error } = useSelector((state) => state.booking);
  const { travelerInfo } = useSelector((state) => state.traveler);

  // Fetch bookings on component mount
  useEffect(() => {
    dispatch(fetchBookings());
  }, [dispatch]);

  /// WebSocket connection for real-time updates
  useEffect(() => {
    const travelerId = travelerInfo?.id || travelerInfo?._id;
    
    if (travelerId) {
      // Connect to WebSocket
      const socket = connectSocket(travelerId, 'traveler');

      // Listen for booking status updates directly on socket
      const handleStatusUpdate = (data) => {
        console.log('Received booking status update:', data);
        dispatch(fetchBookings());
      };

      if (socket) {
        socket.on('booking-status-update', handleStatusUpdate);
      }

      // Cleanup on unmount
      return () => {
        if (socket) {
          socket.off('booking-status-update', handleStatusUpdate);
        }
      };
    }
  }, [travelerInfo, dispatch]);

  // Get status badge class
  const getStatusBadge = (status) => {
    const s = status?.toUpperCase();
    switch (s) {
      case 'PENDING':
        return 'bg-warning';
      case 'ACCEPTED':
      case 'CONFIRMED':
        return 'bg-success';
      case 'REJECTED':
      case 'CANCELLED':
        return 'bg-danger';
      case 'COMPLETED':
        return 'bg-info';
      default:
        return 'bg-secondary';
    }
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Calculate nights
  const calculateNights = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return 0;
    const nights = Math.ceil(
      (new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24)
    );
    return nights > 0 ? nights : 0;
  };

  // Handle view property
  const handleViewProperty = (propertyId) => {
    navigate(`/traveler/property/${propertyId}`);
  };

  // Handle cancel booking
  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) {
      return;
    }

    try {
      await dispatch(cancelBooking(bookingId)).unwrap();
      alert('Booking cancelled successfully!');
      // Refresh bookings list
      dispatch(fetchBookings());
    } catch (error) {
      console.error('Cancel booking failed:', error);
      alert(error || 'Failed to cancel booking. Please try again.');
    }
  };

  // Get booking ID (MongoDB uses _id)
  const getBookingId = (booking) => booking._id || booking.id;

  // Check if status is pending (case insensitive)
  const isPending = (status) => status?.toUpperCase() === 'PENDING';

  return (
    <div className="container mt-4">
      {/* Header */}
      <div className="row mb-4">
        <div className="col-12">
          <h2>My Bookings</h2>
          <p className="text-muted">Manage your reservations (Real-time updates enabled)</p>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2">Loading your bookings...</p>
        </div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-5">
          <div className="mb-3">
            <i className="bi bi-calendar-x" style={{ fontSize: '3rem', color: '#ccc' }}></i>
          </div>
          <h4>No bookings yet</h4>
          <p className="text-muted">Start exploring properties to make your first booking!</p>
          <button className="btn btn-primary" onClick={() => navigate('/traveler/dashboard')}>
            Browse Properties
          </button>
        </div>
      ) : (
        <div className="row g-4">
          {bookings.map((booking) => (
            <div key={getBookingId(booking)} className="col-12">
              <div className="card shadow-sm">
                <div className="card-body">
                  <div className="row">
                    {/* Property Image */}
                    <div className="col-md-3">
                      {booking.propertyImage || booking.property_image ? (
                        <img
                          src={booking.propertyImage || booking.property_image}
                          alt={booking.propertyName || booking.property_name || 'Property'}
                          className="img-fluid rounded"
                          style={{ height: '150px', width: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <div
                          className="bg-secondary rounded d-flex align-items-center justify-content-center"
                          style={{ height: '150px' }}
                        >
                          <span className="text-white">No Image</span>
                        </div>
                      )}
                    </div>

                    {/* Booking Details */}
                    <div className="col-md-6">
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <h5 className="mb-0">{booking.propertyName || booking.property_name || 'Property'}</h5>
                        <span className={`badge ${getStatusBadge(booking.status)}`}>
                          {booking.status?.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-muted mb-2">
                        <i className="bi bi-geo-alt"></i> {booking.propertyLocation || booking.property_location || 'Location'}
                      </p>
                      <div className="mb-2">
                        <strong>Check-in:</strong> {formatDate(booking.startDate || booking.start_date)}
                        <br />
                        <strong>Check-out:</strong> {formatDate(booking.endDate || booking.end_date)}
                        <br />
                        <strong>Duration:</strong> {calculateNights(booking.startDate || booking.start_date, booking.endDate || booking.end_date)} nights
                        <br />
                        <strong>Guests:</strong> {booking.num_guests || booking.guests}
                      </div>
                      <p className="mb-0 text-muted small">
                        Booking ID: {getBookingId(booking)}
                      </p>
                    </div>

                    {/* Price and Actions */}
                    <div className="col-md-3 d-flex flex-column justify-content-between">
                      <div>
                        <h4 className="text-primary mb-0">${booking.totalPrice || booking.total_price}</h4>
                        <p className="text-muted small">Total Price</p>
                      </div>
                      <div className="d-grid gap-2">
                        <button
                          className="btn btn-outline-primary btn-sm"
                          onClick={() => handleViewProperty(booking.property_id?._id || booking.property_id || booking.propertyId)}
                        >
                          View Property
                        </button>
                        {/* Cancel button - only show for pending bookings */}
                        {isPending(booking.status) && (
                          <button
                            className="btn btn-outline-danger btn-sm"
                            onClick={() => handleCancelBooking(getBookingId(booking))}
                          >
                            Cancel Booking
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                {isPending(booking.status) && (
                  <div className="card-footer bg-light">
                    <small className="text-muted">
                      <i className="bi bi-clock"></i> Waiting for owner confirmation
                    </small>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default TravelerBookings;