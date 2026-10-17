# Lab 2 Progress Tracker

## Completed Tasks   

### Part 1: Docker & Kubernetes 

#### Docker Setup
-    **Backend Dockerfile**: Multi-stage Node.js container with health checks
-    **Frontend Dockerfile**: Multi-stage build with Nginx for production
-    **.dockerignore files**: Optimized build context
-    **docker-compose.yml**: Complete orchestration with:
  - MySQL database
  - Kafka + Zookeeper
  - Kafka UI
  - Backend service
  - Frontend service
  - Health checks and dependencies
  - Persistent volumes

#### Kubernetes Setup
-    **Namespace**: Isolated airbnb namespace
-   **ConfigMaps & Secrets**: Configuration management
-   **MySQL Deployment**: Stateful service with PVC (5Gi)
-   **Kafka Deployment**: Distributed messaging with Zookeeper
-   **Backend Deployment**:
  - 2 replicas with auto-scaling (2-5)
  - Health probes (liveness & readiness)
  - Resource limits
  - HPA configuration
-   **Frontend Deployment**:
  - 2 replicas with auto-scaling (2-5)
  - LoadBalancer service
  - Health probes
-   **Service Communication**: All services properly networked
-   **Documentation**: Comprehensive setup guide

**Files Created:**
- `backend/Dockerfile`
- `frontend/Dockerfile`
- `docker-compose.yml`
- `k8s/00-namespace.yaml`
- `k8s/01-configmap.yaml`
- `k8s/02-secrets.yaml`
- `k8s/03-mysql-deployment.yaml`
- `k8s/04-kafka-deployment.yaml`
- `k8s/05-backend-deployment.yaml`
- `k8s/06-frontend-deployment.yaml`
- `DOCKER_KUBERNETES_SETUP.md`

---

### Part 2: Kafka for Asynchronous Messaging 

#### Kafka Integration
-   **Kafka Setup**: Integrated with Kubernetes
-   **Producer Implementation**: Backend publishes events
-   **Consumer Implementation**:
  - Owner service consumes booking requests
  - Traveler service consumes status updates
-   **Booking Flow**:
  - Traveler creates booking → Kafka → Owner receives
  - Owner accepts/cancels → Kafka → Traveler receives
-   **Topics**:
  - `booking-request`: Booking creation events
  - `booking-status-update`: Status change events
-   **Error Handling**: Graceful degradation if Kafka fails
-   **Documentation**: Complete setup guide

**Files Created:**
- `backend/config/kafka.js`
- `backend/kafka/consumers.js`
- `backend/controllers/bookingController.js` (updated)
- `backend/server.js` (updated)
- `docker-compose.kafka.yml`
- `KAFKA_SETUP.md`
- `LAB2_KAFKA_STATUS.md`

---

## Remaining Tasks  *

### Part 3: MongoDB 

**Requirements:**
- Use MongoDB as database
- Store sessions in MongoDB
- Encrypt passwords

**Current Status:**
- Currently using MySQL
- Need to either:
  1. Migrate to MongoDB completely, OR
  2. Use MongoDB for sessions only (hybrid approach)
  3. Add MongoDB alongside MySQL

**TODO:**
- [ ] Add MongoDB to docker-compose.yml
- [ ] Add MongoDB to Kubernetes
- [ ] Configure express-session with connect-mongo
- [ ] Verify password encryption (already using bcrypt)

---

### Part 4: Redux Integration 

**Requirements:**
- Integrate Redux into React frontend
- Manage state for:
  - User authentication (JWT tokens)
  - Property data (search results, details)
  - Booking data (status, favorites)
- Create Redux store, actions, reducers, selectors

**TODO:**
- [ ] Install Redux dependencies (@reduxjs/toolkit, react-redux)
- [ ] Create Redux store structure
- [ ] Implement auth slice (login, signup, JWT storage)
- [ ] Implement properties slice (fetch, store, filter)
- [ ] Implement bookings slice (create, update, track status)
- [ ] Connect components to Redux
- [ ] Test Redux DevTools integration

---

### Part 5: JMeter Performance Testing 

**Requirements:**
- Test critical APIs:
  - User authentication
  - Property data fetching
  - Booking processing
- Simulate concurrent users (Travelers and Owners)
- Test with 100, 200, 300, 400, 500 concurrent users
- Measure response times, throughput, error rates
- Create graphs and analysis

**TODO:**
- [ ] Install Apache JMeter
- [ ] Create test plan for authentication endpoints
- [ ] Create test plan for property search
- [ ] Create test plan for booking flow
- [ ] Run tests for 100, 200, 300, 400, 500 users
- [ ] Collect results and screenshots
- [ ] Create performance analysis graphs
- [ ] Write performance report

---

## Next Steps

1. **MongoDB Integration** (Estimated: 1-2 hours)
   - Add MongoDB container
   - Configure session storage
   - Update Kubernetes configs

2. **Redux Implementation** (Estimated: 2-3 hours)
   - Set up Redux Toolkit
   - Create slices for auth, properties, bookings
   - Connect all components
   - Test with Redux DevTools

3. **JMeter Testing** (Estimated: 2-3 hours)
   - Create test plans
   - Run performance tests
   - Generate graphs
   - Write analysis report

**Total Estimated Time**: 5-8 hours

---

## Files to Submit

### Code Repository
-   Dockerfiles (backend, frontend)
-   docker-compose.yml
-   Kubernetes configs (k8s/)
-   Kafka integration code
-  * MongoDB configuration
-  * Redux implementation
-  * JMeter test plans (.jmx files)

### Documentation
-   DOCKER_KUBERNETES_SETUP.md
-   KAFKA_SETUP.md
-   LAB2_KAFKA_STATUS.md
-  * Screenshots of AWS deployment
-  * Kafka event flow screenshots
-  * Redux DevTools screenshots
-  * JMeter results and graphs

### Report
- Architecture overview
- Implementation details
- Performance analysis
- Screenshots and evidence

---

**Authors**: Savitha and Jane
**Last Updated**: November 20, 2025
