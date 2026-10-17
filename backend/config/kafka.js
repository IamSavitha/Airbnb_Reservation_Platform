const { Kafka } = require('kafkajs');

// Set KAFKA_ENABLED=false to run without a broker (e.g. a single-container demo):
// booking events are then delivered straight to the WebSocket layer with the same
// payloads the Kafka consumers would send.
const KAFKA_ENABLED = process.env.KAFKA_ENABLED !== 'false';

// Kafka configuration
const kafka = new Kafka({
  clientId: 'airbnb-app',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
  retry: {
    initialRetryTime: 100,
    retries: 8
  }
});

// Topics
const TOPICS = {
  BOOKING_REQUEST: 'booking-request',
  BOOKING_STATUS_UPDATE: 'booking-status-update'
};

// Create producer
const producer = kafka.producer();

// Create consumers
const ownerConsumer = kafka.consumer({ groupId: 'owner-service' });
const travelerConsumer = kafka.consumer({ groupId: 'traveler-service' });

// Producer helper functions
const sendBookingRequest = async (bookingData) => {
  if (!KAFKA_ENABLED) {
    const { notifyOwner } = require('./socket');
    if (bookingData.ownerId) notifyOwner(bookingData.ownerId, { type: 'NEW_BOOKING_REQUEST', booking: bookingData });
    return true;
  }
  try {
    await producer.send({
      topic: TOPICS.BOOKING_REQUEST,
      messages: [
        {
          key: bookingData.id.toString(),
          value: JSON.stringify(bookingData),
          headers: {
            'event-type': 'BOOKING_CREATED'
          }
        }
      ]
    });
    console.log('✅ Booking request published to Kafka:', bookingData.id);
    return true;
  } catch (error) {
    console.error('❌ Failed to publish booking request:', error);
    throw error;
  }
};

const sendBookingStatusUpdate = async (bookingData) => {
  if (!KAFKA_ENABLED) {
    const { notifyTraveler } = require('./socket');
    if (bookingData.travelerId) {
      notifyTraveler(bookingData.travelerId, {
        type: 'BOOKING_STATUS_UPDATE',
        bookingId: bookingData.id,
        status: bookingData.status,
        booking: bookingData
      });
    }
    return true;
  }
  try {
    await producer.send({
      topic: TOPICS.BOOKING_STATUS_UPDATE,
      messages: [
        {
          key: bookingData.id.toString(),
          value: JSON.stringify(bookingData),
          headers: {
            'event-type': 'BOOKING_STATUS_CHANGED',
            'status': bookingData.status
          }
        }
      ]
    });
    console.log('✅ Booking status update published to Kafka:', bookingData.id, bookingData.status);
    return true;
  } catch (error) {
    console.error('❌ Failed to publish booking status update:', error);
    throw error;
  }
};

// Initialize producer
const initProducer = async () => {
  if (!KAFKA_ENABLED) {
    console.log('ℹ️  Kafka disabled (KAFKA_ENABLED=false): booking events go directly to WebSockets');
    return;
  }
  try {
    await producer.connect();
    console.log('✅ Kafka producer connected');
  } catch (error) {
    console.error('❌ Failed to connect Kafka producer:', error);
    throw error;
  }
};

// Initialize consumers
const initConsumers = async () => {
  if (!KAFKA_ENABLED) return;
  try {
    await ownerConsumer.connect();
    await travelerConsumer.connect();
    console.log('✅ Kafka consumers connected');
  } catch (error) {
    console.error('❌ Failed to connect Kafka consumers:', error);
    throw error;
  }
};

// Graceful shutdown
const disconnectKafka = async () => {
  if (!KAFKA_ENABLED) return;
  try {
    await producer.disconnect();
    await ownerConsumer.disconnect();
    await travelerConsumer.disconnect();
    console.log('✅ Kafka connections closed');
  } catch (error) {
    console.error('❌ Error disconnecting Kafka:', error);
  }
};

module.exports = {
  KAFKA_ENABLED,
  kafka,
  producer,
  ownerConsumer,
  travelerConsumer,
  TOPICS,
  sendBookingRequest,
  sendBookingStatusUpdate,
  initProducer,
  initConsumers,
  disconnectKafka
};
