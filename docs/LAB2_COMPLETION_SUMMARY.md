# Lab 2 Completion Summary

## Project: Airbnb Prototype Enhancement

**Student**: Savitha and Jane 

**Due Date**: November 24, 2025

---

##   COMPLETED SECTIONS

### Part 1: Docker & Kubernetes Setup  

#### Docker Implementation
**Files Created:**
- `backend/Dockerfile` - Node.js container with health checks
- `frontend/Dockerfile` - Multi-stage build with Nginx
- `backend/.dockerignore` - Optimized build context
- `frontend/.dockerignore` - Optimized build context
- `docker-compose.yml` - Complete orchestration

**Services Containerized:**
1.    MySQL Database (port 3306)
2.    MongoDB Sessions (port 27017)
3.    Zookeeper (port 2181)
4.    Kafka Broker (ports 9092, 9093)
5.    Kafka UI (port 8080)
6.    Backend API - Traveler/Owner/Property/Booking services (port 4000)
7.   Frontend React App (port 3000)

**Features:**
- Health checks for all services
- Dependency management (depends_on with conditions)
- Persistent volumes for data
- Network isolation
- Environment variable configuration

#### Kubernetes Implementation
**Files Created:**
- `k8s/00-namespace.yaml` - Namespace isolation
- `k8s/01-configmap.yaml` - Application configuration
- `k8s/02-secrets.yaml` - Sensitive data management
- `k8s/03-mysql-deployment.yaml` - MySQL StatefulSet
- `k8s/04-kafka-deployment.yaml` - Kafka + Zookeeper
- `k8s/05-backend-deployment.yaml` - Backend with HPA
- `k8s/06-frontend-deployment.yaml` - Frontend with LoadBalancer
- `k8s/07-mongodb-deployment.yaml` - MongoDB for sessions

**Kubernetes Features:**
-   Namespace for isolation (`airbnb`)
-   ConfigMaps for configuration
-   Secrets for sensitive data
-   PersistentVolumeClaims for data persistence
-   Health probes (liveness & readiness)
-   Resource limits and requests
-   Horizontal Pod Autoscaler (HPA) for backend and frontend
-   Service discovery and networking
-   Auto-scaling: 2-5 replicas based on CPU/memory

**Service Communication:**
- All services can communicate via ClusterIP services
- Backend connects to MySQL, MongoDB, and Kafka
- Frontend exposed via LoadBalancer

**Scaling Demonstration:**
- Backend: 2-5 replicas (CPU 70%, Memory 80% threshold)
- Frontend: 2-5 replicas (CPU 70%, Memory 80% threshold)

**Documentation:**
- `DOCKER_KUBERNETES_SETUP.md` - Complete setup guide

---

### Part 2: Kafka for Asynchronous Messaging 

#### Kafka Setup
**Files Created:**
- `backend/config/kafka.js` - Kafka producer and configuration
- `backend/kafka/consumers.js` - Consumer implementations
- `docker-compose.kafka.yml` - Standalone Kafka setup
- `KAFKA_SETUP.md` - Documentation
- `LAB2_KAFKA_STATUS.md` - Status and verification

**Topics Implemented:**
1.   `booking-request` - Traveler → Owner flow
2.   `booking-status-update` - Owner → Traveler flow

#### Booking Flow Implementation

**Flow 1: Booking Creation**
```
Traveler → POST /api/bookings/request
   ↓
Database: Insert booking (status: PENDING)
   ↓
Kafka Producer: Publish to "booking-request" topic
   ↓
Owner Consumer: Receives notification
   ↓
Owner sees new booking in dashboard
```

**Flow 2: Booking Status Update**
```
Owner → PUT /api/bookings/owner/:id/accept
   ↓
Database: Update booking (status: ACCEPTED)
   ↓
Kafka Producer: Publish to "booking-status-update" topic
   ↓
Traveler Consumer: Receives notification
   ↓
Traveler sees status update
```

**Code Integration:**
-   Producer in `bookingController.js`:
  - `createBooking()` publishes booking requests
  - `acceptBooking()` publishes status updates
  - `cancelBookingOwner()` publishes status updates
-   Owner consumer listens for booking requests
-   Traveler consumer listens for status updates
-   Graceful error handling
-   Server initialization with Kafka

**Testing:**
- Kafka running on Docker Compose
- Backend connected and publishing events
- Consumers receiving and processing messages
- Kafka UI accessible for monitoring

---

### Part 3: MongoDB 

#### MongoDB Integration
**Files Created/Modified:**
- `backend/server.js` - MongoDB session configuration
- `k8s/07-mongodb-deployment.yaml` - MongoDB K8s deployment
- Updated `docker-compose.yml` with MongoDB service
- Updated Kubernetes ConfigMap and Secrets

**Implementation:**
1.   **MongoDB as database**: Using MongoDB 7.0
2.   **Sessions stored in MongoDB**:
   - Integrated `connect-mongo` with `express-session`
   - Sessions persist in MongoDB collection
   - TTL: 24 hours
   - Lazy session updates (touchAfter: 24h)
   - Encryption with session secret

3.   **Passwords encrypted**:
   - Using `bcryptjs` with salt rounds: 10
   - All passwords hashed before storage
   - Verified in `travelerController.js` and `ownerController.js`
   - Password comparison using `bcrypt.compare()`

**Database Architecture:**
- **MySQL**: Application data (travelers, owners, properties, bookings, favorites)
- **MongoDB**: Session storage (user sessions with encryption)
- Hybrid approach for optimal performance

**Session Storage Features:**
- Automatic session cleanup (TTL)
- Encrypted session data
- Persistent across server restarts
- Scalable with MongoDB clustering

---

## ⏳ REMAINING SECTIONS

### Part 4: Redux Integration - TODO

**Requirements:**
- [ ] Install Redux Toolkit and React-Redux
- [ ] Create Redux store structure
- [ ] Implement auth slice (JWT token management)
- [ ] Implement properties slice (search, filter, details)
- [ ] Implement bookings slice (create, status, favorites)
- [ ] Connect React components to Redux
- [ ] Test with Redux DevTools

**Estimated Time:** 2-3 hours

---

### Part 5: JMeter Performance Testing - TODO

**Requirements:**
- [ ] Install Apache JMeter
- [ ] Create test plans for:
  - User authentication (login/signup)
  - Property data fetching
  - Booking processing
- [ ] Run tests with 100, 200, 300, 400, 500 concurrent users
- [ ] Collect metrics:
  - Response times
  - Throughput
  - Error rates
- [ ] Create graphs and analysis
- [ ] Write performance report

**Estimated Time:** 2-3 hours


---

## 📁 Repository Structure

```
Lab1_DistributedSystem/
├── backend/
│   ├── config/
│   │   ├── database.js
│   │   └── kafka.js                      NEW
│   ├── controllers/
│   │   ├── bookingController.js          Updated (Kafka)
│   │   ├── ownerController.js            (bcrypt)
│   │   └── travelerController.js         (bcrypt)
│   ├── kafka/
│   │   └── consumers.js                  NEW
│   ├── Dockerfile                        NEW
│   ├── .dockerignore                     NEW
│   ├── package.json                      Updated
│   └── server.js                         Updated (Kafka + MongoDB)
│
├── frontend/
│   ├── Dockerfile                        NEW
│   └── .dockerignore                     NEW
│
├── k8s/
│   ├── 00-namespace.yaml                 NEW
│   ├── 01-configmap.yaml                 NEW
│   ├── 02-secrets.yaml                   NEW
│   ├── 03-mysql-deployment.yaml          NEW
│   ├── 04-kafka-deployment.yaml          NEW
│   ├── 05-backend-deployment.yaml        NEW
│   ├── 06-frontend-deployment.yaml       NEW
│   └── 07-mongodb-deployment.yaml        NEW
│
├── docker-compose.yml                    NEW
├── docker-compose.kafka.yml              NEW
├── DOCKER_KUBERNETES_SETUP.md            NEW
├── KAFKA_SETUP.md                        NEW
├── LAB2_KAFKA_STATUS.md                  NEW
└── LAB2_PROGRESS.md                      NEW
```

---

## How to Run

### Docker Compose
```bash
# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

**Access:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:4000
- Kafka UI: http://localhost:8080

### Kubernetes
```bash
# Deploy everything
kubectl apply -f k8s/

# Check status
kubectl get all -n airbnb

# Port forward services
kubectl port-forward service/frontend-service 3000:80 -n airbnb
kubectl port-forward service/backend-service 4000:4000 -n airbnb

# View logs
kubectl logs -f deployment/backend -n airbnb
```

---

## 🔍 Verification

### Docker Verification
  All services running: `docker-compose ps`
  Backend health: `curl http://localhost:4000/health`
  Kafka UI accessible: http://localhost:8080
  MongoDB running: `docker exec -it airbnb-mongodb mongosh`

### Kubernetes Verification
  All pods ready: `kubectl get pods -n airbnb`
  HPA configured: `kubectl get hpa -n airbnb`
  Services created: `kubectl get svc -n airbnb`
  PVCs bound: `kubectl get pvc -n airbnb`

### Kafka Verification
  Topics created: `booking-request`, `booking-status-update`
  Producer publishing events
  Consumers receiving messages
  Console logs showing Kafka activity

### MongoDB Verification
  Sessions stored in MongoDB
  Passwords encrypted with bcrypt
  Session persistence working
  MongoDB health checks passing

---

##  Commits

All work committed to `lab2` branch:

1.   `5b7fee06` - Kafka integration implementation
2.   `1d3ce444` - Kafka status documentation
3.   `0230a9ac` - Docker and Kubernetes setup
4.   `97eb8e27` - MongoDB integration for sessions

---

## Next Steps

1. **Redux Implementation** 
   - Set up Redux Toolkit
   - Create slices for auth, properties, bookings
   - Connect components
   - Test with DevTools

2. **JMeter Testing** 
   - Create test plans
   - Run load tests (100-500 users)
   - Generate graphs
   - Write analysis report

3. **Final Report**
   - Architecture diagrams
   - Implementation details
   - Screenshots
   - Performance analysis

---

**Authors**: Savitha and Jane
**Last Updated**: November 20, 2025
**Branch**: lab2
