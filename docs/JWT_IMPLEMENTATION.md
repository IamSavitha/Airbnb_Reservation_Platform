# JWT Token Management Implementation

**Authors**: Savitha and Jane
**Date**: November 21, 2025
**Lab**: Lab 2 - JWT Authentication Enhancement

---

## Overview

This document describes the JWT (JSON Web Token) authentication implementation added to the Airbnb prototype application. JWT provides stateless, token-based authentication alongside the existing session-based authentication for backward compatibility.

---

## Architecture

### Authentication Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     JWT Authentication Flow                      │
└─────────────────────────────────────────────────────────────────┘

1. User Login
   ┌─────────┐                                    ┌─────────┐
   │ Client  │ ──── POST /api/traveler/login ───► │ Backend │
   └─────────┘       { email, password }          └─────────┘
                                                        │
                                                        ▼
                                                   Verify Password
                                                        │
                                                        ▼
                                                   Generate JWT
                                                        │
                                                        ▼
   ┌─────────┐                                    ┌─────────┐
   │ Client  │ ◄──── { traveler, token } ──────── │ Backend │
   └─────────┘                                    └─────────┘
        │
        ▼
   Store token in:
   - Redux state
   - localStorage

2. Protected API Requests
   ┌─────────┐                                    ┌─────────┐
   │ Client  │ ──── GET /api/traveler/profile ──► │ Backend │
   └─────────┘   Authorization: Bearer <token>   └─────────┘
                                                        │
                                                        ▼
                                                   Verify JWT Token
                                                        │
                                                        ▼
                                                   Check User Type
                                                        │
                                                        ▼
   ┌─────────┐                                    ┌─────────┐
   │ Client  │ ◄──── { success, traveler } ────── │ Backend │
   └─────────┘                                    └─────────┘

3. Token Expiration
   ┌─────────┐                                    ┌─────────┐
   │ Client  │ ──── API Request with token ─────► │ Backend │
   └─────────┘                                    └─────────┘
                                                        │
                                                        ▼
                                                   Token Expired?
                                                        │
                                                        ▼
   ┌─────────┐                                    ┌─────────┐
   │ Client  │ ◄──── { error: "Invalid token" } ─ │ Backend │
   └─────────┘                                    └─────────┘
        │
        ▼
   Clear token & Redirect to login
```

---

## Backend Implementation

### 1. JWT Utility Functions

**File**: `backend/utils/jwt.js`

```javascript
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// Generate JWT token
const generateToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN
  });
};

// Verify JWT token
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};
```

**Key Features**:
- Token expiration: 24 hours by default
- Secret key configurable via environment variable
- Error handling for invalid/expired tokens

### 2. Authentication Middleware

**File**: `backend/middleware/authMiddleware.js`

```javascript
const { verifyToken } = require('../utils/jwt');

// JWT Authentication Middleware
const authenticateJWT = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      // Fallback to session-based auth
      if (req.session && (req.session.travelerId || req.session.ownerId)) {
        return next();
      }
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    // Extract token from "Bearer <token>"
    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    // Add user info to request
    req.user = decoded;

    // Set session for backward compatibility
    if (decoded.userType === 'traveler') {
      req.session.travelerId = decoded.id;
      req.session.userType = 'traveler';
    } else if (decoded.userType === 'owner') {
      req.session.ownerId = decoded.id;
      req.session.userType = 'owner';
    }

    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      message: 'Invalid or expired token.'
    });
  }
};

// Check if user is a traveler
const isTraveler = (req, res, next) => {
  if (req.user && req.user.userType === 'traveler') {
    return next();
  }
  if (req.session && req.session.userType === 'traveler') {
    return next();
  }
  return res.status(403).json({
    success: false,
    message: 'Access denied. Traveler access required.'
  });
};

// Check if user is an owner
const isOwner = (req, res, next) => {
  if (req.user && req.user.userType === 'owner') {
    return next();
  }
  if (req.session && req.session.userType === 'owner') {
    return next();
  }
  return res.status(403).json({
    success: false,
    message: 'Access denied. Owner access required.'
  });
};
```

**Key Features**:
- Extracts JWT from Authorization header
- Supports both JWT and session-based authentication
- Role-based access control (traveler vs owner)
- Backward compatibility with existing session system

### 3. Controller Updates

**File**: `backend/controllers/travelerController.js`

```javascript
const { generateToken } = require('../utils/jwt');

// In login function
const token = generateToken({
  id: traveler.id,
  email: traveler.email,
  userType: 'traveler'
});

res.json({
  success: true,
  message: 'Login successful',
  traveler,
  token  // Return token to client
});
```

**File**: `backend/controllers/ownerController.js`

```javascript
const { generateToken } = require('../utils/jwt');

// In login function
const token = generateToken({
  id: owner.id,
  email: owner.email,
  userType: 'owner'
});

res.json({
  success: true,
  message: 'Login successful',
  owner,
  token  // Return token to client
});
```

**Token Payload**:
- `id`: User ID
- `email`: User email
- `userType`: "traveler" or "owner"
- `iat`: Issued at (automatic)
- `exp`: Expiration time (automatic)

### 4. Routes Update

**All protected routes now use JWT middleware**:

```javascript
const { authenticateJWT, isTraveler, isOwner } = require('../middleware/authMiddleware');

// Traveler routes
const requireTravelerAuth = [authenticateJWT, isTraveler];

// Owner routes
const requireOwnerAuth = [authenticateJWT, isOwner];

// Usage
router.get('/profile', requireTravelerAuth, travelerController.getProfile);
router.get('/profile', requireOwnerAuth, ownerController.getProfile);
```

**Updated Route Files**:
- `backend/routes/travelerRoutes.js`
- `backend/routes/ownerRoutes.js`
- `backend/routes/bookingRoutes.js`
- `backend/routes/ownerPropertyRoutes.js`
- `backend/routes/favoriteRoutes.js`

---

## Frontend Implementation

### 1. Redux State Management

**File**: `frontend/src/features/traveler/travelerSlice.js`

```javascript
import { jwtDecode } from 'jwt-decode';

const initialState = {
  travelerInfo: null,
  token: localStorage.getItem('travelerToken') || null,
  isLoggedIn: !!localStorage.getItem('travelerToken'),
  loading: false,
  error: null,
};

const travelerSlice = createSlice({
  name: 'traveler',
  initialState,
  reducers: {
    loginTraveler(state, action) {
      const { traveler, token } = action.payload;
      state.travelerInfo = traveler;
      state.token = token;
      state.isLoggedIn = true;

      // Store token in localStorage
      if (token) {
        localStorage.setItem('travelerToken', token);
      }
    },
    logoutTraveler(state) {
      state.travelerInfo = null;
      state.token = null;
      state.isLoggedIn = false;

      // Remove token from localStorage
      localStorage.removeItem('travelerToken');
    },
    setTravelerFromToken(state, action) {
      const token = action.payload;
      if (token) {
        try {
          const decoded = jwtDecode(token);
          state.travelerInfo = { id: decoded.id, email: decoded.email };
          state.token = token;
          state.isLoggedIn = true;
        } catch (error) {
          // Invalid token
          state.token = null;
          state.isLoggedIn = false;
          localStorage.removeItem('travelerToken');
        }
      }
    },
  },
});
```

**File**: `frontend/src/features/owner/OwnerSlice.js`

Similar implementation for owner authentication with:
- `ownerToken` in localStorage
- `loginOwner`, `logoutOwner`, `setOwnerFromToken` actions

**Key Features**:
- Token stored in Redux state and localStorage
- Persistent authentication across page refreshes
- Token decoding for user information
- Automatic token validation

### 2. API Service Configuration

**File**: `frontend/src/services/api.js`

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:4000/api',
  withCredentials: true,
});

// Request interceptor - Add JWT to headers
api.interceptors.request.use(
  (config) => {
    const travelerToken = localStorage.getItem('travelerToken');
    const ownerToken = localStorage.getItem('ownerToken');
    const token = travelerToken || ownerToken;

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - Handle token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 403) {
      const message = error.response.data.message;
      if (message && message.includes('token')) {
        // Clear expired tokens
        localStorage.removeItem('travelerToken');
        localStorage.removeItem('ownerToken');
      }
    }
    return Promise.reject(error);
  }
);
```

**Key Features**:
- Automatic token injection in Authorization header
- Token expiration handling
- Automatic cleanup of expired tokens

### 3. Component Usage

**Login Component Example**:

```javascript
import { useDispatch } from 'react-redux';
import { loginTraveler } from '../features/traveler/travelerSlice';
import api from '../services/api';

function LoginPage() {
  const dispatch = useDispatch();

  const handleLogin = async (email, password) => {
    try {
      const response = await api.post('/traveler/login', { email, password });
      const { traveler, token } = response.data;

      // Dispatch to Redux with both traveler and token
      dispatch(loginTraveler({ traveler, token }));

      // Navigate to dashboard
      navigate('/traveler/dashboard');
    } catch (error) {
      console.error('Login failed:', error);
    }
  };
}
```

**Protected Route Example**:

```javascript
import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';

function ProtectedRoute({ children }) {
  const { isLoggedIn, token } = useSelector((state) => state.traveler);

  if (!isLoggedIn || !token) {
    return <Navigate to="/login" />;
  }

  return children;
}
```

---

## Configuration

### Environment Variables

**Backend (.env)**:
```env
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=24h
```

**Security Note**: Always use a strong, random secret in production!

Generate secure secret:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## API Endpoints

### Authentication Endpoints

#### POST /api/traveler/login

**Request**:
```json
{
  "email": "traveler@example.com",
  "password": "password123"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Login successful",
  "traveler": {
    "id": 1,
    "name": "John Doe",
    "email": "traveler@example.com"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### POST /api/owner/login

**Request**:
```json
{
  "email": "owner@example.com",
  "password": "password123"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Login successful",
  "owner": {
    "id": 1,
    "name": "Jane Smith",
    "email": "owner@example.com"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Protected Endpoints

All protected endpoints now accept JWT in Authorization header:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Examples**:
- GET /api/traveler/profile
- PUT /api/traveler/profile
- GET /api/owner/profile
- POST /api/booking/request
- GET /api/booking/traveler
- GET /api/owner/properties

---

## Token Structure

### Token Payload

```json
{
  "id": 1,
  "email": "user@example.com",
  "userType": "traveler",
  "iat": 1700000000,
  "exp": 1700086400
}
```

### Decoded Token Fields

- **id**: User database ID
- **email**: User email address
- **userType**: "traveler" or "owner"
- **iat**: Issued at timestamp
- **exp**: Expiration timestamp

---

## Security Considerations

### 1. Token Storage

**Current Implementation**: localStorage
- ✅ Simple and persistent
- ⚠️ Vulnerable to XSS attacks
- ⚠️ No HttpOnly protection

**Alternative (More Secure)**: HttpOnly Cookies
- ✅ Protected from XSS
- ✅ Automatic with every request
- ⚠️ Vulnerable to CSRF (mitigated with CSRF tokens)

### 2. Token Expiration

- Default: 24 hours
- Configurable via JWT_EXPIRES_IN
- Consider shorter expiration for production
- Implement refresh token mechanism for better UX

### 3. Secret Key Management

- ✅ Use environment variables
- ✅ Never commit secrets to version control
- ✅ Use strong, random keys in production
- ✅ Rotate keys periodically

### 4. HTTPS

- ⚠️ Always use HTTPS in production
- Prevents token interception
- Protects against man-in-the-middle attacks

---

## Testing JWT Authentication

### 1. Manual Testing with cURL

**Login and get token**:
```bash
# Traveler login
curl -X POST http://localhost:4000/api/traveler/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Response: { "token": "eyJhbGciOiJIUz..." }
```

**Use token for protected route**:
```bash
# Get profile with JWT
curl -X GET http://localhost:4000/api/traveler/profile \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### 2. Testing with Postman

1. **Login**:
   - POST http://localhost:4000/api/traveler/login
   - Body: `{ "email": "test@example.com", "password": "password123" }`
   - Copy the `token` from response

2. **Set Authorization**:
   - Authorization tab → Type: Bearer Token
   - Paste token in Token field

3. **Test Protected Routes**:
   - GET http://localhost:4000/api/traveler/profile
   - Should return user profile

### 3. Testing Token Expiration

**Create short-lived token** (for testing):
```javascript
// In backend/.env
JWT_EXPIRES_IN=60s  // 60 seconds
```

**Test flow**:
1. Login and get token
2. Make successful API request
3. Wait 61 seconds
4. Try same API request → Should fail with 403
5. Frontend should clear token and redirect to login

---

## Benefits of JWT Implementation

### 1. Stateless Authentication
- No server-side session storage needed
- Scales horizontally across multiple servers
- Reduced database queries for auth checks

### 2. Mobile-Friendly
- Easy integration with mobile apps
- No cookie management needed
- Works with native mobile HTTP clients

### 3. Microservices Ready
- Token can be verified by any service
- No shared session store required
- Independent service authentication

### 4. Cross-Domain Support
- Works across different domains
- Supports CORS scenarios
- API-first architecture

### 5. Granular Control
- Custom expiration per token
- Role-based claims in token
- Revocation via blacklist

---

## Migration from Session to JWT

### Backward Compatibility

The implementation supports **both** session and JWT authentication:

```javascript
// Middleware checks JWT first, falls back to session
if (!authHeader) {
  if (req.session && req.session.travelerId) {
    return next();  // Allow session-based auth
  }
}
```

### Gradual Migration Strategy

1. **Phase 1**: Add JWT alongside sessions (Current)
   - Both methods work
   - No breaking changes

2. **Phase 2**: Encourage JWT usage
   - Update frontend to use JWT
   - Keep session as fallback

3. **Phase 3**: Deprecate sessions
   - Remove session checks
   - JWT-only authentication

---

## Troubleshooting

### Common Issues

#### 1. "Invalid or expired token" Error

**Causes**:
- Token expired (> 24 hours old)
- Invalid JWT_SECRET mismatch
- Malformed token

**Solution**:
- Login again to get fresh token
- Verify JWT_SECRET is consistent
- Check token format: `Bearer <token>`

#### 2. "Access denied. No token provided" Error

**Causes**:
- Missing Authorization header
- Token not in localStorage
- API interceptor not working

**Solution**:
- Check localStorage for token
- Verify API interceptor code
- Check browser console for errors

#### 3. Token not persisting after refresh

**Causes**:
- localStorage not saving
- Browser privacy mode
- Redux persist not configured

**Solution**:
- Check browser storage settings
- Verify localStorage.setItem() works
- Check Redux state initialization

#### 4. CORS issues with Authorization header

**Causes**:
- Backend CORS not allowing Authorization header
- Preflight request failing

**Solution**:
```javascript
// backend/server.js
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
  exposedHeaders: ['Authorization']
}));
```

---

## Future Enhancements

### 1. Refresh Tokens
- Implement refresh token mechanism
- Short-lived access tokens (15 min)
- Long-lived refresh tokens (7 days)
- Automatic token refresh before expiration

### 2. Token Blacklist
- Revoke tokens before expiration
- Redis-based blacklist
- Logout invalidates token

### 3. Rate Limiting
- Limit login attempts
- Prevent brute force attacks
- Token generation throttling

### 4. Multi-Factor Authentication (MFA)
- Two-factor authentication
- SMS/Email verification codes
- Authenticator app support

### 5. Social Authentication
- OAuth2 integration (Google, Facebook)
- JWT for social auth tokens
- Unified authentication flow

---

## Comparison: Session vs JWT

| Feature | Session-Based | JWT-Based |
|---------|---------------|-----------|
| **Storage** | Server-side (MongoDB) | Client-side (localStorage) |
| **Scalability** | Requires shared session store | Fully stateless, easy to scale |
| **Mobile** | Cookie-based, needs workarounds | Header-based, native support |
| **Security** | HttpOnly cookies (XSS-safe) | localStorage (XSS vulnerable) |
| **Expiration** | Server-side control | Token-based, automatic |
| **Revocation** | Immediate (destroy session) | Delayed (wait for expiration) |
| **Bandwidth** | Small session ID | Larger token payload |
| **CORS** | Complex with cookies | Simple with headers |

---

## Code Files Summary

### Backend Files
- `backend/utils/jwt.js` - JWT utility functions
- `backend/middleware/authMiddleware.js` - JWT authentication middleware
- `backend/controllers/travelerController.js` - Updated with JWT generation
- `backend/controllers/ownerController.js` - Updated with JWT generation
- `backend/routes/travelerRoutes.js` - Updated with JWT middleware
- `backend/routes/ownerRoutes.js` - Updated with JWT middleware
- `backend/routes/bookingRoutes.js` - Updated with JWT middleware
- `backend/routes/ownerPropertyRoutes.js` - Updated with JWT middleware
- `backend/routes/favoriteRoutes.js` - Updated with JWT middleware

### Frontend Files
- `frontend/src/features/traveler/travelerSlice.js` - Redux with JWT
- `frontend/src/features/owner/OwnerSlice.js` - Redux with JWT
- `frontend/src/services/api.js` - Axios interceptors for JWT

### Configuration Files
- `backend/.env` - JWT_SECRET and JWT_EXPIRES_IN
- `backend/package.json` - jsonwebtoken dependency
- `frontend/package.json` - jwt-decode dependency

---

## References

- [JWT.io](https://jwt.io/) - JWT debugger and documentation
- [jsonwebtoken npm package](https://www.npmjs.com/package/jsonwebtoken)
- [jwt-decode npm package](https://www.npmjs.com/package/jwt-decode)
- [RFC 7519 - JWT Standard](https://tools.ietf.org/html/rfc7519)

---

**Authors**: Savitha and Jane
**Date**: November 21, 2025
**Status**: JWT implementation complete and ready for Lab 2 submission
