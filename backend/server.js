const express = require('express');
const http = require('http');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const cors = require('cors');
require('dotenv').config();

// Kafka setup
const { initProducer, initConsumers, disconnectKafka } = require('./config/kafka');
const { startAllConsumers } = require('./kafka/consumers');

// MongoDB connection
const connectDB = require('./config/mongodb');
const { initSocket } = require('./config/socket');
const { allowedOrigins } = require('./config/origins');

const app = express();
const server = http.createServer(app);

// Import routes - only the ones that exist
const travelerRoutes = require('./routes/travelerRoutes');
const ownerRoutes = require('./routes/ownerRoutes');
const propertyRoutes = require('./routes/propertyRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const favoriteRoutes = require('./routes/favoriteRoutes');
const ownerPropertyRoutes = require('./routes/ownerPropertyRoutes');


// swaggerUi
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: { title: 'Airbnb Prototype API', version: '1.0.0' },
    servers: [{ url: 'http://localhost:4000' }]
  },
  apis: ['./routes/*.js'], // add JSDoc comments in route files
});

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));


// Middleware - ORDER MATTERS!
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS Configuration - MUST BE BEFORE ROUTES
app.use(cors({
  origin: allowedOrigins, // from CORS_ORIGINS (comma-separated)
  credentials: true, // Allow cookies
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Cookie', 'Authorization']
}));

// MongoDB URL for sessions (same database now)
const MONGO_URL = process.env.MONGO_URL || 
  `mongodb://${process.env.MONGO_USER || 'admin'}:${process.env.MONGO_PASSWORD || 'mongopassword'}@${process.env.MONGO_HOST || 'mongodb-service'}:27017/${process.env.MONGO_DB || 'airbnb_db'}?authSource=admin`;

// Session Configuration with MongoDB - MUST BE BEFORE ROUTES
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: MONGO_URL,
    ttl: 24 * 60 * 60, // 1 day in seconds
    touchAfter: 24 * 3600
    }),
  cookie: {
    secure: false, // Set to true in production with HTTPS
    httpOnly: true, // Prevents client-side JavaScript from accessing cookie
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'lax' // CSRF protection
  }
}));

// Optional: serve the built React app from the same origin (single-container deploys).
// Set FRONTEND_DIR to the frontend build folder; API routes keep priority.
const path = require('path');
const FRONTEND_DIR = process.env.FRONTEND_DIR ? path.resolve(process.env.FRONTEND_DIR) : null;
if (FRONTEND_DIR) {
  app.use(express.static(FRONTEND_DIR));
}

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'Airbnb API Server',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      traveler: '/api/traveler/*',
      owner: '/api/owner/*',
      properties: '/api/properties/*',
      bookings: '/api/bookings/*',
      favorites: '/api/favorites/*'
    }
  });
});

// Health check route
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// API Routes - Only include existing routes
app.use('/api/traveler', travelerRoutes);
app.use('/api/owner', ownerRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/favorites', favoriteRoutes);

app.use('/api/owner/properties', ownerPropertyRoutes);



// Client-side routes fall back to index.html when the frontend is served from here.
if (FRONTEND_DIR) {
  app.get(/^\/(?!api\/|api$|health$|socket\.io\/).*/, (req, res) => {
    res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
  });
}

// 404 handler - AFTER all routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    requestedPath: req.path,
    method: req.method
  });
});

// Error handler - MUST BE LAST
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Initialize MongoDB, Kafka and start server
const PORT = process.env.PORT || 4000;

const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Initialize WebSocket
    initSocket(server);

    // Initialize Kafka producer
    await initProducer();

    // Initialize Kafka consumers
    await initConsumers();

    // Start all consumer listeners
    await startAllConsumers();

    // Start Express server
    server.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(` Health check: http://localhost:${PORT}/health`);
      console.log('✅ Kafka integration initialized successfully');
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await disconnectKafka();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await disconnectKafka();
  process.exit(0);
});

// Start the server
startServer();
