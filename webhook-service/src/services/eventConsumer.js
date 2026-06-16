const logger = require('../config/logger');
const { getChannel } = require('../config/rabbitmq');
const { getRedisClient } = require('../config/redis');

/**
 * Start consuming events from RabbitMQ
 * When an event is received, add a job to Redis queue for delivery
 */
async function startEventConsumer() {
  try {
    const channel = await getChannel();
    const redis = getRedisClient();

        // ✅ STEP 1: Assert all queues exist
    logger.info('Asserting RabbitMQ queues...');
    await channel.assertQueue('delivery.completed', { durable: true });
    await channel.assertQueue('delivery.failed', { durable: true });
    await channel.assertQueue('notification.sent', { durable: true });
    await channel.assertQueue('notification.failed', { durable: true });
    logger.info('✓ All queues asserted');
    console.log('✓ All queues asserted');
    
    // Consume from delivery.completed events
    channel.consume('delivery.completed', async (msg) => {
      if (msg) {
        const event = JSON.parse(msg.content.toString());
        logger.info('Received delivery.completed event', { eventId: event.id });
        console.log('Received delivery.completed event', { eventId: event.id });
        
        // Add job to Redis queue for processing
        await redis.lPush(
          'webhook:jobs',
          JSON.stringify({
            eventType: 'delivery.completed',
            eventId: event.id,
            data: event,
            timestamp: new Date().toISOString(),
            attempts: 0,
          })
        );
        
        console.log('Job added to Redis queue for delivery.completed event', { eventId: event.id });

        channel.ack(msg);
      }
    });


    
    // Consume from notification.sent events
    channel.consume('notification.sent', async (msg) => {
      if (msg) {
        const event = JSON.parse(msg.content.toString());
        logger.info('Received notification.sent event', { eventId: event.id });
        console.log('Received notification.sent event', { eventId: event.id });
        
        await redis.lPush(
          'webhook:jobs',
          JSON.stringify({
            eventType: 'notification.sent',
            eventId: event.id,
            data: event,
            timestamp: new Date().toISOString(),
            attempts: 0,
          })
        );

        console.log('Job added to Redis queue for notification.sent event', { eventId: event.id });

        channel.ack(msg);
      }
    });
    
    logger.info('Event consumer started');
    console.log('Event consumer started');
  } catch (error) {
    logger.error('Error starting event consumer:', error);
    console.error('Error starting event consumer:', error);
    throw error;
  }
}

module.exports = { startEventConsumer };