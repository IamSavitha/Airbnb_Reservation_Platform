const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema(
  {
    owner_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Owner', required: true, index: true },
    name: { type: String, required: true, trim: true },
    type: { type: String, required: true },
    location: { type: String, default: null },
    city: { type: String, required: true },
    state: { type: String, default: null },
    country: { type: String, required: true },
    price: { type: Number, required: true, min: 0 }, // per night
    bedrooms: { type: Number, required: true, min: 0 },
    bathrooms: { type: Number, required: true, min: 0 },
    max_guests: { type: Number, required: true, min: 1 },
    image_url: { type: String, default: null },
    description: { type: String, default: '' },
    amenities: { type: String, default: '[]' }, // JSON-encoded array, parsed by the frontend
    available_from: { type: Date, default: null },
    available_to: { type: Date, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// Search filters on city / country / location text and guest count.
propertySchema.index({ city: 1, country: 1 });
propertySchema.index({ max_guests: 1 });

module.exports = mongoose.model('Property', propertySchema);
