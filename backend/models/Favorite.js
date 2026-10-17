const mongoose = require('mongoose');

const favoriteSchema = new mongoose.Schema(
  {
    traveler_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Traveler', required: true },
    property_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

// A traveler can favorite a property once.
favoriteSchema.index({ traveler_id: 1, property_id: 1 }, { unique: true });

module.exports = mongoose.model('Favorite', favoriteSchema);
