import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { addFavorite, removeFavorite } from '../features/booking/bookingSlice';
import '../styles/components/PropertyCard.css';

// Property Card Component - displays property information in search results
function PropertyCard({ property }) {
  const dispatch = useDispatch();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Get favorites from Redux
  const { favorites } = useSelector((state) => state.booking);

  // Handle both MongoDB (_id) and MySQL (id) formats
  const propertyId = property._id || property.id;

  // Check if current property is in favorites
  const isFavorite = favorites.some(
    fav => {
      const favId = fav.propertyId || fav.property_id || fav.id;
      return parseInt(favId) === parseInt(propertyId);
    }
  );

  // Handle both naming conventions (camelCase and snake_case)
  const title = property.title || property.name;
  const location = property.location || `${property.city || ''}, ${property.country || ''}`.trim();
  const price = property.pricePerNight || property.price_per_night || property.price;
  const guests = property.guests || property.maxGuests || property.max_guests;
  const bedrooms = property.bedrooms;
  const bathrooms = property.bathrooms;
  const description = property.description;
  const type = property.type;

  // Handle both image formats (array or single URL)
  const imageUrl = property.images && property.images.length > 0
    ? property.images[0]
    : property.imageUrl || property.image_url || 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&q=80';

  const handleFavoriteClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isProcessing) return;
    
    setIsProcessing(true);
    try {
      if (isFavorite) {
        await dispatch(removeFavorite(propertyId)).unwrap();
      } else {
        await dispatch(addFavorite(propertyId)).unwrap();
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
      alert('Failed to update favorites. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Link to={`/traveler/property/${propertyId}`} className="property-card-link">
      <div className="property-card animate-fadeInUp">
        {/* Property Image Container */}
        <div className="property-card-image-wrapper">
          {!imageLoaded && (
            <div className="property-card-skeleton"></div>
          )}
          <img
            src={imageUrl}
            className={`property-card-image ${imageLoaded ? 'loaded' : ''}`}
            alt={title}
            onLoad={() => setImageLoaded(true)}
            onError={(e) => {
              e.target.src = 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&q=80';
              setImageLoaded(true);
            }}
          />

          {/* Favorite Heart Button */}
          <button
            className={`property-card-heart ${isFavorite ? 'active' : ''}`}
            onClick={handleFavoriteClick}
            disabled={isProcessing}
            aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            {isProcessing ? (
              <svg className="spinner" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                <circle cx="16" cy="16" r="14" fill="none" stroke="currentColor" strokeWidth="3" />
              </svg>
            ) : (
              <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                <path d="M16 28c7-4.73 14-10 14-17a6.98 6.98 0 0 0-7-7c-1.8 0-3.58.68-4.95 2.05L16 8.1l-2.05-2.05a6.98 6.98 0 0 0-9.9 0A6.98 6.98 0 0 0 2 11c0 7 7 12.27 14 17z"/>
              </svg>
            )}
          </button>

          {/* Property Type Badge */}
          {type && (
            <div className="property-card-badge">{type}</div>
          )}
        </div>

        {/* Property Card Content */}
        <div className="property-card-content">
          {/* Location & Rating */}
          <div className="property-card-header">
            <div className="property-card-location">{location}</div>
            <div className="property-card-rating">
              <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                <path d="M15.094 1.579l-4.124 8.885-9.86 1.27a1 1 0 0 0-.542 1.736l7.293 6.565-1.965 9.852a1 1 0 0 0 1.483 1.061L16 25.951l8.625 4.997a1 1 0 0 0 1.482-1.06l-1.965-9.853 7.293-6.565a1 1 0 0 0-.541-1.735l-9.86-1.271-4.127-8.885a1 1 0 0 0-1.814 0z"/>
              </svg>
              <span>{property.rating || '4.9'}</span>
            </div>
          </div>

          {/* Property Title */}
          <h3 className="property-card-title">{title}</h3>

          {/* Property Details */}
          <div className="property-card-details">
            {guests && (
              <span className="property-card-detail-item">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4zm-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10c-2.29 0-3.516.68-4.168 1.332-.678.678-.83 1.418-.832 1.664h10z"/>
                </svg>
                {guests} guests
              </span>
            )}
            {bedrooms && (
              <span className="property-card-detail-item">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M3 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"/>
                  <path d="M2.5 3A1.5 1.5 0 0 0 1 4.5V6h14V4.5A1.5 1.5 0 0 0 13.5 3h-11zM15 7H1v5.5A1.5 1.5 0 0 0 2.5 14h11a1.5 1.5 0 0 0 1.5-1.5V7z"/>
                </svg>
                {bedrooms} bed{bedrooms !== 1 ? 's' : ''}
              </span>
            )}
            {bathrooms && (
              <span className="property-card-detail-item">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M4 1a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V1zm1 0v3h6V1H5z"/>
                  <path d="M0 6a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H1a1 1 0 0 1-1-1V6zm1 0v7h14V6H1z"/>
                </svg>
                {bathrooms} bath{bathrooms !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* Description */}
          {description && (
            <p className="property-card-description">
              {description}
            </p>
          )}

          {/* Price */}
          <div className="property-card-footer">
            <div className="property-card-price">
              <strong>${price}</strong>
              <span> / night</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default PropertyCard;
