const { KAFKA_ENABLED, ownerConsumer, travelerConsumer, TOPICS } = require('../config/kafka');
const { notifyTraveler, notifyOwner } = require('../config/socket');

// Owner Consumer - Listens for booking requests
const startOwnerConsumer = async () => {
  try {
    await ownerConsumer.subscribe({
      topic: TOPICS.BOOKING_REQUEST,
      fromBeginning: false
    });

    await ownerConsumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const bookingData = JSON.parse(message.value.toString());
          console.log('📨 Owner service received booking request:', {
            bookingId: bookingData.id,
            propertyId: bookingData.propertyId,
            travelerId: bookingData.travelerId,
            status: bookingData.status
          });

          // Notify owner via WebSocket
          if (bookingData.ownerId) {
            notifyOwner(bookingData.ownerId, {
              type: 'NEW_BOOKING_REQUEST',
              booking: bookingData
            });
          }
        } catch (error) {
          console.error('❌ Error processing booking request in owner consumer:', error);
        }
      }
    });

    console.log('✅ Owner consumer started - listening for booking requests');
  } catch (error) {
    console.error('❌ Failed to start owner consumer:', error);
    throw error;
  }
};

// Traveler Consumer - Listens for booking status updates
const startTravelerConsumer = async () => {
  try {
    await travelerConsumer.subscribe({
      topic: TOPICS.BOOKING_STATUS_UPDATE,
      fromBeginning: false
    });

    await travelerConsumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const bookingData = JSON.parse(message.value.toString());
          const status = message.headers['status']?.toString();

          console.log('📨 Traveler service received booking status update:', {
            bookingId: bookingData.id,
            status: status || bookingData.status,
            propertyName: bookingData.propertyName
          });

          // Notify traveler via WebSocket
          if (bookingData.travelerId) {
            notifyTraveler(bookingData.travelerId, {
              type: 'BOOKING_STATUS_UPDATE',
              bookingId: bookingData.id,
              status: status || bookingData.status,
              booking: bookingData
            });
          }
        } catch (error) {
          console.error('❌ Error processing booking status update in traveler consumer:', error);
        }
      }
    });

    console.log('✅ Traveler consumer started - listening for booking status updates');
  } catch (error) {
    console.error('❌ Failed to start traveler consumer:', error);
    throw error;
  }
};

// Start all consumers
const startAllConsumers = async () => {
  if (!KAFKA_ENABLED) return;
  try {
    await Promise.all([
      startOwnerConsumer(),
      startTravelerConsumer()
    ]);
    console.log('✅ All Kafka consumers started successfully');
  } catch (error) {
    console.error('❌ Failed to start consumers:', error);
    throw error;
  }
};

module.exports = {
  startOwnerConsumer,
  startTravelerConsumer,
  startAllConsumers
};