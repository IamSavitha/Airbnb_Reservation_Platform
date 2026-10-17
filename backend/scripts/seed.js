// Seed demo data: 2 owners, 2 travelers, 8 listings, a few bookings in every status.
// Usage: MONGO_URL=... node scripts/seed.js   (add --reset to wipe the collections first)
require('dotenv').config();
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const connectDB = require('../config/mongodb');
const Owner = require('../models/Owner');
const Traveler = require('../models/Traveler');
const Property = require('../models/Property');
const Booking = require('../models/Booking');
const Favorite = require('../models/Favorite');

const DEMO_PASSWORD = 'demo1234';

const day = (offset) => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + offset);
  return d;
};

const LISTINGS = [
  ['Sunny Loft near SoFA', 'Apartment', 'San Jose', 'CA', 'USA', 145, 1, 1, 2, 'photo-1502672260266-1c1ef2d93688'],
  ['Willow Glen Craftsman', 'House', 'San Jose', 'CA', 'USA', 260, 3, 2, 6, 'photo-1568605114967-8130f3a36994'],
  ['Mission District Studio', 'Studio', 'San Francisco', 'CA', 'USA', 189, 1, 1, 2, 'photo-1522708323590-d24dbb6b0267'],
  ['Pacific Heights Flat', 'Apartment', 'San Francisco', 'CA', 'USA', 310, 2, 2, 4, 'photo-1493809842364-78817add7ffb'],
  ['Santa Cruz Beach Cottage', 'Cottage', 'Santa Cruz', 'CA', 'USA', 275, 2, 1, 4, 'photo-1499793983690-e29da59ef1c2'],
  ['Tahoe Lakeview Cabin', 'Cabin', 'South Lake Tahoe', 'CA', 'USA', 340, 3, 2, 8, 'photo-1449158743715-0a90ebb6d2d8'],
  ['Pearl District Loft', 'Apartment', 'Portland', 'OR', 'USA', 165, 1, 1, 3, 'photo-1505691938895-1758d7feb511'],
  ['Capitol Hill Townhouse', 'House', 'Seattle', 'WA', 'USA', 230, 3, 2, 5, 'photo-1570129477492-45c003edd2be'],
];

const AMENITIES = ['wifi', 'kitchen', 'washer', 'free parking', 'air conditioning', 'workspace'];

(async () => {
  await connectDB();
  if (process.argv.includes('--reset')) {
    await Promise.all([Owner, Traveler, Property, Booking, Favorite].map((M) => M.deleteMany({})));
    console.log('🧹 Collections cleared');
  }

  const password = await bcrypt.hash(DEMO_PASSWORD, 10);
  const upsert = (Model, email, doc) =>
    Model.findOneAndUpdate({ email }, { $setOnInsert: { ...doc, email, password } }, { upsert: true, new: true });

  const owners = await Promise.all([
    upsert(Owner, 'host@demo.dev', { name: 'Maya Host', location: 'San Jose, CA', phone: '408-555-0101' }),
    upsert(Owner, 'host2@demo.dev', { name: 'Leo Host', location: 'Seattle, WA', phone: '206-555-0102' }),
  ]);
  const travelers = await Promise.all([
    upsert(Traveler, 'guest@demo.dev', { name: 'Ava Guest', city: 'Austin', state: 'TX', country: 'USA' }),
    upsert(Traveler, 'guest2@demo.dev', { name: 'Noah Guest', city: 'Denver', state: 'CO', country: 'USA' }),
  ]);

  const properties = [];
  for (const [i, [name, type, city, state, country, price, bedrooms, bathrooms, maxGuests, photo]] of LISTINGS.entries()) {
    const owner = owners[i < 6 ? 0 : 1];
    const property = await Property.findOneAndUpdate(
      { name, owner_id: owner._id },
      {
        $setOnInsert: {
          owner_id: owner._id, name, type, city, state, country,
          location: `${city}, ${state}`,
          price, bedrooms, bathrooms, max_guests: maxGuests,
          image_url: `https://images.unsplash.com/${photo}?auto=format&fit=crop&w=800&q=70`,
          description: `${type} in ${city} with ${bedrooms} bedroom${bedrooms > 1 ? 's' : ''}, sleeps ${maxGuests}.`,
          amenities: JSON.stringify(AMENITIES.slice(0, 3 + (i % 4))),
          available_from: day(-60),
          available_to: day(365),
        },
      },
      { upsert: true, new: true }
    );
    properties.push(property);
  }

  if ((await Booking.countDocuments()) === 0) {
    const nights = (a, b) => Math.round((b - a) / 86400000);
    const mk = (p, t, start, end, status, extra = {}) => ({
      property_id: p._id, traveler_id: t._id, start_date: day(start), end_date: day(end),
      num_guests: 2, total_price: p.price * nights(day(start), day(end)), status, ...extra,
    });
    await Booking.insertMany([
      mk(properties[0], travelers[0], 14, 17, 'PENDING', { special_requests: 'Arriving late, around 10pm' }),
      mk(properties[1], travelers[1], 21, 25, 'PENDING'),
      mk(properties[2], travelers[0], 30, 33, 'ACCEPTED', { accepted_at: new Date() }),
      mk(properties[4], travelers[0], -20, -16, 'COMPLETED', { accepted_at: day(-40) }),
      mk(properties[3], travelers[1], 40, 42, 'CANCELLED', { cancelled_at: new Date() }),
    ]);
    await Favorite.insertMany([
      { traveler_id: travelers[0]._id, property_id: properties[5]._id },
      { traveler_id: travelers[0]._id, property_id: properties[3]._id },
    ]);
  }

  console.log(`✅ Seeded ${owners.length} owners, ${travelers.length} travelers, ${properties.length} listings`);
  console.log(`   Owner login:    host@demo.dev / ${DEMO_PASSWORD}`);
  console.log(`   Traveler login: guest@demo.dev / ${DEMO_PASSWORD}`);
  await mongoose.disconnect();
})().catch(async (error) => {
  console.error('❌ Seed failed:', error);
  await mongoose.disconnect();
  process.exit(1);
});
