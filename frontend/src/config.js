// Runtime endpoints. Set at build time with REACT_APP_* variables (Create React App).
// Defaults match the local docker-compose / `npm start` setup.
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

// Socket.IO lives on the API host without the /api suffix.
export const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || API_BASE_URL.replace(/\/api\/?$/, '');

export const AI_AGENT_URL = process.env.REACT_APP_AI_AGENT_URL || 'http://localhost:8000';

// Origin of the API (no /api suffix), for code that builds full paths itself.
export const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, '');
