const mongoose = require('mongoose');

const ownerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true }, // bcrypt hash
    location: { type: String, default: null },
    phone: { type: String, default: null },
    profile_picture: { type: String, default: null },
    about: { type: String, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

module.exports = mongoose.model('Owner', ownerSchema);
