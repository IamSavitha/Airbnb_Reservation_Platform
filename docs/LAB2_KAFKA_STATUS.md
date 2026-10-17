# Lab 2 - Kafka Implementation Status

### Implementation Overview
The Kafka integration for asynchronous booking flow has been successfully implemented and tested.

### What's Running
-   **Zookeeper** (port 2181)
-   **Kafka Broker** (port 9092)
-   **Kafka UI** (port 8080) - http://localhost:8080
-   **Backend Server** (port 4000) with Kafka integration

### Architecture Implemented

```
┌─────────────────────────────────────────────────────────┐
│                   BOOKING FLOW                          │
└─────────────────────────────────────────────────────────┘

1. BOOKING CREATION (Traveler → Owner)
   ┌──────────┐                  ┌────────────────┐                  ┌───────────┐
   │ Traveler │ ──── POST ────> │ Backend API    │ ──── Kafka ────> │ Owner     │
   │  Service │   /bookings     │ + Producer     │  (booking-      │ Consumer  │
   └──────────┘                  └────────────────┘   request)       └───────────┘
                                        │
                                        ↓
                                   [Database]
                                   Status: PENDING

2. BOOKING STATUS UPDATE (Owner → Traveler)
   ┌──────────┐                  ┌────────────────┐                  ┌───────────┐
   │  Owner   │ ── PUT/Accept ─> │ Backend API    │ ──── Kafka ────> │ Traveler  │
   │  Service │   or Cancel      │ + Producer     │  (booking-      │ Consumer  │
   └──────────┘                  └────────────────┘   status-update) └───────────┘
                                        │
                                        ↓
                                   [Database]
                                   Status: ACCEPTED/CANCELLED
```

### Files Created/Modified

#### New Files:
1. **backend/config/kafka.js** - Kafka configuration and producer setup
2. **backend/kafka/consumers.js** - Consumer implementations
3. **docker-compose.kafka.yml** - Kafka infrastructure setup
4. **KAFKA_SETUP.md** - Complete documentation

#### Modified Files:
1. **backend/controllers/bookingController.js** - Added Kafka publishing
2. **backend/server.js** - Added Kafka initialization
3. **backend/package.json** - Added kafkajs dependency

### Kafka Topics

| Topic Name | Purpose | Producer | Consumer |
|------------|---------|----------|----------|
| `booking-request` | New booking notifications | Booking API | Owner Service |
| `booking-status-update` | Status change notifications | Booking API | Traveler Service |

### API Integration Points

#### 1. Create Booking (POST /api/bookings/request)
- **Action**: Traveler creates a booking
- **Database**: Saves booking with status `PENDING`
- **Kafka**: Publishes to `booking-request` topic
- **Consumer**: Owner service receives notification

#### 2. Accept Booking (PUT /api/bookings/owner/:id/accept)
- **Action**: Owner accepts a booking
- **Database**: Updates status to `ACCEPTED`
- **Kafka**: Publishes to `booking-status-update` topic
- **Consumer**: Traveler service receives notification

#### 3. Cancel Booking (PUT /api/bookings/owner/:id/cancel)
- **Action**: Owner cancels a booking
- **Database**: Updates status to `CANCELLED`
- **Kafka**: Publishes to `booking-status-update` topic
- **Consumer**: Traveler service receives notification

### Testing the Integration

#### Start Services:
```bash
# Start Kafka
docker-compose -f docker-compose.kafka.yml up -d

# Start Backend (in background or new terminal)
cd backend
npm start
```

#### Monitor Kafka Messages:
Visit: http://localhost:8080

#### Test Booking Flow:

1. **Create a booking** (simulate as logged-in traveler):
```bash
curl -X POST http://localhost:4000/api/bookings/request \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE" \
  -d '{
    "propertyId": 1,
    "startDate": "2025-12-01",
    "endDate": "2025-12-05",
    "guests": 2
  }'
```

**Expected Console Output:**
```
  Booking request published to Kafka: <booking-id>
📨 Owner service received booking request: { bookingId: ... }
```

2. **Accept a booking** (simulate as logged-in owner):
```bash
curl -X PUT http://localhost:4000/api/bookings/owner/<booking-id>/accept \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE"
```

**Expected Console Output:**
```
  Booking status update published to Kafka: <booking-id> ACCEPTED
  Traveler service received booking status update: { bookingId: ..., status: 'ACCEPTED' }
```

### Error Handling

The implementation includes robust error handling:

-   **Kafka publishing failure**: Booking operations complete successfully even if Kafka is unavailable
-   **Consumer processing failure**: Errors are logged without crashing the service
-   **Graceful shutdown**: Kafka connections are properly closed on server shutdown

### Lab 2 Requirements Met

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| Kafka Setup |   Complete | docker-compose.kafka.yml |
| Booking Request Flow |   Complete | booking-request topic |
| Owner Consumes Events |   Complete | ownerConsumer |
| Status Update Flow |   Complete | booking-status-update topic |
| Traveler Consumes Updates |   Complete | travelerConsumer |
| Documentation |   Complete | KAFKA_SETUP.md |

### Verification Checklist

-   Kafka broker running on port 9092
-   Zookeeper running on port 2181
-   Kafka UI accessible on port 8080
-   Backend server connected to Kafka
-   Producer publishing events
-   Consumers listening to topics
-   Topics auto-created: booking-request, booking-status-update
-   Code committed to lab2 branch
-   Documentation complete

### Next Steps for Complete Lab 2

The Kafka integration is complete. To finish Lab 2, you still need to implement:

1. **Docker & Kubernetes** 
   - Dockerize all services
   - Create Kubernetes configurations
   - Deploy to K8s cluster

2. **MongoDB** -   Already using MySQL, may need to add MongoDB for sessions

3. **Redux**  
   - Integrate Redux in frontend
   - Manage authentication state
   - Manage property and booking state

4. **JMeter Testing**  
   - Create test plans
   - Performance testing
   - Results analysis

### References

- Full setup guide: [KAFKA_SETUP.md](KAFKA_SETUP.md)
- Kafka UI: http://localhost:8080
- Backend API: http://localhost:4000
- API Documentation: http://localhost:4000/api/docs

---

**Authors**: Savitha and Jane
