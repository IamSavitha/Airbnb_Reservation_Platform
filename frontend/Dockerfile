# ==============================
# Frontend Dockerfile - Multi-stage build
# ==============================

# ---- Build Stage ----
  FROM node:18-alpine AS builder

  # Set working directory
  WORKDIR /app
  
  # Copy package files
  COPY package*.json ./
  
  # Install dependencies
  RUN npm install
  
  # Copy the rest of the app
  COPY . .
  
  # API endpoints are baked in at build time (Create React App)
  ARG REACT_APP_API_URL=http://localhost:4000/api
  ARG REACT_APP_AI_AGENT_URL=http://localhost:8000
  ENV REACT_APP_API_URL=$REACT_APP_API_URL \
      REACT_APP_AI_AGENT_URL=$REACT_APP_AI_AGENT_URL

  # Build the production-ready React app
  RUN npm run build
  
  
  # ---- Production Stage ----
  FROM nginx:alpine
  
  # ✅ Install curl for healthcheck
  RUN apk add --no-cache curl
  
  # Copy built files from the builder stage
  COPY --from=builder /app/build /usr/share/nginx/html
  
  # Copy custom nginx configuration (optional)
  COPY nginx.conf /etc/nginx/conf.d/default.conf
  
  # Expose container port
  EXPOSE 80
  
  # ✅ Health check using curl
  HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD curl -fsS http://127.0.0.1/ >/dev/null || exit 1
  
  # Start Nginx in the foreground
  CMD ["nginx", "-g", "daemon off;"]
  