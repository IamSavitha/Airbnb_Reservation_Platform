const mongoose = require('mongoose');

// Same URL the session store in server.js uses, so app data and sessions share one database.
const buildMongoUrl = () =>
  process.env.MONGO_URL ||
  `mongodb://${process.env.MONGO_USER || 'admin'}:${process.env.MONGO_PASSWORD || 'mongopassword'}@${process.env.MONGO_HOST || 'mongodb-service'}:27017/${process.env.MONGO_DB || 'airbnb_db'}?authSource=admin`;

const connectDB = async () => {
  const url = buildMongoUrl();
  try {
    await mongoose.connect(url, { serverSelectionTimeoutMS: 10000 });
    console.log(`✅ MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    throw error;
  }

  mongoose.connection.on('disconnected', () => console.warn('⚠️  MongoDB disconnected'));
  mongoose.connection.on('reconnected', () => console.log('✅ MongoDB reconnected'));
  return mongoose.connection;
};

module.exports = connectDB;
module.exports.buildMongoUrl = buildMongoUrl;
