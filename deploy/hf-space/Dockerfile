# Single-container demo for Hugging Face Spaces (Docker SDK):
# MongoDB + Express API + Socket.IO + the built React app on one port (7860).
# Kafka is disabled (KAFKA_ENABLED=false): booking events go straight to WebSockets.
# Build context: repository root.
FROM mongo:7.0

ARG NODE_VERSION=20.18.0
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates curl xz-utils \
 && curl -fsSL "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz" \
    | tar -xJ -C /usr/local --strip-components=1 \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Frontend: same-origin API, AI agent button hidden (no LLM key in the demo)
COPY frontend/package*.json frontend/
RUN cd frontend && npm ci --legacy-peer-deps --no-audit --no-fund
COPY frontend frontend
RUN cd frontend && REACT_APP_API_URL=/api REACT_APP_AI_AGENT_URL= npm run build

# Backend
COPY backend/package*.json backend/
RUN cd backend && npm ci --omit=dev --no-audit --no-fund
COPY backend backend
COPY deploy/hf-space/start.sh /app/start.sh

ENV PORT=7860 \
    KAFKA_ENABLED=false \
    MONGO_URL=mongodb://127.0.0.1:27017/airbnb \
    FRONTEND_DIR=/app/frontend/build \
    NODE_ENV=production \
    KAFKAJS_NO_PARTITIONER_WARNING=1

EXPOSE 7860
ENTRYPOINT []
CMD ["bash", "/app/start.sh"]
