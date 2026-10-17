# Airbnb Prototype - Lab 2 Complete

## Quick Start

### Option 1: Docker Compose (Recommended for Quick Testing)

```bash
# Start all services
docker-compose up -d

# Verify services are running
docker-compose ps

# View logs
docker-compose logs -f backend
```

**Access Points:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:4000
- Backend Health: http://localhost:4000/health
- API Docs: http://localhost:4000/api/docs
- Kafka UI: http://localhost:8080
- MongoDB: localhost:27017
- MySQL: localhost:3306

### Option 2: Kubernetes (Production-Ready)

```bash
# Deploy everything
kubectl apply -f k8s/

# Check deployment status
kubectl get all -n airbnb

# Wait for all pods to be ready
kubectl wait --for=condition=ready pod --all -n airbnb --timeout=300s

# Port forward frontend
kubectl port-forward service/frontend-service 3000:80 -n airbnb &

# Port forward backend
kubectl port-forward service/backend-service 4000:4000 -n airbnb &
```

### Option 3: Kafka Only

```bash
# Start Kafka infrastructure only
docker-compose -f docker-compose.kafka.yml up -d

# Start backend separately
cd backend && npm start
```

---

## Documentation

### Main Guides
1. **[DOCKER_KUBERNETES_SETUP.md](DOCKER_KUBERNETES_SETUP.md)** - Complete Docker & K8s guide
2. **[KAFKA_SETUP.md](KAFKA_SETUP.md)** - Kafka integration guide
3. **[JMETER_SETUP.md](JMETER_SETUP.md)** - Performance testing guide
4. **[LAB2_FINAL_STATUS.md](LAB2_FINAL_STATUS.md)** - Final completion report

### Additional Documentation
- **[LAB2_KAFKA_STATUS.md](LAB2_KAFKA_STATUS.md)** - Kafka implementation details
- **[LAB2_PROGRESS.md](LAB2_PROGRESS.md)** - Development progress
- **[LAB2_COMPLETION_SUMMARY.md](LAB2_COMPLETION_SUMMARY.md)** - Summary report

---

##  Part 1: Docker & Kubernetes

### What's Implemented
-   All services containerized (Backend, Frontend, MySQL, MongoDB, Kafka, Zookeeper)
-   Production-ready Dockerfiles with multi-stage builds
-   Complete docker-compose.yml with 7 services
-   8 Kubernetes deployments with proper configurations
-   Horizontal Pod Autoscaler (2-5 replicas, CPU/Memory based)
-   Persistent Volumes for databases
-   Health checks and resource limits
-   Service discovery and networking

### Key Files
- `backend/Dockerfile`, `frontend/Dockerfile`
- `docker-compose.yml`
- `k8s/*.yaml` (8 configuration files)

---

##   Part 2: Kafka Integration

### What's Implemented
-   Kafka producer for booking events
-   Two Kafka consumers (Owner & Traveler services)
-   Topics: `booking-request`, `booking-status-update`
-   Asynchronous message flow:
  - Traveler creates booking → Kafka → Owner receives
  - Owner accepts/cancels → Kafka → Traveler receives
-   Graceful error handling
-   Kafka UI for monitoring

### Key Files
- `backend/config/kafka.js` - Configuration & producer
- `backend/kafka/consumers.js` - Consumer implementations
- `backend/controllers/bookingController.js` - Producer integration

### Test It
1. Start Kafka: `docker-compose up -d kafka zookeeper`
2. Create a booking via API
3. Check Kafka UI: http://localhost:8080
4. View console logs for Kafka events

---

##   Part 3: MongoDB

### What's Implemented
-   MongoDB 7.0 for session storage
-   Sessions persist in MongoDB (not memory)
-   Password encryption with bcrypt (salt rounds: 10)
-   Hybrid database architecture:
  - MySQL: Application data (users, properties, bookings)
  - MongoDB: Session storage
-   MongoDB in both Docker and Kubernetes

### Key Files
- `backend/server.js` - MongoDB session configuration
- `k8s/07-mongodb-deployment.yaml`
- `docker-compose.yml` - MongoDB service

### Test It
```bash
# Connect to MongoDB
docker exec -it airbnb-mongodb mongosh

# View sessions
use airbnb_sessions
db.sessions.find().pretty()
```

---

##   Part 4: Redux 

### What's Implemented
-   Redux Toolkit (@reduxjs/toolkit@^2.9.0)
-   React-Redux (react-redux@^9.2.0)
-   Redux Persist for state persistence
-   4 Redux slices:
  1. **travelerSlice** - Traveler authentication & profile
  2. **OwnerSlice** - Owner authentication & profile
  3. **propertySlice** - Property search, fetch, details
  4. **bookingSlice** - Booking creation, status, favorites
-   Async thunks for API calls
-   Loading and error states

### Key Files
- `frontend/src/app/store.js`
- `frontend/src/features/traveler/travelerSlice.js`
- `frontend/src/features/owner/OwnerSlice.js`
- `frontend/src/features/property/propertySlice.js`
- `frontend/src/features/booking/bookingSlice.js`

### Test It
1. Open frontend: http://localhost:3000
2. Open Redux DevTools in browser
3. Login as traveler
4. Watch state changes in DevTools

---

##   Part 5: JMeter

### What's Implemented
-   3 comprehensive test plans (.jmx files)
-   Tests for 100, 200, 300, 400, 500 concurrent users
-   Automated test execution script
-   Metrics collected:
  - Response times (avg, median, percentiles)
  - Throughput (requests/second)
  - Error rates (% failed)
-   HTML reports with graphs
-   CSV data for analysis

### Key Files
- `jmeter/test-plans/01-authentication-test.jmx`
- `jmeter/test-plans/02-property-search-test.jmx`
- `jmeter/test-plans/03-booking-process-test.jmx`
- `jmeter/run-all-tests.sh` - Automation script

### Run Tests
```bash
# Ensure backend is running
curl http://localhost:4000/health

# Run all tests (100, 200, 300, 400, 500 users)
cd jmeter
./run-all-tests.sh

# View results
open results/authentication-100-users-report/index.html
```

### Manual Test (Specific User Count)
```bash
jmeter -n -t test-plans/01-authentication-test.jmx \
  -Jusers=100 \
  -l results/auth-100.jtl \
  -e -o results/auth-100-report
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  Kubernetes Cluster                     │
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐  │
│  │ Frontend │  │ Backend  │  │  MySQL   │  │ MongoDB │  │
│  │  (2-5)   │  │  (2-5)   │  │   (1)    │  │  (1)    │  │
│  └────┬─────┘  └────┬─────┘  └────-┬────┘  └────-┬───┘  │
│       │             │              │             │      │
│       └─────────────┴──────────────┴─────────────┘      │
│                     │                                   │
│       ┌─────────────┴──────────────┐                    │
│       │                            │                   │
│  ┌────┴─────┐              ┌───────┴────┐               │
│  │ Zookeeper│              │   Kafka    │               │
│  │   (1)    │              │   (1)      │               │
│  └──────────┘              └────────────┘               │
└─────────────────────────────────────────────────────────┘
         │                          │
         ▼                          ▼
   LoadBalancer              Kafka Producer/Consumer
```

---

## Project Structure

```
Lab1_DistributedSystem/
├── backend/                    # Node.js Backend
│   ├── config/
│   │   ├── kafka.js           #   Kafka configuration
│   │   └── database.js
│   ├── kafka/
│   │   └── consumers.js       #   Kafka consumers
│   ├── controllers/           #   Kafka producers
│   ├── Dockerfile             #   Docker
│   └── server.js              #   MongoDB sessions
│
├── frontend/                   # React Frontend
│   ├── src/
│   │   ├── app/
│   │   │   └── store.js       #   Redux store
│   │   └── features/          #   Redux slices
│   └── Dockerfile             #   Docker
│
├── k8s/                        #   Kubernetes configs (8 files)
│   ├── 00-namespace.yaml
│   ├── 01-configmap.yaml
│   ├── 02-secrets.yaml
│   ├── 03-mysql-deployment.yaml
│   ├── 04-kafka-deployment.yaml
│   ├── 05-backend-deployment.yaml
│   ├── 06-frontend-deployment.yaml
│   └── 07-mongodb-deployment.yaml
│
├── jmeter/                     #   Performance testing
│   ├── test-plans/            #   3 JMeter test plans
│   ├── run-all-tests.sh       #   Automation
│   └── results/               # Generated reports
│
├── docker-compose.yml          #   All services
├── docker-compose.kafka.yml    #   Kafka only
│
└── Documentation               #   Complete guides
    ├── DOCKER_KUBERNETES_SETUP.md
    ├── KAFKA_SETUP.md
    ├── JMETER_SETUP.md
    └── LAB2_FINAL_STATUS.md
```

---

## Testing Checklist

### Docker Testing
```bash
# Start all services
docker-compose up -d

# Verify services
docker-compose ps
curl http://localhost:4000/health
curl http://localhost:3000

# Check Kafka
open http://localhost:8080

# Stop services
docker-compose down
```

### Kubernetes Testing
```bash
# Deploy
kubectl apply -f k8s/

# Check status
kubectl get all -n airbnb
kubectl get hpa -n airbnb
kubectl get pvc -n airbnb

# View logs
kubectl logs -f deployment/backend -n airbnb

# Clean up
kubectl delete namespace airbnb
```

### Kafka Testing
```bash
# Create a booking
curl -X POST http://localhost:4000/api/bookings/request \
  -H "Content-Type: application/json" \
  -d '{"propertyId":1,"startDate":"2025-12-01","endDate":"2025-12-05","guests":2}'

# Check backend logs for Kafka events
docker-compose logs backend | grep Kafka
```

### JMeter Testing
```bash
cd jmeter
./run-all-tests.sh
open results/authentication-100-users-report/index.html
```

---

## Configuration

### Environment Variables (.env)
```bash
# MySQL
DB_HOST=mysql
DB_USER=airbnb_user
DB_PASSWORD=password123
DB_NAME=airbnb_db

# MongoDB
MONGO_USER=admin
MONGO_PASSWORD=mongopassword
MONGO_DB=airbnb_sessions

# Kafka
KAFKA_BROKER=kafka:9093

# Session
SESSION_SECRET=your-secret-key-change-in-production
```

---

## Screenshots Needed for Report

1.   Docker services running (`docker-compose ps`)
2.   Kubernetes pods (`kubectl get pods -n airbnb`)
3.   Kafka UI with topics
4.   MongoDB sessions
5.   Redux DevTools in browser
6.   JMeter test results
7.   Performance graphs

---

## Troubleshooting

### Backend Won't Start
```bash
# Check if ports are in use
lsof -ti:4000
lsof -ti:3306
lsof -ti:27017

# Check logs
docker-compose logs backend
```

### Kafka Issues
```bash
# Restart Kafka services
docker-compose restart zookeeper kafka

# Check Kafka logs
docker-compose logs kafka
```

### Database Connection Failed
```bash
# Verify MySQL is running
docker exec -it airbnb-mysql mysql -u root -p

# Verify MongoDB is running
docker exec -it airbnb-mongodb mongosh
```
---

**Last Updated**: November 20, 2025
**Author**: Savitha and Jane 