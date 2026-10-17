const mongoose = require('mongoose');

const travelerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true }, // bcrypt hash
    phone: { type: String, default: null },
    profile_picture: { type: String, default: null }, // URL or base64 data URI
    city: { type: String, default: null },
    state: { type: String, default: null, maxlength: 2 },
    country: { type: String, default: null },
    about: { type: String, default: null },
    languages: { type: String, default: null },
    gender: { type: String, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

module.exports = mongoose.model('Traveler', travelerSchema);
