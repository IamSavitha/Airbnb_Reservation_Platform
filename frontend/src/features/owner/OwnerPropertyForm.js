import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';

// Property type options
const PROPERTY_TYPES = [
  'Apartment',
  'House',
  'Villa',
  'Condo',
  'Townhouse',
  'Cottage',
  'Cabin',
  'Loft',
  'Studio',
  'Other'
];

// Common amenities
const AMENITIES_OPTIONS = [
  'WiFi',
  'Kitchen',
  'Washer',
  'Dryer',
  'Air Conditioning',
  'Heating',
  'TV',
  'Parking',
  'Pool',
  'Hot Tub',
  'Gym',
  'Workspace',
  'Fireplace',
  'BBQ Grill',
  'Balcony',
  'Garden'
];

function OwnerPropertyForm() {
  const params = useParams();
  const navigate = useNavigate();

  // Support both 'id' and 'propertyId' parameter names
  const propertyId = params.propertyId || params.id;
  const isEdit = Boolean(propertyId);

  const [form, setForm] = useState({
    name: '',
    type: '',
    location: '',
    city: '',
    state: '',
    country: '',
    price: '',
    bedrooms: 1,
    bathrooms: 1,
    maxGuests: 1,
    imageUrl: '',
    description: '',
    amenities: [],
    availableFrom: '',
    availableTo: '',
  });

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newImage, setNewImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (isEdit) {
      fetchProperty();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyId, isEdit]);

  const fetchProperty = async () => {
    console.log('Fetching property with ID:', propertyId);
    setLoading(true);
    try {
      const res = await api.get(`/owner/properties/${propertyId}`);
      console.log('Property data received:', res.data);
      // Backend may return { property: {...} } or just {...}
      const property = res.data.property || res.data;
      
      // Parse amenities if it's a JSON string
      let amenitiesArray = [];
      if (property.amenities) {
        if (typeof property.amenities === 'string') {
          try {
            amenitiesArray = JSON.parse(property.amenities);
          } catch (e) {
            amenitiesArray = property.amenities.split(',').map(a => a.trim());
          }
        } else if (Array.isArray(property.amenities)) {
          amenitiesArray = property.amenities;
        }
      }

      // Parse dates if needed
      const formatDate = (dateValue) => {
        if (!dateValue) return '';
        const date = new Date(dateValue);
        return date.toISOString().split('T')[0];
      };

      const formData = {
        name: property.name || property.title || '',
        type: property.type || '',
        location: property.location || '',
        city: property.city || '',
        state: property.state || '',
        country: property.country || '',
        price: property.price || property.price_per_night || '',
        bedrooms: property.bedrooms || 1,
        bathrooms: property.bathrooms || 1,
        maxGuests: property.maxGuests || property.max_guests || 1,
        imageUrl: property.imageUrl || property.image_url || '',
        description: property.description || '',
        amenities: amenitiesArray,
        availableFrom: formatDate(property.availableFrom || property.available_from),
        availableTo: formatDate(property.availableTo || property.available_to),
      };

      console.log('Form data after parsing:', formData);
      setForm(formData);
    } catch (err) {
      console.error('Failed to load property:', err);
      alert('Failed to load property: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (form.bedrooms < 1 || form.bathrooms < 1 || form.maxGuests < 1) {
      alert('Bedrooms, bathrooms, and max guests must be at least 1.');
      return;
    }

    if (form.price < 0) {
      alert('Price cannot be negative.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...form,
        amenities: JSON.stringify(form.amenities), // Send as JSON string
      };

      console.log('Submitting payload:', payload);

      if (isEdit) {
        await api.put(`/owner/properties/${propertyId}`, payload);
        alert('Property updated successfully!');
      } else {
        await api.post('/owner/properties', payload);
        alert('Property created successfully!');
      }
      navigate('/owner/properties');
    } catch (err) {
      console.error('Error saving property:', err);
      alert('Error saving property: ' + (err.response?.data?.error || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  // Handle amenity checkbox toggle
  const handleAmenityToggle = (amenity) => {
    setForm(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity]
    }));
  };

  // Handle image file selection
  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file.');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('Image size must be less than 2MB.');
      return;
    }

    setNewImage(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // Handle image upload
  const handleImageUpload = async () => {
    if (!newImage) {
      alert('Please select an image first.');
      return;
    }

    if (!isEdit) {
      alert('Please save the property first before uploading an image.');
      return;
    }

    setUploading(true);

    try {
      // Convert image to base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Image = reader.result;

        try {
          const res = await api.post(`/owner/properties/${propertyId}/image`, {
            imageData: base64Image
          });

          if (res.data.success) {
            // Update form with new image
            setForm((prev) => ({
              ...prev,
              imageUrl: res.data.imageUrl
            }));
            setNewImage(null);
            setImagePreview(null);

            // Clear the file input
            const fileInput = document.getElementById('propertyImageUpload');
            if (fileInput) fileInput.value = '';

            alert('Image uploaded successfully.');
          }
        } catch (err) {
          console.error('Image upload failed:', err);
          alert('Image upload failed: ' + (err.response?.data?.error || err.message));
        } finally {
          setUploading(false);
        }
      };

      reader.onerror = () => {
        alert('Failed to read image file.');
        setUploading(false);
      };

      reader.readAsDataURL(newImage);
    } catch (err) {
      console.error('Image processing failed:', err);
      alert('Failed to process image.');
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <main className="container mt-5">
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2">Loading property...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="container mt-5" style={{ maxWidth: '800px' }}>
      <h2 className="text-center mb-4">
        {isEdit ? 'Edit Property' : 'Add New Property'}
      </h2>
      
      <form onSubmit={handleSubmit} className="border p-4 rounded shadow-sm">
        {/* Basic Information */}
        <h5 className="mb-3">Basic Information</h5>
        
        {/* Property Name */}
        <div className="mb-3">
          <label className="form-label">
            Property Name <span className="text-danger">*</span>
          </label>
          <input
            type="text"
            className="form-control"
            placeholder="e.g., Cozy Downtown Apartment"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </div>

        {/* Property Type */}
        <div className="mb-3">
          <label className="form-label">
            Property Type <span className="text-danger">*</span>
          </label>
          <select
            className="form-select"
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
            required
          >
            <option value="">Select property type</option>
            {PROPERTY_TYPES.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        {/* Description */}
        <div className="mb-3">
          <label className="form-label">Description</label>
          <textarea
            className="form-control"
            rows="4"
            placeholder="Describe your property..."
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>

        {/* Location Section */}
        <h5 className="mb-3 mt-4">Location</h5>
        
        <div className="row">
          <div className="col-md-6 mb-3">
            <label className="form-label">
              City <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g., San Francisco"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              required
            />
          </div>
          <div className="col-md-6 mb-3">
            <label className="form-label">State (Abbreviated)</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g., CA"
              maxLength="2"
              value={form.state}
              onChange={(e) => setForm({ ...form, state: e.target.value.toUpperCase() })}
            />
          </div>
        </div>

        <div className="row">
          <div className="col-md-6 mb-3">
            <label className="form-label">Country</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g., United States"
              value={form.country}
              onChange={(e) => setForm({ ...form, country: e.target.value })}
            />
          </div>
          <div className="col-md-6 mb-3">
            <label className="form-label">Full Address/Location</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g., 123 Main St"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
            />
          </div>
        </div>

        {/* Property Details */}
        <h5 className="mb-3 mt-4">Property Details</h5>
        
        <div className="row">
          <div className="col-md-3 mb-3">
            <label className="form-label">
              Bedrooms <span className="text-danger">*</span>
            </label>
            <input
              type="number"
              className="form-control"
              min="1"
              value={form.bedrooms}
              onChange={(e) => setForm({ ...form, bedrooms: parseInt(e.target.value) || 1 })}
              required
            />
          </div>
          <div className="col-md-3 mb-3">
            <label className="form-label">
              Bathrooms <span className="text-danger">*</span>
            </label>
            <input
              type="number"
              className="form-control"
              min="1"
              step="0.5"
              value={form.bathrooms}
              onChange={(e) => setForm({ ...form, bathrooms: parseFloat(e.target.value) || 1 })}
              required
            />
          </div>
          <div className="col-md-3 mb-3">
            <label className="form-label">
              Max Guests <span className="text-danger">*</span>
            </label>
            <input
              type="number"
              className="form-control"
              min="1"
              value={form.maxGuests}
              onChange={(e) => setForm({ ...form, maxGuests: parseInt(e.target.value) || 1 })}
              required
            />
          </div>
          <div className="col-md-3 mb-3">
            <label className="form-label">
              Price per Night ($) <span className="text-danger">*</span>
            </label>
            <input
              type="number"
              className="form-control"
              min="0"
              step="0.01"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              required
            />
          </div>
        </div>

        {/* Amenities */}
        <h5 className="mb-3 mt-4">Amenities</h5>
        <div className="row">
          {AMENITIES_OPTIONS.map(amenity => (
            <div className="col-md-4 mb-2" key={amenity}>
              <div className="form-check">
                <input
                  type="checkbox"
                  className="form-check-input"
                  id={`amenity-${amenity}`}
                  checked={form.amenities.includes(amenity)}
                  onChange={() => handleAmenityToggle(amenity)}
                />
                <label className="form-check-label" htmlFor={`amenity-${amenity}`}>
                  {amenity}
                </label>
              </div>
            </div>
          ))}
        </div>

        {/* Availability */}
        <h5 className="mb-3 mt-4">Availability</h5>
        <div className="row">
          <div className="col-md-6 mb-3">
            <label className="form-label">Available From</label>
            <input
              type="date"
              className="form-control"
              value={form.availableFrom}
              onChange={(e) => setForm({ ...form, availableFrom: e.target.value })}
            />
          </div>
          <div className="col-md-6 mb-3">
            <label className="form-label">Available To</label>
            <input
              type="date"
              className="form-control"
              value={form.availableTo}
              onChange={(e) => setForm({ ...form, availableTo: e.target.value })}
              min={form.availableFrom}
            />
          </div>
        </div>

        {/* Property Images */}
        <h5 className="mb-3 mt-4">Property Images</h5>

        {/* Current Image */}
        {form.imageUrl && (
          <div className="mb-3">
            <label className="form-label">Current Image</label>
            <div>
              <img
                src={form.imageUrl}
                alt="Property preview"
                className="img-thumbnail"
                style={{ maxWidth: '300px', maxHeight: '200px' }}
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            </div>
          </div>
        )}

        {/* Image Upload Section */}
        {isEdit && (
          <div className="mb-3">
            <label className="form-label">Upload New Image</label>

            {/* Image Preview */}
            {imagePreview && (
              <div className="mb-3">
                <p className="text-muted mb-2">Preview:</p>
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="img-thumbnail"
                  style={{ maxWidth: '300px', maxHeight: '200px' }}
                />
              </div>
            )}

            <input
              type="file"
              id="propertyImageUpload"
              className="form-control"
              accept="image/*"
              onChange={handleImageSelect}
              disabled={uploading}
            />
            <small className="form-text text-muted">
              Maximum file size: 2MB. Supported formats: JPEG, PNG, GIF, WebP
            </small>

            <button
              type="button"
              className="btn btn-primary mt-2"
              onClick={handleImageUpload}
              disabled={!newImage || uploading}
            >
              {uploading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Uploading...
                </>
              ) : (
                'Upload Image'
              )}
            </button>
          </div>
        )}

        {/* Image URL (fallback) */}
        <div className="mb-3">
          <label className="form-label">Or enter Image URL</label>
          <input
            type="text"
            className="form-control"
            placeholder="https://example.com/image.jpg"
            value={form.imageUrl}
            onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
          />
          <small className="form-text text-muted">
            You can paste a URL to an image instead of uploading
          </small>
        </div>

        {/* Submit Button */}
        <div className="d-flex gap-2 mt-4">
          <button 
            type="submit" 
            className="btn btn-primary flex-grow-1"
            disabled={submitting}
          >
            {submitting ? 'Saving...' : (isEdit ? 'Update Property' : 'Create Property')}
          </button>
          <button 
            type="button" 
            className="btn btn-secondary"
            onClick={() => navigate('/owner/properties')}
          >
            Cancel
          </button>
        </div>
      </form>
    </main>
  );
}

export default OwnerPropertyForm;
