// Allowed browser origins for both REST (CORS) and WebSocket connections.
// Set CORS_ORIGINS to a comma-separated list, e.g. "http://localhost:3000,https://my-app.example.com".
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

module.exports = { allowedOrigins };
