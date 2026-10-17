import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { fetchPropertyById, clearPropertyDetail } from '../../features/property/propertySlice';
import { createBooking, clearSuccessMessage } from '../../features/booking/bookingSlice';
import { addFavorite, removeFavorite, fetchFavorites } from '../../features/booking/bookingSlice';
import AgentButton from '../../components/AgentButton';

function PropertyDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Redux state
  const { propertyDetail: property, loading } = useSelector((state) => state.property);
  const { favorites, loading: bookingLoading, successMessage } = useSelector((state) => state.booking);

  // Local state
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [guests, setGuests] = useState(1);
  const [favoriteLoading, setFavoriteLoading] = useState(false);

  // Fetch property details on mount
  useEffect(() => {
    dispatch(fetchPropertyById(id));
    dispatch(fetchFavorites());
    
    //Clear any previous booking success messages
    dispatch(clearSuccessMessage());
    
    return () => {
      dispatch(clearPropertyDetail());
    };
  }, [dispatch, id]);

  // Redirect to bookings after successful booking
  useEffect(() => {
    if (successMessage === 'Booking created successfully!') {
      setTimeout(() => {
        navigate('/traveler/bookings');
      }, 2000);
    }
  }, [successMessage, navigate]);

  // Check if current property is in favorites
  const isFavorite = favorites.some(
    fav => (fav.propertyId === id || fav._id === id || fav.id === parseInt(id))
  );

  // Handle add/remove favorite
  const handleToggleFavorite = async () => {
    setFavoriteLoading(true);
    try {
      if (isFavorite) {
        await dispatch(removeFavorite(id)).unwrap();
        alert('Removed from favorites!');
      } else {
        await dispatch(addFavorite(id)).unwrap();
        alert('Added to favorites!');
      }
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
      alert('Failed to update favorites. Please try again.');
    } finally {
      setFavoriteLoading(false);
    }
  };

  // Handle booking request
  const handleBooking = async (e) => {
    e.preventDefault();
    
    if (new Date(endDate) <= new Date(startDate)) {
      alert('End date must be after start date.');
      return;
    }

    const totalInfo = calculateTotal();
    if (!totalInfo) {
      alert('Please select valid dates.');
      return;
    }

    try {
      await dispatch(createBooking({
        propertyId: id,
        startDate: startDate,
        endDate: endDate,
        numGuests: parseInt(guests),
      })).unwrap();
      
      alert('Booking request submitted successfully!');
    } catch (err) {
      console.error('Booking failed:', err);
      alert(err || 'Booking failed. Please try again.');
    }
  };

  // Calculate total nights and price
  const calculateTotal = () => {
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const nights = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
      if (nights > 0) {
        const pricePerNight = property?.price || property?.price_per_night || property?.pricePerNight || 0;
        return { nights, total: nights * pricePerNight };
      }
    }
    return null;
  };

  const totalInfo = calculateTotal();

  if (loading) {
    return (
      <main className="container mt-5" role="main" aria-busy="true">
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading property...</span>
          </div>
          <p className="mt-2">Loading property...</p>
        </div>
      </main>
    );
  }

  if (!property) {
    return (
      <main className="container mt-5" role="main">
        <div className="alert alert-warning" role="alert">
          <h4 className="alert-heading">Property not found</h4>
          <p>The property you're looking for doesn't exist or has been removed.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="container mt-5" role="main">
      {successMessage && (
        <div className="alert alert-success" role="alert">
          {successMessage}
          {successMessage === 'Booking created successfully!' && ' Redirecting to your bookings...'}
        </div>
      )}

      <nav aria-label="breadcrumb">
        <ol className="breadcrumb">
          <li className="breadcrumb-item"><a href="/traveler/dashboard">Search</a></li>
          <li className="breadcrumb-item active" aria-current="page">
            {property.name || property.title}
          </li>
        </ol>
      </nav>

      <div className="row">
        <div className="col-md-6 mb-4">
          <img
            src={
              property.imageUrl || 
              property.image_url || 
              (property.images && property.images[0]) ||
              'https://via.placeholder.com/600x400?text=Property+Image'
            }
            alt={`${property.name || property.title} - ${property.type || 'Property'} in ${property.location || property.city || 'Location'}`}
            className="img-fluid rounded shadow"
            style={{ width: '100%', height: '400px', objectFit: 'cover' }}
          />
        </div>

        <div className="col-md-6">
          <div className="d-flex justify-content-between align-items-start mb-3">
            <div>
              <h1 className="h2">{property.name || property.title}</h1>
              <p className="text-muted">
                <i className="bi bi-geo-alt-fill"></i> {property.location || property.city}
              </p>
            </div>
            
            <button
              className={`btn ${isFavorite ? 'btn-danger' : 'btn-outline-danger'}`}
              onClick={handleToggleFavorite}
              disabled={favoriteLoading}
              style={{ minWidth: '140px' }}
              aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              aria-pressed={isFavorite}
            >
              {favoriteLoading ? (
                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
              ) : isFavorite ? (
                'Favorited'
              ) : (
                'Add to Favorites'
              )}
            </button>
          </div>

          <p className="lead">{property.description || 'No description available.'}</p>

          <div className="card mb-4">
            <div className="card-body">
              <h2 className="h5 card-title">Property Details</h2>
              <dl className="row mb-0">
                <dt className="col-sm-4">Type:</dt>
                <dd className="col-sm-8">{property.type || 'N/A'}</dd>
                
                <dt className="col-sm-4">Bedrooms:</dt>
                <dd className="col-sm-8">{property.bedrooms || 'N/A'}</dd>
                
                <dt className="col-sm-4">Bathrooms:</dt>
                <dd className="col-sm-8">{property.bathrooms || 'N/A'}</dd>
                
                <dt className="col-sm-4">Max Guests:</dt>
                <dd className="col-sm-8">
                  {property.maxGuests || property.max_guests || property.guests || 'N/A'}
                </dd>
                
                {property.amenities && (
                  <>
                    <dt className="col-sm-4">Amenities:</dt>
                    <dd className="col-sm-8">
                      {(() => {
                        try {
                          if (typeof property.amenities === 'string') {
                            const parsed = JSON.parse(property.amenities);
                            return Array.isArray(parsed) ? parsed.join(', ') : property.amenities;
                          } else if (Array.isArray(property.amenities)) {
                            return property.amenities.join(', ');
                          }
                          return 'N/A';
                        } catch (e) {
                          return property.amenities;
                        }
                      })()}
                    </dd>
                  </>
                )}
              </dl>
            </div>
          </div>

          <p className="h4 text-primary mb-3">
            <span className="visually-hidden">Price:</span>
            ${property.price || property.price_per_night || property.pricePerNight || 0} per night
          </p>
        </div>
      </div>

      <section className="mt-5" aria-labelledby="booking-section">
        <div className="row justify-content-center">
          <div className="col-md-8">
            <div className="card shadow">
              <div className="card-body">
                <h2 id="booking-section" className="h3 card-title mb-4">Request Booking</h2>
                <form onSubmit={handleBooking} aria-label="Property booking form">
                  <div className="row g-3">
                    <div className="col-md-4">
                      <label htmlFor="startDate" className="form-label">Check-in Date</label>
                      <input
                        type="date"
                        id="startDate"
                        className="form-control"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        required
                        aria-required="true"
                      />
                    </div>
                    <div className="col-md-4">
                      <label htmlFor="endDate" className="form-label">Check-out Date</label>
                      <input
                        type="date"
                        id="endDate"
                        className="form-control"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        min={startDate || new Date().toISOString().split('T')[0]}
                        required
                        aria-required="true"
                      />
                    </div>
                    <div className="col-md-4">
                      <label htmlFor="guests" className="form-label">Number of Guests</label>
                      <input
                        type="number"
                        id="guests"
                        className="form-control"
                        min="1"
                        max={property.maxGuests || property.max_guests || property.guests || 10}
                        value={guests}
                        onChange={(e) => setGuests(e.target.value)}
                        required
                        aria-required="true"
                      />
                    </div>
                  </div>

                  {totalInfo && (
                    <div className="alert alert-info mt-3" role="status" aria-live="polite">
                      <strong>Price Summary:</strong><br />
                      ${property.price || property.price_per_night || property.pricePerNight} x {totalInfo.nights} {totalInfo.nights === 1 ? 'night' : 'nights'} = <strong>${totalInfo.total}</strong>
                    </div>
                  )}

                  <div className="text-end mt-3">
                    <button 
                      type="submit" 
                      className="btn btn-success btn-lg"
                      disabled={bookingLoading}
                      aria-busy={bookingLoading}
                    >
                      {bookingLoading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                          Submitting...
                        </>
                      ) : (
                        'Submit Booking Request'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      <AgentButton />
    </main>
  );
}

export default PropertyDetails;

