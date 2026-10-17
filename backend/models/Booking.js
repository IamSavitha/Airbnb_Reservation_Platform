const mongoose = require('mongoose');

const BOOKING_STATUSES = ['PENDING', 'ACCEPTED', 'CANCELLED', 'COMPLETED'];

const bookingSchema = new mongoose.Schema(
  {
    property_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true, index: true },
    traveler_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Traveler', required: true, index: true },
    start_date: { type: Date, required: true },
    end_date: { type: Date, required: true },
    num_guests: { type: Number, required: true, min: 1 },
    total_price: { type: Number, required: true, min: 0 },
    special_requests: { type: String, default: null },
    status: { type: String, enum: BOOKING_STATUSES, default: 'PENDING', index: true },
    accepted_at: { type: Date, default: null },
    cancelled_at: { type: Date, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// Overlap checks query by property + status + date range.
bookingSchema.index({ property_id: 1, status: 1, start_date: 1, end_date: 1 });

module.exports = mongoose.model('Booking', bookingSchema);
module.exports.BOOKING_STATUSES = BOOKING_STATUSES;
