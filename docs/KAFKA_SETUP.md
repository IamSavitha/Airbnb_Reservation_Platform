# Kafka Integration for Airbnb Prototype

## Overview

This project implements Kafka for asynchronous message handling in the booking flow, following the Lab 2 requirements.

## Architecture

### Message Flow

```
Traveler creates booking → Kafka (booking-request topic) → Owner service
Owner accepts/cancels → Kafka (booking-status-update topic) → Traveler service
```

### Topics

1. **booking-request**: Published when a traveler creates a new booking
2. **booking-status-update**: Published when an owner accepts/cancels a booking

### Services

- **Producer (Frontend Services)**: Publishes booking requests and status updates
- **Consumer (Backend Services)**:
  - Owner Consumer: Listens for new booking requests
  - Traveler Consumer: Listens for booking status updates

## Setup Instructions

### 1. Start Kafka Services

Using Docker Compose:

```bash
docker-compose -f docker-compose.kafka.yml up -d
```

This will start:
- Zookeeper (port 2181)
- Kafka Broker (port 9092)
- Kafka UI (port 8080 - for monitoring)

### 2. Verify Kafka is Running

Check running containers:
```bash
docker ps
```

You should see:
- zookeeper
- kafka
- kafka-ui

### 3. Access Kafka UI

Open browser: http://localhost:8080

This web interface allows you to:
- View topics
- Monitor messages
- Check consumer groups

### 4. Configure Environment Variables

Add to your `.env` file:

```env
KAFKA_BROKER=localhost:9092
```

### 5. Start the Backend Server

```bash
cd backend
npm start
```

The server will automatically:
- Connect to Kafka broker
- Initialize producer
- Start consumer listeners

### 6. Test the Integration

#### Test Booking Creation Flow

1. **Create a booking** (as Traveler):
```bash
curl -X POST http://localhost:4000/api/bookings/request \
  -H "Content-Type: application/json" \
  -d '{
    "propertyId": 1,
    "startDate": "2025-12-01",
    "endDate": "2025-12-05",
    "guests": 2
  }'
```

Check the console logs - you should see:
```
✅ Booking request published to Kafka: <booking-id>
📨 Owner service received booking request: { bookingId: ... }
```

2. **Accept a booking** (as Owner):
```bash
curl -X PUT http://localhost:4000/api/bookings/owner/<booking-id>/accept
```

Check the console logs - you should see:
```
✅ Booking status update published to Kafka: <booking-id> ACCEPTED
📨 Traveler service received booking status update: { bookingId: ..., status: 'ACCEPTED' }
```

## Code Structure

```
backend/
├── config/
│   └── kafka.js              # Kafka configuration and producer
├── kafka/
│   └── consumers.js          # Consumer implementations
└── controllers/
    └── bookingController.js  # Updated with Kafka publishing
```

## Event Payloads

### Booking Request Event

```json
{
  "id": 123,
  "propertyId": 1,
  "travelerId": 5,
  "startDate": "2025-12-01",
  "endDate": "2025-12-05",
  "guests": 2,
  "totalPrice": 400,
  "status": "PENDING",
  "createdAt": "2025-11-20T10:00:00Z"
}
```

### Booking Status Update Event

```json
{
  "id": 123,
  "propertyId": 1,
  "travelerId": 5,
  "status": "ACCEPTED",
  "propertyName": "Cozy Beach House",
  "acceptedAt": "2025-11-20T10:05:00Z"
}
```

## Monitoring

### View Messages in Kafka UI

1. Open http://localhost:8080
2. Click on "Topics"
3. Select `booking-request` or `booking-status-update`
4. Click "Messages" to see published events

### Console Logs

The application logs all Kafka activities:
- ✅ Successful operations
- 📨 Received messages
- ❌ Errors

## Error Handling

The implementation includes graceful error handling:

- **Kafka publishing failure**: Booking is still created/updated in the database, error is logged
- **Consumer processing failure**: Error is logged, message is not acknowledged (will retry)
- **Connection failure**: Application will retry connecting with exponential backoff

## Graceful Shutdown

The application handles graceful shutdown:

```javascript
process.on('SIGINT', async () => {
  await disconnectKafka();
  process.exit(0);
});
```

Stop the server with `Ctrl+C` and it will:
1. Disconnect Kafka producer
2. Disconnect Kafka consumers
3. Close gracefully

## Stopping Kafka Services

```bash
docker-compose -f docker-compose.kafka.yml down
```

To also remove volumes:
```bash
docker-compose -f docker-compose.kafka.yml down -v
```

## Troubleshooting

### Kafka Connection Failed

**Error**: `Failed to connect Kafka producer: Connection refused`

**Solution**:
1. Ensure Kafka is running: `docker ps | grep kafka`
2. Check Kafka logs: `docker logs kafka`
3. Verify KAFKA_BROKER in .env matches the running Kafka host

### Topics Not Created

**Solution**:
Topics are auto-created. If issues persist:
```bash
# Connect to Kafka container
docker exec -it kafka bash

# List topics
kafka-topics --list --bootstrap-server localhost:9092

# Create topic manually
kafka-topics --create --topic booking-request --bootstrap-server localhost:9092
```

### Consumer Not Receiving Messages

**Solution**:
1. Check consumer group status in Kafka UI
2. Verify topic names match in producer and consumer
3. Check console logs for consumer errors

## Benefits of Kafka Integration

1. **Asynchronous Processing**: Bookings are processed without blocking the API
2. **Scalability**: Can handle high volume of booking requests
3. **Reliability**: Messages are persisted and can be replayed
4. **Decoupling**: Frontend and backend services are loosely coupled
5. **Event-Driven**: Real-time status updates for travelers and owners

## Future Enhancements

- Add WebSocket integration for real-time frontend updates
- Implement dead letter queue for failed messages
- Add message schema validation
- Implement event sourcing for booking history
- Add monitoring with Prometheus/Grafana

---

**Authors**: Savitha and Jane
