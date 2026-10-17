import { io } from 'socket.io-client';
import { SOCKET_URL } from '../config';

// One shared Socket.IO connection per browser tab. The server authenticates the
// handshake with the same JWT the REST API uses and places the user in a private room.
let socket = null;
let currentKey = null;

const tokenFor = (userType) =>
  localStorage.getItem(userType === 'owner' ? 'ownerToken' : 'travelerToken');

export const connectSocket = (userId, userType) => {
  const token = tokenFor(userType);
  if (!userId || !token) return null;

  const key = `${userType}:${userId}`;
  if (socket && currentKey === key) return socket;

  disconnectSocket();
  // An empty SOCKET_URL means the API is served from this same origin.
  socket = io(SOCKET_URL || undefined, {
    auth: { token },
    transports: ['websocket', 'polling'],
    withCredentials: true,
    reconnectionAttempts: 5,
  });
  currentKey = key;

  socket.on('connect_error', (err) => {
    console.warn('Real-time updates unavailable:', err.message);
  });
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    currentKey = null;
  }
};

export const getSocket = () => socket;

export const onBookingStatusUpdate = (handler) => {
  if (socket) socket.on('booking-status-update', handler);
};

export const offBookingStatusUpdate = (handler) => {
  if (socket) socket.off('booking-status-update', handler);
};

export const onNewBookingRequest = (handler) => {
  if (socket) socket.on('new-booking-request', handler);
};

export const offNewBookingRequest = (handler) => {
  if (socket) socket.off('new-booking-request', handler);
};
