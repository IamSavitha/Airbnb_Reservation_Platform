const { Server } = require('socket.io');
const { verifyToken } = require('../utils/jwt');
const { allowedOrigins } = require('./origins');

// Real-time notifications over Socket.IO.
// Each authenticated client joins a private room named "<userType>:<userId>", so the
// Kafka consumers (or the direct path when Kafka is disabled) can push to one user.
let io = null;

const roomFor = (userType, userId) => `${userType}:${userId}`;

const initSocket = (server) => {
  io = new Server(server, {
    cors: { origin: allowedOrigins, credentials: true },
  });

  // Authenticate the handshake with the same JWT the REST API uses.
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));
    try {
      const decoded = verifyToken(token);
      if (!decoded?.id || !['traveler', 'owner'].includes(decoded.userType)) {
        return next(new Error('Invalid token payload'));
      }
      socket.data.user = { id: String(decoded.id), userType: decoded.userType };
      return next();
    } catch (error) {
      return next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    const { id, userType } = socket.data.user;
    socket.join(roomFor(userType, id));
    console.log(`🔌 Socket connected: ${userType} ${id}`);

    socket.on('disconnect', (reason) => {
      console.log(`🔌 Socket disconnected: ${userType} ${id} (${reason})`);
    });
  });

  console.log('✅ WebSocket server initialized');
  return io;
};

const getIO = () => io;

const emitToUser = (userType, userId, event, payload) => {
  if (!io) {
    console.warn(`⚠️  Socket.IO not initialized; dropped "${event}" for ${userType} ${userId}`);
    return false;
  }
  io.to(roomFor(userType, String(userId))).emit(event, payload);
  return true;
};

// Owner dashboard listens for "new-booking-request" (OwnerRequests.js).
const notifyOwner = (ownerId, payload) => emitToUser('owner', ownerId, 'new-booking-request', payload);

// Traveler bookings page listens for "booking-status-update" (TravelerBookings.js).
const notifyTraveler = (travelerId, payload) => emitToUser('traveler', travelerId, 'booking-status-update', payload);

module.exports = { initSocket, getIO, notifyOwner, notifyTraveler, roomFor };
